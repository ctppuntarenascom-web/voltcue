# VoltCue

VoltCue es una app para controlar acciones de energia de una computadora desde el telefono y, mas adelante, por voz con Alexa.

Eslogan:

Apaga tu PC con tu voz.

## Estado Actual

La demo funcional actual esta en:

`desktop-agent/windows`

Incluye:

- App de escritorio moderna con Electron.
- PIN de vinculacion.
- QR de vinculacion local.
- Control movil por navegador en la misma red Wi-Fi.
- Acciones de apagar, reiniciar, suspender y bloquear.
- Nombre personalizado de PC.
- Auto-inicio y bandeja del sistema.
- Modo simulacion por defecto.
- Modo real opcional.

## Estructura

```text
desktop-agent/
  windows/      Agente funcional actual
  macos/        Plan del agente para Mac
  linux/        Plan del agente para Linux
  chromeos/     Limitaciones y plan para Chromebook
mobile-app/     Futura app Android para Google Play
cloud-api/      Futura API para control remoto y Alexa
alexa-skill/    Futura skill de Alexa
brand/          Logo y recursos de marca
docs/           Arquitectura y notas del producto
```

## Ejecutar Demo Windows

```powershell
cd .\desktop-agent\windows
npm start
```

Modo real:

```powershell
npm run start:real
```

Usar modo real solo despues de probar en simulacion.

## Empaquetar Windows

```powershell
cd .\desktop-agent\windows
npm run pack
```

Para generar instalador:

```powershell
npm run dist
```

## Ejecutar Nube Demo Para Alexa

```powershell
cd .\cloud-api
npm start
```

Despues, en VoltCue para Windows:

1. Abre `Avanzado`.
2. Activa `Conectar a nube demo`.
3. Usa `http://localhost:8799` como URL.

Tambien puedes iniciar el agente ya conectado:

```powershell
cd .\desktop-agent\windows
npm run start:cloud-demo
```

Para simular un comando de Alexa:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:8799/api/alexa/command -Headers @{Authorization='Bearer demo-user-token'} -ContentType 'application/json' -Body '{"action":"shutdown"}'
```

## Probar Alexa Skill Demo

```powershell
cd .\alexa-skill
npm install
npm test
```

O prueba una accion especifica:

```powershell
node .\lambda\local-test.js restart
```

## Publicar Nube HTTPS

Guia:

[docs/PUBLIC_CLOUD_DEPLOY.md](docs/PUBLIC_CLOUD_DEPLOY.md)
