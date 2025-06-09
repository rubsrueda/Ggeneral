// utils.js
// Funciones de utilidad general.

function logMessage(msg) {
    // Siempre mostrar el mensaje en la consola
    console.log(msg);
    /*
    const logContainer = document.getElementById('gameLogContainer');
    if (!logContainer) {
        return; // No hacer nada si el contenedor no existe
    }

    // Crear un nuevo elemento para el mensaje
    const messageElement = document.createElement('div');
    messageElement.className = 'log-message';
    messageElement.textContent = msg;

    // Añadir el nuevo mensaje al contenedor
    logContainer.prepend(messageElement); // prepend() lo añade al principio

    // Limitar el número de mensajes en pantalla para no saturar
    while (logContainer.children.length > 10) {
        logContainer.removeChild(logContainer.lastChild);
    }
    */
}

function hexDistance(r1, c1, r2, c2) {
    // Convertir coordenadas de offset (r, c) a cúbicas (q, r, s)
    const q1 = c1 - (r1 - (r1 & 1)) / 2;
    const r_coord1 = r1;

    const q2 = c2 - (r2 - (r2 & 1)) / 2;
    const r_coord2 = r2;

    // La distancia en un sistema cúbico es la mitad de la "distancia de Manhattan" de las 3 coordenadas.
    const dq = Math.abs(q1 - q2);
    const dr = Math.abs(r_coord1 - r_coord2);
    const ds = Math.abs((-q1 - r_coord1) - (-q2 - r_coord2));

    return (dq + dr + ds) / 2;
}

function getUnitOnHex(r, c) {
    if (!board || board.length === 0 || !board[0] || !units) {
        return null;
    }

    if (r < 0 || r >= board.length || c < 0 || c >= board[0].length) {
        return null;
    }

    return units.find(u => u.r === r && u.c === c && u.currentHealth > 0);
}

/**
 * Verifica si un hexágono está conectado a una fuente de suministro (ciudad/fortaleza)
 * del jugador a través de hexágonos propios o con caminos propios.
 * @param {number} startR - Fila del hexágono de la unidad.
 * @param {number} startC - Columna del hexágono de la unidad.
 * @param {number} playerId - ID del jugador dueño de la unidad.
 * @returns {boolean} - True si está suministrado, false si no.
 */
function isHexSupplied(startR, startC, playerId) {
    if (!board || board.length === 0) {
        console.error("[isHexSupplied] Tablero no inicializado.");
        return false;
    }
    const startHexData = board[startR]?.[startC];

    let queue = [{ r: startR, c: startC }];
    let visited = new Set();
    visited.add(`${startR},${startC}`);

    const maxSearchDepth = 50; 
    let iterations = 0;

    while (queue.length > 0 && iterations < maxSearchDepth * BOARD_ROWS * BOARD_COLS) {
        iterations++;
        const current = queue.shift();
        const currentHexData = board[current.r]?.[current.c];

        if (!currentHexData) continue;

        if (currentHexData.owner === playerId && (currentHexData.isCity || currentHexData.structure === "Fortaleza")) {
            console.log(`[isHexSupplied] Unidad en (${startR},${startC}) SÍ está suministrada. Ruta encontrada a fuente en (${current.r},${current.c}).`);
            return true;
        }

        const neighbors = getHexNeighbors(current.r, current.c);
        for (const neighborCoords of neighbors) {
            const neighborKey = `${neighborCoords.r},${neighborCoords.c}`;
            if (!visited.has(neighborKey)) {
                const neighborHexData = board[neighborCoords.r]?.[neighborCoords.c];
                if (neighborHexData) {
                    if (neighborHexData.owner === playerId || neighborHexData.structure === "Camino") {
                        visited.add(neighborKey);
                        queue.push({ r: neighborCoords.r, c: neighborCoords.c });
                    }
                }
            }
        }
    }
    console.log(`[isHexSupplied] Unidad en (${startR},${startC}) NO está suministrada (no se encontró ruta a ciudad/fortaleza propia).`);
    return false;
}