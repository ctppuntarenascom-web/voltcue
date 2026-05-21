const http = require("http");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 8799);
const DEMO_USER_TOKEN = process.env.VOLTCUE_DEMO_USER_TOKEN || "demo-user-token";
const DEMO_USER_EMAIL = process.env.VOLTCUE_DEMO_USER_EMAIL || "demo@voltcue.local";

const db = {
  users: [
    {
      id: "demo-user",
      email: DEMO_USER_EMAIL,
      token: DEMO_USER_TOKEN,
    },
  ],
  devices: [],
  commands: [],
};

function now() {
  return new Date().toISOString();
}

function id(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

function send(res, status, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  });
  res.end(body);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function bearer(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function userFromReq(req) {
  const token = bearer(req);
  return db.users.find((user) => user.token === token) || null;
}

function deviceFromAgent(req) {
  const token = bearer(req);
  return db.devices.find((device) => device.agentToken === token) || null;
}

function publicDevice(device) {
  return {
    id: device.id,
    name: device.name,
    platform: device.platform,
    status: device.status,
    lastSeen: device.lastSeen,
    createdAt: device.createdAt,
  };
}

function queueCommand(device, action, source = "cloud") {
  const command = {
    id: id("cmd"),
    userId: device.userId,
    deviceId: device.id,
    action,
    source,
    status: "queued",
    createdAt: now(),
    completedAt: null,
    result: null,
  };
  db.commands.push(command);
  return command;
}

function alexaResponse(output, shouldEndSession = true) {
  return {
    version: "1.0",
    response: {
      outputSpeech: {
        type: "PlainText",
        text: output,
      },
      shouldEndSession,
    },
  };
}

function alexaLanguage(body) {
  const locale = body?.request?.locale || "en-US";
  return locale.toLowerCase().startsWith("es") ? "es" : "en";
}

function alexaText(lang, key, action = "") {
  const text = {
    en: {
      launch: "VoltCue is ready. You can say, turn off my PC, restart my PC, sleep my computer, or lock my desktop.",
      help: "You can say, turn off my PC, restart my PC, sleep my computer, or lock my desktop.",
      queued: {
        shutdown: "Okay, I sent the shutdown command to your PC.",
        restart: "Okay, I sent the restart command to your PC.",
        sleep: "Okay, I sent the sleep command to your PC.",
        lock: "Okay, I sent the lock command to your PC.",
      },
      noDevice: "I could not find a PC connected to VoltCue.",
      unsupported: "VoltCue does not support that command yet.",
      bye: "Okay.",
    },
    es: {
      launch: "VoltCue esta listo. Puedes decir, apaga mi PC, reinicia mi PC, suspende mi computadora, o bloquea mi PC.",
      help: "Puedes decir, apaga mi PC, reinicia mi PC, suspende mi computadora, o bloquea mi PC.",
      queued: {
        shutdown: "Listo, envie el comando para apagar tu PC.",
        restart: "Listo, envie el comando para reiniciar tu PC.",
        sleep: "Listo, envie el comando para suspender tu PC.",
        lock: "Listo, envie el comando para bloquear tu PC.",
      },
      noDevice: "No encontre una PC conectada a VoltCue.",
      unsupported: "VoltCue todavia no soporta ese comando.",
      bye: "De acuerdo.",
    },
  };
  return action ? text[lang][key][action] : text[lang][key];
}

function actionFromIntent(intentName) {
  return {
    ShutdownIntent: "shutdown",
    RestartIntent: "restart",
    SleepIntent: "sleep",
    LockIntent: "lock",
  }[intentName] || "";
}

async function route(req, res) {
  if (req.method === "OPTIONS") {
    send(res, 200, { ok: true });
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/health") {
    send(res, 200, { ok: true, service: "VoltCue Cloud API", time: now() });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/demo") {
    const user = db.users[0];
    send(res, 200, { ok: true, userToken: user.token, user: { id: user.id, email: user.email } });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/agents/register") {
    const user = userFromReq(req);
    if (!user) return send(res, 401, { ok: false, message: "Unauthorized user token." });

    const body = await readJson(req);
    const name = String(body.name || "Mi PC").trim().slice(0, 50) || "Mi PC";
    const platform = String(body.platform || "windows").trim().slice(0, 30) || "windows";
    let device = db.devices.find((item) => item.userId === user.id && item.name === name && item.platform === platform);

    if (!device) {
      device = {
        id: id("dev"),
        userId: user.id,
        name,
        platform,
        agentToken: id("agent"),
        status: "online",
        createdAt: now(),
        lastSeen: now(),
      };
      db.devices.push(device);
    } else {
      device.status = "online";
      device.lastSeen = now();
    }

    send(res, 200, { ok: true, device: publicDevice(device), agentToken: device.agentToken });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/devices") {
    const user = userFromReq(req);
    if (!user) return send(res, 401, { ok: false, message: "Unauthorized user token." });
    send(res, 200, { ok: true, devices: db.devices.filter((device) => device.userId === user.id).map(publicDevice) });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/commands") {
    const user = userFromReq(req);
    if (!user) return send(res, 401, { ok: false, message: "Unauthorized user token." });
    const commands = db.commands
      .filter((command) => command.userId === user.id)
      .slice()
      .reverse();
    send(res, 200, { ok: true, commands });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/agents/commands") {
    const device = deviceFromAgent(req);
    if (!device) return send(res, 401, { ok: false, message: "Unauthorized agent token." });

    device.status = "online";
    device.lastSeen = now();
    const commands = db.commands.filter((command) => command.deviceId === device.id && command.status === "queued");
    commands.forEach((command) => {
      command.status = "delivered";
    });
    send(res, 200, { ok: true, commands });
    return;
  }

  if (req.method === "POST" && url.pathname.startsWith("/api/agents/commands/") && url.pathname.endsWith("/complete")) {
    const device = deviceFromAgent(req);
    if (!device) return send(res, 401, { ok: false, message: "Unauthorized agent token." });

    const commandId = url.pathname.split("/")[4];
    const body = await readJson(req);
    const command = db.commands.find((item) => item.id === commandId && item.deviceId === device.id);
    if (!command) return send(res, 404, { ok: false, message: "Command not found." });

    command.status = "completed";
    command.completedAt = now();
    command.result = body.result || "OK";
    send(res, 200, { ok: true, command });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/alexa/command") {
    const user = userFromReq(req);
    if (!user) return send(res, 401, { ok: false, message: "Unauthorized user token." });

    const body = await readJson(req);
    const action = String(body.action || "shutdown");
    const allowed = new Set(["shutdown", "restart", "sleep", "lock"]);
    if (!allowed.has(action)) return send(res, 400, { ok: false, message: "Unsupported action." });

    const device = body.deviceId
      ? db.devices.find((item) => item.userId === user.id && item.id === body.deviceId)
      : db.devices.find((item) => item.userId === user.id);
    if (!device) return send(res, 404, { ok: false, message: "No device registered." });

    const command = queueCommand(device, action, "alexa-demo");
    send(res, 200, { ok: true, message: `${action} queued for ${device.name}.`, command });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/alexa/skill") {
    const body = await readJson(req);
    const lang = alexaLanguage(body);
    const requestType = body?.request?.type;
    const intentName = body?.request?.intent?.name || "";

    if (requestType === "LaunchRequest") {
      send(res, 200, alexaResponse(alexaText(lang, "launch"), false));
      return;
    }

    if (requestType === "IntentRequest" && intentName === "AMAZON.HelpIntent") {
      send(res, 200, alexaResponse(alexaText(lang, "help"), false));
      return;
    }

    if (requestType === "IntentRequest" && ["AMAZON.CancelIntent", "AMAZON.StopIntent"].includes(intentName)) {
      send(res, 200, alexaResponse(alexaText(lang, "bye")));
      return;
    }

    if (requestType === "IntentRequest") {
      const action = actionFromIntent(intentName);
      if (!action) {
        send(res, 200, alexaResponse(alexaText(lang, "unsupported")));
        return;
      }

      const user = db.users[0];
      const device = db.devices.find((item) => item.userId === user.id);
      if (!device) {
        send(res, 200, alexaResponse(alexaText(lang, "noDevice")));
        return;
      }

      queueCommand(device, action, "alexa-skill");
      send(res, 200, alexaResponse(alexaText(lang, "queued", action)));
      return;
    }

    send(res, 200, alexaResponse(alexaText(lang, "help"), false));
    return;
  }

  send(res, 404, { ok: false, message: "Not found." });
}

const server = http.createServer((req, res) => {
  route(req, res).catch((error) => {
    send(res, 500, { ok: false, message: error.message });
  });
});

server.listen(PORT, () => {
  console.log(`VoltCue Cloud API running at http://localhost:${PORT}`);
  console.log(`Demo user token: ${DEMO_USER_TOKEN}`);
});
