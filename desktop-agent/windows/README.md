# VoltCue Windows Agent

Este es el agente funcional actual de VoltCue.

## Ejecutar En Simulacion

```powershell
npm start
```

## Ejecutar Con Comandos Reales

```powershell
npm run start:real
```

## Generar App Portable Para Pruebas

```powershell
npm run pack
```

Esto crea una version empaquetada en:

```text
release/win-unpacked/VoltCue.exe
```

## Generar Instalador

```powershell
npm run dist
```

Esto crea instalador `.exe` y version portable dentro de `release/`.

Nota: para esta etapa de demo, la edicion/firma del ejecutable esta desactivada para evitar errores de permisos de Windows al crear enlaces simbolicos en herramientas de firma. Mas adelante, para distribuir profesionalmente, se debe configurar firma de codigo real.

## Acciones Soportadas

- Apagar PC
- Reiniciar PC
- Suspender PC
- Bloquear pantalla
- Cancelar accion con cuenta regresiva

## Mejoras Actuales

- Auto-inicio con Windows desde la pantalla de ajustes.
- Minimizar a la bandeja del sistema.
- Menu de bandeja para abrir VoltCue, abrir el control movil o salir.
- Nombre personalizado de la computadora.
- QR local para abrir el control movil desde el telefono.
- Token secreto por telefono vinculado.
- Lista de dispositivos vinculados con opcion de desvincular.
- Conexion a Cloud API demo para recibir comandos tipo Alexa.

## Modo Alexa Demo

1. Ejecuta la Cloud API:

```powershell
cd ..\..\cloud-api
npm start
```

2. Ejecuta VoltCue conectado automaticamente a la nube demo:

```powershell
cd ..\desktop-agent\windows
npm run start:cloud-demo
```

Tambien puedes hacerlo manualmente desde VoltCue:

1. Abre `Avanzado`.
2. En `Alexa demo`, activa `Conectar a nube demo`.
3. Usa:

```text
http://localhost:8799
```

4. Simula Alexa enviando un comando:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:8799/api/alexa/command -Headers @{Authorization='Bearer demo-user-token'} -ContentType 'application/json' -Body '{"action":"shutdown"}'
```

## Seguridad De Vinculacion

El PIN solo se usa para vincular por primera vez. Despues de vincular, VoltCue genera un token secreto para ese telefono.

Las acciones sensibles como apagar, reiniciar, suspender, bloquear o cancelar requieren ese token. Si se quita un telefono desde la lista de dispositivos vinculados, ese telefono deja de poder enviar comandos.

## Notas

La app abre un servidor local para que el telefono controle la PC desde la misma red Wi-Fi.

Si el puerto `8787` esta ocupado, usa automaticamente otro puerto cercano.

## Logo

El icono oficial usado por la app esta en:

```text
electron-ui/assets/voltcue-logo.png
```

El recurso de empaquetado esta en:

```text
build/icon.png
```
