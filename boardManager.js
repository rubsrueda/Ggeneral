// boardManager.js
// Funciones para crear, gestionar y renderizar el tablero y sus hexágonos.

let panStartTimestamp = 0;
let hasMovedEnoughForPan = false;
const PAN_MOVE_THRESHOLD = 5; 

function initializeNewGameBoardDOMAndData(selectedResourceLevel = 'min') {
    console.log("%%%%% BOARDMANAGER.JS --- DEBUG ---> initializeNewGameBoardDOMAndData HA SIDO LLAMADA %%%%%");
    // Resetear transformaciones para el paneo
    currentBoardTranslateX = 0; // Asumiendo que esta es la global de domElements.js
    currentBoardTranslateY = 0; // Asumiendo que esta es la global de domElements.js
    if (gameBoard) { 
        gameBoard.style.transform = `translate(0px, 0px)`;
    }

    if (!gameBoard) { console.error("CRITICAL: gameBoard element not found in DOM."); return; }
    gameBoard.innerHTML = '';

    // ----- INICIO DE CAMBIO DRÁSTICO PARA DEPURACIÓN -----
    console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    console.log('!!! ESTOY AL INICIO DE initializeNewGameBoardDOMAndData !!!');
    console.log('!!! VERSIÓN DEL CÓDIGO: XXX (Reemplaza XXX con un número o fecha) !!!');
    console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    // alert('DEBUG: Dentro de initializeNewGameBoardDOMAndData - VERSIÓN XXX'); // Puedes usar alert si quieres algo muy obvio
    // ----- FIN DE CAMBIO DRÁSTICO PARA DEPURACIÓN -----


    // Usar constantes globales BOARD_ROWS y BOARD_COLS para escaramuza
    board = Array(BOARD_ROWS).fill(null).map(() => Array(BOARD_COLS).fill(null));
    // ... el resto de tu función ...

    // ... al final de la función, justo ANTES de la llave de cierre } ...
    // MANTÉN los logs de depuración que te pedí antes alrededor de initializeBoardPanning
    console.log('DEBUG: ANTES DE INTENTAR LLAMAR A initializeBoardPanning. Tipo de initializeBoardPanning:', typeof initializeBoardPanning);
    
    if (typeof initializeBoardPanning === 'function') {
        try {
            console.log('DEBUG: LLAMANDO A initializeBoardPanning DENTRO DE TRY...');
            initializeBoardPanning();
            console.log('DEBUG: LLAMADA A initializeBoardPanning COMPLETADA.');
        } catch (error) {
            console.error('DEBUG: ERROR AL LLAMAR O DENTRO DE initializeBoardPanning:', error);
        }
    } else {
        console.error('DEBUG: initializeBoardPanning NO ES UNA FUNCIÓN O NO ESTÁ DEFINIDA EN ESTE PUNTO.');
    }
}



function initializeBoardPanning() {
     console.log("PANNING_INIT_CALLED");
     
     if (!gameBoard || !gameBoard.parentElement) {
        // ...
        return;
    }

    const viewport = gameBoard.parentElement;

    // Estas variables deben ser locales a boardManager.js o accesibles de alguna manera
    // Si lastTouchX_pan_bm y lastTouchY_pan_bm no están ya declaradas arriba en el script,
    // decláralas aquí con let:
    let lastTouchX_pan_bm = null; 
    let lastTouchY_pan_bm = null;
    let touchStartR = -1, touchStartC = -1; // Para detectar si el clic es en el mismo hex

    function applyTransformAndLimits() {
        console.log("******************************************************");
        console.log("DEBUG APPLY LIMITS:");
        console.log("gameBoard.offsetWidth (boardW):", gameBoard.offsetWidth);
        console.log("gameBoard.offsetHeight (boardH):", gameBoard.offsetHeight);
        console.log("viewport.clientWidth (viewportW):", viewport.clientWidth);
        console.log("viewport.clientHeight (viewportH):", viewport.clientHeight);
        console.log("******************************************************");

        
        const boardWidth = gameBoard.offsetWidth;
        const boardHeight = gameBoard.offsetHeight;
        const viewportWidth = viewport.clientWidth;
        const viewportHeight = viewport.clientHeight;

        console.log('[APPLY LIMITS] boardW:', boardWidth, 'boardH:', boardHeight, 'viewportW:', viewportWidth, 'viewportH:', viewportHeight);

        let targetX = currentBoardTranslateX; // Global de domElements.js
        let targetY = currentBoardTranslateY; // Global de domElements.js

        if (boardWidth > viewportWidth) {
            targetX = Math.max(targetX, viewportWidth - boardWidth);
            targetX = Math.min(targetX, 0);
        } else {
            targetX = (viewportWidth - boardWidth) / 2;
        }

        if (boardHeight > viewportHeight) {
            targetY = Math.max(targetY, viewportHeight - boardHeight);
            targetY = Math.min(targetY, 0);
        } else {
            targetY = (viewportHeight - boardHeight) / 2;
        }
        
        currentBoardTranslateX = targetX; // Global
        currentBoardTranslateY = targetY; // Global
        gameBoard.style.transform = `translate(${currentBoardTranslateX}px, ${currentBoardTranslateY}px)`;
    }

    // --- Panning con Ratón ---
    gameBoard.addEventListener('mousedown', function(e) {
        if (e.button !== 0 || placementMode.active) return;
        
        isPanning = false; // Global
        hasMovedEnoughForPan = false; // Global o local a boardManager
        panStartTimestamp = Date.now(); // Global o local a boardManager

        boardInitialX = currentBoardTranslateX; // Global
        boardInitialY = currentBoardTranslateY; // Global
        panStartX = e.clientX; // Global
        panStartY = e.clientY; // Global
        
        console.log('[PAN DEBUG] mousedown - Posibles inicio de paneo. Coords:', e.clientX, e.clientY);
    });

    document.addEventListener('mousemove', function(e) {
        if (panStartX === 0 && panStartY === 0 && !isPanning) return;

        if (!isPanning && !hasMovedEnoughForPan) {
            const deltaX = Math.abs(e.clientX - panStartX);
            const deltaY = Math.abs(e.clientY - panStartY);
            if (deltaX > PAN_MOVE_THRESHOLD || deltaY > PAN_MOVE_THRESHOLD) {
                hasMovedEnoughForPan = true;
                isPanning = true; // Global
                gameBoard.classList.add('grabbing');
                console.log('[PAN DEBUG] mousemove - Paneo INICIADO (movimiento detectado)');
            } else {
                return;
            }
        }

        if (!isPanning) return;

        const dx = e.clientX - panStartX;
        const dy = e.clientY - panStartY;
        currentBoardTranslateX = boardInitialX + dx; // Global
        currentBoardTranslateY = boardInitialY + dy; // Global
        applyTransformAndLimits();
        // console.log('[PAN DEBUG] mousemove - PANEANDO');
    });

    function stopPanning() {
        let wasPanningState = isPanning; // Captura el estado de la variable global

        if (isPanning) { // Usa la global
            isPanning = false; // Modifica la global
            gameBoard.classList.remove('grabbing');
            console.log('[PAN DEBUG] Paneo DETENIDO');
        }
        hasMovedEnoughForPan = false; // Global o local a boardManager
        panStartX = 0; // Global
        panStartY = 0; // Global

        return wasPanningState;
    }

    document.addEventListener('mouseup', function(e) {
        if (e.button !== 0) return;
        const wasPanningBeforeStop = stopPanning();
        if (!wasPanningBeforeStop) {
            console.log('[PAN DEBUG] mouseup - NO fue paneo, podría ser click en hex.');
        }
    });

    document.addEventListener('mouseleave', function(e) {
        // stopPanning(); // Considera si realmente quieres esto
    });

    // --- Panning Táctil ---
    gameBoard.addEventListener('touchstart', function(e) {
        console.log('[PAN DEBUG] touchstart - touches:', e.touches.length, 'placementMode:', placementMode.active);
        if (placementMode.active || e.touches.length !== 1) {
            if (e.touches.length !== 1 && isPanning) stopPanning(); // Detener si hay multitouch y estaba paneando
            return;
        }
        
        isPanning = false; // Global
        hasMovedEnoughForPan = false; // Global o local a boardManager
        panStartTimestamp = Date.now(); // Global o local a boardManager

        const touch = e.touches[0];
        boardInitialX = currentBoardTranslateX; // Global
        boardInitialY = currentBoardTranslateY; // Global
        panStartX = touch.clientX; // Global
        panStartY = touch.clientY; // Global
        lastTouchX_pan_bm = touch.clientX; // Local a boardManager
        lastTouchY_pan_bm = touch.clientY; // Local a boardManager

        const targetElement = e.target.closest('.hex');
        if (targetElement) {
            touchStartR = parseInt(targetElement.dataset.r);
            touchStartC = parseInt(targetElement.dataset.c);
        } else {
            touchStartR = -1;
            touchStartC = -1;
        }
        console.log(`[PAN DEBUG] touchstart - Posible paneo/tap. Coords: (${panStartX}, ${panStartY}), Hex: (${touchStartR},${touchStartC})`);
    }, { passive: true });

    gameBoard.addEventListener('touchmove', function(e) {
        if (e.touches.length !== 1) return;

        if (!isPanning && !hasMovedEnoughForPan) {
            const deltaX = Math.abs(e.touches[0].clientX - panStartX); // panStartX es Global
            const deltaY = Math.abs(e.touches[0].clientY - panStartY); // panStartY es Global

            if (deltaX > PAN_MOVE_THRESHOLD || deltaY > PAN_MOVE_THRESHOLD) {
                hasMovedEnoughForPan = true; // Global o local
                isPanning = true; // Global
                gameBoard.classList.add('grabbing');
                console.log('[PAN DEBUG] touchmove - Paneo INICIADO (movimiento detectado)');
                if (e.cancelable) e.preventDefault();
            } else {
                return;
            }
        }
        
        if (!isPanning) return; // Global
        if (e.cancelable) e.preventDefault();

        const touch = e.touches[0];
        const dx = touch.clientX - lastTouchX_pan_bm; // lastTouch... es local
        const dy = touch.clientY - lastTouchY_pan_bm; // lastTouch... es local
        
        currentBoardTranslateX += dx; // Global
        currentBoardTranslateY += dy; // Global

        applyTransformAndLimits();
        
        lastTouchX_pan_bm = touch.clientX; // local
        lastTouchY_pan_bm = touch.clientY; // local
    }, { passive: false });

    gameBoard.addEventListener('touchend', function(e) {
        const wasPanningBeforeStop = isPanning; // Global
        
        stopPanning();

        if (wasPanningBeforeStop) {
            console.log('[PAN DEBUG] touchend - FUE un paneo. Evitar onHexClick.');
            if (typeof gameState !== 'undefined') { // Asegurar que gameState existe
                gameState.justPanned = true; 
                setTimeout(() => { if (typeof gameState !== 'undefined') gameState.justPanned = false; }, 50);
            } else {
                console.warn("[PAN DEBUG] gameState no definido, no se pudo setear justPanned.");
            }
        } else {
            console.log('[PAN DEBUG] touchend - NO fue paneo, fue un tap.');
            const targetElement = e.target.closest('.hex');
            if (targetElement) {
                const r = parseInt(targetElement.dataset.r);
                const c = parseInt(targetElement.dataset.c);
                if (r === touchStartR && c === touchStartC) {
                     console.log(`[PAN DEBUG] touchend - Tap detectado en hex (${r},${c}). onHexClick debería ejecutarse.`);
                }
            }
        }
        
        lastTouchX_pan_bm = null;
        lastTouchY_pan_bm = null;
        touchStartR = -1;
        touchStartC = -1;
    });

    gameBoard.addEventListener('touchcancel', function(e) {
        console.log('[PAN DEBUG] touchcancel');
        stopPanning();
        lastTouchX_pan_bm = null;
        lastTouchY_pan_bm = null;
        touchStartR = -1;
        touchStartC = -1;
        if (typeof gameState !== 'undefined') gameState.justPanned = false;
    });

    console.log("BoardManager: Panning listeners (con lógica tap/pan) inicializados.");
    applyTransformAndLimits();
}

function createHexDOMElementWithListener(r, c) {
    const hexEl = document.createElement('div');
    hexEl.classList.add('hex');
    hexEl.dataset.r = r;
    hexEl.dataset.c = c;

    // Asumimos que HEX_WIDTH y HEX_VERT_SPACING son constantes globales de constants.js
    const xPos = c * HEX_WIDTH + (r % 2 !== 0 ? HEX_WIDTH / 2 : 0);
    const yPos = r * HEX_VERT_SPACING;
    hexEl.style.left = `${xPos}px`;
    hexEl.style.top = `${yPos}px`;

    hexEl.addEventListener('click', () => onHexClick(r, c)); // onHexClick definida en main.js
    return hexEl;
}

// --- INICIALIZACIÓN PARA PARTIDAS DE ESCARAMUZA (EXISTENTE) ---
function initializeNewGameBoardDOMAndData(selectedResourceLevel = 'min') {
    currentBoardTranslateX = 0;
    currentBoardTranslateY = 0;
    if (gameBoard) { // Aplicar reseteo visual inmediato
        gameBoard.style.transform = `translate(0px, 0px)`;
    }

    if (!gameBoard) { console.error("CRITICAL: gameBoard element not found in DOM."); return; }
    gameBoard.innerHTML = '';

    // Usar constantes globales BOARD_ROWS y BOARD_COLS para escaramuza
    board = Array(BOARD_ROWS).fill(null).map(() => Array(BOARD_COLS).fill(null));
    gameState.cities = []; // Limpiar ciudades del estado global para una nueva partida

    gameBoard.style.width = `${BOARD_COLS * HEX_WIDTH + HEX_WIDTH / 2}px`;
    gameBoard.style.height = `${BOARD_ROWS * HEX_VERT_SPACING + HEX_HEIGHT * 0.25}px`;

    console.log(`[BOARD SIZE DEBUG] gameBoard.style.width SET TO: ${gameBoard.style.width}, gameBoard.style.height SET TO: ${gameBoard.style.height}`);

    for (let r = 0; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
            const hexElement = createHexDOMElementWithListener(r, c);
            gameBoard.appendChild(hexElement);
            board[r][c] = {
                element: hexElement, terrain: 'plains', owner: null, structure: null,
                isCity: false, isCapital: false, resourceNode: null,
                visibility: { player1: 'visible', player2: 'visible' }, unit: null
            };
        }
    }

    // Marcar que NO es una batalla de campaña
    if (gameState) { // Asegurarse que gameState está definido
        gameState.isCampaignBattle = false;
        gameState.currentScenarioData = null;
        gameState.currentMapData = null;
    }


    // Definir Ciudades Capitales (fijas para escaramuza)
    addCityToBoardData(1, 2, 1, "Capital P1 (Escaramuza)", true);
    addCityToBoardData(BOARD_ROWS - 2, BOARD_COLS - 3, 2, "Capital P2 (Escaramuza)", true);

    generateRandomResourceNodes(selectedResourceLevel); // Para escaramuzas

    renderFullBoardVisualState();
    updateFogOfWar(); // Aplicar niebla de guerra inicial
    initializeBoardPanning(); // <--- AÑADE ESTA LLAMADA AQUÍ

// ----- INICIO DE CAMBIO PARA DEPURACIÓN -----
    console.log('DEBUG: ANTES DE INTENTAR LLAMAR A initializeBoardPanning. Tipo de initializeBoardPanning:', typeof initializeBoardPanning);
    
    if (typeof initializeBoardPanning === 'function') {
        try {
            console.log('DEBUG: LLAMANDO A initializeBoardPanning DENTRO DE TRY...');
            initializeBoardPanning();
            console.log('DEBUG: LLAMADA A initializeBoardPanning COMPLETADA.');
        } catch (error) {
            console.error('DEBUG: ERROR AL LLAMAR O DENTRO DE initializeBoardPanning:', error);
        }
    } else {
        console.error('DEBUG: initializeBoardPanning NO ES UNA FUNCIÓN O NO ESTÁ DEFINIDA EN ESTE PUNTO.');
    }
    // ----- FIN DE CAMBIO PARA DEPURACIÓN -----
    
}



// --- NUEVA FUNCIÓN PARA INICIALIZAR TABLERO PARA ESCENARIOS DE CAMPAÑA ---
async function initializeGameBoardForScenario(mapTacticalData, scenarioData) {
    currentBoardTranslateX = 0;
    currentBoardTranslateY = 0;
    if (gameBoard) { // Aplicar reseteo visual inmediato
        gameBoard.style.transform = `translate(0px, 0px)`;
    }
    
    if (!gameBoard) { console.error("CRITICAL: gameBoard element not found in DOM for scenario."); return; }
    gameBoard.innerHTML = ''; // Limpiar tablero existente

    const R = mapTacticalData.rows;
    const C = mapTacticalData.cols;

    // Actualizar constantes globales o pasarlas a funciones si es necesario
    // Por ahora, asumiremos que las funciones de renderizado pueden acceder a R y C
    // o que `board.length` y `board[0].length` se usarán.
    // TODO: Considerar si BOARD_ROWS y BOARD_COLS globales deben reflejar el mapa actual.
    // Podría ser mejor almacenarlos en gameState.currentMapDimensions = {rows: R, cols: C};

    board = Array(R).fill(null).map(() => Array(C).fill(null));
    gameState.cities = []; // Limpiar ciudades del estado global para el nuevo escenario

    gameBoard.style.width = `${C * HEX_WIDTH + HEX_WIDTH / 2}px`;
    gameBoard.style.height = `${R * HEX_VERT_SPACING + HEX_HEIGHT * 0.25}px`;

    console.log("------------------------------------------------------");
    console.log("DEBUG BOARD SIZE (después de asignar style.width/height):");
    console.log("BOARD_COLS:", (typeof BOARD_COLS !== 'undefined' ? BOARD_COLS : 'NO_DEF'), "| HEX_WIDTH:", (typeof HEX_WIDTH !== 'undefined' ? HEX_WIDTH : 'NO_DEF'));
    console.log("gameBoard.style.width asignado:", gameBoard.style.width);
    console.log("gameBoard.style.height asignado:", gameBoard.style.height);
    console.log("------------------------------------------------------");

    for (let r = 0; r < R; r++) {
        for (let c = 0; c < C; c++) {
            const hexElement = createHexDOMElementWithListener(r, c);
            gameBoard.appendChild(hexElement);

            let terrainType = mapTacticalData.hexesConfig?.defaultTerrain || 'plains';
            let structureType = null;
            const specificHexConfig = mapTacticalData.hexesConfig?.specificHexes?.find(h => h.r === r && h.c === c);
            if (specificHexConfig) {
                if (specificHexConfig.terrain) terrainType = specificHexConfig.terrain;
                if (specificHexConfig.structure) structureType = specificHexConfig.structure;
            }

            board[r][c] = {
                element: hexElement,
                terrain: terrainType,
                owner: null, // El dueño se establecerá por capitales, ciudades o unidades
                structure: structureType,
                isCity: false,
                isCapital: false,
                resourceNode: null,
                visibility: { player1: 'visible', player2: 'visible' }, // Puede ser sobreescrito por escenario
                unit: null
            };
        }
    }
    
    // Marcar que SÍ es una batalla de campaña
    if (gameState) { // Asegurarse que gameState está definido
        gameState.isCampaignBattle = true;
        // gameState.currentScenarioData y gameState.currentMapData ya se establecieron en state.js
    }

    // Añadir Ciudades y Capitales desde mapTacticalData
    if (mapTacticalData.playerCapital) {
        addCityToBoardData(mapTacticalData.playerCapital.r, mapTacticalData.playerCapital.c, 1, mapTacticalData.playerCapital.name, true);
        if (board[mapTacticalData.playerCapital.r]?.[mapTacticalData.playerCapital.c]) {
            board[mapTacticalData.playerCapital.r][mapTacticalData.playerCapital.c].owner = 1;
        }
    }
    if (mapTacticalData.enemyCapital) {
        // Determinar el dueño de la capital enemiga desde scenarioData
        const enemyOwnerId = scenarioData.enemySetup.ownerId === "ai_1" ? 2 : (scenarioData.enemySetup.ownerId === "ai_2" ? 3 : 2); // Ejemplo de mapeo, asumiendo jugador 2 por defecto
        addCityToBoardData(mapTacticalData.enemyCapital.r, mapTacticalData.enemyCapital.c, enemyOwnerId, mapTacticalData.enemyCapital.name, true);
        if (board[mapTacticalData.enemyCapital.r]?.[mapTacticalData.enemyCapital.c]) {
            board[mapTacticalData.enemyCapital.r][mapTacticalData.enemyCapital.c].owner = enemyOwnerId;
        }
    }
    mapTacticalData.cities?.forEach(cityInfo => {
        let cityOwnerPlayerNumber = null;
        if (cityInfo.owner === 'player') cityOwnerPlayerNumber = 1;
        else if (cityInfo.owner === 'enemy' || cityInfo.owner === scenarioData.enemySetup.ownerId) {
             cityOwnerPlayerNumber = scenarioData.enemySetup.ownerId === "ai_1" ? 2 : (scenarioData.enemySetup.ownerId === "ai_2" ? 3 : 2);
        } else if (cityInfo.owner === 'neutral' || !cityInfo.owner) {
            cityOwnerPlayerNumber = null;
        } else { // Podría ser un ID de IA específico si tienes más de una IA
            console.warn("Dueño de ciudad no reconocido en mapa:", cityInfo.owner);
        }

        addCityToBoardData(cityInfo.r, cityInfo.c, cityOwnerPlayerNumber, cityInfo.name, false);
        if (cityOwnerPlayerNumber && board[cityInfo.r]?.[cityInfo.c]) {
            board[cityInfo.r][cityInfo.c].owner = cityOwnerPlayerNumber;
        }
    });

    // Añadir Nodos de Recursos desde mapTacticalData
    mapTacticalData.resourceNodes?.forEach(node => {
        addResourceNodeToBoardData(node.r, node.c, node.type);
        // Podrías asignar dueño al nodo de recurso si el mapa lo especifica
        // if (node.owner && board[node.r]?.[node.c]) {
        //    board[node.r][node.c].owner = node.owner === 'player' ? 1 : (node.owner === 'enemy' ? 2 : null);
        // }
    });

    // Colocar Unidades Iniciales Pre-desplegadas (si gameState.currentPhase no es 'deployment')
    // La creación real de la unidad (datos y elemento DOM) debe hacerse en unitActions.js o similar
    // Aquí solo preparamos los datos si es necesario y llamamos a la función correspondiente.
    units = []; // Limpiar unidades existentes del estado del juego táctico
    if (gameState.currentPhase !== "deployment") {
        scenarioData.playerSetup.initialUnits?.forEach(unitDef => {
            const unitData = createUnitDataObjectFromDefinition(unitDef, 1); // Nueva función helper
            if (unitData) placeInitialUnit(unitData); // Nueva función helper
        });
        scenarioData.enemySetup.initialUnits?.forEach(unitDef => {
            const unitData = createUnitDataObjectFromDefinition(unitDef, 2); // Asumiendo IA es jugador 2
            if (unitData) placeInitialUnit(unitData);
        });
    } else {
        // Si es fase de despliegue, el jugador y la IA colocarán sus unidades.
        // Podrías tener unidades "disponibles para reclutar" en lugar de pre-desplegadas.
        logMessage("Fase de Despliegue para el escenario. Coloca tus unidades.");
    }

    renderFullBoardVisualState();
    updateFogOfWar();
   
    initializeBoardPanning();

}


// --- FUNCIONES HELPER PARA LA INICIALIZACIÓN DE ESCENARIOS ---

// Función helper para crear el objeto de datos de una unidad a partir de una definición de escenario
// Esta función debería probablemente vivir en unitActions.js o state.js
function createUnitDataObjectFromDefinition(unitDef, player) {
    const regimentTypeData = REGIMENT_TYPES[unitDef.type];
    if (!regimentTypeData) {
        console.error(`Tipo de regimiento desconocido "${unitDef.type}" en la definición de unidad del escenario.`);
        return null;
    }

    // Crear una estructura de regimiento simplificada para la unidad
    // En tu juego, una unidad (división) se compone de múltiples regimientos.
    // Aquí, para simplificar, cada "initialUnit" podría ser una división con un solo tipo de regimiento,
    // o necesitarías una forma más compleja de definir divisiones en el JSON del escenario.
    // Por ahora, asumimos que unitDef define una división con stats basados en el tipo.
    const singleRegiment = { ...regimentTypeData, type: unitDef.type };

    return {
        id: `u${unitIdCounter++}`, // unitIdCounter de state.js
        player: player,
        name: unitDef.name || unitDef.type,
        regiments: [JSON.parse(JSON.stringify(singleRegiment))], // La unidad es una división con este "regimiento"
        attack: regimentTypeData.attack,
        defense: regimentTypeData.defense,
        maxHealth: regimentTypeData.health,
        currentHealth: regimentTypeData.health,
        movement: regimentTypeData.movement,
        currentMovement: regimentTypeData.movement,
        visionRange: regimentTypeData.visionRange,
        attackRange: regimentTypeData.attackRange,
        r: unitDef.r, // Coordenada r del escenario
        c: unitDef.c, // Coordenada c del escenario
        sprite: regimentTypeData.sprite,
        element: null, // Se creará en placeInitialUnit
        hasMoved: false, // Las unidades pre-desplegadas no han actuado
        hasAttacked: false,
    };
}

// Función helper para colocar una unidad pre-desplegada en el tablero
// Similar a placeFinalizedDivision pero adaptada para unidades iniciales
function placeInitialUnit(unitData) {
    if (!unitData || typeof unitData.r === 'undefined' || typeof unitData.c === 'undefined') {
        console.error("Datos de unidad inválidos o faltan coordenadas para placeInitialUnit", unitData);
        return;
    }
    // placeFinalizedDivision ya hace la mayor parte de esto, podríamos reutilizarla
    // o tener una versión específica. Por ahora, replicamos parte de su lógica.

    const unitElement = document.createElement('div');
    unitElement.classList.add('unit', `player${unitData.player}`);
    unitElement.textContent = unitData.sprite;
    unitElement.dataset.id = unitData.id;
    const strengthDisplay = document.createElement('div');
    strengthDisplay.classList.add('unit-strength');
    strengthDisplay.textContent = unitData.currentHealth;
    unitElement.appendChild(strengthDisplay);

    if (gameBoard) {
        gameBoard.appendChild(unitElement);
    } else {
        console.error("CRITICAL: gameBoard no encontrado en DOM al colocar unidad inicial.");
        return; // No se puede continuar si el tablero no está
    }

    unitData.element = unitElement; // Asignar el elemento DOM al objeto de datos

    const targetHexData = board[unitData.r]?.[unitData.c];
    if (targetHexData) {
        if (targetHexData.unit) {
            console.warn(`Conflicto al colocar unidad: ${unitData.name} en (${unitData.r},${unitData.c}). Ya hay una unidad: ${targetHexData.unit.name}. La nueva unidad no se colocará.`);
            unitElement.remove(); // Quitar el elemento del DOM si no se puede colocar
            return;
        }
        targetHexData.unit = unitData; // Asignar la unidad al hexágono en el 'board'
        // Asegurar que el hexágono obtiene la propiedad del jugador de la unidad
        if (targetHexData.owner !== unitData.player) {
            targetHexData.owner = unitData.player;
            // No es necesario llamar a renderSingleHexVisuals aquí, renderFullBoardVisualState lo hará.
        }
    } else {
        console.error(`Error al colocar unidad inicial: hexágono destino (${unitData.r},${unitData.c}) no existe en 'board'.`);
        unitElement.remove();
        return;
    }

    units.push(unitData); // Añadir al array global de unidades (de state.js)
    // positionUnitElement(unitData) se llamará en renderFullBoardVisualState
}


// --- FUNCIONES EXISTENTES (SIN CAMBIOS GRANDES ESPERADOS EN ESTAS) ---

// generateRandomResourceNodes, addCityToBoardData, addResourceNodeToBoardData
// renderFullBoardVisualState, renderSingleHexVisuals ya están en tu archivo original.

function generateRandomResourceNodes(level) {
    let cantidadPorTipo;
    switch (level) {
        case 'min': cantidadPorTipo = 1; break;
        case 'med': cantidadPorTipo = 3; break;
        case 'max': cantidadPorTipo = 5; break;
        default:    cantidadPorTipo = 1;
    }

    logMessage(`Generando recursos aleatorios - Nivel: ${level} (${cantidadPorTipo} de c/u)`);

    const resourceTypesArray = Object.keys(RESOURCE_NODES_DATA); // RESOURCE_NODES_DATA de constants.js
    const occupiedBySetup = new Set();

    gameState.cities.forEach(city => {
        if (city.isCapital) {
            occupiedBySetup.add(`${city.r}-${city.c}`);
        }
    });

    resourceTypesArray.forEach(type => {
        let countPlaced = 0;
        let attempts = 0;
        // Usar las dimensiones actuales del tablero si están disponibles, sino las globales
        const currentBoardRows = board.length || BOARD_ROWS;
        const currentBoardCols = board[0]?.length || BOARD_COLS;
        const maxAttemptsPerType = currentBoardRows * currentBoardCols * 2;

        while (countPlaced < cantidadPorTipo && attempts < maxAttemptsPerType) {
            const r_rand = Math.floor(Math.random() * currentBoardRows);
            const c_rand = Math.floor(Math.random() * currentBoardCols);
            const hexKey = `${r_rand}-${c_rand}`;

            if (board[r_rand]?.[c_rand] &&
                !board[r_rand][c_rand].resourceNode &&
                !board[r_rand][c_rand].isCity &&
                !occupiedBySetup.has(hexKey) ) {

                let tooCloseToCapital = false;
                gameState.cities.forEach(city => {
                    if (city.isCapital && hexDistance(city.r, city.c, r_rand, c_rand) <= 2) { // hexDistance de utils.js
                        tooCloseToCapital = true;
                    }
                });
                // Ajustar la comprobación de borde a las dimensiones actuales
                const isBorderHex = r_rand < 1 || r_rand >= currentBoardRows - 1 || c_rand < 1 || c_rand >= currentBoardCols - 1;

                if (!tooCloseToCapital && !isBorderHex) {
                    addResourceNodeToBoardData(r_rand, c_rand, type);
                    occupiedBySetup.add(hexKey);
                    countPlaced++;
                }
            }
            attempts++;
        }
        if (countPlaced < cantidadPorTipo) {
            console.warn(`No se pudieron colocar todas las instancias de ${type}. Colocadas: ${countPlaced}/${cantidadPorTipo}`);
        }
    });
    logMessage(`Generación de recursos completada.`);
}

function addCityToBoardData(r, c, owner, name, isCapital = false) {
    if (board[r]?.[c]) {
        board[r][c].isCity = true;
        board[r][c].isCapital = isCapital;
        board[r][c].owner = owner;
        // Solo añadir a gameState.cities si no existe ya una ciudad en esas coordenadas
        // Esto es importante porque initializeGameBoardForScenario y initializeNewGameBoardDOMAndData
        // ambas llaman a esta función y no queremos duplicados si gameState.cities no se limpia adecuadamente.
        // gameState.cities debería limpiarse al inicio de cada inicialización de tablero.
        if (!gameState.cities.some(city => city.r === r && city.c === c)) {
            gameState.cities.push({ r, c, owner, name, isCapital });
        } else {
            // Actualizar la ciudad existente si es necesario (ej. cambio de dueño o nombre)
            const existingCity = gameState.cities.find(city => city.r === r && city.c === c);
            if (existingCity) {
                existingCity.owner = owner;
                existingCity.name = name;
                existingCity.isCapital = isCapital;
            }
        }
    } else {
        console.warn(`Intento de añadir ciudad en hexágono inválido: (${r},${c})`);
    }
}

function addResourceNodeToBoardData(r, c, type) {
    if (board[r]?.[c] && RESOURCE_NODES_DATA[type]) {
        board[r][c].resourceNode = type;
    } else {
         console.warn(`Intento de añadir nodo de recurso inválido: (${r},${c}) tipo ${type}`);
    }
}

function renderFullBoardVisualState() {
    if (!board || board.length === 0) return;
    // Usar las dimensiones reales del array 'board'
    const currentRows = board.length;
    const currentCols = board[0] ? board[0].length : 0;

    for (let r = 0; r < currentRows; r++) {
        for (let c = 0; c < currentCols; c++) {
            if (board[r] && board[r][c]) { // Comprobar que el hexágono existe
                renderSingleHexVisuals(r, c);
            }
        }
    }
    units.forEach(unit => { // units de state.js
        if (unit.element && !unit.element.parentElement && gameBoard) {
            gameBoard.appendChild(unit.element);
        }
        // positionUnitElement y updateUnitStrengthDisplay deberían estar en unitActions.js o uiUpdates.js
        // pero si están aquí y funcionan, las dejamos por ahora. Idealmente, boardManager
        // solo se encarga del tablero, no de las unidades directamente.
        if (typeof positionUnitElement === "function") positionUnitElement(unit); else console.warn("positionUnitElement no definida");
        if (typeof updateUnitStrengthDisplay === "function") updateUnitStrengthDisplay(unit); else console.warn("updateUnitStrengthDisplay no definida");
    });
}

function renderSingleHexVisuals(r, c) {
    const hexData = board[r]?.[c];
    if (!hexData || !hexData.element) { return; }
    const hexEl = hexData.element;

    let classesToKeep = ['hex'];
    if (hexEl.classList.contains('highlight-move')) classesToKeep.push('highlight-move');
    if (hexEl.classList.contains('highlight-attack')) classesToKeep.push('highlight-attack');
    if (hexEl.classList.contains('highlight-build')) classesToKeep.push('highlight-build');
    if (hexEl.classList.contains('fog-hidden')) classesToKeep.push('fog-hidden');
    if (hexEl.classList.contains('fog-partial')) classesToKeep.push('fog-partial');
    hexEl.className = classesToKeep.join(' ');

    hexEl.classList.add(hexData.terrain);
    if (hexData.owner) hexEl.classList.add(`player${hexData.owner}-owner`);
    if (hexData.isCity) hexEl.classList.add('city');
    if (hexData.isCapital) hexEl.classList.add('capital-city');

    if (hexData.resourceNode) {
        const resourceClassKey = hexData.resourceNode.replace('_mina', '');
        hexEl.classList.add(`resource-${resourceClassKey}`);
    }

    let structureSpriteEl = hexEl.querySelector('.structure-sprite');
    if (hexData.structure && STRUCTURE_TYPES[hexData.structure]) { // STRUCTURE_TYPES de constants.js
        if (!structureSpriteEl) {
            structureSpriteEl = document.createElement('span');
            structureSpriteEl.classList.add('structure-sprite');
            hexEl.appendChild(structureSpriteEl);
        }
        structureSpriteEl.textContent = STRUCTURE_TYPES[hexData.structure].sprite;
    } else if (structureSpriteEl) {
        structureSpriteEl.remove();
    }
}