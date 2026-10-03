import time
import requests
import psutil

# Configuración de tu API (Apuntando a tu index.js en localhost)
URL_API = "http://localhost:8080/measurement"

# Simulamos los datos del dispositivo
DEVICE_ID = "09"
DEVICE_KEY = "9999"

def obtener_temperatura_cpu():
    try:
        # Lee los sensores térmicos de la placa base
        sensores = psutil.sensors_temperatures()
        
        # En Ubuntu/Linux, el sensor principal suele llamarse 'coretemp' o 'cpu_thermal'
        if 'coretemp' in sensores:
            return sensores['coretemp'][0].current
        elif 'cpu_thermal' in sensores:
            return sensores['cpu_thermal'][0].current
        elif sensores:
            # Si tiene otro nombre, toma el primer sensor disponible
            primer_sensor = list(sensores.keys())[0]
            return sensores[primer_sensor][0].current
    except Exception as e:
        print(f"No se pudo leer el sensor real, usando simulación: {e}")
    
    return 45.0 # Valor de respaldo por si el hardware bloquea la lectura

def obtener_humedad_simulada():
    # Como la CPU no mide humedad, simulamos el uso de la memoria RAM como porcentaje
    return psutil.virtual_memory().percent

print("🚀 Simulador de ESP32 de Notebook Iniciado...")
print("Presiona Ctrl + C para detener de forma segura.\n")

while True:
    # 1. Capturamos los datos reales del sistema
    temperatura_cpu = obtener_temperatura_cpu()
    humedad_ram = obtener_humedad_simulada()

    # 2. Armamos el paquete EXACTO en formato URL-Encoded
    datos_post = {
        "id": DEVICE_ID,
        "key": DEVICE_KEY,
        "t": round(temperatura_cpu, 1),
        "h": round(humedad_ram, 1)
    }

    try:
        # 3. Enviamos el POST simulando al ESP32
        respuesta = requests.post(URL_API, data=datos_post)
        
        print(f"📦 Enviado -> CPU Temp: {datos_post['t']}°C | RAM Uso: {datos_post['h']}%")
        print(f"🖥️  Servidor respondió: {respuesta.text}\n")
        
    except Exception as err:
        print(f"❌ Error al conectar con el servidor: {err}")

    # Esperamos 5 segundos antes del próximo envío (igual que tu bucle de C)
    time.sleep(5)
