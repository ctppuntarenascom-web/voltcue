# VoltCue Alexa Skill

Primera estructura de Alexa Skill para VoltCue.

## Que Hace

La skill convierte frases de Alexa en comandos para la Cloud API:

```text
Alexa -> Skill Handler -> VoltCue Cloud API -> PC Agent
```

## Frases Soportadas

Invocation name:

```text
volt cue
```

Ejemplos:

- Alexa, open Volt Cue.
- Alexa, ask Volt Cue to turn off my PC.
- Alexa, ask Volt Cue to restart my PC.
- Alexa, ask Volt Cue to put my computer to sleep.
- Alexa, ask Volt Cue to lock my desktop.

## Archivos

```text
models/en-US.json       Modelo de interaccion Alexa
lambda/index.js         Handler principal
lambda/local-test.js    Prueba local contra Cloud API
```

## Probar Localmente

Primero ejecuta la Cloud API:

```powershell
cd ..\cloud-api
npm start
```

Luego, en otra terminal:

```powershell
cd ..\alexa-skill
npm install
npm test
```

Puedes probar acciones:

```powershell
node .\lambda\local-test.js shutdown
node .\lambda\local-test.js restart
node .\lambda\local-test.js sleep
node .\lambda\local-test.js lock
```

## Variables De Entorno

```text
VOLTCUE_CLOUD_API_URL=http://localhost:8799
VOLTCUE_USER_TOKEN=demo-user-token
```

## Siguiente Paso

Para usarlo en Alexa real:

1. Crear una skill en Amazon Developer Console.
2. Copiar `models/en-US.json` al Interaction Model.
3. Subir `lambda/index.js` como AWS Lambda o endpoint compatible HTTPS.
4. Cambiar la Cloud API local por una URL publica HTTPS.
5. Agregar account linking real para usuarios.
