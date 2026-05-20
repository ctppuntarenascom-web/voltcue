const els = {
  mode: document.getElementById("mode"),
  statusTitle: document.getElementById("statusTitle"),
  statusDetail: document.getElementById("statusDetail"),
  statusDot: document.getElementById("statusDot"),
  pin: document.getElementById("pin"),
  pinButton: document.getElementById("pinButton"),
  mobileUrl: document.getElementById("mobileUrl"),
  copyUrl: document.getElementById("copyUrl"),
  qrImage: document.getElementById("qrImage"),
  shutdownCard: document.getElementById("shutdownCard"),
  countdown: document.getElementById("countdown"),
  cancelButton: document.getElementById("cancelButton"),
  deviceName: document.getElementById("deviceName"),
  saveNameButton: document.getElementById("saveNameButton"),
  autoStart: document.getElementById("autoStart"),
  cloudApiUrl: document.getElementById("cloudApiUrl"),
  cloudEnabled: document.getElementById("cloudEnabled"),
  cloudStatus: document.getElementById("cloudStatus"),
  hideButton: document.getElementById("hideButton"),
  devices: document.getElementById("devices"),
  history: document.getElementById("history"),
};

let editingName = false;

function render(state) {
  els.mode.textContent = state.realShutdown ? "Modo real" : "Modo simulacion";
  els.mobileUrl.textContent = state.url;
  els.qrImage.src = `${state.qrUrl}?t=${Date.now()}`;
  els.autoStart.checked = Boolean(state.autoStartEnabled);
  els.cloudEnabled.checked = Boolean(state.cloudEnabled);
  els.cloudStatus.textContent = state.cloudStatus || "Desconectada";
  if (document.activeElement !== els.cloudApiUrl) {
    els.cloudApiUrl.value = state.cloudApiUrl || "http://localhost:8799";
  }
  if (!editingName) {
    els.deviceName.value = state.deviceName || "";
  }

  if (state.paired) {
    els.statusTitle.textContent = "Telefono conectado";
    els.statusDetail.textContent = `${state.pairedName || "Telefono"} puede controlar esta PC.`;
    els.statusDot.classList.add("connected");
    els.pin.textContent = "Lista";
    els.pin.style.letterSpacing = "0";
    els.pinButton.textContent = "Reiniciar vinculacion";
  } else {
    els.statusTitle.textContent = "Esperando telefono";
    els.statusDetail.textContent = "Escanea el QR para vincular.";
    els.statusDot.classList.remove("connected");
    els.pin.textContent = state.pin;
    els.pin.style.letterSpacing = ".11em";
    els.pinButton.textContent = "Generar nuevo PIN";
  }

  els.shutdownCard.classList.toggle("hidden", !state.shutdownPending);
  els.countdown.textContent = state.countdown || "0";
  renderDevices(state.pairedDevices || []);

  if (!state.history.length) {
    els.history.innerHTML = `<p class="empty">Sin acciones todavia.</p>`;
    return;
  }

  els.history.innerHTML = state.history.slice(0, 5).map((item) => `
    <div class="history-row">
      <span>${item.time}</span>
      <strong>${item.action}</strong>
      <b>${item.result}</b>
    </div>
  `).join("");
}

function formatDate(value) {
  if (!value) return "Nunca";
  try {
    return new Date(value).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Reciente";
  }
}

function renderDevices(devices) {
  if (!devices.length) {
    els.devices.innerHTML = `<p class="empty">No hay telefonos vinculados.</p>`;
    return;
  }

  els.devices.innerHTML = devices.map((device) => `
    <div class="device-row">
      <div>
        <strong>${escapeHtml(device.name || "Telefono")}</strong>
        <span>Token *${escapeHtml(device.tokenLast4 || "----")} · Ultimo uso: ${escapeHtml(formatDate(device.lastSeen))}</span>
      </div>
      <button class="link-danger" data-revoke="${escapeHtml(device.id)}">Quitar</button>
    </div>
  `).join("");
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

els.pinButton.addEventListener("click", () => {
  window.voltcue.regeneratePin();
});

els.cancelButton.addEventListener("click", () => {
  window.voltcue.cancelShutdown();
});

els.mobileUrl.addEventListener("click", () => {
  window.voltcue.openMobileUrl();
});

els.copyUrl.addEventListener("click", () => {
  window.voltcue.openMobileUrl();
});

els.deviceName.addEventListener("focus", () => {
  editingName = true;
});

els.deviceName.addEventListener("blur", () => {
  editingName = false;
});

els.saveNameButton.addEventListener("click", async () => {
  editingName = false;
  await window.voltcue.setDeviceName(els.deviceName.value);
});

els.deviceName.addEventListener("keydown", async (event) => {
  if (event.key === "Enter") {
    editingName = false;
    els.deviceName.blur();
    await window.voltcue.setDeviceName(els.deviceName.value);
  }
});

els.autoStart.addEventListener("change", () => {
  window.voltcue.setAutoStart(els.autoStart.checked);
});

els.cloudEnabled.addEventListener("change", () => {
  window.voltcue.connectCloud({
    enabled: els.cloudEnabled.checked,
    apiUrl: els.cloudApiUrl.value,
  });
});

els.cloudApiUrl.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    window.voltcue.connectCloud({
      enabled: els.cloudEnabled.checked,
      apiUrl: els.cloudApiUrl.value,
    });
  }
});

els.hideButton.addEventListener("click", () => {
  window.voltcue.hideWindow();
});

els.devices.addEventListener("click", (event) => {
  const id = event.target?.dataset?.revoke;
  if (!id) return;
  window.voltcue.revokeDevice(id);
});

window.voltcue.onState(render);
window.voltcue.getState().then(render);
