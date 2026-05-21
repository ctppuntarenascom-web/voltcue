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
VOLTCUE_CLOUD_API_URL=https://voltcue-cloud-api.onrender.com
VOLTCUE_USER_TOKEN=demo-user-token
```

## Paquete Para Lambda

Genera el ZIP listo para subir:

```powershell
npm run package:lambda
```

Archivo generado:

```text
build/voltcue-alexa-lambda.zip
```

## Alexa Real

1. Crea una skill en Amazon Developer Console con nombre `VoltCue`.
2. Invocation name: `volt cue`.
3. Copia el modelo `models/en-US.json` para ingles.
4. Opcional: copia `models/es-US.json` para espanol de Estados Unidos.
5. Sube `build/voltcue-alexa-lambda.zip` a AWS Lambda o a una Alexa-hosted skill.
6. Variables:

```text
VOLTCUE_CLOUD_API_URL=https://voltcue-cloud-api.onrender.com
VOLTCUE_USER_TOKEN=demo-user-token
```
