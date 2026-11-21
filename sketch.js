/* © 2026, Rommina Dolorier todos los derechos reservados.
"Creado para OFF, Chelas y código creativo"

–––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
*/
// Espacio horizontal entre letras en píxeles; usa 0 para que se toquen.
let espaciadoLetras = 0;
// Letra o texto que se repite en la retícula (por ejemplo 'a', 'R' o 'hola').
let textoPatron = '.pe';
// Intensidad del estirado: 0 lo desactiva, 1 lo hace dramático y los valores
// intermedios producen un efecto más sutil.
let intensidadEstirado = 0.9;

let tipografia;
let modeloMano;
let camara;
// Posición objetivo (0 a 1) y posición suavizada que controla el estirado.
let posicionMouseX = 0.5;
let posicionMouseY = 0.5;
let suaveX = 0.5;
let suaveY = 0.5;
// Suavizado (ms) al seguir la mano y al volver al centro cuando no se detecta.
const suavizadoManoMs = 30;
const suavizadoRetornoMs = 500;
let detectando = false; // evita acumular detecciones pendientes
let ultimaManoMs = -Infinity;
const tiempoSinManoMs = 300;

// Calcula tamaños de celda que suman exactamente "total". Las celdas cercanas
// al mouse (posicion, de 0 a 1) son grandes y las lejanas se comprimen.
function calcularTamanos(cantidad, total, posicion, intensidad) {
    const pesos = [];
    let suma = 0;
    for (let i = 0; i < cantidad; i++) {
        const d = abs((i + 0.5) / cantidad - posicion); // distancia 0..1
        const peso = lerp(1, 0.1 + pow(1 - d, 3), intensidad);
        pesos.push(peso);
        suma += peso;
    }
    return pesos.map(p => (p / suma) * total);
}

function preload(){
    tipografia = loadFont('assets/ABCCameraTrial-RegularItalic.otf');
    modeloMano = ml5.handPose({
        maxHands: 1,
        modelType: 'lite',
        runtime: 'mediapipe',
        flipped: false
    });
}

function setup(){
    createCanvas(windowWidth, windowHeight);
    camara = createCapture(VIDEO);
    camara.elt.removeAttribute('width');
    camara.elt.removeAttribute('height');
    camara.elt.setAttribute('playsinline', '');
    camara.elt.style.cssText = 'position:fixed;left:16px;bottom:16px;width:auto;' +
        'display:block;filter:grayscale(1);transform:scaleX(-1);pointer-events:none;';
    ajustarPreview();
}

function ajustarPreview() {
    // Alto aproximado de 1/9 de la ventana; el ancho sigue la proporción del video
    if (camara) camara.elt.style.height = (windowHeight / 9) + 'px';
}

// Una sola detección a la vez: si la anterior no terminó, se omite el cuadro.
function detectarMano() {
    if (detectando || camara.elt.readyState < 2) return;
    detectando = true;
    modeloMano.detect(camara.elt).then(manos => {
        if (manos.length > 0) {
            const p = manos[0].keypoints;
            // Centro de la palma: promedio de la muñeca y la base de los 4 dedos
            const idx = [0, 5, 9, 13, 17];
            let cx = 0, cy = 0;
            idx.forEach(i => { cx += p[i].x; cy += p[i].y; });
            cx /= idx.length;
            cy /= idx.length;
            // Se invierte X para coincidir con el preview en espejo
            posicionMouseX = constrain(1 - cx / camara.elt.videoWidth, 0, 1);
            posicionMouseY = constrain(cy / camara.elt.videoHeight, 0, 1);
            ultimaManoMs = millis();
        }
    }).catch(() => {}).finally(() => { detectando = false; });
}

function draw(){
    background('#0000ff');
    fill('#ff0000');
    noStroke();
    textFont(tipografia);
    textSize(150);
    textAlign(LEFT, BASELINE);

    const intensidad = constrain(intensidadEstirado, 0, 1);
    detectarMano();
    // Sin mano: el objetivo vuelve suavemente al centro
    const hayMano = millis() - ultimaManoMs < tiempoSinManoMs;
    const objetivoX = hayMano ? posicionMouseX : 0.5;
    const objetivoY = hayMano ? posicionMouseY : 0.5;
    const alfa = 1 - exp(-deltaTime / (hayMano ? suavizadoManoMs : suavizadoRetornoMs));
    suaveX = lerp(suaveX, objetivoX, alfa);
    suaveY = lerp(suaveY, objetivoY, alfa);

    // Cantidad fija de columnas y filas, ajustadas al canvas
    const tamanoBaseCelda = 180;
    const columnas = max(1, round(width / tamanoBaseCelda));
    const filas = max(1, round(height / tamanoBaseCelda));
    const anchos = calcularTamanos(columnas, width, suaveX, intensidad);
    const altos = calcularTamanos(filas, height, suaveY, intensidad);
    const limitesLetra = tipografia.textBounds(textoPatron, 0, 0, 150);

    let y = 0;
    for (let fila = 0; fila < filas; fila++) {
        const escalaY = altos[fila] / limitesLetra.h;
        let x = 0;
        for (let columna = 0; columna < columnas; columna++) {
            const anchoLetra = max(0.01, anchos[columna] - espaciadoLetras);
            const escalaX = anchoLetra / limitesLetra.w;
            push();
            translate(x, y);
            scale(escalaX, escalaY);
            text(textoPatron, -limitesLetra.x, -limitesLetra.y);
            pop();
            x += anchos[columna];
        }
        y += altos[fila];
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    ajustarPreview();
}
