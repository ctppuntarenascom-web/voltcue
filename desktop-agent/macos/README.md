# VoltCue macOS Agent

Objetivo: crear una version del agente para computadoras Apple con macOS.

## Viabilidad

Si se puede, pero algunas acciones requieren permisos del sistema.

## Comandos Probables

- Apagar: `osascript -e 'tell app "System Events" to shut down'`
- Reiniciar: `osascript -e 'tell app "System Events" to restart'`
- Suspender: `pmset sleepnow`
- Bloquear: usar Keychain/System Events o APIs nativas

## Riesgos

- macOS puede pedir permisos de accesibilidad o automatizacion.
- La app debe estar firmada para distribuirse profesionalmente.
- Para vender fuera de la Mac App Store, puede necesitar notarizacion de Apple.

## Estado

Pendiente.
