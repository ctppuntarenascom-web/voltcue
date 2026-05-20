# VoltCue Linux Agent

Objetivo: crear una version del agente para Linux.

## Viabilidad

Si se puede, pero depende de la distribucion, systemd y permisos del usuario.

## Comandos Probables

- Apagar: `systemctl poweroff`
- Reiniciar: `systemctl reboot`
- Suspender: `systemctl suspend`
- Bloquear: depende del escritorio, por ejemplo `loginctl lock-session`

## Riesgos

- Algunas distros pediran permisos.
- El bloqueo de pantalla cambia entre GNOME, KDE, XFCE y otros escritorios.
- Hay que probar en Ubuntu primero.

## Estado

Pendiente.
