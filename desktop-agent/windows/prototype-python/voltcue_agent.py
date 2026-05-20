import argparse
import http.server
import json
import os
import random
import socket
import subprocess
import threading
import time
import tkinter as tk
from tkinter import messagebox
from urllib.parse import parse_qs


APP_NAME = "VoltCue"
PORT = 8787
COUNTDOWN_SECONDS = 10
CYAN = "#139fc2"
INK = "#15222b"
MUTED = "#6b7b86"
DANGER = "#e5484d"


class VoltCueState:
    def __init__(self, real_shutdown=False):
        self.real_shutdown = real_shutdown
        self.pin = self._new_pin()
        self.paired = False
        self.paired_name = None
        self.shutdown_pending = False
        self.countdown = 0
        self.history = []
        self.lock = threading.Lock()
        self.ui = None

    def _new_pin(self):
        return str(random.randint(100000, 999999))

    def regenerate_pin(self):
        with self.lock:
            self.pin = self._new_pin()
            self.paired = False
            self.paired_name = None
            self.add_history("Nuevo PIN generado", "OK")
        self.refresh_ui()

    def pair(self, pin, name):
        with self.lock:
            if pin != self.pin:
                self.add_history("Intento de vinculacion", "PIN incorrecto")
                return False
            self.paired = True
            self.paired_name = name or "Telefono"
            self.add_history("Telefono vinculado", "OK")
        self.refresh_ui()
        return True

    def add_history(self, action, result):
        self.history.insert(0, {
            "time": time.strftime("%H:%M:%S"),
            "action": action,
            "result": result,
        })
        self.history = self.history[:8]

    def refresh_ui(self):
        if self.ui:
            self.ui.after(0, self.ui.refresh)

    def start_shutdown(self):
        with self.lock:
            if not self.paired:
                self.add_history("Apagar PC", "No vinculado")
                return False, "Primero vincula el telefono con el PIN."
            if self.shutdown_pending:
                return True, "El apagado ya esta en cuenta regresiva."
            self.shutdown_pending = True
            self.countdown = COUNTDOWN_SECONDS
            self.add_history("Apagar PC", "Cuenta regresiva")
        self.refresh_ui()
        threading.Thread(target=self._countdown_worker, daemon=True).start()
        return True, "Cuenta regresiva iniciada."

    def cancel_shutdown(self):
        with self.lock:
            was_pending = self.shutdown_pending
            self.shutdown_pending = False
            self.countdown = 0
            self.add_history("Cancelar apagado", "OK" if was_pending else "Sin apagado activo")
        if self.real_shutdown:
            subprocess.run(["shutdown", "/a"], capture_output=True, text=True)
        self.refresh_ui()
        return True, "Apagado cancelado."

    def _countdown_worker(self):
        while True:
            time.sleep(1)
            with self.lock:
                if not self.shutdown_pending:
                    return
                self.countdown -= 1
                if self.countdown <= 0:
                    self.shutdown_pending = False
                    self.countdown = 0
                    self.add_history("Apagar PC", "Ejecutado" if self.real_shutdown else "Simulado")
                    execute_real = self.real_shutdown
                    break
            self.refresh_ui()

        self.refresh_ui()
        if execute_real:
            subprocess.Popen(["shutdown", "/s", "/t", "0"])


def get_local_ip():
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.connect(("8.8.8.8", 80))
        ip = sock.getsockname()[0]
        sock.close()
        return ip
    except OSError:
        return "127.0.0.1"


def icon_svg():
    return """
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="13" y="12" width="38" height="28" rx="3"></rect>
      <path d="M32 19v10"></path>
      <path d="M25 26a9 9 0 1 0 14 0"></path>
      <path d="M26 47h12"></path>
      <path d="M22 53c6 4 14 4 20 0"></path>
    </svg>
    """


def mobile_page(state):
    with state.lock:
        paired = state.paired
        pending = state.shutdown_pending
        countdown = state.countdown
        history = list(state.history)
        real_shutdown = state.real_shutdown
    rows = "".join(
        f"<div class='row'><span>{item['time']} - {item['action']}</span><b>{item['result']}</b></div>"
        for item in history
    )
    paired_block = """
      <section class="panel">
        <h2>Vincular PC</h2>
        <p>Escribe el PIN que aparece en VoltCue para Windows.</p>
        <input id="pin" inputmode="numeric" maxlength="6" placeholder="PIN">
        <button onclick="pair()">Vincular PC</button>
      </section>
    """ if not paired else """
      <section class="panel">
        <h2>Desktop de Casa</h2>
        <p class="ok">Conectada y lista.</p>
        <button class="danger" onclick="shutdownPc()">Apagar PC</button>
        <button class="secondary" onclick="cancelShutdown()">Cancelar apagado</button>
      </section>
    """
    countdown_block = f"""
      <section class="panel countdown">
        <p>Cuenta regresiva</p>
        <strong>{countdown}</strong>
      </section>
    """ if pending else ""

    mode = "REAL" if real_shutdown else "SIMULACION"
    return f"""<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>VoltCue</title>
  <style>
    * {{ box-sizing: border-box; }}
    body {{ margin: 0; font-family: Arial, Helvetica, sans-serif; background: #f4f7f9; color: #15222b; }}
    main {{ max-width: 430px; min-height: 100vh; margin: 0 auto; padding: 26px 18px; }}
    .hero {{ text-align: center; padding: 24px 0 14px; }}
    .icon {{ width: 82px; height: 82px; margin: 0 auto 16px; border-radius: 22px; background: #139fc2; color: white; display: grid; place-items: center; }}
    .icon svg {{ width: 56px; height: 56px; }}
    h1 {{ margin: 0; font-size: 32px; }}
    h2 {{ margin: 0 0 8px; font-size: 20px; }}
    p {{ color: #6b7b86; line-height: 1.35; }}
    .panel {{ background: white; border: 1px solid #d9e3e8; border-radius: 10px; padding: 18px; margin: 14px 0; }}
    input {{ width: 100%; height: 48px; border: 1px solid #d9e3e8; border-radius: 8px; font-size: 22px; letter-spacing: 5px; text-align: center; margin: 10px 0; }}
    button {{ width: 100%; height: 46px; border: 0; border-radius: 8px; background: #139fc2; color: white; font-weight: 700; font-size: 15px; margin-top: 10px; }}
    .secondary {{ background: #eef5f8; color: #15222b; }}
    .danger {{ background: #e5484d; }}
    .ok {{ color: #18a86b; font-weight: 700; }}
    .mode {{ display: inline-block; padding: 6px 10px; border-radius: 999px; background: #eef5f8; color: #15222b; font-size: 12px; font-weight: 700; }}
    .countdown {{ text-align: center; }}
    .countdown strong {{ display: block; color: #e5484d; font-size: 58px; }}
    .row {{ display: flex; justify-content: space-between; gap: 10px; padding: 10px 0; border-bottom: 1px solid #edf3f6; font-size: 13px; }}
    .row b {{ color: #18a86b; }}
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <div class="icon">{icon_svg()}</div>
      <h1>VoltCue</h1>
      <p>Apaga tu PC con tu voz.</p>
      <span class="mode">Modo {mode}</span>
    </section>
    {paired_block}
    {countdown_block}
    <section class="panel">
      <h2>Historial</h2>
      {rows or "<p>Todavia no hay acciones.</p>"}
    </section>
  </main>
  <script>
    async function post(path, body) {{
      const res = await fetch(path, {{
        method: "POST",
        headers: {{ "Content-Type": "application/json" }},
        body: JSON.stringify(body || {{}})
      }});
      const data = await res.json();
      if (!data.ok) alert(data.message || "No se pudo completar.");
      location.reload();
    }}
    function pair() {{
      post("/api/pair", {{ pin: document.getElementById("pin").value, name: "Telefono" }});
    }}
    function shutdownPc() {{
      if (confirm("Seguro que quieres apagar esta PC?")) post("/api/shutdown");
    }}
    function cancelShutdown() {{
      post("/api/cancel");
    }}
    setInterval(() => location.reload(), 3000);
  </script>
</body>
</html>"""


class VoltCueHandler(http.server.BaseHTTPRequestHandler):
    state = None

    def _send(self, status, content, content_type="text/html; charset=utf-8"):
        encoded = content.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def _json(self, status, payload):
        self._send(status, json.dumps(payload), "application/json; charset=utf-8")

    def _read_json(self):
        length = int(self.headers.get("Content-Length", "0"))
        if length == 0:
            return {}
        raw = self.rfile.read(length).decode("utf-8")
        return json.loads(raw)

    def do_GET(self):
        if self.path == "/" or self.path.startswith("/?"):
            self._send(200, mobile_page(self.state))
            return
        if self.path == "/api/status":
            with self.state.lock:
                payload = {
                    "ok": True,
                    "paired": self.state.paired,
                    "shutdownPending": self.state.shutdown_pending,
                    "countdown": self.state.countdown,
                }
            self._json(200, payload)
            return
        self._send(404, "Not found", "text/plain; charset=utf-8")

    def do_POST(self):
        try:
            data = self._read_json()
            if self.path == "/api/pair":
                ok = self.state.pair(str(data.get("pin", "")), data.get("name", "Telefono"))
                self._json(200, {"ok": ok, "message": "PIN incorrecto." if not ok else "PC vinculada."})
                return
            if self.path == "/api/shutdown":
                ok, message = self.state.start_shutdown()
                self._json(200, {"ok": ok, "message": message})
                return
            if self.path == "/api/cancel":
                ok, message = self.state.cancel_shutdown()
                self._json(200, {"ok": ok, "message": message})
                return
            self._json(404, {"ok": False, "message": "Ruta no encontrada."})
        except Exception as exc:
            self._json(500, {"ok": False, "message": str(exc)})

    def log_message(self, format, *args):
        return


class VoltCueUI(tk.Tk):
    def __init__(self, state, url):
        super().__init__()
        self.state = state
        self.url = url
        self.state.ui = self
        self.title("VoltCue para Windows")
        self.geometry("500x620")
        self.configure(bg="#f6f9fb")
        self.resizable(False, False)
        self.protocol("WM_DELETE_WINDOW", self.on_close)
        self.build()
        self.refresh()

    def round_rect(self, canvas, x1, y1, x2, y2, radius, **kwargs):
        points = [
            x1 + radius, y1,
            x2 - radius, y1,
            x2, y1,
            x2, y1 + radius,
            x2, y2 - radius,
            x2, y2,
            x2 - radius, y2,
            x1 + radius, y2,
            x1, y2,
            x1, y2 - radius,
            x1, y1 + radius,
            x1, y1,
        ]
        return canvas.create_polygon(points, smooth=True, **kwargs)

    def draw_logo(self, parent, size=92, bg="#f6f9fb"):
        canvas = tk.Canvas(parent, width=size, height=size, bg=bg, highlightthickness=0)
        pad = 4
        self.round_rect(canvas, pad, pad, size - pad, size - pad, 18, fill=CYAN, outline=CYAN)

        scale = size / 92
        def s(value):
            return int(value * scale)

        # Clean monitor + power mark. Large simple geometry keeps the logo readable at small size.
        canvas.create_rectangle(s(24), s(24), s(68), s(52), outline="white", width=s(4))
        canvas.create_line(s(46), s(30), s(46), s(41), fill="white", width=s(4), capstyle="round")
        canvas.create_arc(s(34), s(32), s(58), s(56), start=210, extent=300, outline="white", width=s(4), style="arc")
        canvas.create_line(s(39), s(62), s(53), s(62), fill="white", width=s(4), capstyle="round")
        canvas.create_arc(s(30), s(61), s(62), s(78), start=200, extent=140, outline="white", width=s(4), style="arc")
        return canvas

    def build(self):
        self.header = tk.Frame(self, bg="#f6f9fb")
        self.header.pack(fill="x", padx=34, pady=(30, 16))

        self.logo = self.draw_logo(self.header, 92, "#f6f9fb")
        self.logo.pack(side="left")

        title_box = tk.Frame(self.header, bg="#f6f9fb")
        title_box.pack(side="left", padx=18)
        tk.Label(title_box, text=APP_NAME, bg="#f6f9fb", fg="#061a2b", font=("Segoe UI", 28, "bold")).pack(anchor="w")
        tk.Label(title_box, text="Apaga tu PC con tu voz.", bg="#f6f9fb", fg=MUTED, font=("Segoe UI", 11)).pack(anchor="w", pady=(4, 0))

        self.card = tk.Frame(self, bg="white", highlightbackground="#dbe7ed", highlightthickness=1)
        self.card.pack(fill="x", padx=34, pady=(4, 16))

        self.status_label = tk.Label(self.card, bg="white", fg="#061a2b", font=("Segoe UI", 17, "bold"))
        self.status_label.pack(anchor="w", padx=22, pady=(22, 4))

        self.detail_label = tk.Label(self.card, bg="white", fg=MUTED, font=("Segoe UI", 10), justify="left")
        self.detail_label.pack(anchor="w", padx=22, pady=(0, 16))

        self.pin_label = tk.Label(self.card, bg="white", fg="#061a2b", font=("Segoe UI", 38, "bold"))
        self.pin_label.pack(pady=(0, 18))

        self.regen_button = tk.Button(
            self.card,
            text="Generar nuevo PIN",
            bg=CYAN,
            fg="white",
            activebackground="#0f8dad",
            activeforeground="white",
            bd=0,
            relief="flat",
            cursor="hand2",
            font=("Segoe UI", 10, "bold"),
            command=self.state.regenerate_pin,
        )
        self.regen_button.pack(fill="x", padx=22, pady=(0, 22), ipady=10)

        self.shutdown_card = tk.Frame(self, bg="white", highlightbackground="#f0c6c8", highlightthickness=1)
        self.shutdown_card.pack(fill="x", padx=34, pady=(0, 16))

        self.count_title = tk.Label(self.shutdown_card, text="Apagado en progreso", bg="white", fg="#061a2b", font=("Segoe UI", 14, "bold"))
        self.count_title.pack(pady=(18, 0))

        self.count_label = tk.Label(self.shutdown_card, bg="white", fg=DANGER, font=("Segoe UI", 52, "bold"))
        self.count_label.pack(pady=(2, 0))

        self.cancel_button = tk.Button(
            self.shutdown_card,
            text="Cancelar apagado",
            bg=DANGER,
            fg="white",
            activebackground="#c93c40",
            activeforeground="white",
            bd=0,
            relief="flat",
            cursor="hand2",
            font=("Segoe UI", 10, "bold"),
            command=self.state.cancel_shutdown,
        )
        self.cancel_button.pack(fill="x", padx=22, pady=(4, 22), ipady=10)

        self.connection_card = tk.Frame(self, bg="white", highlightbackground="#dbe7ed", highlightthickness=1)
        self.connection_card.pack(fill="x", padx=34, pady=(0, 14))

        tk.Label(self.connection_card, text="Control movil", bg="white", fg="#061a2b", font=("Segoe UI", 11, "bold")).pack(anchor="w", padx=18, pady=(16, 2))
        self.info = tk.Label(self.connection_card, text=self.url, bg="white", fg=CYAN, font=("Segoe UI", 12, "bold"), wraplength=400)
        self.info.pack(anchor="w", padx=18, pady=(0, 10))

        self.mode_label = tk.Label(self.connection_card, bg="white", fg=MUTED, font=("Segoe UI", 9))
        self.mode_label.pack(anchor="w", padx=18, pady=(0, 16))

        self.history_card = tk.Frame(self, bg="#f6f9fb")
        self.history_card.pack(fill="x", padx=34, pady=(0, 10))
        self.history_label = tk.Label(self.history_card, text="", bg="#f6f9fb", fg=MUTED, font=("Segoe UI", 9), justify="left")
        self.history_label.pack(anchor="w")

    def refresh(self):
        with self.state.lock:
            paired = self.state.paired
            paired_name = self.state.paired_name
            pin = self.state.pin
            pending = self.state.shutdown_pending
            countdown = self.state.countdown
            history = list(self.state.history)
            real_shutdown = self.state.real_shutdown

        if paired:
            self.status_label.config(text="PC vinculada")
            self.detail_label.config(text=f"Dispositivo: {paired_name}\nEstado: lista para recibir comandos")
            self.pin_label.config(text="Conectada", fg="#18a86b", font=("Segoe UI", 22, "bold"))
            self.regen_button.config(text="Desvincular y generar nuevo PIN")
        else:
            self.status_label.config(text="Esperando vinculacion")
            self.detail_label.config(text="Ingresa este PIN en la app o pagina movil.")
            self.pin_label.config(text=pin, fg="#061a2b", font=("Segoe UI", 38, "bold"))
            self.regen_button.config(text="Generar nuevo PIN")

        if pending:
            self.shutdown_card.pack(fill="x", padx=24, pady=12)
            self.count_label.config(text=str(countdown))
        else:
            self.shutdown_card.pack_forget()

        mode = "REAL: esta demo apagara Windows" if real_shutdown else "SIMULACION: no apaga Windows todavia"
        self.mode_label.config(text=mode)
        if history:
            text = "Historial reciente\n" + "\n".join(f"{item['time']}  {item['action']}  {item['result']}" for item in history[:3])
        else:
            text = "Historial reciente\nSin acciones todavia"
        self.history_label.config(text=text)

    def on_close(self):
        if self.state.shutdown_pending:
            if not messagebox.askyesno(APP_NAME, "Hay una cuenta regresiva activa. Quieres cerrar y cancelarla?"):
                return
            self.state.cancel_shutdown()
        self.destroy()
        os._exit(0)


def start_server(state):
    VoltCueHandler.state = state
    server = http.server.ThreadingHTTPServer(("0.0.0.0", PORT), VoltCueHandler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


def main():
    parser = argparse.ArgumentParser(description="VoltCue Windows Demo")
    parser.add_argument("--real-shutdown", action="store_true", help="Ejecuta el apagado real de Windows despues de la cuenta regresiva.")
    args = parser.parse_args()

    state = VoltCueState(real_shutdown=args.real_shutdown)
    start_server(state)
    url = f"http://{get_local_ip()}:{PORT}"
    app = VoltCueUI(state, url)
    app.mainloop()


if __name__ == "__main__":
    main()
