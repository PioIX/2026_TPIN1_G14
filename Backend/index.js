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

app.get('/users', async (req, res) => {
    try {
        // Ejecutamos la consulta para traer todos los usuarios
        const [users] = await realizarQuery('SELECT * FROM Users');

        // Retornamos la lista con un estatus 200 (OK)
        return res.status(200).json({
            success: true,
            data: users
        });

    } catch (error) {
        console.error('Error en GET /users:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor al obtener los usuarios.',
        });
    }
});


app.post('/register', async (req, res) => {
    const { fullName, nickName, password } = req.body;
 
    // Validación de campos obligatorios
    if (!fullName || !nickName || !password) {
        return res.status(400).json({
            success: false,
            message: 'Todos los campos son obligatorios.',
        });
    }
 
    try {
        // Verificar que el nickName no exista
        const vfNick = await realizarQuery('SELECT id_user FROM Users WHERE nickName = ?',
            [nickName]);
        if (vfNick.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'El nombre de usuario ya está en uso.',
            });
        }


        // Insertar usuario
        const result = await realizarQuery('INSERT INTO Users (fullName, nickName, password, is_ad) VALUES (?, ?, ?, FALSE)', [fullName, nickName, password]);
        return res.status(201).json({ userId: result.insertId });
 
        return res.status(201).json({
            success: true,
            message: 'Todo ok!',
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

app.post('/login', async (req, res) => {
    const { nickName, password } = req.body;

    if (!nickName || !password) {
        return res.status(400).json({
            success: false,
            message: 'Usuario y contraseña son obligatorios.',
        });
    }

    try {
        const userFound = await realizarQuery(
            'SELECT id_user, fullName, nickName, password, is_ad FROM Users WHERE nickName = ? AND password = ?',
            [nickName, password]
        );

        if (userFound.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Los datos ingresados son incorrectos.',
            });
        }

        const user = userFound[0];

        return res.status(200).json({
            success: true,
            message: `Bienvenido, ${user.fullName}!`,
            user: {
                id:       user.id_user,
                fullName: user.fullName,
                nickName: user.nickName,
                is_ad:    user.is_ad,
            },
        });

    } catch (error) {
        console.error('Error en /login:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor.',
        });
    }
});
