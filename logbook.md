# 📓 Cuaderno de Pruebas y Notas - Proyecto CEIOT

Este archivo sirve como registro de configuración, pruebas de seguridad y notas.

---

## 🛠️ Arquitectura del Sistema
- **Dispositivos:** ESP32 (C nativo / ESP-IDF) y Notebook Ubuntu (Simulador Python en carpeta `tools/`). ESP32-cam 
- **API (Backend):** Node.js con Express (`index.js`).
- **Bases de Datos:** 
  - **MongoDB (Docker - Puerto 27018):** Almacenamiento histórico de mediciones (`measurements`).
  - **pg-mem (SQL en memoria):** Control de acceso y listado público de dispositivos (`devices`).
  
  - **Conecto todo a  AP Redmi note 7
  - **Para presentar a router

---
# Bitacora actualizada
###22/09/2026
//Luego de muchos errores logro compilar y flash a Esp32 (Monitoreo con monitor serial arduino entrada y salida de ES).
Timestamp.
Modifico index.js para generar timestamp. Aparece marca en pestaña "measurement" pero desaparece dispositivo del resto de pestañas.
Creo un nuevo Docker 23018 y en index le digo apunte ahí. 

###23/09/2026
Key.
//Ahora modifiqué codigo en ESP32 para que envíe key (compilo, flash, ok). EN "localhost:8080/measurement" aparece Timestamp y key

###24/09/2026
//Descargo Postman para probar.
Sensado temperatura CPU.
Con script python creo dispositivo y éste envía temperatura CPU.
Ahora en "measurement" puedo ver datos que envía ESP32 y datos que envía Script con temp. cpu.

En "localhost:8080/index.html" los dispositivos aparecen. Los renombro en index.js para que aparezcan con el nombre que quiero.

###25/09/2026
//Ahora resulta que cualquier dispositivo envía cualquier key y el sistema lo acepta. Necesito qu eso no ocurra, entonces voy a listado que se encuentra al final Index.js.
Ahí declaro que dispositivos y con qué key se pueden aceptar.
Pruebo con Postman y el sistema rechaza envío de dispositivo que no está en listado.

//Continúo pero resulta que desde Postman(o de .sh) se puede "agregar" manualmente o "en caliente" un dispositivo que no está en la lista.EN index hay líneas para "crear" un dispositivo que "no existe"
Tengo que modificar esto con algúna clave o password para q no ocurra. 


###28/09/2026
//El token desde Postman y desde archivo .sh  funcionó  recién ahora.
Creo ahora debo implementar método para no repetir o clonar un dispositivo (con los scrip de python simulador_pc.py y simulador2_pc.py con identicos valores, el sistema no se da cuenta que hay 2 dispositivos iguales) 

###29/09/2026
//Implemento en index para evitar dar de alta un dispositivo con los mismos datos de otro que ya está dado de alta. Pero, no puedo hacer que un dispositivo "clonado" no pueda enviar informacion al sistema ???????No me queda claro del todo.(Lo que no puedo repetir es el id, el nombre del dispositivo y/o la clave no interesa).

//Por otro lado, intento flash a ESP32-cam pero no tiene usb, entonces intento con conversor USB-ttl(CH340) pero no funciona.

###01/10/2026
//Faltaba puente fisico entre  GPIO0 y masa para hacer flash.
Ahora si cargó código a esp32-cam (mismo codigo de esp32)
Monitoreo con monitor serial e indica: 
"E (268940) dht: Initialization error, problem in phase 'C'
Could not read data from sensor"

Es lógico, falta conectar sensor dht a algun pin.
Ahora defino pin 14 como entrada datos DHT. Flash, ahora si mide.

###08/10/2026
//Modifiqué index para permitir borrado de dispositivos. Pruebo con Postman, ok (con uso de clavemaestra)

A partir de acá lo generó IA con ejemplo que le pedí.

## 🔒 Registro de Validaciones y Escudos de Seguridad

### 1. Validación Estricta de Sensores (`/measurement`)
- **Estado:** 🟢 Activo.
- **Funcionamiento:** Cada vez que el ESP32 o el Script de Python envían telemetría (`t` y `h`), el backend verifica que su `id` exista en la tabla SQL de `pg-mem` y que su `key` coincida. Si no coincide o es un ID intruso, devuelve `401 Unauthorized` o `403 Forbidden`.

### 2. Protección de Altas en Caliente (`/device`)
- **Estado:** 🟢 Activo con Token.
- **Token de Administrador:** `clavemaestra123`
//Esto todavía no está implementado- **Restricción de Duplicados:** Se añadió `PRIMARY KEY` al campo `device_id` en SQL para evitar que se repitan los equipos. Si se intenta duplicar, la API responde `409 Conflict`.

---

## 📝 Bitácora de Pruebas y Errores Solucionados

### [26/09/2026] - Implementación de Token y Scripts en Tools
- **Prueba realizada:** Registro en caliente usando `wget` desde la carpeta `/tools`.
- **Error encontrado:** Al ejecutar `./registro_con_token.sh`, la terminal devolvió `401 Unauthorized` a pesar de tener las claves idénticas.
- **Causa:** Las barras invertidas (`\`) para romper líneas en el script Bash introducían espacios invisibles que rompían la cabecera HTTP del token.
- **Solución:** Se unificó el comando `wget` en una sola línea continua dentro del archivo `.sh`.

### [Anterior] - Corrección de caída del servidor
- **Error encontrado:** El servidor se apagaba por completo al recibir un dispositivo no autorizado.
- **Causa:** Uso de la función inexistente `print()` dentro del bloque `catch` en JavaScript.
- **Solución:** Se reemplazó por `console.log()`.

---

## 🚀 Comandos Útiles de Consulta Rápida

### Ejecutar el Servidor Principal (API)
```bash
cd /home/esteban/ceiot_base/api/
node index.js
```

### Simular Notebook (Python)
```bash
cd /home/esteban/ceiot_base/tools/
python3 simulador_pc.py
```

### Registrar nuevo dispositivo en caliente (Consola)
```bash
cd /home/esteban/ceiot_base/tools/
./registro_con_token.sh [ID] "[NOMBRE]" [KEY]
# Ejemplo: ./registro_con_token.sh 08 "Sensor Cocina" 5555
```
