# VoltCue MVP

## Identidad

Nombre: VoltCue

Eslogan en espanol: Apaga tu PC con tu voz.

Eslogan en ingles: Shut down your PC with your voice.

Logo base: monitor con simbolo de apagado y arco de senal.

Color principal: azul/cian tipo asistente de voz.

## Objetivo De La Primera Demo

Crear una primera version funcional donde una app Android pueda enviar una orden a un programa instalado en Windows para apagar la computadora.

En esta primera demo no se incluye Alexa todavia. Primero se prueba que el telefono puede controlar la PC de forma segura en la misma red Wi-Fi.

## Producto Inicial

VoltCue tendra dos piezas principales:

1. App Android
2. Programa Windows

Mas adelante se agregaran:

1. Servidor en la nube
2. Alexa Skill
3. Version demo y Pro
4. Publicacion en Google Play

## App Android - Pantallas

### 1. Bienvenida

Objetivo: presentar la app y llevar al usuario a vincular su primera PC.

Elementos:

- Logo de VoltCue
- Texto: Apaga tu PC con tu voz.
- Boton principal: Agregar PC
- Boton secundario: Como funciona

### 2. Agregar PC

Objetivo: conectar el telefono con el programa de Windows.

Elementos:

- Campo para escribir codigo PIN
- Boton: Vincular PC
- Texto breve: Abre VoltCue en tu computadora e ingresa el codigo que aparece.

Flujo:

1. El programa Windows muestra un PIN.
2. El usuario escribe el PIN en Android.
3. La app guarda la PC vinculada.

### 3. Lista De PCs

Objetivo: mostrar las computadoras vinculadas.

Elementos:

- Nombre de la PC
- Estado: Conectada o Desconectada
- Acceso a controles
- Boton para agregar otra PC

Demo gratis:

- Solo permite 1 PC.

### 4. Control De PC

Objetivo: permitir acciones principales sobre la computadora.

Elementos:

- Nombre de la PC
- Estado de conexion
- Boton principal: Apagar PC
- Boton secundario: Cancelar apagado
- Futuro: Reiniciar, Suspender, Bloquear

Confirmacion:

- Antes de apagar, mostrar mensaje: Seguro que quieres apagar esta PC?
- Botones: Cancelar / Apagar

### 5. Historial Basico

Objetivo: mostrar acciones recientes.

Elementos:

- Fecha y hora
- Accion enviada
- Resultado: Exitoso, cancelado o fallido

## Programa Windows - Ventanas

### 1. Ventana Principal

Objetivo: mostrar que VoltCue esta activo en la computadora.

Elementos:

- Logo de VoltCue
- Nombre de la PC
- Estado: Esperando conexion
- Codigo PIN para vincular
- Boton: Generar nuevo PIN

### 2. Estado Vinculado

Objetivo: confirmar que la PC ya esta conectada con la app.

Elementos:

- Nombre de la PC
- Estado: Vinculada
- Nombre del dispositivo Android
- Boton: Desvincular

### 3. Cuenta Regresiva De Apagado

Objetivo: evitar apagados accidentales.

Elementos:

- Mensaje: Tu PC se apagara en 10 segundos.
- Cuenta regresiva grande
- Boton: Cancelar apagado

Comportamiento:

- Si el usuario no cancela, Windows ejecuta el apagado.
- Si cancela, se detiene la orden y se registra en historial.

## Flujo De La Demo 1

1. El usuario instala VoltCue en Windows.
2. El programa Windows muestra un PIN.
3. El usuario abre la app Android.
4. Toca Agregar PC.
5. Escribe el PIN.
6. La app muestra la PC como Conectada.
7. El usuario toca Apagar PC.
8. La app pide confirmacion.
9. Windows muestra cuenta regresiva.
10. Si no se cancela, la PC se apaga.

## Seguridad Minima Para La Demo

- Vinculacion por PIN temporal.
- Solo aceptar comandos de dispositivos vinculados.
- Confirmacion antes de apagar.
- Cuenta regresiva en Windows.
- Boton de cancelar apagado.

## Funciones Que No Van En La Demo 1

- Alexa
- Pagos
- Google Play Billing
- Servidor en la nube
- Control fuera de la red Wi-Fi
- Multiples PCs
- Wake-on-LAN

Estas funciones se agregan despues de validar que la demo local funciona.

## Siguiente Fase

Crear wireframes simples de:

1. App Android
2. Programa Windows

Despues de aprobar los wireframes, comenzar la programacion de la demo.
