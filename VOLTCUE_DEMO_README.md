# VoltCue Demo 1

Esta demo prueba la idea base del producto:

Una computadora Windows muestra un PIN y un telefono conectado a la misma red Wi-Fi puede enviar la orden de apagado.

## Archivos

- `desktop-agent/windows/electron-main.js`: programa Windows moderno de VoltCue.
- `desktop-agent/windows/electron-ui/`: interfaz visual de escritorio.
- `desktop-agent/windows/prototype-python/voltcue_agent.py`: primera version prototipo en Python.
- `VOLTCUE_WIREFRAMES.html`: wireframes visuales del producto.
- `VOLTCUE_MVP.md`: documento inicial del producto.

## Requisitos Para La Version Moderna

- Windows
- Node.js instalado
- Telefono y PC conectados a la misma red Wi-Fi

## Instalar Dependencias

Solo se hace una vez:

```powershell
npm install
```

## Como Ejecutar En Modo Seguro

Este modo simula el apagado. Sirve para probar sin apagar la computadora.

Abre PowerShell en esta carpeta y ejecuta:

```powershell
cd .\desktop-agent\windows
npm start
```

Se abrira una ventana de VoltCue para Windows.

La ventana mostrara:

- PIN de vinculacion
- Direccion para abrir desde el celular
- Estado de conexion
- Historial

## Como Probar Desde El Telefono

1. Asegurate de que la PC y el telefono esten en la misma red Wi-Fi.
2. Ejecuta `python .\voltcue_agent.py`.
3. En la ventana de VoltCue, copia la direccion que aparece como `Control movil`.
4. Abre esa direccion en el navegador del telefono.
5. Escribe el PIN que aparece en la ventana Windows.
6. Toca `Vincular PC`.
7. Toca `Apagar PC`.
8. La ventana Windows mostrara una cuenta regresiva.
9. Puedes tocar `Cancelar apagado`.

En modo seguro, no se apaga Windows; solo se registra como simulado.

## Como Ejecutar Apagado Real

Usa esto solo cuando ya hayas probado el modo seguro.

```powershell
cd .\desktop-agent\windows
npm run start:real
```

En este modo, al terminar la cuenta regresiva, Windows ejecutara el apagado real.

## Version Prototipo Anterior

La primera version en Python sigue disponible por si se necesita comparar:

```powershell
python .\desktop-agent\windows\prototype-python\voltcue_agent.py
```

## Seguridad De La Demo

Esta demo tiene seguridad basica:

- PIN temporal para vincular el telefono.
- Confirmacion antes de enviar apagado.
- Cuenta regresiva en Windows.
- Boton para cancelar.
- Modo seguro por defecto.

## Limitaciones

Esta es una demo local. Todavia no incluye:

- App Android nativa
- Alexa Skill
- Servidor en la nube
- Login de usuario
- Google Play Billing
- Control fuera de casa

## Siguiente Paso

Cuando esta demo funcione, el siguiente paso es convertir el controlador movil en una app Android real y luego agregar la nube para poder conectar Alexa.
