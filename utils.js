// utils.js
// Funciones de utilidad general.

let messageTimeout;
function logMessage(msg) {
    console.log(msg);
    if (gameMessagesMobile && gameMessagesMobile.querySelector('p')) {
        const p = gameMessagesMobile.querySelector('p');
        p.textContent = msg;
        gameMessagesMobile.classList.add('visible');
        
        clearTimeout(messageTimeout); // Limpiar timeout anterior si existe
        messageTimeout = setTimeout(() => {
            gameMessagesMobile.classList.remove('visible');
        }, 3000); // El mensaje desaparece después de 3 segundos
    } else {
        // Fallback si el elemento móvil no está, usar el antiguo
        if (typeof messagesDisplay !== 'undefined' && messagesDisplay) {
             messagesDisplay.textContent = msg;
        } else {
            console.warn("messagesDisplay (escritorio) ni gameMessagesMobile encontrados.");
        }
    }
}

function hexDistance(r1, c1, r2, c2) {
    // Conversión a coordenadas axiales/cúbicas para cálculo de distancia
    // q = col - (row - (row&1)) / 2
    // r = row
    // s = -q - r (en cúbicas)
    // Distancia = (abs(aq-bq) + abs(ar-br) + abs(as-bs)) / 2
    const aq = c1 - (r1 - (r1 & 1)) / 2;
    const ar = r1;
    // const as = -aq - ar; // No es necesario para esta fórmula de distancia

    const bq = c2 - (r2 - (r2 & 1)) / 2;
    const br = r2;
    // const bs = -bq - br;

    return (Math.abs(aq - bq) + Math.abs(aq + ar - (bq + br)) + Math.abs(ar - br)) / 2;
}

function getUnitOnHex(r, c) {
    // Valida que r y c estén dentro de los límites del tablero
    if (r < 0 || r >= BOARD_ROWS || c < 0 || c >= BOARD_COLS) return null;
    // Encuentra la unidad en las coordenadas dadas que tenga salud > 0
    return units.find(u => u.r === r && u.c === c && u.currentHealth > 0);
}