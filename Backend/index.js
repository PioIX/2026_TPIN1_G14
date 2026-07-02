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

/**
 * req = request. en este objeto voy a tener todo lo que reciba del cliente
 * res = response. Voy a responderle al cliente
 */
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
            message: `¡Bienvenido, ${user.fullName}!`,
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

app.get("/Questions", async (req, res) => {
    try {
        const id = req.query.id;
        const queryResult = await realizarQuery(
            'SELECT question FROM Questions WHERE id = ?', 
            [id]
        );
        
        return res.status(200).json({
            success: true,
            data: queryResult 
        });
    } catch (error) {
        console.error('Error en /Questions:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor.',
        });
    }
});

app.get('/admin/questions', async (req, res) => {
    try {
        const questions = await realizarQuery('SELECT id, question FROM Questions ORDER BY id');
        const answers = await realizarQuery('SELECT id, answer, is_correct, is_question FROM Answers ORDER BY id');
        const data = questions.map(q => ({
            id: q.id,
            question: q.question,
            answers: answers.filter(a => a.is_question === q.id)
        }));

        return res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error en GET /admin/questions:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor.',
        });
    }
});

// Crea una nueva pregunta junto con sus respuestas
app.post('/admin/questions', async (req, res) => {
    const { question, answers } = req.body;

    if (!question || !Array.isArray(answers) || answers.length < 2) {
        return res.status(400).json({
            success: false,
            message: 'La pregunta debe tener un enunciado y al menos 2 respuestas.',
        });
    }

    const correctCount = answers.filter(a => a.is_correct).length;
    if (correctCount !== 1) {
        return res.status(400).json({
            success: false,
            message: 'Debe marcarse exactamente una respuesta como correcta.',
        });
    }

    try {
        const result = await realizarQuery('INSERT INTO Questions (question) VALUES (?)', [question]);
        const questionId = result.insertId;

        for (const a of answers) {
            await realizarQuery(
                'INSERT INTO Answers (answer, is_correct, is_question) VALUES (?, ?, ?)',
                [a.answer, !!a.is_correct, questionId]
            );
        }

        return res.status(201).json({
            success: true,
            message: 'Pregunta creada con éxito.',
            questionId,
        });
    } catch (error) {
        console.error('Error en POST /admin/questions:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor.',
        });
    }
});

// Edita una pregunta existente y reemplaza sus respuestas
app.put('/admin/questions/:id', async (req, res) => {
    const { id } = req.params;
    const { question, answers } = req.body;

    if (!question || !Array.isArray(answers) || answers.length < 2) {
        return res.status(400).json({
            success: false,
            message: 'La pregunta debe tener un enunciado y al menos 2 respuestas.',
        });
    }

    const correctCount = answers.filter(a => a.is_correct).length;
    if (correctCount !== 1) {
        return res.status(400).json({
            success: false,
            message: 'Debe marcarse exactamente una respuesta como correcta.',
        });
    }

    try {
        await realizarQuery('UPDATE Questions SET question = ? WHERE id = ?', [question, id]);

        // Se eliminan las respuestas anteriores y se cargan las nuevas
        await realizarQuery('DELETE FROM Answers WHERE is_question = ?', [id]);

        for (const a of answers) {
            await realizarQuery(
                'INSERT INTO Answers (answer, is_correct, is_question) VALUES (?, ?, ?)',
                [a.answer, !!a.is_correct, id]
            );
        }

        return res.status(200).json({
            success: true,
            message: 'Pregunta actualizada con éxito.',
        });
    } catch (error) {
        console.error('Error en PUT /admin/questions/:id:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor.',
        });
    }
});

// Elimina una pregunta y todas sus respuestas asociadas
app.delete('/admin/questions/:id', async (req, res) => {
    const { id } = req.params;

    try {
        await realizarQuery('DELETE FROM Answers WHERE is_question = ?', [id]);
        await realizarQuery('DELETE FROM Questions WHERE id = ?', [id]);

        return res.status(200).json({
            success: true,
            message: 'Pregunta eliminada con éxito.',
        });
    } catch (error) {
        console.error('Error en DELETE /admin/questions/:id:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor.',
        });
    }
});

