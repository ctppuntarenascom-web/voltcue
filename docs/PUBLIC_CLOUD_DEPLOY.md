# Publicar VoltCue Cloud API

Para que Alexa real pueda hablar con VoltCue, la Cloud API necesita una URL publica HTTPS.

Ejemplo:

```text
https://voltcue-cloud-api.onrender.com
```

## Opcion Recomendada Para MVP: Render

1. Sube este proyecto a GitHub.
2. En Render, crea un nuevo `Blueprint`.
3. Selecciona el repositorio.
4. Render detectara `render.yaml`.
5. Crea el servicio `voltcue-cloud-api`.
6. Copia la URL publica HTTPS.

El archivo `render.yaml` ya esta configurado con:

```yaml
rootDir: cloud-api
buildCommand: npm install
startCommand: npm start
healthCheckPath: /health
```

Render generara automaticamente:

```text
VOLTCUE_DEMO_USER_TOKEN
```

Guarda ese token. Lo necesitaras en:

- Alexa Skill
- pruebas de API
- futuro login de usuario

## Opcion Alternativa: Railway

1. Sube este proyecto a GitHub.
2. Crea un proyecto en Railway.
3. Conecta el repositorio.
4. Railway usara `railway.json`.
5. Agrega variable:

```text
VOLTCUE_DEMO_USER_TOKEN=un-token-largo-y-secreto
```

6. Genera dominio publico HTTPS.

## Probar La URL Publica

Cuando tengas la URL:

```powershell
Invoke-RestMethod -Uri https://TU-URL/health
```

Debe responder:

```json
{
  "ok": true,
  "service": "VoltCue Cloud API"
}
```

## Conectar VoltCue Windows A La Nube Publica

1. Abre VoltCue.
2. Abre `Avanzado`.
3. En `Alexa demo`, escribe tu URL HTTPS.
4. Activa `Conectar a nube demo`.

Ejemplo:

```text
https://voltcue-cloud-api.onrender.com
```

## Conectar Alexa Skill A La Nube Publica

En la Lambda o entorno donde corra la skill:

```text
VOLTCUE_CLOUD_API_URL=https://TU-URL
VOLTCUE_USER_TOKEN=EL_TOKEN_DE_RENDER_O_RAILWAY
```

## Probar Comando Tipo Alexa

```powershell
Invoke-RestMethod -Method Post `
  -Uri https://TU-URL/api/alexa/command `
  -Headers @{Authorization='Bearer EL_TOKEN'} `
  -ContentType 'application/json' `
  -Body '{"action":"shutdown"}'
```

## Importante Para Producto Final

Esta nube demo todavia usa memoria. Para vender:

- Base de datos real
- Login real
- Tokens por usuario
- Enlace de cuenta con Alexa
- HTTPS obligatorio
- Politica de privacidad
