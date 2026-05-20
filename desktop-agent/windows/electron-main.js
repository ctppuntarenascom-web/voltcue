const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage } = require("electron");
const http = require("http");
const os = require("os");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { execFile } = require("child_process");
const QRCode = require("qrcode");

const DEFAULT_PORT = 8787;
const COUNTDOWN_SECONDS = 10;
const realShutdown = process.argv.includes("--real-shutdown");
const DEFAULT_CLOUD_URL = "http://localhost:8799";
const DEMO_USER_TOKEN = "demo-user-token";
const cloudDemo = process.argv.includes("--cloud-demo");

const state = {
  pin: newPin(),
  paired: false,
  pairedName: "",
  pairedDevices: [],
  deviceName: os.hostname() || "Mi PC",
  autoStartEnabled: false,
  cloudEnabled: false,
  cloudApiUrl: DEFAULT_CLOUD_URL,
  cloudStatus: "Desconectada",
  cloudDeviceId: "",
  cloudAgentToken: "",
  shutdownPending: false,
  pendingAction: "",
  countdown: 0,
  history: [],
};

let mainWindow;
let countdownTimer;
let server;
let activePort = DEFAULT_PORT;
let tray;
let isQuitting = false;
let cloudPollTimer;

function newPin() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "127.0.0.1";
}

function addHistory(action, result) {
  state.history.unshift({
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    action,
    result,
  });
  state.history = state.history.slice(0, 8);
}

function publicState() {
  return {
    ...state,
    paired: state.pairedDevices.length > 0,
    pairedDevices: state.pairedDevices.map(safeDevice),
    url: `http://${getLocalIp()}:${activePort}`,
    qrUrl: `http://${getLocalIp()}:${activePort}/qr.png`,
    realShutdown,
  };
}

function mobileState(token) {
  const device = findDeviceByToken(token);
  return {
    ok: true,
    pin: state.pin,
    paired: Boolean(device),
    pairedName: device ? device.name : "",
    deviceName: state.deviceName,
    shutdownPending: state.shutdownPending,
    pendingAction: state.pendingAction,
    countdown: state.countdown,
    history: state.history,
    realShutdown,
  };
}

function sendState() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("state", publicState());
  }
}

function regeneratePin() {
  state.pin = newPin();
  state.paired = false;
  state.pairedName = "";
  state.pairedDevices = [];
  saveSettings();
  addHistory("Dispositivos desvinculados", "OK");
  sendState();
}

function settingsPath() {
  return path.join(app.getPath("userData"), "settings.json");
}

function loadSettings() {
  try {
    const raw = fs.readFileSync(settingsPath(), "utf8");
    const settings = JSON.parse(raw);
    state.deviceName = settings.deviceName || state.deviceName;
    state.autoStartEnabled = Boolean(settings.autoStartEnabled);
    state.cloudEnabled = Boolean(settings.cloudEnabled);
    state.cloudApiUrl = settings.cloudApiUrl || DEFAULT_CLOUD_URL;
    state.cloudDeviceId = settings.cloudDeviceId || "";
    state.cloudAgentToken = settings.cloudAgentToken || "";
    state.pairedDevices = Array.isArray(settings.pairedDevices) ? settings.pairedDevices : [];
    state.paired = state.pairedDevices.length > 0;
    state.pairedName = state.pairedDevices[0]?.name || "";
  } catch {
    state.autoStartEnabled = app.getLoginItemSettings().openAtLogin;
  }
}

function saveSettings() {
  const settings = {
    deviceName: state.deviceName,
    autoStartEnabled: state.autoStartEnabled,
    cloudEnabled: state.cloudEnabled,
    cloudApiUrl: state.cloudApiUrl,
    cloudDeviceId: state.cloudDeviceId,
    cloudAgentToken: state.cloudAgentToken,
    pairedDevices: state.pairedDevices,
  };
  fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
  fs.writeFileSync(settingsPath(), JSON.stringify(settings, null, 2));
}

function applyAutoStart(enabled) {
  state.autoStartEnabled = Boolean(enabled);
  app.setLoginItemSettings({
    openAtLogin: state.autoStartEnabled,
    path: app.getPath("exe"),
  });
  saveSettings();
}

function setDeviceName(name) {
  const cleanName = String(name || "").trim().slice(0, 40);
  state.deviceName = cleanName || os.hostname() || "Mi PC";
  saveSettings();
  addHistory("Nombre de PC actualizado", "OK");
  sendState();
  updateTray();
  if (state.cloudEnabled) {
    connectCloud({ enabled: true, apiUrl: state.cloudApiUrl });
  }
  return { ok: true, deviceName: state.deviceName };
}

function setAutoStart(enabled) {
  applyAutoStart(enabled);
  addHistory("Auto-inicio", state.autoStartEnabled ? "Activado" : "Desactivado");
  sendState();
  updateTray();
  return { ok: true, autoStartEnabled: state.autoStartEnabled };
}

function newToken() {
  return crypto.randomBytes(32).toString("hex");
}

function safeDevice(device) {
  return {
    id: device.id,
    name: device.name,
    createdAt: device.createdAt,
    lastSeen: device.lastSeen,
    tokenLast4: String(device.token || "").slice(-4),
  };
}

function findDeviceByToken(token) {
  if (!token) return null;
  return state.pairedDevices.find((device) => device.token === token) || null;
}

function touchDevice(token) {
  const device = findDeviceByToken(token);
  if (!device) return null;
  device.lastSeen = new Date().toISOString();
  state.pairedName = device.name;
  saveSettings();
  return device;
}

function pair(pin, name = "Telefono") {
  if (String(pin || "") !== state.pin) {
    addHistory("Intento de vinculacion", "PIN incorrecto");
    sendState();
    return { ok: false, message: "PIN incorrecto." };
  }

  const device = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    name: String(name || "Telefono").trim().slice(0, 40) || "Telefono",
    token: newToken(),
    createdAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
  };
  state.pairedDevices.unshift(device);
  state.pairedDevices = state.pairedDevices.slice(0, 12);
  state.paired = true;
  state.pairedName = device.name;
  state.pin = newPin();
  saveSettings();
  addHistory(`${device.name} vinculado`, "OK");
  sendState();
  return { ok: true, message: "PC vinculada.", token: device.token, device: safeDevice(device) };
}

function revokeDevice(id) {
  const before = state.pairedDevices.length;
  state.pairedDevices = state.pairedDevices.filter((device) => device.id !== id);
  state.paired = state.pairedDevices.length > 0;
  state.pairedName = state.pairedDevices[0]?.name || "";
  saveSettings();
  if (before !== state.pairedDevices.length) {
    addHistory("Dispositivo desvinculado", "OK");
  }
  sendState();
  return { ok: true };
}

const COMMANDS = {
  shutdown: {
    label: "Apagar PC",
    countdown: true,
    real: () => execFile("shutdown", ["/s", "/t", "0"]),
  },
  restart: {
    label: "Reiniciar PC",
    countdown: true,
    real: () => execFile("shutdown", ["/r", "/t", "0"]),
  },
  sleep: {
    label: "Suspender PC",
    countdown: false,
    real: () => execFile("rundll32.exe", ["powrprof.dll,SetSuspendState", "0,1,0"]),
  },
  lock: {
    label: "Bloquear pantalla",
    countdown: false,
    real: () => execFile("rundll32.exe", ["user32.dll,LockWorkStation"]),
  },
};

function startPowerAction(action = "shutdown", token = "", options = {}) {
  const command = COMMANDS[action] || COMMANDS.shutdown;
  const device = options.trusted ? { name: options.source || "Nube" } : touchDevice(token);
  if (!device) {
    addHistory(command.label, "No vinculado");
    sendState();
    return { ok: false, message: "Este telefono no esta vinculado. Vuelve a ingresar el PIN." };
  }
  if (state.shutdownPending) {
    return { ok: true, message: "Ya hay una cuenta regresiva activa." };
  }

  if (!command.countdown) {
    addHistory(command.label, realShutdown ? "Ejecutado" : `Simulado (${device.name})`);
    sendState();
    if (realShutdown) command.real();
    return { ok: true, message: `${command.label} ${realShutdown ? "ejecutado" : "simulado"}.` };
  }

  state.shutdownPending = true;
  state.pendingAction = action;
  state.countdown = COUNTDOWN_SECONDS;
  addHistory(command.label, options.trusted ? `Cuenta regresiva (${device.name})` : "Cuenta regresiva");
  sendState();

  clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    if (!state.shutdownPending) {
      clearInterval(countdownTimer);
      return;
    }

    state.countdown -= 1;
    if (state.countdown <= 0) {
      clearInterval(countdownTimer);
      state.shutdownPending = false;
      const finalAction = state.pendingAction || action;
      const finalCommand = COMMANDS[finalAction] || COMMANDS.shutdown;
      state.pendingAction = "";
      state.countdown = 0;
      addHistory(finalCommand.label, realShutdown ? "Ejecutado" : "Simulado");
      sendState();
      if (realShutdown) {
        finalCommand.real();
      }
      return;
    }
    sendState();
  }, 1000);

  return { ok: true, message: "Cuenta regresiva iniciada." };
}

function startShutdown(token = "") {
  return startPowerAction("shutdown", token);
}

function cancelShutdown(token = "") {
  if (token && !touchDevice(token)) {
    return { ok: false, message: "Este telefono no esta vinculado." };
  }
  const wasPending = state.shutdownPending;
  state.shutdownPending = false;
  state.pendingAction = "";
  state.countdown = 0;
  clearInterval(countdownTimer);
  addHistory("Cancelar apagado", wasPending ? "OK" : "Sin apagado activo");
  if (realShutdown) {
    execFile("shutdown", ["/a"]);
  }
  sendState();
  return { ok: true, message: "Apagado cancelado." };
}

async function cloudRequest(pathname, options = {}) {
  const base = String(state.cloudApiUrl || DEFAULT_CLOUD_URL).replace(/\/$/, "");
  const response = await fetch(`${base}${pathname}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  return response.json();
}

async function connectCloud({ enabled = true, apiUrl = state.cloudApiUrl } = {}) {
  state.cloudEnabled = Boolean(enabled);
  state.cloudApiUrl = String(apiUrl || DEFAULT_CLOUD_URL).trim() || DEFAULT_CLOUD_URL;

  if (!state.cloudEnabled) {
    state.cloudStatus = "Desconectada";
    stopCloudPolling();
    saveSettings();
    sendState();
    return { ok: true, cloudStatus: state.cloudStatus };
  }

  try {
    state.cloudStatus = "Conectando...";
    sendState();
    const result = await cloudRequest("/api/agents/register", {
      method: "POST",
      headers: { Authorization: `Bearer ${DEMO_USER_TOKEN}` },
      body: JSON.stringify({ name: state.deviceName, platform: "windows" }),
    });
    if (!result.ok) throw new Error(result.message || "No se pudo registrar la PC.");

    state.cloudDeviceId = result.device.id;
    state.cloudAgentToken = result.agentToken;
    state.cloudStatus = "Conectada a nube demo";
    saveSettings();
    addHistory("Nube demo conectada", "OK");
    startCloudPolling();
    sendState();
    return { ok: true, cloudStatus: state.cloudStatus };
  } catch (error) {
    state.cloudStatus = `Error: ${error.message}`;
    state.cloudEnabled = false;
    stopCloudPolling();
    saveSettings();
    sendState();
    return { ok: false, message: error.message };
  }
}

function stopCloudPolling() {
  clearInterval(cloudPollTimer);
  cloudPollTimer = null;
}

function startCloudPolling() {
  stopCloudPolling();
  if (!state.cloudEnabled || !state.cloudAgentToken) return;

  cloudPollTimer = setInterval(async () => {
    try {
      const result = await cloudRequest("/api/agents/commands", {
        method: "GET",
        headers: { Authorization: `Bearer ${state.cloudAgentToken}` },
      });
      if (!result.ok) throw new Error(result.message || "No se pudo consultar comandos.");

      state.cloudStatus = "Conectada a nube demo";
      for (const command of result.commands || []) {
        const actionResult = startPowerAction(command.action, "", { trusted: true, source: "Alexa demo" });
        await cloudRequest(`/api/agents/commands/${command.id}/complete`, {
          method: "POST",
          headers: { Authorization: `Bearer ${state.cloudAgentToken}` },
          body: JSON.stringify({ result: actionResult.ok ? "OK" : actionResult.message }),
        });
      }
      sendState();
    } catch (error) {
      state.cloudStatus = `Error nube: ${error.message}`;
      sendState();
    }
  }, 4000);
}

function mobilePage() {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>VoltCue</title>
  <style>${mobileCss()}</style>
</head>
<body>
  <main>
    <section class="hero">
      <div class="brand-icon"><img src="/assets/voltcue-logo.png" alt=""></div>
      <h1>VoltCue</h1>
      <p>Controla tu PC con un toque.</p>
      <span id="mode" class="pill">Modo simulacion</span>
    </section>
    <section id="controls" class="panel"></section>
    <section id="countdownPanel" class="panel countdown hidden">
      <span id="countdownLabel">Cuenta regresiva</span>
      <strong id="countdownValue">0</strong>
      <button class="secondary" onclick="cancelShutdown()">Cancelar accion</button>
    </section>
    <section class="panel">
      <h2>Historial</h2>
      <div id="history"><p>Todavia no hay acciones.</p></div>
    </section>
  </main>
  <div id="modal" class="modal hidden">
    <div class="modal-card">
      <h2 id="modalTitle">Confirmar accion</h2>
      <p id="modalText">Quieres continuar?</p>
      <div class="modal-actions">
        <button class="secondary" onclick="closeModal()">Cancelar</button>
        <button id="modalConfirm" class="danger">Confirmar</button>
      </div>
    </div>
  </div>
  <script>
    let lastPaired = null;
    let lastDeviceName = null;
    let selectedAction = null;
    const tokenKey = "voltcueDeviceToken";
    const actionLabels = {
      shutdown: "Apagar PC",
      restart: "Reiniciar PC",
      sleep: "Suspender PC",
      lock: "Bloquear pantalla"
    };
    function escapeHtml(value) {
      return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    async function post(path, body) {
      const res = await fetch(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-VoltCue-Token": localStorage.getItem(tokenKey) || ""
        },
        body: JSON.stringify({ token: localStorage.getItem(tokenKey) || "", ...(body || {}) })
      });
      const data = await res.json();
      if (data.token) localStorage.setItem(tokenKey, data.token);
      if (!data.ok) alert(data.message || "No se pudo completar.");
      await refresh();
    }

    async function refresh() {
      const res = await fetch("/api/status", {
        headers: { "X-VoltCue-Token": localStorage.getItem(tokenKey) || "" }
      });
      const data = await res.json();
      if (!data.ok) return;
      render(data);
    }

    function render(data) {
      document.getElementById("mode").textContent = data.realShutdown ? "Modo REAL" : "Modo SIMULACION";

      if (lastPaired !== data.paired || lastDeviceName !== data.deviceName) {
        lastPaired = data.paired;
        lastDeviceName = data.deviceName;
        document.getElementById("controls").innerHTML = data.paired
          ? '<div class="status-card"><div class="pc-icon"><img src="/assets/voltcue-logo.png" alt=""></div><div><h2>' + escapeHtml(data.deviceName) + '</h2><p class="ok">Conectada y lista.</p></div></div><div class="actions"><button class="action danger" onclick="askAction(\\'shutdown\\')"><span>Apagar</span><small>Cuenta regresiva</small></button><button class="action" onclick="askAction(\\'restart\\')"><span>Reiniciar</span><small>Cuenta regresiva</small></button><button class="action" onclick="askAction(\\'sleep\\')"><span>Suspender</span><small>Modo reposo</small></button><button class="action" onclick="askAction(\\'lock\\')"><span>Bloquear</span><small>Pantalla segura</small></button></div><button class="secondary" onclick="cancelShutdown()">Cancelar accion</button>'
          : '<h2>Vincular PC</h2><p>Normalmente solo tienes que tocar el boton de abajo. Si te pide PIN, usa el que aparece en Avanzado.</p><input id="pin" inputmode="numeric" pattern="[0-9]*" maxlength="6" placeholder="PIN" autocomplete="one-time-code"><button onclick="pair()">Vincular PC</button>';
      }

      document.getElementById("countdownPanel").classList.toggle("hidden", !data.shutdownPending);
      document.getElementById("countdownValue").textContent = data.countdown || 0;
      document.getElementById("countdownLabel").textContent = data.pendingAction ? actionLabels[data.pendingAction] : "Cuenta regresiva";

      document.getElementById("history").innerHTML = data.history && data.history.length
        ? data.history.map(item => '<div class="row"><span>' + item.time + ' ' + item.action + '</span><b>' + item.result + '</b></div>').join("")
        : "<p>Todavia no hay acciones.</p>";
    }

    function pair() {
      const name = navigator.userAgent.includes("Android") ? "Telefono Android" : "Telefono";
      post("/api/pair", { pin: document.getElementById("pin").value, name });
    }
    function askAction(action) {
      selectedAction = action;
      const label = actionLabels[action] || "Ejecutar accion";
      document.getElementById("modalTitle").textContent = label;
      document.getElementById("modalText").textContent = "Seguro que quieres " + label.toLowerCase() + "?";
      document.getElementById("modal").classList.remove("hidden");
    }
    function closeModal() {
      selectedAction = null;
      document.getElementById("modal").classList.add("hidden");
    }
    function cancelShutdown() {
      post("/api/cancel");
    }
    document.getElementById("modalConfirm").addEventListener("click", () => {
      const action = selectedAction;
      closeModal();
      post("/api/action", { action });
    });
    refresh();
    setInterval(refresh, 2000);
  </script>
</body>
</html>`;
}

function logoSvg(withBg = true) {
  const bg = withBg ? "<rect x=\"16\" y=\"16\" width=\"96\" height=\"96\" rx=\"20\" fill=\"#139FC2\"/>" : "";
  return `<svg viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
    ${bg}
    <rect x="38" y="38" width="52" height="36" rx="4" stroke="currentColor" stroke-width="6" stroke-linejoin="round"/>
    <path d="M64 48V60" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
    <path d="M54 58C51.7 61.1 51.4 65.4 53.4 68.9C55.4 72.4 59.2 74.5 64 74.5C68.8 74.5 72.6 72.4 74.6 68.9C76.6 65.4 76.3 61.1 74 58" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
    <path d="M64 75V82" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
    <path d="M55 84H73" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
    <path d="M49 96C57.5 100.5 70.5 100.5 79 96" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
  </svg>`;
}

function mobileCss() {
  return `
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Inter, Arial, sans-serif; background: linear-gradient(180deg, #edf8fb 0%, #f7fafc 42%, #eef5f8 100%); color: #071827; }
    main { max-width: 430px; min-height: 100vh; margin: 0 auto; padding: 28px 18px 34px; }
    .hero { text-align: center; padding: 22px 0 10px; }
    .brand-icon { width: 86px; height: 86px; margin: 0 auto 16px; border-radius: 22px; background: #139fc2; display: grid; place-items: center; box-shadow: 0 18px 30px rgba(19, 159, 194, .24); overflow: hidden; }
    .brand-icon img { width: 100%; height: 100%; object-fit: cover; display: block; }
    h1 { margin: 0; font-size: 34px; letter-spacing: 0; }
    h2 { margin: 0 0 8px; font-size: 20px; }
    p { color: #647887; line-height: 1.4; }
    .panel { background: white; border: 1px solid #dfe9ef; border-radius: 14px; padding: 18px; margin: 14px 0; box-shadow: 0 10px 30px rgba(15, 48, 66, .07); }
    input { width: 100%; height: 52px; border: 1px solid #dce7ed; border-radius: 10px; font-size: 24px; letter-spacing: 6px; text-align: center; margin: 10px 0; }
    button { width: 100%; height: 48px; border: 0; border-radius: 10px; background: #139fc2; color: white; font-weight: 800; font-size: 15px; margin-top: 10px; }
    .secondary { background: #eef5f8; color: #071827; }
    .danger { background: #e5484d; }
    .ok { color: #12a66a; font-weight: 800; margin: 0; }
    .pill { display: inline-block; padding: 7px 11px; border-radius: 999px; background: #e8f4f8; color: #0d6f86; font-size: 12px; font-weight: 800; }
    .status-card { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; }
    .pc-icon { width: 52px; height: 52px; border-radius: 12px; background: #e7f7fb; display: grid; place-items: center; flex: 0 0 auto; overflow: hidden; }
    .pc-icon img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px; }
    .action { height: 78px; margin: 0; padding: 12px; text-align: left; background: #f1f8fb; color: #071827; border: 1px solid #d8e9ef; }
    .action span { display: block; font-size: 16px; font-weight: 900; }
    .action small { display: block; margin-top: 5px; color: #647887; font-size: 12px; font-weight: 800; }
    .action.danger { background: #fff1f2; color: #b42329; border-color: #ffd0d3; }
    .countdown { text-align: center; }
    .countdown span { color: #647887; font-weight: 800; }
    .countdown strong { display: block; color: #e5484d; font-size: 64px; }
    .row { display: flex; justify-content: space-between; gap: 10px; padding: 10px 0; border-bottom: 1px solid #edf3f6; font-size: 13px; }
    .row b { color: #12a66a; }
    .modal { position: fixed; inset: 0; padding: 20px; background: rgba(7, 24, 39, .42); display: grid; place-items: center; }
    .modal.hidden, .hidden { display: none; }
    .modal-card { width: min(100%, 360px); padding: 20px; border-radius: 16px; background: white; box-shadow: 0 24px 60px rgba(7, 24, 39, .24); }
    .modal-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px; }
    .modal-actions button { margin: 0; }
  `;
}

function send(res, status, body, type = "text/html; charset=utf-8") {
  const data = Buffer.from(body);
  res.writeHead(status, {
    "Content-Type": type,
    "Content-Length": data.length,
  });
  res.end(data);
}

function requestToken(req, data = {}) {
  const headerToken = req.headers["x-voltcue-token"];
  return String(data.token || headerToken || "").trim();
}

function startServer(port = DEFAULT_PORT) {
  server = http.createServer((req, res) => {
    if (req.method === "GET" && (req.url === "/" || req.url.startsWith("/?"))) {
      send(res, 200, mobilePage());
      return;
    }
    if (req.method === "GET" && req.url === "/assets/voltcue-logo.png") {
      const logoPath = path.join(__dirname, "electron-ui", "assets", "voltcue-logo.png");
      const data = fs.readFileSync(logoPath);
      res.writeHead(200, {
        "Content-Type": "image/png",
        "Content-Length": data.length,
      });
      res.end(data);
      return;
    }
    if (req.method === "GET" && req.url.startsWith("/qr.png")) {
      QRCode.toBuffer(`http://${getLocalIp()}:${activePort}`, {
        type: "png",
        margin: 1,
        width: 420,
        color: {
          dark: "#061a2b",
          light: "#ffffff",
        },
      }).then((data) => {
        res.writeHead(200, {
          "Content-Type": "image/png",
          "Content-Length": data.length,
          "Cache-Control": "no-store",
        });
        res.end(data);
      }).catch(() => {
        send(res, 500, "QR error", "text/plain; charset=utf-8");
      });
      return;
    }
    if (req.method === "GET" && req.url === "/api/status") {
      send(res, 200, JSON.stringify(mobileState(requestToken(req))), "application/json; charset=utf-8");
      return;
    }
    if (req.method === "POST") {
      let raw = "";
      req.on("data", (chunk) => {
        raw += chunk;
      });
      req.on("end", () => {
        let data = {};
        try {
          data = raw ? JSON.parse(raw) : {};
        } catch {
          send(res, 400, JSON.stringify({ ok: false, message: "JSON invalido." }), "application/json; charset=utf-8");
          return;
        }

        if (req.url === "/api/pair") {
          send(res, 200, JSON.stringify(pair(data.pin, data.name)), "application/json; charset=utf-8");
          return;
        }
        if (req.url === "/api/shutdown") {
          send(res, 200, JSON.stringify(startShutdown(requestToken(req, data))), "application/json; charset=utf-8");
          return;
        }
        if (req.url === "/api/action") {
          send(res, 200, JSON.stringify(startPowerAction(data.action, requestToken(req, data))), "application/json; charset=utf-8");
          return;
        }
        if (req.url === "/api/cancel") {
          send(res, 200, JSON.stringify(cancelShutdown(requestToken(req, data))), "application/json; charset=utf-8");
          return;
        }
        send(res, 404, JSON.stringify({ ok: false, message: "Ruta no encontrada." }), "application/json; charset=utf-8");
      });
      return;
    }
    send(res, 404, "Not found", "text/plain; charset=utf-8");
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE" && port < DEFAULT_PORT + 20) {
      activePort = port + 1;
      startServer(activePort);
      return;
    }
    throw error;
  });

  server.listen(port, "0.0.0.0", () => {
    activePort = port;
    sendState();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 680,
    minWidth: 860,
    minHeight: 600,
    backgroundColor: "#f6f9fb",
    title: "VoltCue para Windows",
    webPreferences: {
      preload: path.join(__dirname, "electron-preload.js"),
    },
  });

  mainWindow.loadFile(path.join(__dirname, "electron-ui", "index.html"));
  mainWindow.once("ready-to-show", () => {
    sendState();
  });
  mainWindow.on("close", (event) => {
    if (isQuitting) return;
    event.preventDefault();
    mainWindow.hide();
  });
}

function showWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }
  mainWindow.show();
  mainWindow.focus();
}

function updateTray() {
  if (!tray) return;
  tray.setToolTip(`VoltCue - ${state.deviceName}`);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: `VoltCue - ${state.deviceName}`, enabled: false },
    { label: "Abrir", click: showWindow },
    { label: "Abrir control movil", click: () => shell.openExternal(`http://${getLocalIp()}:${activePort}`) },
    { type: "separator" },
    { label: state.autoStartEnabled ? "Auto-inicio activado" : "Auto-inicio desactivado", enabled: false },
    { type: "separator" },
    {
      label: "Salir",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]));
}

function createTray() {
  const iconPath = path.join(__dirname, "electron-ui", "assets", "voltcue-logo.png");
  const image = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(image);
  tray.on("click", showWindow);
  updateTray();
}

ipcMain.handle("get-state", () => publicState());
ipcMain.handle("regenerate-pin", () => regeneratePin());
ipcMain.handle("cancel-shutdown", () => cancelShutdown());
ipcMain.handle("open-mobile-url", () => shell.openExternal(`http://${getLocalIp()}:${activePort}`));
ipcMain.handle("set-device-name", (_event, name) => setDeviceName(name));
ipcMain.handle("set-auto-start", (_event, enabled) => setAutoStart(enabled));
ipcMain.handle("connect-cloud", (_event, options) => connectCloud(options));
ipcMain.handle("revoke-device", (_event, id) => revokeDevice(id));
ipcMain.handle("hide-window", () => {
  if (mainWindow) mainWindow.hide();
});

app.whenReady().then(() => {
  loadSettings();
  if (cloudDemo) {
    state.cloudEnabled = true;
    state.cloudApiUrl = DEFAULT_CLOUD_URL;
  }
  applyAutoStart(state.autoStartEnabled);
  startServer();
  createWindow();
  createTray();
  if (state.cloudEnabled) {
    connectCloud({ enabled: true, apiUrl: state.cloudApiUrl });
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    // Keep the agent alive in the tray so phone/Alexa commands can still arrive.
  }
});

app.on("before-quit", () => {
  isQuitting = true;
  if (server) server.close();
});
