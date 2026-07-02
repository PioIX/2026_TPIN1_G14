// --- VARIABLES DEL TABLERO ---
let tablero;
let anchoTablero = 750;
let altoTablero = 250;
let contexto; // Se usa para dibujar adentro del canvas

// --- VARIABLES DEL DINO ---
let anchoDino = 60; 
let altoDino = 65;
let dinoX = 50;

// Al cambiar altoDino arriba, esta variable se calcula sola 
// y se asegura de que el dino siga pisando el suelo y no quede flotando.
let dinoY = altoTablero - altoDino; 

let imgDino; 
let imgDinoCorre1; 
let imgDinoCorre2; 

// Objeto dino con sus propiedades
let dino = {
    x : dinoX,
    y : dinoY,
    ancho : anchoDino,
    alto : altoDino
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
let velocidadY = 0;
let gravedad = 0.8;  

let juegoTerminado = false;
let puntaje = 0;

// Esta función se ejecuta apenas carga la página
window.onload = function() {
    tablero = document.getElementById("board"); //ref al canv
    tablero.height = altoTablero;
    tablero.width = anchoTablero;

    contexto = tablero.getContext("2d"); // Setea el contexto para poder dibujar en 2D

    // Cargar imagen del dinosaurio estático / saltando
    imgDino = new Image();
    imgDino.src = "./img/dino.png";
    imgDino.onload = function() {
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
    document.addEventListener("keydown", moverDino); // Escucha cuando tocás una tecla
    document.addEventListener("keydown", bajarDino); // Escucha cuando tocás una tecla
}

// Función principal que se repite constantemente para animar el juego
function actualizar() {
    requestAnimationFrame(actualizar);
    
    // Si perdiste, se frena acá y no actualiza más nada
    if (juegoTerminado) {
        return;
    }
    
    // Limpia el tablero en cada frame para volver a dibujar
    contexto.clearRect(0, 0, tablero.width, tablero.height);

    // --- Lógica del Dino ---
    velocidadY += gravedad;
    // Aplica la gravedad a la posición Y actual del dino, asegurándose de que no traspase el suelo
    dino.y = Math.min(dino.y + velocidadY, dinoY); 

    // Lógica para animar los sprites al correr
    let imagenActualDino = imgDino; // Por defecto usa la imagen estática (para cuando salta)

    if (dino.y == dinoY) { 
        // Si está tocando el piso, alternamos las imágenes de correr usando el puntaje como reloj
        if (Math.floor(puntaje / 10) % 2 === 0) {
            imagenActualDino = imgDinoCorre1;
        } else {
            imagenActualDino = imgDinoCorre2;
        }
    }

    // Dibuja al dino con el frame de animación que corresponda
    contexto.drawImage(imagenActualDino, dino.x, dino.y, dino.ancho, dino.alto);

    // --- Lógica de los Cactus ---
    for (let i = 0; i < listaCactus.length; i++) {
        let cactus = listaCactus[i];
        cactus.x += velocidadX; // Mueve el cactus hacia la izquierda
        contexto.drawImage(cactus.img, cactus.x, cactus.y, cactus.ancho, cactus.alto);

        // Chequear si el dino se chocó con este cactus
        if (detectarColision(dino, cactus)) {
            juegoTerminado = true; // Perdiste
            imgDino.src = "./img/dino-dead.png"; // Cambia la imagen a la del dino muerto
            imgDino.onload = function() {
                contexto.drawImage(imgDino, dino.x, dino.y, dino.ancho, dino.alto);
            }
        }
    }

    // --- Lógica del Puntaje ---
    contexto.fillStyle="black";
    contexto.font="20px courier";
    puntaje++; // Sube el puntaje constantemente
    contexto.fillText(puntaje, 5, 20); // Dibuja el puntaje arriba a la izquierda
}

// Función para manejar los saltos del dino
function moverDino(e) {
    if (juegoTerminado) {
        return; // Si ya perdiste, no te deja mover
    }

    // Si tocaste Espacio o Flecha Arriba Y el dino está tocando el suelo
    if ((e.code == "Space" || e.code == "ArrowUp") && dino.y == dinoY) {
        // ¡Saltar!
        velocidadY = -15; // Le da impulso hacia arriba
    }
    else if (e.code == "ArrowDown" && dino.y == dinoY) {
        velocidadY = 0; 
        imagenActualDino = "";
    }
}


// Función para generar cactus aleatorios
function colocarCactus() {
    if (juegoTerminado) {
        return;
    }

    // Objeto base para el nuevo cactus
    let cactus = {
        img : null,
        x : cactusX,
        y : cactusY,
        ancho : null,
        alto: altoCactus
    }

    // Genera un número aleatorio entre 0 y casi 1 (ej: 0.85)
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