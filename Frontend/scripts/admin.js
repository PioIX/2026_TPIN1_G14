const API_URL = 'http://localhost:4000';
const CANTIDAD_RESPUESTAS = 4; // Cantidad de opciones por pregunta en el formulario de "Añadir"
const MODO = "test"

/* ===================== Protección de acceso ===================== */

function verificarAcceso() {
    const userRaw = sessionStorage.getItem('user');
    let user
    if (MODO != "test") {
        if (!userRaw) {
            window.location.href = 'login.html';
            return null;
        }

        user = JSON.parse(userRaw);

        if (!user.is_ad) {
            //Usuario logueado pero sin permisos de administrador
            window.location.href = 'login.html';
            return null;
        }
    } else {
        user = JSON.parse(userRaw);
    }
    return user;
}

/* ===================== Inicialización ===================== */

function cargarTablas() {
    let user
    if (MODO != "test") {
        user = verificarAcceso();
        if (!user) return;
    } else {
        user = "test"
    }
    document.getElementById('admin-user').textContent = user.fullName;

    construirFormularioAgregar();
    cargarPreguntas();
}

/* ===================== Carga y render de preguntas ===================== */

async function cargarPreguntas() {
    const editBody = document.getElementById('edit-table-body');
    const deleteBody = document.getElementById('delete-table-body');

    editBody.innerHTML = '<tr><td colspan="3">Cargando...</td></tr>';
    deleteBody.innerHTML = '<tr><td colspan="2">Cargando...</td></tr>';

    let editTabla = ""
    let deleteTabla = ""

    try {
        const response = await fetch(`${API_URL}/admin/questions`);
        const data = await response.json();
        console.log(data)
        let datos = data.data
        if (data.success) {
            for (let i = 0; i < datos.length; i++) {
                let respuestas = datos[i].answers
                editTabla += "<tr>"
                deleteTabla += "<tr>"
                editTabla += `<td colspan="3">${datos[i].question}</td>`
                deleteTabla += `<td colspan="3">${datos[i].question}</td>`
                for (let j = 0; j < respuestas.length; j++) {
                    editTabla += `<td colspan="3"> ${respuestas[j].answer}</td>`
                    editTabla += `<td colspan="3">${respuestas[j].is_correct} </td>`
                    deleteTabla += `<td colspan="3"> ${respuestas[j].answer}</td>`
                    deleteTabla += `<td colspan="3">${respuestas[j].is_correct} </td>`
                }
                editTabla += `<td>
                        <button class="boton" onclick="editarPregunta(${datos[i].id})">
                            Editar
                        </button> </td>`;
                deleteTabla += `<td>
                        <button class="boton" onclick="eliminarPregunta(${datos[i].id})">
                            Eliminar
                        </button> </td>`;
                editTabla += `</tr>`
                deleteTabla += `</tr>`
                document.getElementById('edit-table-body').innerHTML = editTabla;
                document.getElementById('delete-table-body').innerHTML = deleteTabla;
            }
        }

        //renderTablaEditar(data.data);
        //renderTablaEliminar(data.data);

    } catch (error) {
        const msg = 'No se pudo conectar con el servidor.';
        editBody.innerHTML = `<tr><td colspan="3">${msg}</td></tr>`;
        deleteBody.innerHTML = `<tr><td colspan="2">${msg}</td></tr>`;
    }
}

/* ===================== Tab: Añadir ===================== */

function construirFormularioAgregar() {
    const contenedor = document.getElementById('add-answers');
    contenedor.innerHTML = '';

    for (let i = 0; i < CANTIDAD_RESPUESTAS; i++) {
        const fila = document.createElement('div');
        fila.className = 'answer-row';
        fila.innerHTML = `
            <input type="radio" name="add-correct" value="${i}" ${i === 0 ? 'checked' : ''}>
            <input type="text" class="input add-answer-text" placeholder="Respuesta ${i + 1}">
        `;
        contenedor.appendChild(fila);
    }
}

async function sendAdd() {
    const questionInput = document.getElementById('add-question');
    const question = questionInput.value.trim();
    const msg = document.getElementById('add-msg');

    const answerInputs = document.querySelectorAll('#add-answers .add-answer-text');
    const correctRadio = document.querySelector('input[name="add-correct"]:checked');

    const answers = Array.from(answerInputs).map((input, i) => ({
        answer: input.value.trim(),
        is_correct: correctRadio && Number(correctRadio.value) === i,
    }));

    if (!question || answers.some(a => !a.answer)) {
        msg.textContent = 'Completá la pregunta y todas las respuestas.';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/admin/questions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question, answers }),
        });

        const data = await response.json();
        msg.textContent = data.message;

        if (response.ok && data.success) {
            questionInput.value = '';
            answerInputs.forEach(input => input.value = '');
            document.querySelector('input[name="add-correct"][value="0"]').checked = true;
            cargarPreguntas();
        }

    } catch (error) {
        msg.textContent = 'No se pudo conectar con el servidor.';
    }
}

/* ===================== Tab: Editar ===================== */

async function editarPregunta(id) {

    let nuevaPregunta = prompt("Ingrese la nueva pregunta:");

    if (nuevaPregunta == null || nuevaPregunta == "") {
        return;
    }

    const respuesta = await fetch(`http://localhost:4000/admin/questions`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            question: nuevaPregunta,
            id: id
        })
    });
    let response = await respuesta.json()
    console.log(response)
    if (respuesta.ok) {
        alert("Pregunta modificada correctamente.");
        cargarTablas();
    } else {
        alert("Error al modificar la pregunta.");
    }
}

async function guardarEdicion(id, boton) {
    const fila = boton.closest('tr');
    const msg = document.getElementById('edit-msg');

    const question = fila.querySelector('.edit-question-text').value.trim();
    const answerRows = fila.querySelectorAll('.answer-row');

    const answers = Array.from(answerRows).map(row => ({
        answer: row.querySelector('.edit-answer-text').value.trim(),
        is_correct: row.querySelector('input[type="radio"]').checked,
    }));

    if (!question || answers.some(a => !a.answer)) {
        msg.textContent = 'Completá la pregunta y todas las respuestas antes de guardar.';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/admin/questions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question, answers }),
        });

        const data = await response.json();
        msg.textContent = data.message;

        if (response.ok && data.success) {
            cargarPreguntas();
        }

    } catch (error) {
        msg.textContent = 'No se pudo conectar con el servidor.';
    }
}

/* ===================== Tab: Eliminar ===================== */

function renderTablaEliminar(preguntas) {
    const body = document.getElementById('delete-table-body');
    body.innerHTML = '';

    if (preguntas.length === 0) {
        body.innerHTML = '<tr><td colspan="2">No hay preguntas cargadas.</td></tr>';
        return;
    }

    preguntas.forEach(p => {
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td>${escapeHtml(p.question)}</td>
            <td><button class="boton boton-eliminar" onclick="eliminarPregunta(${p.id})">Eliminar</button></td>
        `;
        body.appendChild(fila);
    });
}

async function eliminarPregunta(id) {
    const msg = document.getElementById('delete-msg');

    const confirmar = confirm('¿Seguro que querés eliminar esta pregunta? Esta acción no se puede deshacer.');
    if (!confirmar) return;

    try {
        const response = await fetch(`${API_URL}/admin/questions/${id}`, {
            method: 'DELETE',
        });

        const data = await response.json();
        msg.textContent = data.message;

        if (response.ok && data.success) {
            cargarPreguntas();
        }

    } catch (error) {
        msg.textContent = 'No se pudo conectar con el servidor.';
    }
}

/* ===================== Utilidades ===================== */

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function cerrarSesion() {
    sessionStorage.removeItem('user');
    window.location.href = 'login.html';
}
