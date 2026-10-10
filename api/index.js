const express = require("express");
const bodyParser = require("body-parser");
const { MongoClient } = require("mongodb");
const PgMem = require("pg-mem");

const db = PgMem.newDb();
const render = require("./render.js");

// Configuración y acceso a la base de datos de MongoDB
let database = null;
const collectionName = "measurements";

async function startDatabase() {
    const uri = "mongodb://localhost:27018/?maxPoolSize=20&w=majority";	
    const connection = await MongoClient.connect(uri);
    database = connection.db();
}

async function getDatabase() {
    if (!database) await startDatabase();
    return database;
}

async function insertMeasurement(message) {
    const { insertedId } = await database.collection(collectionName).insertOne(message);
    return insertedId;
}

async function getMeasurements() {
    return await database.collection(collectionName).find({}).toArray();	
}

// Servidor API
const app = express();

// 💡 CORRECCIÓN: Habilitamos TODOS los formatos de entrada posibles simultáneamente
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static('spa/static'));

const PORT = 8080;

// Ruta para recibir mediciones del ESP32 y Python (CORREGIDA)
// Ahora modifico
// Ruta para recibir mediciones con VALIDACIÓN ESTRICTA DE SEGURIDAD
app.post('/measurement', async function (req, res) {
    const fechaActual = new Date();
    const timestampLog = fechaActual.toLocaleString('es-AR', { timeZone: 'America/Buenos_Aires' });

    const devId = req.body.id;
    const devKey = req.body.key || req.body.k; 
    const temp = req.body.t;
    const hum = req.body.h;

    if (!devId) {
        return res.status(400).send("Falta el ID del dispositivo");
    }

    console.log("[" + timestampLog + "] Intento de envío -> ID: " + devId + " | Key recibida: " + devKey);	
    
    // ==========================================
    // 🛡️ ESCUDO DE SEGURIDAD ESTRICTO
    // ==========================================
    try {
        // Buscamos si el dispositivo existe en la base de datos de control SQL
        const registros = db.public.many("SELECT * FROM devices WHERE device_id = '" + devId + "'");
        
        // Si el código llega acá, el dispositivo EXISTE. Ahora validamos su clave:
        if (registros[0].key !== devKey) {
            console.log("❌ ERROR: Clave INCORRECTA para el dispositivo habilitado: " + devId);
            return res.status(401).send("No autorizado: Clave incorrecta");
        }
        
    } catch (err) {
        // Si entra al catch, es porque el SELECT dio 0 filas. El ID NO ESTÁ REGISTRADO.
        console.log("❌ RECHAZADO: El dispositivo ID '" + devId + "' no está autorizado en el sistema.");
        return res.status(403).send("Prohibido: Dispositivo no registrado en el sistema");
    }
    // ==========================================

    // Si pasó con éxito el escudo estricto, se almacena en tu MongoDB limpio (27018)
    try {
        const insertedId = await insertMeasurement({
            id: devId, 
            key: devKey,
            t: temp, 
            h: hum,
            time: fechaActual.toISOString()
        });

        res.send("received measurement into " + insertedId);
    } catch (error) {
        console.error("Error al procesar medición:", error);
        res.status(500).send("Error interno");
    }
});

// Registrar dispositivo manualmente por API
//Desde Postman???? Necesito una manera de colocarle password o key a ésto

// Registrar dispositivo manualmente por API (PROTEGIDA CON TOKEN)
/*app.post('/device', function (req, res) {

    // Capturamos el token que viene desde las cabeceras (Headers) de la petición
    const tokenRecibido = req.headers['x-admin-token'];   
        // 🔑 Definimos tu llave maestra secreta
    const ADMIN_TOKEN_SECRETO = "clavemaestra123";


    // 🛡️ Validación estricta del administrador
    if (!tokenRecibido || tokenRecibido !== ADMIN_TOKEN_SECRETO) {
        console.log("⚠️ ALERTA: Intento de registro de dispositivo RECHAZADO por Token inválido o ausente.");
        return res.status(401).send("No autorizado: Se requiere el Token de Administrador.");
    }

    // Si el token coincide, se realiza la inserción en la BD SQL en memoria
	console.log("🔒 [ADMIN] Registrando -> ID: " + req.body.id + " | Name: " + req.body.n + " | Key: " + req.body.k );
    db.public.none("INSERT INTO devices VALUES ('"+req.body.id+ "', '"+req.body.n+"', '"+req.body.k+"')");
	res.send("received new device");
});
*/
// Registrar dispositivo manualmente por API (CON DIAGNÓSTICO)
// Registrar dispositivo manualmente por API (PROTEGIDA CON TOKEN - LIMPIA)
/*app.post('/device', function (req, res) {
    const ADMIN_TOKEN_SECRETO = "clavemaestra123";

    // Capturamos el token que viene desde las cabeceras de la petición
    const tokenRecibido = req.headers['x-admin-token'];

    // 🛡️ Validación estricta del administrador
    if (!tokenRecibido || tokenRecibido !== ADMIN_TOKEN_SECRETO) {
        console.log("⚠️ ALERTA: Intento de registro de dispositivo RECHAZADO por Token inválido o ausente.");
        return res.status(401).send("No autorizado: Se requiere el Token de Administrador.");
    }

    // Si el token coincide, se realiza la inserción en la BD SQL en memoria
	console.log("🔒 [ADMIN] Registrando -> ID: " + req.body.id + " | Name: " + req.body.n + " | Key: " + req.body.k );
    db.public.none("INSERT INTO devices VALUES ('"+req.body.id+ "', '"+req.body.n+"', '"+req.body.k+"')");
	res.send("received new device");
});
*/

// Registrar dispositivo de forma segura (EVITA DUPLICADOS Y PROTEGE CON TOKEN)
app.post('/device', function (req, res) {
    const ADMIN_TOKEN_SECRETO = "clavemaestra123";
    const tokenRecibido = req.headers['x-admin-token'];

    // 1. Validación de seguridad del Administrador
    if (!tokenRecibido || tokenRecibido !== ADMIN_TOKEN_SECRETO) {
        console.log("⚠️ ALERTA: Intento de registro RECHAZADO por Token inválido o ausente.");
        return res.status(401).send("No autorizado: Se requiere el Token de Administrador.");
    }

    const devId = req.body.id;
    const devName = req.body.n;
    const devKey = req.body.k;

    if (!devId) {
        return res.status(400).send("Falta el ID del dispositivo.");
    }

    // 2. Controlar que no se duplique el ID en la tabla SQL
    try {
        const existe = db.public.manyOrNone("SELECT * FROM devices WHERE device_id = '" + devId + "'");
        if (existe && existe.length > 0) {
            console.log("⚠️ ALERTA: Intento de registrar ID duplicado bloqueado: " + devId);
            return res.status(409).send("Error: El dispositivo con ID '" + devId + "' ya se encuentra registrado.");
        }
    } catch (err) {
        // Si pg-mem da error en el SELECT por estar vacío el registro, continuamos sin problemas
    }

    // 3. Si no está duplicado, se realiza la inserción limpia
	console.log("🔒 [ADMIN] Registrando -> ID: " + devId + " | Name: " + devName + " | Key: " + devKey);
    db.public.none("INSERT INTO devices VALUES ('" + devId + "', '" + devName + "', '" + devKey + "')");
	res.send("received new device");
});

// ==========================================================
// 🗑️ RUTA DE ADMINISTRACIÓN: ELIMINAR DISPOSITIVO (CON TOKEN)
// ==========================================================
// ==========================================================
// 🗑️ RUTA DE ELIMINACIÓN DE DISPOSITIVO (CORREGIDA AL 100%)
// ==========================================================
app.delete('/device/:id', function (req, res) {
    const ADMIN_TOKEN_SECRETO = "clavemaestra123";
    const tokenRecibido = req.headers['x-admin-token'];

    // 1. Validación de seguridad del Administrador
    if (!tokenRecibido || tokenRecibido !== ADMIN_TOKEN_SECRETO) {
        console.log("⚠️ ALERTA: Intento de ELIMINACIÓN RECHAZADO por Token inválido o ausente.");
        return res.status(401).send("No autorizado: Se requiere el Token de Administrador.");
    }

    const devId = req.params.id;

    if (!devId) {
        return res.status(400).send("Falta especificar el ID del dispositivo a eliminar.");
    }

    // 2. CORRECCIÓN: Usamos un bloque try/catch con tu función .many() nativa para verificar existencia
    let existe = false;
    try {
        const resultado = db.public.many("SELECT * FROM devices WHERE device_id = '" + devId + "'");
        if (resultado && resultado.length > 0) {
            existe = true;
        }
    } catch (err) {
        // Si da error es porque SELECT devolvió 0 filas (comportamiento estándar de pg-mem con .many)
        existe = false;
    }

    // 3. Si el dispositivo no se encontró, devolvemos el error 404 seguro
    if (!existe) {
        console.log("⚠️ ALERTA: Intento de eliminar un ID inexistente: " + devId);
        return res.status(404).send("Error: El dispositivo con ID '" + devId + "' no existe en el sistema.");
    }

    // 4. Si existe, procedemos a borrarlo usando .none() como en el resto de tu código
    try {
        db.public.none("DELETE FROM devices WHERE device_id = '" + devId + "'");
        console.log("🗑️ [ADMIN] Dispositivo ELIMINADO del sistema -> ID: " + devId);
        
        res.send("Dispositivo " + devId + " eliminado con éxito del control de acceso.");
    } catch (error) {
        console.error("Error crítico al ejecutar el DELETE en SQL:", error);
        res.status(500).send("Error interno al procesar la baja.");
    }
});


/*app.post('/device', function (req, res) {
    const ADMIN_TOKEN_SECRETO = "clavemaestra123";

    // 🚀 IMPRESIÓN DE DIAGNÓSTICO: Esto nos va a decir la verdad en la terminal
    console.log("=== CABECERAS RECIBIDAS EN EL SERVIDOR ===");
    console.log(req.headers);
    console.log("==========================================");

    const tokenRecibido = req.headers['x-admin-token'];

    if (!tokenRecibido || tokenRecibido !== ADMIN_TOKEN_SECRETO) {
        console.log("⚠️ ALERTA: Intento de registro RECHAZADO. Recibido: [" + tokenRecibido + "]");
        return res.status(401).send("No autorizado: Se requiere el Token de Administrador.");
    }

    console.log("🔒 [ADMIN] Registrando -> ID: " + req.body.id + " | Name: " + req.body.n + " | Key: " + req.body.k );
    db.public.none("INSERT INTO devices VALUES ('"+req.body.id+ "', '"+req.body.n+"', '"+req.body.k+"')");
	res.send("received new device");
});
*/



// Listar dispositivos en HTML (Regresa a tu sintaxis original exacta)
app.get('/web/device', function (req, res) {
	var devices = db.public.many("SELECT * FROM devices").map( function(device) {
		console.log(device);
		return '<tr><td><a href=/web/device/'+ device.device_id +'>' + device.device_id + "</a>" +
			       "</td><td>"+ device.name+"</td><td>"+ device.key+"</td></tr>";
	   }
	);
	res.send("<html>"+
		     "<head><title>Sensores</title></head>" +
		     "<body>" +
		        "<table border=\"1\">" +
		           "<tr><th>id</th><th>name</th><th>key</th></tr>" +
		           devices +
		        "</table>" +
		     "</body>" +
		"</html>");
});

// Ver detalle de un dispositivo específico (Restaurado el arreglo device[0])
app.get('/web/device/:id', function (req,res) {
    var template = "<html>"+
                     "<head><title>Sensor {{name}}</title></head>" +
                     "<body>" +
		        "<h1>{{ name }}</h1>"+
		        "id  : {{ id }}<br/>" +
		        "Key : {{ key }}" +
                     "</body>" +
                "</html>";

    var device = db.public.many("SELECT * FROM devices WHERE device_id = '"+req.params.id+"'");
    console.log(device);
    res.send(render(template,{id:device[0].device_id, key: device[0].key, name:device[0].name}));
});	

app.get('/term/device/:id', function (req, res) {
    var red = "\33[31m";
    var green = "\33[32m";
    var blue = "\33[33m";
    var reset = "\33[0m";
    var template = "Device name " + red   + "   {{name}}" + reset + "\n" +
		   "       id   " + green + "       {{ id }} " + reset +"\n" +
	           "       key  " + blue  + "  {{ key }}" + reset +"\n";
    var device = db.public.many("SELECT * FROM devices WHERE device_id = '"+req.params.id+"'");
    console.log(device);
    res.send(render(template,{id:device[0].device_id, key: device[0].key, name:device[0].name}));
});

// API que devuelve los datos puros de MongoDB en JSON
app.get('/measurement', async (req,res) => {
    res.send(await getMeasurements());
});

// API que devuelve los dispositivos registrados en JSON
app.get('/device', function(req,res) {
    res.send( db.public.many("SELECT * FROM devices") );
});

// Inicialización del sistema
startDatabase().then(async() => {

    const addAdminEndpoint = require("./admin.js");
    addAdminEndpoint(app, render);

    // Datos iniciales de prueba para MongoDB
    await insertMeasurement({id:'00', t:'18', h:'78'});
    await insertMeasurement({id:'00', t:'19', h:'77'});
    await insertMeasurement({id:'00', t:'17', h:'77'});
    await insertMeasurement({id:'01', t:'17', h:'77'});
    console.log("mongo measurement database Up");

    // Creación de tablas y datos iniciales en la BD SQL simulada
    //db.public.none("CREATE TABLE devices (device_id VARCHAR, name VARCHAR, key VARCHAR)");

    // 🚀 REEMPLÁZALA POR ESTA (Añadimos PRIMARY KEY al ID):
    db.public.none("CREATE TABLE devices (device_id VARCHAR PRIMARY KEY, name VARCHAR, key VARCHAR)");
    
    db.public.none("INSERT INTO devices VALUES ('00', 'Fake Device 00', '123456')");
    db.public.none("INSERT INTO devices VALUES ('01', 'Fake Device 01', '234567')");
    db.public.none("CREATE TABLE users (user_id VARCHAR, name VARCHAR, key VARCHAR)");
    db.public.none("INSERT INTO users VALUES ('1','Ana','admin123')");
    db.public.none("INSERT INTO users VALUES ('2','Beto','user123')");
    
    //Aca agrego dispositivos que voy a permitir
    db.public.none("INSERT INTO devices VALUES ('07', 'Sensor_Oficina (ESP32)', '8888')");
    //db.public.none("INSERT INTO devices VALUES ('09', '09', '9999')");
    db.public.none("INSERT INTO devices VALUES ('09', 'Mi_Notebook', '9999')");

    //////////
    
    console.log("sql device database up");

    app.listen(PORT, () => {
        console.log(`Listening at ${PORT}`);
    });
});

