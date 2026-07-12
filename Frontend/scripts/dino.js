// Estado de la trivia
let esta_correcto = false; // true cuando el jugador contesta bien la pregunta actual
let id_actual = 0;         // id de la pregunta que se está mostrando (puntaje / 1000)

// Canvas
let tablero;
let anchoTablero = 750;
let altoTablero = 250;
let contexto;

// Estado general del juego
let juegoIniciado = false; // si ya se jugó una partida alguna vez (controla el texto del botón)
let juegoTerminado = true; // si es true, el loop principal no mueve ni dibuja nada nuevo
let puntaje = 0;
let partidaProcesada = false; // evita llamar terminarPartida() más de una vez por partida

// Puntajes
let usuarioActual = parseInt(sessionStorage.getItem('id'));
console.log('Usuario actual:', usuarioActual);

// Pausa por pregunta de trivia
let enPausaPorHito = false; // true mientras se muestra una pregunta
let yaPauso1000 = false;    // evita relanzar la misma pregunta en el mismo hito
let hitoTimeoutId = null;
let triviaIntervalId = null; // id del setInterval del contador de 10 segundos

// Dinosaurio
let anchoDino = 60;
let altoDino = 65;
let dinoX = 50;
let dinoY = altoTablero - altoDino;
let estaAgachado = false;
let estaVolando; // setInterval usado para detectar aterrizaje mientras se agacha en el aire

let imgDino;
let imgDinoCorre1;
let imgDinoCorre2;
let imgDinoCorreAgachado1;
let imgDinoCorreAgachado2;

let dino = {
    x: dinoX,
    y: dinoY,
    ancho: anchoDino,
    alto: altoDino
};

// Controles
let flechaEstaPresionada;

// Cactus
let listaCactus = [];

let anchoCactus1 = 34;
let anchoCactus2 = 69;
let anchoCactus3 = 102;
let altoCactus = 70;

let cactusX = 700;
let cactusY = altoTablero - altoCactus;

let imgCactus1;
let imgCactus2;
let imgCactus3;

// Física
let velocidadX = -8;
let velocidadY = 0;
let gravedad = 0.8;


// Controla qué pantalla se ve: juego, trivia o puntajes.
// Es la única función que toca el display de estos tres contenedores,
// para que nunca queden dos pantallas visibles al mismo tiempo.
function mostrarPantalla(pantalla) {
    document.getElementById("board").style.display = (pantalla === "juego") ? "block" : "none";
    document.getElementById("contenedor-trivia").style.display = (pantalla === "trivia") ? "flex" : "none";
    document.getElementById("contenedor-puntajes").style.display = (pantalla === "puntajes") ? "flex" : "none";
}


// Se ejecuta una sola vez al cargar la página
window.onload = function () {
    // Configuración del canvas
    tablero = document.getElementById("board");
    tablero.height = altoTablero;
    tablero.width = anchoTablero;
    contexto = tablero.getContext("2d");

    // Sprite del dino parado / saltando / muerto (se reemplaza el src según el estado)
    imgDino = new Image();
    imgDino.src = "./img/dino.png";
    imgDino.onload = function () {
        contexto.drawImage(imgDino, dino.x, dino.y, dino.ancho, dino.alto);
    };

    // Sprites de correr agachado (2 frames)
    imgDinoCorreAgachado1 = new Image();
    imgDinoCorreAgachado1.src = "./img/dino-duck1.png";

    imgDinoCorreAgachado2 = new Image();
    imgDinoCorreAgachado2.src = "./img/dino-duck2.png";

    // Sprites de correr parado (2 frames)
    imgDinoCorre1 = new Image();
    imgDinoCorre1.src = "./img/dino-run1.png";

    imgDinoCorre2 = new Image();
    imgDinoCorre2.src = "./img/dino-run2.png";

    // Sprites de los 3 tamaños de cactus
    imgCactus1 = new Image();
    imgCactus1.src = "./img/cactus1.png";

    imgCactus2 = new Image();
    imgCactus2.src = "./img/cactus2.png";

    imgCactus3 = new Image();
    imgCactus3.src = "./img/cactus3.png";

    // Al cargar, solo se ve el canvas del juego (congelado hasta tocar el botón)
    mostrarPantalla("juego");

    // Arranca el loop de dibujado (no mueve nada porque juegoTerminado empieza en true)
    requestAnimationFrame(actualizar);

    // Genera un cactus nuevo (o ninguno) cada 1 segundo
    setInterval(colocarCactus, 1000);

    document.addEventListener("keydown", moverDino);
    document.addEventListener("keyup", soltarDino);
};


// Handler del botón de abajo.
// Primer click: arranca la partida y el texto pasa a "Reiniciar Juego" para siempre.
// Siguientes clicks: reinicia la partida en curso o terminada.
function manejarBotonJuego() {
    const boton = document.getElementById("btn-reiniciar");

    if (!juegoIniciado) {
        juegoIniciado = true;
        boton.textContent = "Reiniciar Juego";
    }

    resetear();
}


// Loop principal, se ejecuta en cada frame
async function actualizar() {
    // Se vuelve a pedir el próximo frame antes que nada, así el loop nunca se corta
    requestAnimationFrame(actualizar);

    // Si el juego no arrancó o ya terminó, no se dibuja ni actualiza nada
    if (juegoTerminado) {
        return;
    }

    // Limpia el canvas para redibujar el frame desde cero
    contexto.clearRect(0, 0, tablero.width, tablero.height);

    // Física del salto/caída. Se frena mientras hay una pregunta en pantalla
    if (!enPausaPorHito) {
        velocidadY += gravedad;
        let pisoActual = altoTablero - dino.alto;
        dino.y = Math.min(dino.y + velocidadY, pisoActual);
    }

    let pisoActual = altoTablero - dino.alto;

    // Elige qué sprite dibujar: quieto por defecto, o alterna entre los
    // 2 frames de animación de correr (agachado o parado) según el puntaje
    let imagenActualDino = imgDino;

    if (!enPausaPorHito && dino.y == pisoActual) {
        const frameA = Math.floor(puntaje / 10) % 2 === 0;
        if (estaAgachado === false) {
            imagenActualDino = frameA ? imgDinoCorre1 : imgDinoCorre2;
        } else {
            imagenActualDino = frameA ? imgDinoCorreAgachado1 : imgDinoCorreAgachado2;
        }
    }

    contexto.drawImage(imagenActualDino, dino.x, dino.y, dino.ancho, dino.alto);

    // Mueve, dibuja y chequea colisión de cada cactus en pantalla
    for (let i = 0; i < listaCactus.length; i++) {
        let cactus = listaCactus[i];

        if (!enPausaPorHito) {
            cactus.x += velocidadX;
        }
        contexto.drawImage(cactus.img, cactus.x, cactus.y, cactus.ancho, cactus.alto);

        if (!enPausaPorHito && !juegoTerminado && detectarColision(dino, cactus)) {
            juegoTerminado = true;

            // Guarda las medidas viejas del dino (por si estaba agachado)
            // para reposicionarlo bien antes de dibujarlo muerto
            let anchoViejo = dino.ancho;
            let xVieja = dino.x;
            let yVieja = dino.y;
            let altoViejo = dino.alto;

            let diferenciaAncho = anchoDino - anchoViejo;
            dino.x = dino.x - diferenciaAncho;

            let piesViejos = yVieja + altoViejo;
            dino.ancho = anchoDino;
            dino.alto = altoDino;
            dino.y = piesViejos - dino.alto;

            // Borra la silueta vieja del dino antes de dibujar la nueva
            contexto.clearRect(xVieja - 2, yVieja - 2, anchoViejo + 4, altoViejo + 4);

            // Cambia al sprite de "muerto"
            imgDino.src = "./img/dino-dead.png";
            imgDino.onload = function () {
                contexto.drawImage(imgDino, dino.x, dino.y, dino.ancho, dino.alto);
            };

            // Espera un momento para que se vea el dino muerto, y recién
            // ahí pasa a consultar el servidor y mostrar la leaderboard
            setTimeout(() => {
                terminarPartida();
            }, 600);
        }
    }

    // Si el choque de arriba terminó el juego, o está pausado por una
    // pregunta, no se sigue generando puntaje ni evaluando el próximo hito
    if (juegoTerminado || enPausaPorHito) {
        return;
    }

    // Cada 1000 puntos aparece una pregunta de trivia
    if (puntaje % 1000 === 0 && puntaje !== 0) {
        if (!yaPauso1000) {
            enPausaPorHito = true;
            yaPauso1000 = true;
            esta_correcto = false;
            id_actual = puntaje / 1000;

            const pyr = await obtenerPreguntaYRespuestas(puntaje / 1000);

            mostrarPantalla("trivia");

            // Restaura los elementos internos de la trivia por si la
            // pregunta anterior los había ocultado al mostrar el resultado
            document.getElementById("trivia-timer").style.display = "flex";
            document.querySelector(".trivia-pregunta").style.display = "block";
            document.querySelector(".trivia-grid").style.display = "grid";
            document.querySelector(".feedback-correcto").style.display = "none";
            document.querySelector(".feedback-incorrecto").style.display = "none";

            // Configura el contador regresivo
            let tiempoRestante = 10;
            const componenteTimer = document.getElementById("trivia-timer");
            componenteTimer.textContent = tiempoRestante;

            // Por seguridad, limpia cualquier contador viejo antes de arrancar uno nuevo
            if (triviaIntervalId) {
                clearInterval(triviaIntervalId);
            }

            // Carga el texto de la pregunta y las 4 respuestas
            let pregunta = pyr.question.question;
            let respuestas = pyr.answers;

            document.getElementById("trivia-pregunta-texto").textContent = pregunta;
            document.getElementById("trivia-txt-1").textContent = respuestas[0].answer;
            document.getElementById("trivia-txt-2").textContent = respuestas[1].answer;
            document.getElementById("trivia-txt-3").textContent = respuestas[2].answer;
            document.getElementById("trivia-txt-4").textContent = respuestas[3].answer;

            // Cuenta regresiva de 1 en 1 segundo. Si llega a 0 (o si el
            // jugador ya contestó bien) se corta y se vuelve al juego
            triviaIntervalId = setInterval(() => {
                tiempoRestante--;
                componenteTimer.textContent = tiempoRestante;

                if (tiempoRestante <= 0 || esta_correcto == true) {
                    clearInterval(triviaIntervalId);
                    enPausaPorHito = false;
                    mostrarPantalla("juego");
                }
            }, 1000);
        }
    } else {
        // Resetea la bandera del hito una vez que el puntaje se aleja
        // de un múltiplo de 1000, para que el próximo hito pueda dispararse
        yaPauso1000 = false;

        if (!enPausaPorHito) {
            mostrarPantalla("juego");
        }
    }

    // Dibuja el puntaje y lo incrementa
    contexto.fillStyle = "black";
    contexto.font = "20px courier";
    puntaje++;
    contexto.fillText(puntaje, 5, 20);
}


// Se ejecuta al presionar una tecla
function moverDino(e) {
    // No hace nada si el juego no está corriendo o hay una pregunta en pantalla
    if (juegoTerminado || enPausaPorHito) {
        return;
    }

    // Saltar: espacio o flecha arriba, solo si está parado en el piso
    if ((e.code == "Space" || e.code == "ArrowUp") && dino.y == dinoY && !estaAgachado) {
        velocidadY = -15;
    }

    // Agacharse estando en el piso
    if (e.code == "ArrowDown" && dino.y == dinoY) {
        estaAgachado = true;
        dino.alto = 45;
        dino.ancho = 80;
        dino.y = altoTablero - dino.alto;

    // Agacharse en el aire: acelera la caída
    } else if (e.code == "ArrowDown" && dino.y != dinoY) {
        flechaEstaPresionada = true;
        velocidadY = 10;

        clearInterval(estaVolando);
        // Revisa cada 20ms si ya aterrizó mientras la flecha sigue apretada
        estaVolando = setInterval(() => {
            if (dino.y == dinoY && flechaEstaPresionada) {
                estaAgachado = true;
                dino.alto = 45;
                dino.ancho = 80;
                clearInterval(estaVolando);
            } else if (dino.y == dinoY) {
                clearInterval(estaVolando);
            }
        }, 20);
    }
}

// Se ejecuta al soltar una tecla
function soltarDino(e) {
    if (juegoTerminado) return;

    if (e.code == "ArrowDown") {
        flechaEstaPresionada = false;
        clearInterval(estaVolando);
        estaAgachado = false;
        dino.alto = altoDino;
        dino.ancho = anchoDino;
    }
}


// Genera un cactus nuevo cada vez que se llama (llamada cada 1 segundo)
function colocarCactus() {
    if (juegoTerminado || enPausaPorHito) {
        return;
    }

    let cactus = {
        img: null,
        x: cactusX,
        y: cactusY,
        ancho: null,
        alto: altoCactus
    };

    // Elige aleatoriamente el tamaño del cactus (o ninguno, 50% de las veces)
    let probabilidadCactus = Math.random();

    if (probabilidadCactus > 0.9) {
        // 10%: cactus grande
        cactus.img = imgCactus3;
        cactus.ancho = anchoCactus3;
        listaCactus.push(cactus);
    } else if (probabilidadCactus > 0.7) {
        // 30%: cactus mediano
        cactus.img = imgCactus2;
        cactus.ancho = anchoCactus2;
        listaCactus.push(cactus);
    } else if (probabilidadCactus > 0.5) {
        // 50%: cactus chico
        cactus.img = imgCactus1;
        cactus.ancho = anchoCactus1;
        listaCactus.push(cactus);
    }
    // El 50% restante no genera ningún cactus

    // Borra el cactus más viejo si hay más de 5 guardados
    if (listaCactus.length > 5) {
        listaCactus.shift();
    }
}


// Detección de colisión por rectángulos (AABB)
function detectarColision(a, b) {
    return (
        a.x < b.x + b.ancho &&
        a.x + a.ancho > b.x &&
        a.y < b.y + b.alto &&
        a.y + a.alto > b.y
    );
}


// Deja todas las variables en su estado inicial y desactiva la pausa/fin
// de partida, para que el loop principal vuelva a moverse
function resetear() {
    juegoTerminado = false;
    puntaje = 0;
    partidaProcesada = false;

    enPausaPorHito = false;
    yaPauso1000 = false;
    esta_correcto = false;

    if (hitoTimeoutId !== null) {
        clearTimeout(hitoTimeoutId);
        hitoTimeoutId = null;
    }
    if (triviaIntervalId !== null) {
        clearInterval(triviaIntervalId);
        triviaIntervalId = null;
    }

    mostrarPantalla("juego");

    // Restaura los elementos internos de la trivia por si habían quedado
    // ocultos desde una pregunta anterior
    document.getElementById("trivia-timer").style.display = "flex";
    document.querySelector(".trivia-pregunta").style.display = "block";
    document.querySelector(".trivia-grid").style.display = "grid";
    document.querySelector(".feedback-correcto").style.display = "none";
    document.querySelector(".feedback-incorrecto").style.display = "none";

    listaCactus = [];

    estaAgachado = false;
    flechaEstaPresionada = false;
    clearInterval(estaVolando);

    dino.ancho = anchoDino;
    dino.alto = altoDino;
    dino.x = dinoX;
    dino.y = altoTablero - altoDino;
    velocidadY = 0;

    imgDino.src = "./img/dino.png";
}


// Pide a la API la pregunta y sus 4 respuestas correspondientes al hito actual
async function obtenerPreguntaYRespuestas(id) {
    const API_URL = `http://localhost:4000/questions/${id}`;
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Error en la petición: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Hubo un problema al obtener los datos:", error.message);
        return {
            error: true,
            message: error.message
        };
    }
}

// Se ejecuta al hacer click en una de las 4 opciones de la trivia
async function enviarRespuesta(respuestaSeleccionada) {
    // Frena el contador apenas se elige una respuesta
    if (triviaIntervalId) {
        clearInterval(triviaIntervalId);
    }

    // Oculta el timer, la pregunta y los botones: solo queda visible
    // el cartel de resultado (Correcto/Incorrecto)
    document.getElementById("trivia-timer").style.display = "none";
    document.querySelector(".trivia-pregunta").style.display = "none";
    document.querySelector(".trivia-grid").style.display = "none";

    const cartelCorrecto = document.querySelector(".feedback-correcto");
    const cartelIncorrecto = document.querySelector(".feedback-incorrecto");
    const textoIncorrecto = cartelIncorrecto.querySelector("h1");

    const TEXTO_INCORRECTO_DEFAULT = "Incorrecto";

    // Muestra un estado neutro de "verificando" mientras llega la respuesta de la API
    cartelIncorrecto.style.display = "flex";
    textoIncorrecto.textContent = "Verificando... 🔍";
    cartelIncorrecto.style.backgroundColor = "#333333";

    const API_URL = `http://localhost:4000/questions/${id_actual}`;
    let esCorrecta = false;

    try {
        const response = await fetch(API_URL);
        const data = await response.json();

        // Convierte la respuesta seleccionada (1,2,3,4) a índice de arreglo (0,1,2,3)
        let indiceRespuesta = respuestaSeleccionada - 1;
        let respuestaUsuario = data.answers[indiceRespuesta];

        if (respuestaUsuario && respuestaUsuario.is_correct === 1) {
            esCorrecta = true;
            esta_correcto = true;
        }
    } catch (error) {
        console.error("Hubo un problema al verificar la respuesta:", error);
        esCorrecta = false;
    }

    // Restaura el texto y color originales del cartel de "Incorrecto"
    textoIncorrecto.textContent = TEXTO_INCORRECTO_DEFAULT;
    cartelIncorrecto.style.backgroundColor = "#e21b3c";

    if (esCorrecta) {
        cartelIncorrecto.style.display = "none";
        cartelCorrecto.style.display = "flex";
    } else {
        cartelCorrecto.style.display = "none";
        cartelIncorrecto.style.display = "flex";
    }

    // Deja 2 segundos el cartel de resultado antes de continuar
    setTimeout(() => {
        cartelCorrecto.style.display = "none";
        cartelIncorrecto.style.display = "none";

        if (esCorrecta) {
            // Si acertó, el juego se descongela y sigue desde donde estaba
            enPausaPorHito = false;
            mostrarPantalla("juego");
        } else {
            // Si falló, la partida termina acá. El jugador tiene que
            // presionar "Reiniciar Juego" para volver a jugar
            juegoTerminado = true;
            terminarPartida();
        }
    }, 2000);
}


// Pide a la API el último puntaje guardado (para calcular el próximo id)
async function consultarPuntajeUltimo() {
    const API_URL = `http://localhost:4000/puntajesultid`;
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Error en la petición: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Hubo un problema al obtener los datos:", error.message);
        return {
            error: true,
            message: error.message
        };
    }
}

// Se llama una sola vez por partida (choque con cactus o respuesta
// incorrecta): guarda el puntaje obtenido y muestra la leaderboard
async function terminarPartida() {
    if (partidaProcesada) return; // ya se guardó/mostró para esta partida
    partidaProcesada = true;

    const ultimoPuntaje = await consultarPuntajeUltimo();
    console.log('Ultimo puntaje:', ultimoPuntaje);

    // Si la API falló o no devolvió un array, evita romper acá y
    // muestra la tabla igual para no dejar el juego trabado
    if (!Array.isArray(ultimoPuntaje) || ultimoPuntaje.length === 0) {
        console.error("No se pudo obtener el último puntaje, se usa id=1 por defecto");
        mostrarTablaPuntajes();
        return;
    }

    const id = ultimoPuntaje[0].id + 1;
    console.log('Nuevo id para puntaje:', id);
    const level_max = Math.floor(puntaje / 1000);
    console.log('Level max alcanzado:', level_max);
    const id_user = usuarioActual;
    console.log('ID de usuario actual:', id_user);
    const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
    console.log('Fecha actual:', date);

    await guardarPuntaje(id, date, level_max, id_user);
    mostrarTablaPuntajes();
}

// Trae del servidor todos los puntajes guardados
async function obtenerPuntajesGuardados() {
    try {
        const response = await fetch(`http://localhost:4000/puntajes`);
        const responsejsoned = await response.json();
        const data = responsejsoned.data;
        return data;
    } catch (error) {
        console.error("Hubo un problema al obtener los puntajes de la API:", error.message);
        return [];
    }
}

// Postea el puntaje de la partida recién terminada al servidor
async function guardarPuntaje(id, date, level_max, id_user) {
    try {
        const response = await fetch("http://localhost:4000/puntajes", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ id, date, level_max, id_user })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Error en la petición: ${response.status}`);
        }
    } catch (error) {
        console.error("Hubo un problema al guardar el puntaje en la API:", error.message);
    }
}

// Arma y muestra la tabla con los mejores puntajes
async function mostrarTablaPuntajes() {
    mostrarPantalla("puntajes");

    const todosLosPuntajes = await obtenerPuntajesGuardados();
    console.log('Recibido en mostrarTablaPuntajes:', todosLosPuntajes);

    document.getElementById("puntajes-nombre-usuario").textContent = "Top general";
    document.getElementById("puntaje-actual-texto").textContent =
        `Tu puntaje de esta partida: ${puntaje}`;

    const cuerpoTabla = document.getElementById("tabla-puntajes-cuerpo");
    cuerpoTabla.innerHTML = "";

    // Ordena por nivel más alto primero; si hay empate, gana el registro más reciente (id mayor)
    const topGeneral = [...todosLosPuntajes]
        .sort((a, b) => b.level_max - a.level_max || b.id - a.id)
        .slice(0, 10);

    topGeneral.forEach((registro, indice) => {
        const fila = document.createElement("tr");
        fila.innerHTML = `
            <td>${indice + 1}</td>
            <td>${registro.id_user}</td>
            <td>${registro.level_max}</td>
            <td>${new Date(registro.date).toLocaleString()}</td>
        `;
        cuerpoTabla.appendChild(fila);
    });
}