# VoltCue Cloud API

Demo local de la nube de VoltCue. Esta API prepara el camino para Alexa:

```text
Alexa -> Cloud API -> Agente VoltCue en la PC
```

## Ejecutar

```powershell
cd .\cloud-api
npm start
```

La API corre por defecto en:

```text
http://localhost:8799
```

## Token Demo

Para pruebas locales:

```text
demo-user-token
```

En hosting publico usa variable:

```text
VOLTCUE_DEMO_USER_TOKEN=un-token-largo-y-secreto
```

Ver ejemplo:

```text
.env.example
```

## Endpoints Principales

### Estado

```http
GET /health
```

### Login demo

```http
POST /api/auth/demo
```

### Registrar agente de escritorio

```http
POST /api/agents/register
Authorization: Bearer demo-user-token
Content-Type: application/json

{
  "name": "PC Gamer",
  "platform": "windows"
}
```

### Listar PCs del usuario

```http
GET /api/devices
Authorization: Bearer demo-user-token
```

### Enviar comando tipo Alexa

```http
POST /api/alexa/command
Authorization: Bearer demo-user-token
Content-Type: application/json

{
  "action": "shutdown"
}
```

Acciones soportadas:

- `shutdown`
- `restart`
- `sleep`
- `lock`

### Ver comandos

```http
GET /api/commands
Authorization: Bearer demo-user-token
```

## Nota

Esta es una demo en memoria. Si reinicias el servidor, se borran dispositivos y comandos. Mas adelante se reemplaza por base de datos real.
