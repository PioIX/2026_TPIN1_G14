function switchTab(tab) {
    document.getElementById('login-section').style.display    = tab === 'login'    ? 'block' : 'none';
    document.getElementById('register-section').style.display = tab === 'register' ? 'block' : 'none';
    document.getElementById('login-msg').textContent    = '';
    document.getElementById('register-msg').textContent = '';
}


async function handleLogin() {
    // 1. Captura de elementos del DOM y sus valores
    const nickName = document.getElementById('login-nick').value.trim();
    const password = document.getElementById('login-pass').value;
    const msg      = document.getElementById('login-msg');

    // 2. Validaciones previas en el cliente
    if (!nickName || !password) {
        msg.textContent = 'Completá todos los campos.';
        return; // Corta la ejecución si falta algún dato
    }

    try {
        // 3. Petición HTTP POST al servidor con las credenciales
        const response = await fetch(`http://localhost:4000/login`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ nickName, password }), // Convierte el objeto JS a cadena JSON
        });

        // 4. Procesamiento de la respuesta del servidor
        const data = await response.json();
        msg.textContent = data.message; // Muestra el mensaje retornado por el backend

        // 5. Guardar la sesion
        if (response.ok && data.success) {
            // Guarda los datos del usuario de forma temporal en el navegador
            sessionStorage.setItem('user', JSON.stringify(data.user));
        }

    } catch (error) {
        // 6. manejar el error
        msg.textContent = 'No se pudo conectar con el servidor.';
    }
}

async function handleRegister() {
    // 1. Captura de elementos del DOM y sus valores
    const fullName = document.getElementById('reg-name').value.trim();
    const nickName = document.getElementById('reg-nick').value.trim();
    const password = document.getElementById('reg-pass').value;
    const msg      = document.getElementById('register-msg');

    // 2. Validaciones previas en el cliente
    if (!fullName || !nickName || !password) {
        msg.textContent = 'Completá todos los campos.';
        return;
    }
     // 3. Petición HTTP POST para registrar
    try {
        const response = await fetch(`http://localhost:4000/register`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ fullName, nickName, password }),
        });

        const data = await response.json();
        msg.textContent = data.message;

        if (response.ok && data.success) {
            setTimeout(() => switchTab('login'), 1500);
        }

    } catch (err) {
        msg.textContent = 'No se pudo conectar con el servidor.';
    }
}