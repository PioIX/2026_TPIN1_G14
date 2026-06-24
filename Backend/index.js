var express = require('express'); //Tipo de servidor: Express
var bodyParser = require('body-parser'); //Convierte los JSON
var cors = require('cors');
const { realizarQuery } = require('./modulos/mysql');

var app = express(); //Inicializo express
var port = process.env.PORT || 4000; //Ejecuto el servidor en el puerto 4000

// Convierte una petición recibida (POST-GET...) a objeto JSON
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());
app.use(cors());

//Pongo el servidor a escuchar
app.listen(port, function(){
    console.log(`Server running in http://localhost:${port}`);
});

app.get('/', function(req, res){
    res.status(200).send({
        message: 'GET Home route working fine!'
    });
});

/**
 * req = request. en este objeto voy a tener todo lo que reciba del cliente
 * res = response. Voy a responderle al cliente
 */
app.post('/register', async (req, res) => {
    const { dni, fullName, nickName, password } = req.body;
    //validamos datos
    if (!dni || !fullName || !nickName || !password) {
        return res.status(400).json({
            success: false,
            message: 'Todos los campos son obligatorios.',
        });
    }

    try {
        //verificacion dedni y nickname 
        const [exDni] = await realizarQuery(
            'SELECT id_user FROM Users WHERE dni = ?',
            [dni]
        );
        if (exDni.length > 0) {
            return res.status(409)
        }
        const [exNick] = await realizarQuery(
            'SELECT id_user FROM Users WHERE nickName = ?',
            [nickName]
        );
        if (exNick.length > 0) {
            return res.status(409)
        }
        //ejec
        const [result] = await realizarQuery(
            'INSERT INTO Users (dni, fullName, nickName, password, is_ad) VALUES (?, ?, ?, ?, FALSE)',
            [dni, fullName, nickName, password]
        );

        return res.status(201).json({
            success: true,
            message: '¡Usuario registrado con éxito!',
            userId: result.insertId,
        });

    } catch (error) {
        console.error('Error en /register:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor.',
        });
    }
});
