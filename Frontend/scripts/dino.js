// --- VARIABLES GLOBALES ---
let esta_correcto = false;
// --- VARIABLES DEL TABLERO ---
let tablero;
let anchoTablero = 750;
let altoTablero = 250;
let contexto; // Se usa para dibujar adentro del canvas

// --- VARIABLES JUEGO ---
let enPausaPorHito = false; // Nos dice si el juego está congelado temporalmente
let yaPauso1000 = false;    // Evita que la pausa se active infinitamente en ese mismo hito
let hitoTimeoutId = null;   // Guardamos el id del setTimeout para poder cancelarlo en el reset
let triviaIntervalId = null;

// --- VARIABLES DEL DINO ---
let anchoDino = 60;
let altoDino = 65;
let dinoX = 50;
let estaAgachado = false
let dinoY = altoTablero - altoDino; //pos dino 
let estaVolando;

let imgDino; //sprite
let imgDinoCorre1; //sprite
let imgDinoCorre2; //sprite
let imgDinoCorreAgachado1; //sprite
let imgDinoCorreAgachado2; //sprite
let imgPajaro1; //strite
let imgPajaro2; //sprite

// --- VARIABLES CONTROLES ---
let flechaEstaPresionada;
// Objeto dino con sus propiedades
let dino = {
    x: dinoX,
    y: dinoY,
    ancho: anchoDino,
    alto: altoDino
}

// --- VARIABLES DE LOS CACTUS ---
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

// --- FÍSICA Y ESTADO DEL JUEGO ---
let velocidadX = -8; // Velocidad del juego
let velocidadY = 0; //mov vertical
let gravedad = 0.8;

let juegoTerminado = false;
let puntaje = 0;

// Esta función se ejecuta apenas carga la página
window.onload = function () {
    tablero = document.getElementById("board"); //ref al canv
    tablero.height = altoTablero;
    tablero.width = anchoTablero;

    contexto = tablero.getContext("2d"); // Setea el contexto para poder dibujar en 2D

    // Cargar imagen del dinosaurio estático / saltando
    imgDino = new Image();
    imgDino.src = "./img/dino.png";
    imgDino.onload = function () {
        contexto.drawImage(imgDino, dino.x, dino.y, dino.ancho, dino.alto);
    }

    // Cargar sprites del dino corriendo agachado
    imgDinoCorreAgachado1 = new Image();
    imgDinoCorreAgachado1.src = "./img/dino-duck1.png";

    imgDinoCorreAgachado2 = new Image();
    imgDinoCorreAgachado2.src = "./img/dino-duck2.png";

    // Cargar sprites del dino corriendo
    imgDinoCorre1 = new Image();
    imgDinoCorre1.src = "./img/dino-run1.png";

    imgDinoCorre2 = new Image();
    imgDinoCorre2.src = "./img/dino-run2.png";

    // Cargar imágenes de los cactus
    imgCactus1 = new Image();
    imgCactus1.src = "./img/cactus1.png";

    imgCactus2 = new Image();
    imgCactus2.src = "./img/cactus2.png";

    imgCactus3 = new Image();
    imgCactus3.src = "./img/cactus3.png";

    // Iniciar el loop del juego y los intervalos
    requestAnimationFrame(actualizar);
    setInterval(colocarCactus, 1000); // Se ejecuta cada 1000 milisegundos (1 segundo) para crear nuevos cactus
    document.addEventListener("keydown", moverDino); // Escucha cuando tocas
    document.addEventListener("keyup", soltarDino); // Escucha cuando soltas 
}

// Función principal que se repite constantemente para animar el juego
async function actualizar() {
    requestAnimationFrame(actualizar);

    // Si perdiste, se frena acá y no actualiza más nada
    if (juegoTerminado) {
        return;
    }

    // Limpia el tablero en cada frame para volver a dibujar
    contexto.clearRect(0, 0, tablero.width, tablero.height);

    // --- Lógica del Dino ---
    // BUGFIX: toda la física del dino queda envuelta en "!enPausaPorHito"
    // para que la pausa de hito realmente congele el juego.
    if (!enPausaPorHito) {
        velocidadY += gravedad;

        //Calcula donde está el piso según el alto actual del dino
        let pisoActual = altoTablero - dino.alto;

        // Aplica la gravedad usando el pisoActual en lugar del dinoY fijo
        dino.y = Math.min(dino.y + velocidadY, pisoActual);
    }

    let pisoActual = altoTablero - dino.alto;

    // Lógica para animar los sprites al correr
    let imagenActualDino = imgDino;

    // Revisamos si está tocando el pisoActual (solo animamos si no está pausado)
    if (!enPausaPorHito && dino.y == pisoActual) {
        if (Math.floor(puntaje / 10) % 2 === 0) {
            if (estaAgachado === false) {
                imagenActualDino = imgDinoCorre1;
            } else {
                imagenActualDino = imgDinoCorreAgachado1;
            }
        } else {
            if (estaAgachado === false) {
                imagenActualDino = imgDinoCorre2;
            } else {
                imagenActualDino = imgDinoCorreAgachado2;
            }
        }
    }

    // Dibuja al dino con el frame de animación que corresponda
    contexto.drawImage(imagenActualDino, dino.x, dino.y, dino.ancho, dino.alto);

    // --- Lógica de los Cactus ---
    for (let i = 0; i < listaCactus.length; i++) {
        let cactus = listaCactus[i];

        // BUGFIX: los cactus no se mueven ni chocan mientras está pausado por hito
        if (!enPausaPorHito) {
            cactus.x += velocidadX; // Mueve el cactus hacia la izquierda
        }
        contexto.drawImage(cactus.img, cactus.x, cactus.y, cactus.ancho, cactus.alto);

        if (!enPausaPorHito && detectarColision(dino, cactus)) {
            juegoTerminado = true;
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

            // Borramos solo el área vieja del dino (con un poquito de margen por las dudas)
            contexto.clearRect(xVieja - 2, yVieja - 2, anchoViejo + 4, altoViejo + 4);

            imgDino.src = "./img/dino-dead.png";
            imgDino.onload = function () {
                contexto.drawImage(imgDino, dino.x, dino.y, dino.ancho, dino.alto);
            }
        }
    }

    if (juegoTerminado || enPausaPorHito) {
        return; // Si está pausado, no actualiza puntaje ni genera cactus nuevos
    }

    if (puntaje % 1000 === 0 && puntaje !== 0) {
        if (!yaPauso1000) {
            enPausaPorHito = true;
            yaPauso1000 = true;
            esta_correcto = false; // Reinicia la variable de respuesta correcta para la nueva pregunta
            id_actual = puntaje / 1000; // Almacenamos el ID de la pregunta actual
            const pyr = await obtenerPreguntaYRespuestas(puntaje / 1000);
            console.log(pyr);
            // 1. Mostrar la trivia y ocultar el canvas del juego
            document.getElementById('contenedor-kahoot').style.display = 'block';
            document.getElementById('board').style.display = 'none';

            // 2. Configurar el tiempo inicial en la pantalla
            let tiempoRestante = 10;
            const componenteTimer = document.getElementById('kahoot-timer');
            componenteTimer.textContent = tiempoRestante;

            // 3. Limpiar cualquier contador viejo por seguridad antes de empezar
            if (triviaIntervalId) {
                clearInterval(triviaIntervalId);
            }

            // 1. Entramos al segundo nivel para obtener el TEXTO real de la pregunta
            let pregunta = pyr.question.question;

            // 2. Ahora respuestas ya no va a ser undefined, va a ser la lista con los 4 países
            let respuestas = pyr.answers;
            console.log(respuestas, pregunta);

            document.getElementById("kahoot-pregunta-texto").textContent = pregunta;
            document.getElementById("kahoot-txt-1").textContent = respuestas[0].answer;
            document.getElementById("kahoot-txt-2").textContent = respuestas[1].answer;
            document.getElementById("kahoot-txt-3").textContent = respuestas[2].answer;
            document.getElementById("kahoot-txt-4").textContent = respuestas[3].answer;

            // 4. Iniciar el contador regresivo de 1 en 1 segundo (1000ms)
            triviaIntervalId = setInterval(() => {
                tiempoRestante--;
                componenteTimer.textContent = tiempoRestante; // Actualiza el número en el HTML

                // Cuando el tiempo llega a cero, frena el reloj y vuelve al juego
                if (tiempoRestante <= 0 || esta_correcto == true) {
                    clearInterval(triviaIntervalId);
                    enPausaPorHito = false;
                    document.getElementById('contenedor-kahoot').style.display = 'none';
                    document.getElementById('board').style.display = 'block';
                }
            }, 1000);
        }
    } else {
        yaPauso1000 = false;

        // Si no estamos en el hito, nos aseguramos de que el juego se vea y la trivia esté oculta
        if (!enPausaPorHito) {
            document.getElementById('contenedor-kahoot').style.display = 'none';
            document.getElementById('board').style.display = 'block';
        }
    }

    // --- Lógica del Puntaje ---
    contexto.fillStyle = "black";
    contexto.font = "20px courier";
    puntaje++; // Sube el puntaje constantemente
    contexto.fillText(puntaje, 5, 20); // Dibuja el puntaje arriba a la izquierda
}

// ----------------------- Funciones de agachado y salto ------------------------

function moverDino(e) {
    if (juegoTerminado || enPausaPorHito) {
        return;
    }

    // Saltar
    if ((e.code == "Space" || e.code == "ArrowUp") && dino.y == dinoY && !estaAgachado) { //funccion para saltar
        velocidadY = -15; //genera salto
    }
    //criminal este comentado es horrible pero bueno
    // Agacharse
    if (e.code == "ArrowDown" && dino.y == dinoY) { //si se toca flecha abajo y se esta tocando el suelo
        estaAgachado = true; // cambiamos varia ble para q se ejecutte animacion
        dino.alto = 45; //ajustamos tamaño dino
        dino.ancho = 80; //lo mismo de arriba
        dino.y = altoTablero - dino.alto; //recalculamos asi no queda flotando
    } else if (e.code == "ArrowDown" && dino.y != dinoY) { //si se toca flecha abajo y se esta en el aire
        flechaEstaPresionada = true;
        velocidadY = 10; //En el juego original cuando se aprieta flecha bajo el dino baja mas rapido si esta en  el aikre esto lo hace
        clearInterval(estaVolando);
        estaVolando = setInterval(() => { //set interval permite establecer un tiempo entre cada ejecucion los argumentos usados son el codigo a ejecutar y los milisegundos entre ejecucion
            if (dino.y == dinoY && flechaEstaPresionada) {//solo agachamos SI la flecha sigue apretada
                estaAgachado = true; //si es verdad pone a esta agachado como verdadero lo cual hara que se agache el dino (funccion animaciones : 125-139)
                dino.alto = 45; //ajustamos tamaño dino
                dino.ancho = 80; //lo mismo de arriba
                clearInterval(estaVolando); //termina el "bucle" por asi decirlo
            } else if (dino.y == dinoY) { // si aterriza pero no solto la flecha abajo no hacemos nada y terminamos el intervalo
                clearInterval(estaVolando);
            }
        }, 20); //se ejecuta cada 20 milisegundoss
    }
}

// soltar agachado
function soltarDino(e) {
    if (juegoTerminado) return;

    if (e.code == "ArrowDown") {
        flechaEstaPresionada = false; //se aclara ya nio esta apretada
        clearInterval(estaVolando); //se termina cualquier intervalo
        estaAgachado = false;//Cambiamos la global y reiniciamos al default las variables del dino
        dino.alto = altoDino;
        dino.ancho = anchoDino;
    }
}


// Función para generar cactus aleatorios
function colocarCactus() {
    if (juegoTerminado || enPausaPorHito) {
        return;
    }

    // Objeto base para el nuevo cactus
    let cactus = {
        img: null,
        x: cactusX,
        y: cactusY,
        ancho: null,
        alto: altoCactus
    }

    // Genera un número aleatorio entre 0 y casi 1
    let probabilidadCactus = Math.random();

    // Dependiendo del número aleatorio, elige el tamaño del cactus
    if (probabilidadCactus > .90) { // 10% de probabilidad: cactus grande (de a 3)
        cactus.img = imgCactus3;
        cactus.ancho = anchoCactus3;
        listaCactus.push(cactus);
    }
    else if (probabilidadCactus > .70) { // 30% de probabilidad: cactus mediano (de a 2)
        cactus.img = imgCactus2;
        cactus.ancho = anchoCactus2;
        listaCactus.push(cactus);
    }
    else if (probabilidadCactus > .50) { // 50% de probabilidad: cactus chico (de a 1)
        cactus.img = imgCactus1;
        cactus.ancho = anchoCactus1;
        listaCactus.push(cactus);
    }

    // Si el arreglo tiene más de 5 cactus, borra el más viejo
    // Esto es para que la memoria de la compu no explote guardando cactus que ya ni se ven
    if (listaCactus.length > 5) {
        listaCactus.shift(); // Elimina el primer elemento del arreglo
    }
}

// Función matemática para saber si dos rectángulos (dino y cactus) se están tocando
function detectarColision(a, b) {
    return a.x < b.x + b.ancho &&   // El borde izquierdo de 'a' no pasa el borde derecho de 'b'
        a.x + a.ancho > b.x &&   // El borde derecho de 'a' ya pasó el borde izquierdo de 'b'
        a.y < b.y + b.alto &&    // El borde superior de 'a' no pasa el borde inferior de 'b'
        a.y + a.alto > b.y;      // El borde inferior de 'a' ya pasó el borde superior de 'b'
}

function resetear() {
    //Reiniciar estado del juego y puntaje
    juegoTerminado = false;
    puntaje = 0;

    // BUGFIX: si se resetea mientras estaba pausado por hito, hay que
    // apagar la pausa y cancelar el timeout pendiente, si no el juego
    // arranca congelado (o se descongela solo en un momento random).
    enPausaPorHito = false;
    yaPauso1000 = false;
    if (hitoTimeoutId !== null) {
        clearTimeout(hitoTimeoutId);
        hitoTimeoutId = null;
    }

    //Limpiar la lista de cactus para que empiece vacío
    listaCactus = [];

    //Devolver al dino a sus dimensiones y posición iniciales
    estaAgachado = false;
    flechaEstaPresionada = false;
    clearInterval(estaVolando);

    dino.ancho = anchoDino;
    dino.alto = altoDino;
    dino.x = dinoX;
    dino.y = altoTablero - altoDino;

    velocidadY = 0; // Resetear velocidad de salto o caida

    //Restaurar la imagen original del dino (sacar la de muerto)
    imgDino.src = "./img/dino.png";
}

async function obtenerPreguntaYRespuestas(id) {
    const API_URL = `http://localhost:4000/questions/${id}`;
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Error en la petición: ${response.status}`);
        }
        const data = await response.json();
        return data;

    } catch (error) {
        console.error("Hubo un problema al obtener los datos:", error.message);

        return {
            error: true,
            message: error.message
        };
    }
}

async function enviarRespuesta(respuestaSeleccionada) {
    const API_URL = `http://localhost:4000/questions/${id_actual}`;
    console.log(id_actual, respuestaSeleccionada);
    try {
        const response = await fetch(API_URL);
        console.log("fetch")
        const data = await response.json();
        console.log("data");


        let as = respuestaSeleccionada - 1;
        console.log("Respuesta seleccionada:", respuestaSeleccionada);
        console.log(data.answers);
        let respuestaUsuario = data.answers[as];
        if (respuestaUsuario.is_correct === 1) {
            console.log("Respuesta correcta");
            return esta_correcto = true;
        }


    } catch (error) {
        console.error("Hubo un problema al obtener los datos");


        return {
            error: true,
            message: error.message
        };
    }
}
