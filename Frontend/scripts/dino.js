// ============================================================================
// JUEGO DEL DINOSAURIO CON TRIVIA ESTILO KAHOOT
// ----------------------------------------------------------------------------
// Este archivo maneja:
//  1) El juego del dino (salto, agache, cactus, colisiones, puntaje).
//  2) Un sistema de "hitos": cada 1000 puntos el juego se pausa y aparece
//     una pregunta de trivia (con 4 opciones, estilo Kahoot) que se trae
//     desde una API local. Si el jugador contesta bien, el juego continúa;
//     si contesta mal, el juego termina y hay que reiniciar con el botón.
//  3) El botón de abajo, que arranca como "Iniciar Juego" la primera vez
//     que se entra a la página, y pasa a decir "Reiniciar Juego" apenas
//     el jugador lo usa por primera vez para empezar a jugar.
// ============================================================================


// ---------------------------------------------------------------------------
// ESTADO DE LA TRIVIA
// ---------------------------------------------------------------------------
let esta_correcto = false; // true cuando el jugador acertó la pregunta actual
let id_actual = 0;         // id de la pregunta que se está mostrando (puntaje/1000)


// ---------------------------------------------------------------------------
// TABLERO / CANVAS
// ---------------------------------------------------------------------------
let tablero;              // referencia al elemento <canvas>
let anchoTablero = 750;   // ancho del canvas en píxeles
let altoTablero = 250;    // alto del canvas en píxeles
let contexto;             // contexto 2D del canvas, con el que se dibuja todo


// ---------------------------------------------------------------------------
// ESTADO GENERAL DEL JUEGO
// ---------------------------------------------------------------------------
// juegoIniciado: indica si el jugador ya arrancó una partida alguna vez.
// Se usa únicamente para saber si el botón debe decir "Iniciar Juego"
// (todavía no se jugó nunca) o "Reiniciar Juego" (ya se jugó al menos una vez).
let juegoIniciado = false;

// juegoTerminado: cuando es true, el loop principal (actualizar) no mueve
// nada ni actualiza el puntaje. Se usa tanto para el estado "esperando
// que el jugador arranque" (antes de tocar el botón) como para el estado
// "partida terminada" (choque con un cactus o respuesta incorrecta).
// Arranca en true a propósito: así el juego queda congelado hasta que el
// jugador presiona el botón "Iniciar Juego".
let juegoTerminado = true;

let puntaje = 0; // puntaje actual, sube 1 punto por frame mientras se juega

// partidaProcesada evita que terminarPartida() se ejecute más de una vez
// para la misma partida (por ejemplo si el dino llegara a tocar dos
// cactus superpuestos en el mismo frame).
let partidaProcesada = false;


// ---------------------------------------------------------------------------
// PUNTAJES POR JUGADOR
// ---------------------------------------------------------------------------
// Los puntajes se guardan en localStorage del navegador, agrupados por
// nombre de usuario, para poder mostrar el ranking personal de cada uno.
const CLAVE_STORAGE_PUNTAJES = "dino-puntajes";
let usuarioActual = "Jugador"; // nombre con el que se guarda el puntaje de la partida


// ---------------------------------------------------------------------------
// PAUSA POR PREGUNTA DE TRIVIA (HITO)
// ---------------------------------------------------------------------------
let enPausaPorHito = false; // true mientras está mostrándose una pregunta
let yaPauso1000 = false;    // evita relanzar la misma pregunta en el mismo hito
let hitoTimeoutId = null;   // por si se necesita cancelar un timeout pendiente
let triviaIntervalId = null; // id del setInterval del contador de 10 segundos


// ---------------------------------------------------------------------------
// DINOSAURIO
// ---------------------------------------------------------------------------
let anchoDino = 60;
let altoDino = 65;
let dinoX = 50;
let dinoY = altoTablero - altoDino; // posición Y del dino parado en el piso
let estaAgachado = false;
let estaVolando; // id del setInterval usado al bajar en el aire (agache en salto)

// Sprites del dino (se cargan en window.onload)
let imgDino;                 // parado / saltando / muerto (se reusa cambiando el src)
let imgDinoCorre1;
let imgDinoCorre2;
let imgDinoCorreAgachado1;
let imgDinoCorreAgachado2;

// Objeto con la posición y el tamaño actuales del dino (cambia al agacharse)
let dino = {
    x: dinoX,
    y: dinoY,
    ancho: anchoDino,
    alto: altoDino
};


// ---------------------------------------------------------------------------
// CONTROLES
// ---------------------------------------------------------------------------
let flechaEstaPresionada; // true mientras se mantiene apretada la flecha abajo


// ---------------------------------------------------------------------------
// CACTUS (OBSTÁCULOS)
// ---------------------------------------------------------------------------
let listaCactus = []; // arreglo con los cactus actualmente en pantalla

let anchoCactus1 = 34;  // cactus chico (1 cuerpo)
let anchoCactus2 = 69;  // cactus mediano (2 cuerpos)
let anchoCactus3 = 102; // cactus grande (3 cuerpos)
let altoCactus = 70;

let cactusX = 700;                       // posición X donde nace cada cactus nuevo
let cactusY = altoTablero - altoCactus;  // posición Y (siempre sobre el piso)

let imgCactus1;
let imgCactus2;
let imgCactus3;


// ---------------------------------------------------------------------------
// FÍSICA
// ---------------------------------------------------------------------------
let velocidadX = -8;  // velocidad horizontal de los cactus (negativa = hacia la izquierda)
let velocidadY = 0;   // velocidad vertical del dino (salto / caída)
let gravedad = 0.8;   // aceleración que se le suma a velocidadY en cada frame


// ============================================================================
// INICIALIZACIÓN: se ejecuta una sola vez, apenas termina de cargar la página
// ============================================================================
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

    // Sprites de correr agachado (2 frames para animar)
    imgDinoCorreAgachado1 = new Image();
    imgDinoCorreAgachado1.src = "./img/dino-duck1.png";

    imgDinoCorreAgachado2 = new Image();
    imgDinoCorreAgachado2.src = "./img/dino-duck2.png";

    // Sprites de correr parado (2 frames para animar)
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

    // El loop de dibujado arranca siempre (dibuja el dino quieto en pantalla),
    // pero el juego en sí queda congelado porque juegoTerminado empieza en true.
    // Recién se "activa" cuando el jugador toca el botón "Iniciar Juego".
    requestAnimationFrame(actualizar);

    // Genera cactus nuevos cada 1 segundo. La función internamente no hace
    // nada mientras el juego esté terminado/no iniciado.
    setInterval(colocarCactus, 1000);

    // Controles de teclado
    document.addEventListener("keydown", moverDino);
    document.addEventListener("keyup", soltarDino);
};


// ============================================================================
// BOTÓN DE INICIAR / REINICIAR
// ============================================================================
// Esta función queda enganchada al onclick del botón de abajo.
// - La primera vez que se hace click, arranca la partida y el botón pasa
//   a decir "Reiniciar Juego" para siempre (ya no vuelve a decir "Iniciar").
// - Las siguientes veces que se hace click (partida en curso o terminada
//   por chocar con un cactus o responder mal), simplemente reinicia todo.
function manejarBotonJuego() {
    const boton = document.getElementById("btn-reiniciar");
    const inputNombre = document.getElementById("nombre-jugador");

    // Tomamos el nombre escrito en el input (o "Jugador" si lo dejaron vacío)
    // y lo normalizamos en el propio input para que se vea prolijo
    usuarioActual = inputNombre.value.trim() || "Jugador";
    inputNombre.value = usuarioActual;

    // Ocultamos la tabla de puntajes por si se estaba mostrando (fin de la partida anterior)
    document.getElementById("contenedor-puntajes").style.display = "none";

    if (!juegoIniciado) {
        juegoIniciado = true;
        boton.textContent = "Reiniciar Juego";
    }

    resetear(); // deja todas las variables en su estado inicial y arranca el juego
}


// ============================================================================
// LOOP PRINCIPAL: se ejecuta en cada frame (idealmente 60 veces por segundo)
// ============================================================================
async function actualizar() {
    // Nos volvemos a "anotar" para el siguiente frame antes que nada,
    // así el loop nunca se corta aunque el juego esté pausado/terminado.
    requestAnimationFrame(actualizar);

    // Si el juego todavía no arrancó o ya terminó (choque o respuesta
    // incorrecta), no se dibuja ni actualiza nada más: queda todo congelado
    // tal cual quedó en el último frame válido.
    if (juegoTerminado) {
        return;
    }

    // Limpiamos todo el canvas para volver a dibujar el frame desde cero
    contexto.clearRect(0, 0, tablero.width, tablero.height);

    // ------------------------------------------------------------------
    // FÍSICA DEL DINO (salto y caída)
    // ------------------------------------------------------------------
    // Todo esto queda protegido por "!enPausaPorHito" para que, mientras
    // se está mostrando una pregunta de trivia, el dino quede congelado
    // en el aire o en el piso tal cual estaba.
    if (!enPausaPorHito) {
        velocidadY += gravedad; // la gravedad acelera la caída en cada frame

        // El piso depende del alto actual del dino (cambia si está agachado)
        let pisoActual = altoTablero - dino.alto;

        // Sube o baja al dino según su velocidad vertical, sin dejar que
        // atraviese el piso (Math.min lo frena justo en pisoActual)
        dino.y = Math.min(dino.y + velocidadY, pisoActual);
    }

    let pisoActual = altoTablero - dino.alto;

    // ------------------------------------------------------------------
    // ANIMACIÓN DEL SPRITE DEL DINO
    // ------------------------------------------------------------------
    // Por defecto se dibuja el sprite "quieto" (imgDino). Si el dino está
    // tocando el piso y el juego no está pausado, alternamos entre los
    // 2 frames de animación de correr (agachado o parado) usando el
    // puntaje como "reloj" para saber cuándo cambiar de frame.
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

    // ------------------------------------------------------------------
    // CACTUS: movimiento, dibujado y detección de choques
    // ------------------------------------------------------------------
    for (let i = 0; i < listaCactus.length; i++) {
        let cactus = listaCactus[i];

        // Los cactus tampoco se mueven mientras hay una pregunta en pantalla
        if (!enPausaPorHito) {
            cactus.x += velocidadX;
        }
        contexto.drawImage(cactus.img, cactus.x, cactus.y, cactus.ancho, cactus.alto);

        // Si el dino choca contra este cactus, termina la partida
        if (!enPausaPorHito && !juegoTerminado && detectarColision(dino, cactus)) {
            juegoTerminado = true;
            terminarPartida(); // guarda el puntaje y muestra la tabla de mejores puntajes

            // Guardamos las medidas "viejas" del dino (por si estaba agachado,
            // que tiene otro ancho/alto) para poder borrar bien su silueta
            // del canvas y reposicionarlo con su tamaño normal antes de
            // dibujarlo muerto.
            let anchoViejo = dino.ancho;
            let xVieja = dino.x;
            let yVieja = dino.y;
            let altoViejo = dino.alto;

            let diferenciaAncho = anchoDino - anchoViejo;
            dino.x = dino.x - diferenciaAncho;

            let piesViejos = yVieja + altoViejo; // dónde estaban parados sus pies
            dino.ancho = anchoDino;
            dino.alto = altoDino;
            dino.y = piesViejos - dino.alto; // reubica el dino para que sus pies no se muevan

            // Borra la silueta vieja del dino (con un poco de margen extra)
            contexto.clearRect(xVieja - 2, yVieja - 2, anchoViejo + 4, altoViejo + 4);

            // Cambia el sprite a la versión "muerto" y lo dibuja
            imgDino.src = "./img/dino-dead.png";
            imgDino.onload = function () {
                contexto.drawImage(imgDino, dino.x, dino.y, dino.ancho, dino.alto);
            };
        }
    }

    // Si el choque de arriba terminó el juego, o si está pausado por una
    // pregunta, no seguimos generando puntaje ni evaluando el próximo hito.
    if (juegoTerminado || enPausaPorHito) {
        return;
    }

    // ------------------------------------------------------------------
    // HITOS DE TRIVIA: cada 1000 puntos aparece una pregunta
    // ------------------------------------------------------------------
    if (puntaje % 1000 === 0 && puntaje !== 0) {
        if (!yaPauso1000) {
            enPausaPorHito = true;
            yaPauso1000 = true;
            esta_correcto = false;
            id_actual = puntaje / 1000; // id de la pregunta a mostrar

            const pyr = await obtenerPreguntaYRespuestas(puntaje / 1000);

            // Mostramos la trivia y ocultamos el canvas del juego
            document.getElementById("contenedor-kahoot").style.display = "flex";
            document.getElementById("board").style.display = "none";

            // Restauramos los elementos internos de la trivia por si la
            // pregunta anterior los había ocultado al mostrar el resultado
            // (ver enviarRespuesta). Sin esto, a partir de la 2da pregunta
            // el timer, el texto y los botones quedaban invisibles.
            document.getElementById("kahoot-timer").style.display = "flex";
            document.querySelector(".kahoot-pregunta").style.display = "block";
            document.querySelector(".kahoot-grid").style.display = "grid";
            document.querySelector(".feedback-correcto").style.display = "none";
            document.querySelector(".feedback-incorrecto").style.display = "none";

            // Configuramos el contador regresivo en pantalla
            let tiempoRestante = 10;
            const componenteTimer = document.getElementById("kahoot-timer");
            componenteTimer.textContent = tiempoRestante;

            // Por seguridad, limpiamos cualquier contador viejo antes de arrancar uno nuevo
            if (triviaIntervalId) {
                clearInterval(triviaIntervalId);
            }

            // Extraemos el texto de la pregunta y las 4 respuestas posibles
            let pregunta = pyr.question.question;
            let respuestas = pyr.answers;

            document.getElementById("kahoot-pregunta-texto").textContent = pregunta;
            document.getElementById("kahoot-txt-1").textContent = respuestas[0].answer;
            document.getElementById("kahoot-txt-2").textContent = respuestas[1].answer;
            document.getElementById("kahoot-txt-3").textContent = respuestas[2].answer;
            document.getElementById("kahoot-txt-4").textContent = respuestas[3].answer;

            // Cuenta regresiva de 1 en 1 segundo. Si llega a 0 (o si el
            // jugador ya contestó bien) se corta el contador y se vuelve
            // al juego.
            triviaIntervalId = setInterval(() => {
                tiempoRestante--;
                componenteTimer.textContent = tiempoRestante;

                if (tiempoRestante <= 0 || esta_correcto == true) {
                    clearInterval(triviaIntervalId);
                    enPausaPorHito = false;
                    document.getElementById("contenedor-kahoot").style.display = "none";
                    document.getElementById("board").style.display = "block";
                }
            }, 1000);
        }
    } else {
        // Nos aseguramos de resetear la bandera del hito una vez que el
        // puntaje se aleja de un múltiplo de 1000, para que el próximo
        // hito pueda dispararse normalmente.
        yaPauso1000 = false;

        if (!enPausaPorHito) {
            document.getElementById("contenedor-kahoot").style.display = "none";
            document.getElementById("board").style.display = "block";
        }
    }

    // ------------------------------------------------------------------
    // PUNTAJE
    // ------------------------------------------------------------------
    contexto.fillStyle = "black";
    contexto.font = "20px courier";
    puntaje++;
    contexto.fillText(puntaje, 5, 20);
}


// ============================================================================
// CONTROLES: salto y agache
// ============================================================================

// Se ejecuta cada vez que se presiona una tecla
function moverDino(e) {
    // No hacemos nada si el juego no está corriendo o si hay una pregunta en pantalla
    if (juegoTerminado || enPausaPorHito) {
        return;
    }

    // Saltar: barra espaciadora o flecha arriba, solo si está parado en el piso
    if ((e.code == "Space" || e.code == "ArrowUp") && dino.y == dinoY && !estaAgachado) {
        velocidadY = -15; // impulso hacia arriba
    }

    // Agacharse en el piso
    if (e.code == "ArrowDown" && dino.y == dinoY) {
        estaAgachado = true;
        dino.alto = 45; // el dino agachado es más bajo...
        dino.ancho = 80; // ...y más ancho
        dino.y = altoTablero - dino.alto; // recalculamos su Y para que no quede flotando

    // Agacharse en el aire (baja más rápido, como en el juego original de Chrome)
    } else if (e.code == "ArrowDown" && dino.y != dinoY) {
        flechaEstaPresionada = true;
        velocidadY = 10; // acelera la caída

        clearInterval(estaVolando);
        // Revisamos cada 20ms si ya aterrizó mientras la flecha sigue apretada,
        // para recién ahí activar la animación/tamaño de agachado.
        estaVolando = setInterval(() => {
            if (dino.y == dinoY && flechaEstaPresionada) {
                estaAgachado = true;
                dino.alto = 45;
                dino.ancho = 80;
                clearInterval(estaVolando);
            } else if (dino.y == dinoY) {
                // Aterrizó pero ya soltó la flecha: no hacemos nada más
                clearInterval(estaVolando);
            }
        }, 20);
    }
}

// Se ejecuta cada vez que se suelta una tecla
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


// ============================================================================
// GENERACIÓN DE CACTUS
// ============================================================================
function colocarCactus() {
    // No generamos cactus si el juego no está corriendo o hay una pregunta activa
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

    // Elegimos aleatoriamente qué tamaño de cactus generar (o ninguno, 50% de las veces)
    let probabilidadCactus = Math.random();

    if (probabilidadCactus > 0.9) {
        // 10% de probabilidad: cactus grande (3 cuerpos)
        cactus.img = imgCactus3;
        cactus.ancho = anchoCactus3;
        listaCactus.push(cactus);
    } else if (probabilidadCactus > 0.7) {
        // 30% de probabilidad: cactus mediano (2 cuerpos)
        cactus.img = imgCactus2;
        cactus.ancho = anchoCactus2;
        listaCactus.push(cactus);
    } else if (probabilidadCactus > 0.5) {
        // 50% de probabilidad: cactus chico (1 cuerpo)
        cactus.img = imgCactus1;
        cactus.ancho = anchoCactus1;
        listaCactus.push(cactus);
    }
    // El 50% restante no genera ningún cactus ese segundo

    // Si hay más de 5 cactus guardados, borramos el más viejo para no acumular
    // en memoria cactus que ya salieron de pantalla
    if (listaCactus.length > 5) {
        listaCactus.shift();
    }
}


// ============================================================================
// DETECCIÓN DE COLISIONES (rectángulo contra rectángulo, AABB)
// ============================================================================
function detectarColision(a, b) {
    return (
        a.x < b.x + b.ancho &&  // el borde izquierdo de 'a' no pasó el borde derecho de 'b'
        a.x + a.ancho > b.x &&  // el borde derecho de 'a' ya pasó el borde izquierdo de 'b'
        a.y < b.y + b.alto &&   // el borde superior de 'a' no pasó el borde inferior de 'b'
        a.y + a.alto > b.y      // el borde inferior de 'a' ya pasó el borde superior de 'b'
    );
}


// ============================================================================
// REINICIO / INICIO DE PARTIDA
// ============================================================================
// Deja todas las variables del juego en su estado inicial y desactiva la
// pausa/fin de partida, para que el loop principal vuelva a moverse.
// La llama manejarBotonJuego() tanto para arrancar la primera partida
// como para reiniciar después de perder.
function resetear() {
    // Estado general
    juegoTerminado = false;
    puntaje = 0;
    partidaProcesada = false; // habilita a terminarPartida() para la nueva partida

    // Trivia: apagamos cualquier pausa/pregunta pendiente
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

    // Nos aseguramos de que la trivia y la tabla de puntajes estén ocultas
    // y el canvas del juego visible
    document.getElementById("contenedor-kahoot").style.display = "none";
    document.getElementById("contenedor-puntajes").style.display = "none";
    document.getElementById("board").style.display = "block";

    // Restauramos los elementos internos de la trivia por si habían quedado
    // ocultos desde una pregunta anterior (ver enviarRespuesta)
    document.getElementById("kahoot-timer").style.display = "flex";
    document.querySelector(".kahoot-pregunta").style.display = "block";
    document.querySelector(".kahoot-grid").style.display = "grid";
    document.querySelector(".feedback-correcto").style.display = "none";
    document.querySelector(".feedback-incorrecto").style.display = "none";

    // Cactus: arrancamos con la lista vacía
    listaCactus = [];

    // Dino: tamaño, posición y velocidad iniciales
    estaAgachado = false;
    flechaEstaPresionada = false;
    clearInterval(estaVolando);

    dino.ancho = anchoDino;
    dino.alto = altoDino;
    dino.x = dinoX;
    dino.y = altoTablero - altoDino;
    velocidadY = 0;

    // Por si el dino había quedado con el sprite de "muerto"
    imgDino.src = "./img/dino.png";
}


// ============================================================================
// COMUNICACIÓN CON LA API DE PREGUNTAS
// ============================================================================

// Pide a la API la pregunta (y sus 4 respuestas) correspondiente al hito actual
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

// Se ejecuta cuando el jugador hace click en una de las 4 opciones de la trivia
async function enviarRespuesta(respuestaSeleccionada) {
    // Frenamos el contador apenas se elige una respuesta
    if (triviaIntervalId) {
        clearInterval(triviaIntervalId);
    }

    // Ocultamos el timer, la pregunta y los botones: solo va a quedar
    // visible el cartel de resultado (Correcto/Incorrecto)
    document.getElementById("kahoot-timer").style.display = "none";
    document.querySelector(".kahoot-pregunta").style.display = "none";
    document.querySelector(".kahoot-grid").style.display = "none";

    const cartelCorrecto = document.querySelector(".feedback-correcto");
    const cartelIncorrecto = document.querySelector(".feedback-incorrecto");
    const textoIncorrecto = cartelIncorrecto.querySelector("h1");

    // Texto fijo para no depender de lo que haya quedado escrito en el DOM
    const TEXTO_INCORRECTO_DEFAULT = "Incorrecto";

    // Mostramos un estado neutro de "verificando" mientras llega la respuesta de la API
    cartelIncorrecto.style.display = "flex";
    textoIncorrecto.textContent = "Verificando... 🔍";
    cartelIncorrecto.style.backgroundColor = "#333333";

    const API_URL = `http://localhost:4000/questions/${id_actual}`;
    let esCorrecta = false;

    try {
        const response = await fetch(API_URL);
        const data = await response.json();

        // Las respuestas seleccionadas llegan como 1,2,3,4 desde los botones;
        // las convertimos a índice de arreglo (0,1,2,3)
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

    // Restauramos el texto y color originales del cartel de "Incorrecto"
    // (sin importar el resultado) antes de decidir cuál mostrar
    textoIncorrecto.textContent = TEXTO_INCORRECTO_DEFAULT;
    cartelIncorrecto.style.backgroundColor = "#e21b3c";

    if (esCorrecta) {
        cartelIncorrecto.style.display = "none";
        cartelCorrecto.style.display = "flex";
    } else {
        cartelCorrecto.style.display = "none";
        cartelIncorrecto.style.display = "flex";
    }

    // Dejamos 2 segundos el cartel de resultado en pantalla antes de continuar
    setTimeout(() => {
        cartelCorrecto.style.display = "none";
        cartelIncorrecto.style.display = "none";
        document.getElementById("contenedor-kahoot").style.display = "none";

        if (esCorrecta) {
            // Si acertó, el juego se descongela y sigue desde donde estaba
            enPausaPorHito = false;
            document.getElementById("board").style.display = "block";
        } else {
            // Si falló, la partida termina acá mismo: el loop principal queda
            // congelado y el juego NO se reinicia solo. El jugador tiene que
            // presionar el botón de abajo ("Reiniciar Juego") para volver a jugar.
            juegoTerminado = true;
            terminarPartida(); // guarda el puntaje y muestra la tabla de mejores puntajes
        }
    }, 2000);
}


// ============================================================================
// FIN DE PARTIDA Y TABLA DE MEJORES PUNTAJES
// ============================================================================

// Se llama una sola vez por partida (choque con cactus o respuesta
// incorrecta): guarda el puntaje obtenido y muestra la tabla de mejores
// puntajes del jugador actual.
function terminarPartida() {
    if (partidaProcesada) return; // ya se guardó/mostró para esta partida
    partidaProcesada = true;

    guardarPuntaje(usuarioActual, puntaje);
    mostrarTablaPuntajes();
}

// Lee del localStorage el objeto con los puntajes de todos los jugadores.
// Tiene la forma { "nombreJugador": [ { puntaje, fecha }, ... ], ... }
function obtenerPuntajesGuardados() {
    try {
        const datos = localStorage.getItem(CLAVE_STORAGE_PUNTAJES);
        return datos ? JSON.parse(datos) : {};
    } catch (error) {
        console.error("No se pudieron leer los puntajes guardados:", error);
        return {};
    }
}

// Agrega el puntaje de la partida recién terminada a la lista del jugador,
// la ordena de mayor a menor y se queda solo con el top 5.
function guardarPuntaje(usuario, puntajeObtenido) {
    const todosLosPuntajes = obtenerPuntajesGuardados();

    if (!todosLosPuntajes[usuario]) {
        todosLosPuntajes[usuario] = [];
    }

    todosLosPuntajes[usuario].push({
        puntaje: puntajeObtenido,
        fecha: new Date().toLocaleDateString()
    });

    todosLosPuntajes[usuario].sort((a, b) => b.puntaje - a.puntaje);
    todosLosPuntajes[usuario] = todosLosPuntajes[usuario].slice(0, 5);

    try {
        localStorage.setItem(CLAVE_STORAGE_PUNTAJES, JSON.stringify(todosLosPuntajes));
    } catch (error) {
        console.error("No se pudo guardar el puntaje:", error);
    }
}

// Arma y muestra la tabla con los mejores puntajes del jugador actual,
// ocultando el canvas del juego y la trivia mientras tanto.
function mostrarTablaPuntajes() {
    document.getElementById("board").style.display = "none";
    document.getElementById("contenedor-kahoot").style.display = "none";

    const todosLosPuntajes = obtenerPuntajesGuardados();
    const mejoresPuntajes = todosLosPuntajes[usuarioActual] || [];

    document.getElementById("puntajes-nombre-usuario").textContent = usuarioActual;
    document.getElementById("puntaje-actual-texto").textContent =
        `Tu puntaje de esta partida: ${puntaje}`;

    const cuerpoTabla = document.getElementById("tabla-puntajes-cuerpo");
    cuerpoTabla.innerHTML = ""; // limpiamos filas de una tabla anterior

    mejoresPuntajes.forEach((registro, indice) => {
        const fila = document.createElement("tr");
        fila.innerHTML = `
            <td>${indice + 1}</td>
            <td>${registro.puntaje}</td>
            <td>${registro.fecha}</td>
        `;
        cuerpoTabla.appendChild(fila);
    });

    document.getElementById("contenedor-puntajes").style.display = "flex";
}