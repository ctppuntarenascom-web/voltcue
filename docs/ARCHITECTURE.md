# Arquitectura Multiplataforma De VoltCue

VoltCue tendra cuatro piezas principales:

1. App movil Android
2. Agente de escritorio por sistema operativo
3. API en la nube
4. Alexa Skill

## Idea Central

La app movil y Alexa no ejecutan comandos directamente. En su lugar, envian una orden estandar:

```json
{
  "deviceId": "desktop-casa",
  "action": "shutdown"
}
```

El agente instalado en cada computadora traduce esa orden al comando correcto del sistema operativo.

## Acciones Estandar

- `shutdown`: apagar
- `restart`: reiniciar
- `sleep`: suspender
- `lock`: bloquear pantalla
- `cancel`: cancelar cuenta regresiva

## Seguridad De Dispositivos

La vinculacion usa dos pasos:

1. PIN temporal mostrado por el agente de escritorio.
2. Token secreto permanente guardado en el telefono despues de vincular.

El PIN no debe usarse como autenticacion diaria. Solo sirve para crear el token.

Las acciones sensibles deben validar el token del dispositivo:

- apagar
- reiniciar
- suspender
- bloquear
- cancelar cuenta regresiva

El agente debe permitir revocar telefonos vinculados.

## Soporte Por Sistema

| Sistema | Apagar | Reiniciar | Suspender | Bloquear | Nota |
| --- | --- | --- | --- | --- | --- |
| Windows | Si | Si | Si | Si | Soporte completo |
| macOS | Si | Si | Si | Si | Requiere permisos |
| Linux | Si | Si | Si | Si | Depende de systemd/permisos |
| ChromeOS | Limitado | Limitado | Limitado | Limitado | Mas viable como controlador, no como agente completo |

## Camino Recomendado

1. Completar Windows.
2. Crear API en la nube.
3. Crear Alexa Skill.
4. Crear app Android.
5. Crear agente macOS.
6. Crear agente Linux.
7. Definir ChromeOS como controlador y estudiar limitaciones.

## Flujo Alexa

```text
Alexa Skill
  -> Cloud API
  -> Cola de comandos
  -> Agente VoltCue en la PC
  -> Windows ejecuta o simula accion
```

La Cloud API demo actual ya tiene endpoints para:

- registrar agente
- listar dispositivos
- encolar comandos tipo Alexa
- entregar comandos al agente
- marcar comandos como completados
