/ Registrar dispositivo manualmente por API
//Desde Postman???? Necesito una manera de colocarle password o key a ésto

# Verificamos que pases los 3 datos en la consola
if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]; then
    echo "❌ Error: Faltan parámetros."
    echo "Uso correcto: ./registrar.sh [ID] \"[NOMBRE]\" [KEY]"
    exit 1
fi

# 🚀 COMANDO WGET CORRECTO (Formato de consola puro)
wget -O - --method=POST \
  --body-data="id=$1&n=$2&k=$3" \
  http://localhost:8080/device

echo ""

