// ============================================================
// TRIVIA GAME - Backend (Node.js + Express + MySQL2 + bcrypt)
// ============================================================
// Instalación: npm install express mysql2 bcrypt cors dotenv
// Ejecutar:    node server.js
// ============================================================

const express  = require('express');
const mysql    = require('mysql2/promise');
const bcrypt   = require('bcrypt');
const cors     = require('cors');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ── Conexión a la base de datos ──────────────────────────────
const pool = mysql.createPool({
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'trivia_game',
    waitForConnections: true,
    connectionLimit: 10,
});

// ── POST /api/register ───────────────────────────────────────
// Body: { dni, fullName, nickName, password }
app.post('/api/register', async (req, res) => {
    const { dni, fullName, nickName, password } = req.body;

    // Validación de campos obligatorios
    if (!dni || !fullName || !nickName || !password) {
        return res.status(400).json({
            success: false,
            message: 'Todos los campos son obligatorios.',
        });
    }

    try {
        // Verificar que el DNI no exista
        const [byDni] = await pool.execute(
            'SELECT id_user FROM Users WHERE dni = ?',
            [dni]
        );
        if (byDni.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'El DNI ingresado ya está registrado.',
            });
        }

        // Verificar que el nickName no exista
        const [byNick] = await pool.execute(
            'SELECT id_user FROM Users WHERE nickName = ?',
            [nickName]
        );
        if (byNick.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'El nombre de usuario ya está en uso.',
            });
        }

        // Hashear la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insertar usuario
        const [result] = await pool.execute(
            'INSERT INTO Users (dni, fullName, nickName, password, is_ad) VALUES (?, ?, ?, ?, FALSE)',
            [dni, fullName, nickName, hashedPassword]
        );

        return res.status(201).json({
            success: true,
            message: '¡Usuario registrado con éxito!',
            userId: result.insertId,
        });

    } catch (error) {
        console.error('Error en /api/register:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor.',
        });
    }
});

// ── POST /api/login ──────────────────────────────────────────
// Body: { nickName, password }
app.post('/api/login', async (req, res) => {
    const { nickName, password } = req.body;

    if (!nickName || !password) {
        return res.status(400).json({
            success: false,
            message: 'Usuario y contraseña son obligatorios.',
        });
    }

    try {
        // Buscar usuario por nickName
        const [rows] = await pool.execute(
            'SELECT id_user, fullName, nickName, password, is_ad FROM Users WHERE nickName = ?',
            [nickName]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Los datos ingresados son incorrectos.',
            });
        }

        const user = rows[0];

        // Comparar contraseña con el hash
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Los datos ingresados son incorrectos.',
            });
        }

        // Login exitoso — devolver datos del usuario (sin la contraseña)
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
        console.error('Error en /api/login:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor.',
        });
    }
});

// ── Inicio del servidor ──────────────────────────────────────
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
