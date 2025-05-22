// gameFlow.js
// Lógica principal del flujo del juego: turnos, fases, IA, victoria, niebla de guerra, recolección de recursos.

function handleEndTurn() {
    console.log(`[handleEndTurn] INICIO. Fase: ${gameState.currentPhase}, Jugador Actual: ${gameState.currentPlayer}`);
    if (typeof deselectUnit === "function") deselectUnit(); else console.warn("handleEndTurn: deselectUnit no definida");

    if (gameState.currentPhase === "gameOver") {
        if (typeof logMessage === "function") logMessage("La partida ya ha terminado.");
        return;
    }

    let triggerAiDeployment = false;
    let aiPlayerToDeploy = -1;
    let nextPhaseForGame = gameState.currentPhase;
    let nextPlayerForGame = gameState.currentPlayer;

    if (gameState.currentPhase === "deployment") {
        const player1Id = 1;
        const player2Id = 2;
        const limit = gameState.deploymentUnitLimit;

        let player1CanStillDeploy = gameState.playerTypes.player1 === 'human' && gameState.unitsPlacedByPlayer[player1Id] < limit;
        let player2CanStillDeploy = gameState.playerTypes.player2 === 'human' && gameState.unitsPlacedByPlayer[player2Id] < limit;
        
        // IA se considera "done" si es su turno y ya ha pasado por su lógica de despliegue una vez.
        // O si no hay triggerAiDeployment para ella, significa que ya desplegó o no le toca.
        if (gameState.playerTypes.player1.startsWith('ai_')) player1CanStillDeploy = false; // IA P1 despliega todo en su primer "turno" de handleEndTurn
        if (gameState.playerTypes.player2.startsWith('ai_')) player2CanStillDeploy = false; // IA P2 despliega todo en su primer "turno" de handleEndTurn


        console.log(`[handleEndTurn DEPLOY] J Actual: ${gameState.currentPlayer}`);
        console.log(`  P1 (Tipo: ${gameState.playerTypes.player1}): Colocadas ${gameState.unitsPlacedByPlayer[player1Id]}/${limit}, PuedeSeguir: ${player1CanStillDeploy}`);
        console.log(`  P2 (Tipo: ${gameState.playerTypes.player2}): Colocadas ${gameState.unitsPlacedByPlayer[player2Id]}/${limit}, PuedeSeguir: ${player2CanStillDeploy}`);

        if (gameState.currentPlayer === player1Id) {
            if (player1CanStillDeploy) {
                if (typeof logMessage === "function") logMessage(`Jugador 1: Aún puedes desplegar más unidades (Límite: ${limit === Infinity ? 'Ilimitado' : limit}).`);
                // No retornar, el jugador decidió terminar su turno de colocación
            }

            if (gameState.playerTypes.player2 === 'human') {
                if (player2CanStillDeploy) {
                    nextPlayerForGame = player2Id;
                    if (typeof logMessage === "function") logMessage(`Fase de Despliegue: Turno del Jugador 2. (Límite: ${limit === Infinity ? 'Ilimitado' : limit})`);
                } else {
                    nextPhaseForGame = "play"; nextPlayerForGame = player1Id;
                }
            } else { // P2 es IA
                // Solo activar despliegue de IA si NO ha alcanzado su límite
                if (gameState.unitsPlacedByPlayer[player2Id] < limit) {
                    nextPlayerForGame = player2Id;
                    triggerAiDeployment = true;
                    aiPlayerToDeploy = player2Id;
                } else { // IA P2 ya desplegó su límite
                    nextPhaseForGame = "play"; nextPlayerForGame = player1Id;
                }
            }
        } else { // Era turno de P2
            if (player2CanStillDeploy) { // P2 es humano y aún puede desplegar
                 if (typeof logMessage === "function") logMessage(`Jugador 2: Aún puedes desplegar más unidades (Límite: ${limit === Infinity ? 'Ilimitado' : limit}).`);
                 // No retornar, el jugador decidió terminar su turno de colocación
            }
            // Si P2 (humano o IA) termina su despliegue, y P1 ya terminó, pasar a play.
            nextPhaseForGame = "play"; nextPlayerForGame = player1Id;
        }

        gameState.currentPhase = nextPhaseForGame;
        gameState.currentPlayer = nextPlayerForGame;

        if (gameState.currentPhase === "play") {
            gameState.turnNumber = 1;
            if (typeof logMessage === "function") logMessage("¡Comienza la Batalla! Turno del Jugador 1.");
        }

    } else if (gameState.currentPhase === "play") {
        console.log("[handleEndTurn PLAY] Procesando fin de turno para Jugador", gameState.currentPlayer);
        if (typeof collectPlayerResources === "function") collectPlayerResources(); else console.warn("collectPlayerResources no definida");

        gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
        if (gameState.currentPlayer === 1) {
            gameState.turnNumber++;
        }
        if (typeof logMessage === "function") logMessage(`Turno ${gameState.turnNumber} - Jugador ${gameState.currentPlayer}.`);
    }

    units.forEach(unit => {
        if (unit.player === gameState.currentPlayer) {
            unit.hasMoved = false;
            unit.hasAttacked = false;
            unit.currentMovement = unit.movement;
            unit.hasRetaliatedThisTurn = false;
        }
    });

    if (gameState.currentPhase === 'play') {
        units.forEach(unit => {
            if (unit.player === gameState.currentPlayer && unit.currentHealth > 0) {
                unit.experience = Math.min(unit.maxExperience || 500, (unit.experience || 0) + 1);
            }
        });
    }

    console.log(`[handleEndTurn] ANTES DE UI. Fase: ${gameState.currentPhase}, Jugador: ${gameState.currentPlayer}`);
    // LLAMAR A TRAVÉS DE UIManager
    if (typeof UIManager !== 'undefined' && typeof UIManager.updateAllUIDisplays === 'function') {
        UIManager.updateAllUIDisplays(); // <<<< CAMBIO AQUÍ
    } else {
        console.error("handleEndTurn Error: UIManager.updateAllUIDisplays no está definida.");
    }

    if (triggerAiDeployment && aiPlayerToDeploy !== -1 && gameState.currentPhase === "deployment") {
        if (typeof logMessage === "function") logMessage(`IA (Jugador ${aiPlayerToDeploy}) está desplegando sus unidades... (Límite: ${gameState.deploymentUnitLimit === Infinity ? 'Ilimitado' : gameState.deploymentUnitLimit})`);
        setTimeout(() => {
            console.log(`[handleEndTurn] setTimeout para deployUnitsAI(${aiPlayerToDeploy})`);
            if (typeof deployUnitsAI === "function") { // deployUnitsAI de aiLogic.js
                deployUnitsAI(aiPlayerToDeploy);
                console.log(`[handleEndTurn] deployUnitsAI(${aiPlayerToDeploy}) completado.`);
                // Después de que la IA despliegue, necesitamos re-evaluar el estado del juego
                // La forma más simple es simular que la IA también "terminó su turno" de despliegue.
                if (gameState.currentPhase === "deployment" && endTurnBtn && !endTurnBtn.disabled) {
                    console.log(`[handleEndTurn] IA ${aiPlayerToDeploy} desplegó, simulando click en EndTurn para procesar siguiente fase/jugador.`);
                    endTurnBtn.click();
                } else {
                    // Si la fase ya no es deployment (por ej. si la IA era la última y pasó a play),
                    // o si el botón de fin de turno está deshabilitado, solo actualizar UI.
                    if (typeof UIManager !== 'undefined' && typeof UIManager.updateAllUIDisplays === 'function') UIManager.updateAllUIDisplays();
                }
            } else {
                console.error("Función deployUnitsAI no encontrada.");
                 // Si deployUnitsAI no existe, la IA no puede desplegar, hay que terminar su "turno" de despliegue.
                if (gameState.currentPhase === "deployment" && endTurnBtn && !endTurnBtn.disabled) {
                    console.warn(`[handleEndTurn] deployUnitsAI no encontrada para IA ${aiPlayerToDeploy}, simulando click en EndTurn.`);
                    endTurnBtn.click();
                }
            }
        }, 500);
    } else if (gameState.currentPhase === 'play' && gameState.playerTypes[`player${gameState.currentPlayer}`]?.startsWith('ai_')) {
        if (typeof checkVictory === "function" && checkVictory()) { return; }
        console.log(`[handleEndTurn] Preparando para llamar a simpleAiTurn para Jugador ${gameState.currentPlayer}`);
        setTimeout(simpleAiTurn, 700); // simpleAiTurn de este archivo
    } else if (gameState.currentPhase === 'play') { // Turno de jugador humano
        if (typeof checkVictory === "function") checkVictory();
    }
    console.log(`[handleEndTurn] FIN. Fase: ${gameState.currentPhase}, Jugador Actual: ${gameState.currentPlayer}`);
}

// ----- FUNCIÓN collectPlayerResources CON LÓGICA DE INGRESOS POR TERRITORIO Y ESTRUCTURAS -----
function collectPlayerResources() {
    if (gameState.currentPhase !== 'play' || !gameState.playerResources[gameState.currentPlayer]) {
        return;
    }

    const playerRes = gameState.playerResources[gameState.currentPlayer];
    const playerNum = gameState.currentPlayer;
    let logIngresos = [`Ingresos para Jugador ${playerNum} (Fin del Turno ${gameState.turnNumber}):`];
    let algoRecolectadoEsteTurno = false;

    // --- INGRESOS DE ORO BASE POR CIUDADES ---
    let oroDeCiudadesBase = 0;
    gameState.cities.forEach(city => { // gameState.cities es poblado por boardManager
        if (city.owner === playerNum && board[city.r]?.[city.c]) {
            const ingresoCiudadBase = board[city.r][city.c].isCapital ? 7 : 5;
            oroDeCiudadesBase += ingresoCiudadBase;
        }
    });
    if (oroDeCiudadesBase > 0) {
        playerRes.oro = (playerRes.oro || 0) + oroDeCiudadesBase;
        logIngresos.push(`  +${oroDeCiudadesBase} Oro (base de ciudades).`);
        algoRecolectadoEsteTurno = true;
    }

    // --- INGRESOS DE NODOS DE RECURSOS CON MULTIPLICADORES Y ORO POR HEXÁGONO CONTROLADO ---
    let oroPorTerritorioControlado = 0;
    // Usar las dimensiones del tablero actual
    const currentRows = gameState.currentMapData?.rows || BOARD_ROWS; // BOARD_ROWS de constants.js
    const currentCol = gameState.currentMapData?.cols || BOARD_COLS; // BOARD_COLS de constants.js

    for (let r = 0; r < currentRows; r++) {
        for (let c = 0; c < currentCol; c++) {
            const hexData = board[r]?.[c];

            if (hexData && hexData.owner === playerNum) { // Si el hexágono pertenece al jugador
                // ORO POR HEXÁGONO CONTROLADO (si no es ciudad)
                if (!hexData.isCity) {
                    let oroHex = 1;
                    let motivoOroHex = "(territorio)";
                    if (hexData.structure === "Fortaleza") { // STRUCTURE_TYPES de constants.js
                        oroHex = 3;
                        motivoOroHex = "(territorio con Fortaleza)";
                    } else if (hexData.structure === "Camino") {
                        oroHex = 2;
                        motivoOroHex = "(territorio con Camino)";
                    }
                    oroPorTerritorioControlado += oroHex;
                }

                // Nodos de recursos
                if (hexData.resourceNode && RESOURCE_NODES_DATA[hexData.resourceNode]) { // RESOURCE_NODES_DATA de constants.js
                    const nodeInfo = RESOURCE_NODES_DATA[hexData.resourceNode];
                    const baseIncome = nodeInfo.income;
                    let finalIncome = baseIncome;
                    let infrastructureBonusDescription = " (base)";

                    if (hexData.isCity) {
                        finalIncome = baseIncome * RESOURCE_MULTIPLIERS.CIUDAD; // RESOURCE_MULTIPLIERS de constants.js
                        infrastructureBonusDescription = ` (Ciudad x${RESOURCE_MULTIPLIERS.CIUDAD})`;
                    } else if (hexData.structure === "Fortaleza") {
                        finalIncome = baseIncome * RESOURCE_MULTIPLIERS.FORTALEZA;
                        infrastructureBonusDescription = ` (Fortaleza x${RESOURCE_MULTIPLIERS.FORTALEZA})`;
                    } else if (hexData.structure === "Camino") {
                        finalIncome = baseIncome * RESOURCE_MULTIPLIERS.CAMINO;
                        infrastructureBonusDescription = ` (Camino x${RESOURCE_MULTIPLIERS.CAMINO})`;
                    }

                    const resourceKey = hexData.resourceNode.replace('_mina','');
                    playerRes[resourceKey] = (playerRes[resourceKey] || 0) + finalIncome;
                    logIngresos.push(`  +${finalIncome} ${nodeInfo.name} de hex (${r},${c})${infrastructureBonusDescription}.`);
                    algoRecolectadoEsteTurno = true;
                }
            }
        }
    }

    if (oroPorTerritorioControlado > 0) {
        playerRes.oro = (playerRes.oro || 0) + oroPorTerritorioControlado;
        logIngresos.push(`  +${oroPorTerritorioControlado} Oro total de territorios controlados (no ciudades).`);
        algoRecolectadoEsteTurno = true;
    }

    if (algoRecolectadoEsteTurno) {
        console.log(logIngresos.join("\n"));
    }
}
// ----- FIN DE collectPlayerResources MODIFICADA -----


// ----- FUNCIONES RESTAURADAS (updateFogOfWar, checkVictory, simpleAiTurn) -----
function updateFogOfWar() {
    if (!board || board.length === 0) return; // board de state.js

    // Usar las dimensiones del tablero actual
    const currentRows = gameState.currentMapData?.rows || BOARD_ROWS;
    const currentCol = gameState.currentMapData?.cols || BOARD_COLS;

    const isDeploymentOrSetup = gameState.currentPhase === "deployment" || gameState.currentPhase === "setup";

    for (let r = 0; r < currentRows; r++) {
        for (let c = 0; c < currentCol; c++) {
            const hexData = board[r]?.[c];
            if (!hexData || !hexData.element) continue;
            const hexElement = hexData.element;
            const unitOnThisHex = getUnitOnHex(r, c); // getUnitOnHex de utils.js

            hexElement.classList.remove('fog-hidden', 'fog-partial');
            if (unitOnThisHex && unitOnThisHex.element) {
                unitOnThisHex.element.style.display = 'none';
                unitOnThisHex.element.classList.remove('player-controlled-visible');
            }

            if (isDeploymentOrSetup) {
                hexData.visibility.player1 = 'visible';
                hexData.visibility.player2 = 'visible';
                if (unitOnThisHex && unitOnThisHex.element) unitOnThisHex.element.style.display = 'flex';
            } else if (gameState.currentPhase === "play") {
                const playerKey = `player${gameState.currentPlayer}`;
                if (hexData.visibility[playerKey] === 'visible') {
                    hexData.visibility[playerKey] = 'partial';
                }
            }
        }
    }

    if (gameState.currentPhase === "play") {
        const playerKey = `player${gameState.currentPlayer}`;
        const visionSources = [];
        units.forEach(unit => { // units de state.js
            if (unit.player === gameState.currentPlayer && unit.currentHealth > 0 && unit.r !== -1) {
                visionSources.push({r: unit.r, c: unit.c, range: unit.visionRange});
            }
        });
        gameState.cities.forEach(city => { // gameState.cities de state.js
            if (city.owner === gameState.currentPlayer && board[city.r]?.[city.c]) {
                let range = board[city.r][city.c].isCapital ? 2 : 1;
                if (board[city.r][city.c].structure === 'Fortaleza') range = Math.max(range, 3);
                visionSources.push({r: city.r, c: city.c, range: range });
            }
        });

        visionSources.forEach(source => {
            for (let r_scan = 0; r_scan < currentRows; r_scan++) {
                for (let c_scan = 0; c_scan < currentCol; c_scan++) {
                    if (hexDistance(source.r, source.c, r_scan, c_scan) <= source.range) { // hexDistance de utils.js
                        if(board[r_scan]?.[c_scan]) board[r_scan][c_scan].visibility[playerKey] = 'visible';
                    }
                }
            }
        });

        for (let r = 0; r < currentRows; r++) {
            for (let c = 0; c < currentCol; c++) {
                const hexData = board[r]?.[c];
                if (!hexData || !hexData.element) continue;
                const hexVisStatus = hexData.visibility[playerKey];
                const unitOnThisHex = getUnitOnHex(r,c);

                if (hexVisStatus === 'hidden') {
                    hexData.element.classList.add('fog-hidden');
                } else if (hexVisStatus === 'partial') {
                    hexData.element.classList.add('fog-partial');
                    if (unitOnThisHex && unitOnThisHex.player === gameState.currentPlayer && unitOnThisHex.element) {
                        unitOnThisHex.element.style.display = 'flex';
                        unitOnThisHex.element.classList.add('player-controlled-visible');
                    }
                } else { // 'visible'
                    if (unitOnThisHex && unitOnThisHex.element) {
                        unitOnThisHex.element.style.display = 'flex';
                        if (unitOnThisHex.player === gameState.currentPlayer) {
                            unitOnThisHex.element.classList.add('player-controlled-visible');
                        }
                    }
                }
            }
        }
    }
}

function checkVictory() {
    if (gameState.currentPhase !== 'play') return false;

    let winner = null; // 1 para jugador humano, 2 para IA u oponente

    // --- 1. Condiciones de Victoria/Derrota Específicas del Escenario ---
    if (gameState.isCampaignBattle && gameState.currentScenarioData) {
        const scenario = gameState.currentScenarioData;
        const playerHuman = 1; // Asumimos que el jugador humano es siempre el jugador 1
        const enemyPlayer = 2; // Asumimos que el oponente IA es jugador 2 (esto podría necesitar ser más flexible)

        // Chequear condiciones de victoria del jugador
        if (scenario.victoryConditions) {
            for (const condition of scenario.victoryConditions) {
                if (condition.type === "eliminate_all_enemies") {
                    if (!units.some(u => u.player === enemyPlayer && u.currentHealth > 0)) {
                        winner = playerHuman;
                        logMessage(`¡Condición de victoria: Enemigos eliminados! Jugador ${winner} gana.`);
                        break;
                    }
                }
                // TODO: Implementar más tipos de condiciones de victoria del escenario
                // else if (condition.type === "capture_hex") { ... }
                // else if (condition.type === "survive_turns") { ... }
            }
        }
        if (winner) { // Si ya ganó el jugador
            endTacticalBattle(winner);
            return true;
        }

        // Chequear condiciones de derrota del jugador (victoria del enemigo)
        if (scenario.lossConditions) {
            for (const condition of scenario.lossConditions) {
                if (condition.type === "player_capital_lost") {
                    const playerCapitalCity = gameState.cities.find(c => c.isCapital && c.ownerOriginal === playerHuman); // Necesitaríamos 'ownerOriginal' o una forma de saber cuál era la capital del jugador
                    // O usar la info del mapa:
                    const pCapR = gameState.currentMapData?.playerCapital?.r;
                    const pCapC = gameState.currentMapData?.playerCapital?.c;
                    if (typeof pCapR !== 'undefined' && board[pCapR]?.[pCapC]?.owner === enemyPlayer) {
                        winner = enemyPlayer;
                        logMessage(`Condición de derrota: ¡Capital del jugador capturada! Jugador ${winner} gana.`);
                        break;
                    }
                }
                // TODO: Implementar más tipos de condiciones de derrota del escenario
                // else if (condition.type === "time_limit_exceeded") { ... }
            }
        }
        if (winner) { // Si ya perdió el jugador (ganó el enemigo)
            endTacticalBattle(winner);
            return true;
        }
    }

    // --- 2. Condiciones de Victoria/Derrota Genéricas (si no es campaña o no se cumplieron las específicas) ---
    // Solo si no se ha determinado un ganador por condiciones de escenario
    if (!winner) {
        let p1CapitalOwner = null;
        let p2CapitalOwner = null; // p2 puede ser IA u otro humano

        // Intentar identificar capitales de forma más genérica o basada en el mapa actual
        const playerCapitalInfo = gameState.currentMapData?.playerCapital;
        const enemyCapitalInfo = gameState.currentMapData?.enemyCapital;

        gameState.cities.forEach(city => {
            if (city.isCapital && board[city.r]?.[city.c]) {
                const currentOwner = board[city.r][city.c].owner;
                if (playerCapitalInfo && city.r === playerCapitalInfo.r && city.c === playerCapitalInfo.c) {
                    p1CapitalOwner = currentOwner;
                } else if (enemyCapitalInfo && city.r === enemyCapitalInfo.r && city.c === enemyCapitalInfo.c) {
                    p2CapitalOwner = currentOwner;
                } else { // Fallback para escaramuzas si los nombres de capitales no coinciden con mapData
                    if (city.name.toLowerCase().includes("p1") || (city.ownerOriginal === 1 && !enemyCapitalInfo)) { // Asume que p1 es el nombre para capital P1 en escaramuza
                        p1CapitalOwner = currentOwner;
                    } else if (city.name.toLowerCase().includes("p2") || (city.ownerOriginal === 2 && !playerCapitalInfo) ) {
                        p2CapitalOwner = currentOwner;
                    }
                }
            }
        });
        
        if (p1CapitalOwner !== null && p1CapitalOwner === 2) winner = 2; // IA/P2 capturó capital de P1
        if (p2CapitalOwner !== null && p2CapitalOwner === 1) winner = 1; // P1 capturó capital de IA/P2


        if (winner) {
            logMessage(`¡JUGADOR ${winner} GANA AL CAPTURAR LA CAPITAL ENEMIGA!`);
        } else {
            // Victoria por eliminación total (si no hay captura de capital)
            const player1HasUnits = units.some(u => u.player === 1 && u.currentHealth > 0);
            // Determinar quién es el jugador 2 (puede ser IA o humano en escaramuza)
            const player2Id = (gameState.playerTypes.player2 === 'human') ? 2 : 2; // Asumimos IA es jugador 2 por ahora
            const player2HasUnits = units.some(u => u.player === player2Id && u.currentHealth > 0);

            const player1EverHadUnits = units.some(u => u.player === 1);
            const player2EverHadUnits = units.some(u => u.player === player2Id);

            if (player1EverHadUnits && !player1HasUnits && player2HasUnits) {
                winner = player2Id;
                logMessage(`¡JUGADOR ${winner} GANA POR ELIMINACIÓN TOTAL DE UNIDADES DEL JUGADOR 1!`);
            } else if (player2EverHadUnits && !player2HasUnits && player1HasUnits) {
                winner = 1;
                logMessage(`¡JUGADOR 1 GANA POR ELIMINACIÓN TOTAL DE UNIDADES DEL JUGADOR ${player2Id}!`);
            }
        }
    }

    if (winner) {
        endTacticalBattle(winner); // Llamar a la función centralizada de fin de batalla
        return true;
    }
    return false;
}

// Función para centralizar el fin de una batalla táctica
function endTacticalBattle(winningPlayerNumber) {
    logMessage(`Fin de la batalla. Jugador ${winningPlayerNumber} es el vencedor.`);
    gameState.currentPhase = "gameOver"; // Marcar fin de la batalla táctica

    // Los botones de acción principales (flotantes) y el panel contextual
    // se deshabilitarán/ocultarán a través de UIManager.updateAllUIDisplays(),
    // que llama a UIManager.updateActionButtonsBasedOnPhase() y UIManager.hideContextualPanel().

    if (typeof UIManager !== 'undefined' && typeof UIManager.updateAllUIDisplays === 'function') {
        UIManager.updateAllUIDisplays(); // Esto se encargará de actualizar el estado de los botones
    } else {
        console.warn("endTacticalBattle: UIManager.updateAllUIDisplays no definida.");
        // Fallback manual muy básico si UIManager no está:
        if (typeof floatingEndTurnBtn !== 'undefined' && floatingEndTurnBtn) floatingEndTurnBtn.disabled = true;
        if (typeof floatingCreateDivisionBtn !== 'undefined' && floatingCreateDivisionBtn) floatingCreateDivisionBtn.disabled = true;
        if (typeof concedeBattleBtn_float !== 'undefined' && concedeBattleBtn_float) concedeBattleBtn_float.disabled = true;
    }

    if (typeof UIManager !== 'undefined' && typeof UIManager.hideContextualPanel === 'function'){
        UIManager.hideContextualPanel(); // Ocultar panel contextual al final de la batalla
    }

    // Informar al campaignManager si es una batalla de campaña
    if (gameState.isCampaignBattle) {
        if (typeof campaignManager !== 'undefined' && typeof campaignManager.handleTacticalBattleResult === 'function') {
            const playerHumanWon = (winningPlayerNumber === 1); // Asumiendo que el jugador humano es P1
            logMessage("Preparando para volver al mapa de campaña...");
            setTimeout(() => {
                campaignManager.handleTacticalBattleResult(playerHumanWon, gameState.currentCampaignTerritoryId);
            }, 3000); // Delay para que el jugador lea el mensaje
        } else {
            console.error("Error: Batalla de campaña finalizada pero campaignManager o su handle no está disponible.");
            alert(`¡Jugador ${winningPlayerNumber} gana la batalla del escenario! (Error crítico al volver al mapa)`);
        }
    } else { // Es una escaramuza
        logMessage(`¡Fin de la Escaramuza! Jugador ${winningPlayerNumber} ha ganado.`);
        // Aquí podrías añadir un modal más prominente para la victoria/derrota en escaramuza,
        // y un botón para volver al menú principal (que podría llamar a showScreen(mainMenuScreenEl)).
        alert(`¡Fin de la Escaramuza! Jugador ${winningPlayerNumber} ha ganado.`);
        if (typeof showScreen === "function" && typeof mainMenuScreenEl !== "undefined") { // showScreen de campaignManager
            // setTimeout(() => showScreen(mainMenuScreenEl), 1000); // Pequeño delay opcional
        }
    }
}


function simpleAiTurn() {
    // Obtener el nivel de IA del jugador actual
    const aiPlayerId = `player${gameState.currentPlayer}`;
    const aiLevel = gameState.playerAiLevels?.[aiPlayerId] || 'normal'; // 'normal' por defecto si no está definido

    if (gameState.currentPhase !== 'play' || gameState.playerTypes[aiPlayerId] !== 'ai_simple') { // Asegurar que es 'ai_simple' o tu nuevo tipo 'ai'
        return;
    }
    logMessage(`IA (Jugador ${gameState.currentPlayer}, Nivel: ${aiLevel}) está pensando...`);

    // --- LÓGICA COMÚN: OBTENER UNIDADES Y OBJETIVOS ---
    const aiUnits = units.filter(u => u.player === gameState.currentPlayer && u.currentHealth > 0 && (!u.hasMoved || !u.hasAttacked));
    const enemyPlayer = gameState.currentPlayer === 1 ? 2 : 1;
    const visibleEnemies = units.filter(e => e.player === enemyPlayer && e.currentHealth > 0 && board[e.r]?.[e.c]?.visibility[aiPlayerId] === 'visible');
    const enemyCapitals = gameState.cities.filter(c => c.isCapital && c.owner === enemyPlayer && board[c.r]?.[c.c]?.visibility[aiPlayerId] === 'visible');

    // --- DECISIONES BASADAS EN NIVEL DE IA ---
    let actionProbability = 1.0; // Probabilidad de que una unidad actúe
    let strategicFocus = 0.5; // 0 = aleatorio, 1 = muy estratégico

    if (aiLevel === 'easy') {
        actionProbability = 0.6; // No siempre usa todas las unidades
        strategicFocus = 0.2;
    } else if (aiLevel === 'normal') {
        actionProbability = 0.85;
        strategicFocus = 0.6;
    } else if (aiLevel === 'hard') {
        actionProbability = 1.0;
        strategicFocus = 0.9;
    }

    for (const unit of aiUnits) {
        if (gameState.currentPhase === "gameOver") break;
        if (Math.random() > actionProbability) continue; // La unidad podría no actuar

        let movedThisAction = false;
        let attackedThisAction = false;

        // --- LÓGICA DE ATAQUE ---
        if (!unit.hasAttacked) {
            let bestAttackTarget = null;
            let bestTargetScore = -Infinity; // Para IA más avanzada, podrías puntuar objetivos

            visibleEnemies.forEach(enemy => {
                if (isValidAttack(unit, enemy)) {
                    let score = 100 - enemy.currentHealth; // Priorizar enemigos débiles
                    if (aiLevel === 'hard') {
                        if (enemy.attackRange > 1) score += 50; // Priorizar unidades de rango
                        if (enemy.isCapital) score += 1000; // (Si las unidades pueden ser capitales, improbable)
                        // Podrías añadir más factores: amenaza de la unidad, tipo de unidad, etc.
                    }
                    if (aiLevel === 'easy' && Math.random() > 0.5) { // IA Fácil puede elegir al azar
                        if (bestAttackTarget === null || Math.random() > 0.7) bestAttackTarget = enemy;
                    } else if (score > bestTargetScore) {
                        bestTargetScore = score;
                        bestAttackTarget = enemy;
                    }
                }
            });

            if (bestAttackTarget) {
                attackUnit(unit, bestAttackTarget);
                attackedThisAction = true;
                if (unit.currentHealth <= 0) continue; // Unidad IA destruida
                if (checkVictory()) return;
            }
        }

        // --- LÓGICA DE MOVIMIENTO ---
        if (!unit.hasMoved && unit.currentHealth > 0 && gameState.currentPhase !== "gameOver") {
            let primaryTargetHex = null; // Hacia dónde moverse prioritariamente

            // Decidir objetivo principal (con influencia de strategicFocus)
            if (enemyCapitals.length > 0 && Math.random() < strategicFocus + 0.2) { // +0.2 para darle más peso a la capital
                primaryTargetHex = enemyCapitals[Math.floor(Math.random() * enemyCapitals.length)];
            } else if (visibleEnemies.length > 0) {
                // Moverse hacia el enemigo más cercano o más amenazante
                // IA Fácil: enemigo más cercano
                // IA Difícil: podría elegir un enemigo específico (ej. artillería, unidad dañada)
                let closestEnemy = null;
                let minDistance = Infinity;
                visibleEnemies.forEach(enemy => {
                    const d = hexDistance(unit.r, unit.c, enemy.r, enemy.c);
                    if (d < minDistance) {
                        minDistance = d;
                        closestEnemy = enemy;
                    }
                });
                if (closestEnemy) primaryTargetHex = { r: closestEnemy.r, c: closestEnemy.c };
            } else if (aiLevel !== 'easy') { // Si no hay enemigos visibles, moverse a explorar o hacia la capital enemiga no visible
                // Lógica de exploración (IA Normal/Difícil)
                // Podría moverse hacia el centro, o hacia la última ubicación conocida de un enemigo,
                // o hacia la capital enemiga general si se conoce su ubicación aproximada
                // gameState.cities.find(c => c.isCapital && c.owner === enemyPlayer);
            }


            if (primaryTargetHex) {
                let bestMoveOption = null;
                let bestMoveScore = -Infinity; // Para IA más avanzada
                const currentRows = gameState.currentMapData?.rows || BOARD_ROWS;
                const currentCol = gameState.currentMapData?.cols || BOARD_COLS;

                for (let r_move = Math.max(0, unit.r - unit.movement); r_move <= Math.min(currentRows - 1, unit.r + unit.movement); r_move++) {
                    for (let c_move = Math.max(0, unit.c - unit.movement); c_move <= Math.min(currentCol - 1, unit.c + unit.movement); c_move++) {
                        if (isValidMove(unit, r_move, c_move)) {
                            const distAfter = hexDistance(r_move, c_move, primaryTargetHex.r, primaryTargetHex.c);
                            let moveScore = -distAfter; // Acercarse es bueno

                            if (aiLevel === 'hard') {
                                // Considerar terreno defensivo, evitar hexágonos amenazados
                                if (board[r_move]?.[c_move]?.terrain === 'forest' || board[r_move]?.[c_move]?.terrain === 'hills') moveScore += 5;
                                // Podría evaluar el peligro del hexágono r_move, c_move
                            }

                            if (aiLevel === 'easy' && Math.random() > 0.3) { // IA Fácil más aleatoria
                               if (bestMoveOption === null || Math.random() > 0.6) bestMoveOption = {r: r_move, c: c_move};
                            } else if (moveScore > bestMoveScore) {
                                bestMoveScore = moveScore;
                                bestMoveOption = { r: r_move, c: c_move };
                            }
                        }
                    }
                }

                if (bestMoveOption) {
                    moveUnit(unit, bestMoveOption.r, bestMoveOption.c);
                    movedThisAction = true;
                    if (checkVictory()) return;

                    // Intentar atacar después de mover si no ha atacado y puede
                    if (!attackedThisAction && !unit.hasAttacked && unit.currentHealth > 0 && gameState.currentPhase !== "gameOver") {
                        let bestAttackTargetAfterMove = null;
                        let bestTargetScoreAfterMove = -Infinity;
                         units.filter(e => e.player === enemyPlayer && e.currentHealth > 0 && board[e.r]?.[e.c]?.visibility[aiPlayerId] === 'visible')
                            .forEach(enemy => {
                            if (isValidAttack(unit, enemy)) {
                                let score = 100 - enemy.currentHealth;
                                if (score > bestTargetScoreAfterMove) {
                                    bestTargetScoreAfterMove = score;
                                    bestAttackTargetAfterMove = enemy;
                                }
                            }
                        });
                        if (bestAttackTargetAfterMove) {
                            attackUnit(unit, bestAttackTargetAfterMove);
                            // attackedThisAction = true; // La propiedad unit.hasAttacked se actualiza en attackUnit
                            if (unit.currentHealth <= 0) continue;
                            if (checkVictory()) return;
                        }
                    }
                }
            }
        }
    } // Fin del bucle for (const unit of aiUnits)

    if (gameState.currentPhase !== "gameOver") {
        logMessage(`IA (Jugador ${gameState.currentPlayer}) terminó sus acciones.`);
        if (endTurnBtn && !endTurnBtn.disabled) endTurnBtn.click();
    }
}
