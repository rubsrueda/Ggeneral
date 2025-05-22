// unit_Actions.js
// Lógica relacionada con las acciones de las unidades (selección, movimiento, ataque, colocación).
// VERSIÓN CORREGIDA PARA USAR 'attackRange' consistentemente

console.log("unit_Actions.js CARGADO (Corregido para usar 'attackRange')");

// ---------------------------------------------------------------------------------
// OBTENER VECINOS DE HEXÁGONO (¡CRUCIAL!)
// ---------------------------------------------------------------------------------
function getHexNeighbors(r, c) {
    let neighborsRaw;
    if (r % 2 === 0) { // Fila PAR (corregida según tu feedback anterior)
        neighborsRaw = [
            { r: r,     c: c + 1 },  // Derecha
            { r: r,     c: c - 1 },  // Izquierda
            { r: r - 1, c: c },      // Arriba-Izquierda 
            { r: r - 1, c: c - 1 },  // Arriba-Derecha 
            { r: r + 1, c: c },      // Abajo-Izquierda 
            { r: r + 1, c: c - 1 }   // Abajo-Derecha 
        ];
    } else { // Fila IMPAR
        neighborsRaw = [
            { r: r,     c: c + 1 },  // Derecha
            { r: r,     c: c - 1 },  // Izquierda
            { r: r - 1, c: c + 1 },  // Arriba-Derecha
            { r: r - 1, c: c },      // Arriba-Izquierda
            { r: r + 1, c: c + 1 },  // Abajo-Derecha
            { r: r + 1, c: c }       // Abajo-Izquierda
        ];
    }
    const validNeighbors = neighborsRaw.filter(n =>
        board && board.length > 0 && n.r >= 0 && n.r < board.length &&
        board[0] && n.c >= 0 && n.c < board[0].length
    );
    return validNeighbors;
}

// ---------------------------------------------------------------------------------
// LÓGICA DE DISTANCIA HEXAGONAL
// ---------------------------------------------------------------------------------
function getHexDistance(startCoords, endCoords) {
    if (!startCoords || !endCoords) return Infinity;
    if (startCoords.r === endCoords.r && startCoords.c === endCoords.c) return 0;

    let queue = [{ r: startCoords.r, c: startCoords.c, dist: 0 }];
    let visited = new Set();
    visited.add(`${startCoords.r},${startCoords.c}`);
    // Usar el attackRange de la unidad de inicio si está disponible para optimizar la búsqueda
    const maxDistanceToSearch = startCoords.attackRange ? startCoords.attackRange + 2 : 30; // +2 para holgura
    let iterations = 0;

    while(queue.length > 0 && iterations < maxDistanceToSearch * 7) { 
        iterations++;
        let curr = queue.shift();
        if (curr.r === endCoords.r && curr.c === endCoords.c) return curr.dist;
        if (curr.dist >= maxDistanceToSearch) continue;

        let neighbors = getHexNeighbors(curr.r, curr.c);
        for (const n of neighbors) {
            const key = `${n.r},${n.c}`;
            if (!visited.has(key)) {
                visited.add(key);
                queue.push({ r: n.r, c: n.c, dist: curr.dist + 1});
            }
        }
    }
    return Infinity; 
}

// ---------------------------------------------------------------------------------
// ACCIONES DE COLOCACIÓN DE UNIDADES
// ---------------------------------------------------------------------------------
function handlePlacementModeClick(r, c) {
    // ... (sin cambios en esta función respecto al uso de 'range' vs 'attackRange', ya que se enfoca en colocar)
    // Asegúrate que la unidad en placementMode.unitData tenga 'attackRange' si es necesario
    // para alguna lógica DENTRO de placeFinalizedDivision o al crear la unidad.
    console.log(`[Placement] Clic en (${r},${c}). placementMode.active=${placementMode.active}, Unidad: ${placementMode.unitData ? placementMode.unitData.name : 'Ninguna'}`);
    const hexData = board[r]?.[c];
    if (!hexData) {
        console.error("[Placement] Hex data no encontrada.");
        if (typeof logMessage === "function") logMessage("Hexágono inválido.");
        return;
    }

    const unitToPlace = placementMode.unitData;
    if (!unitToPlace) {
        console.error("[Placement] No hay unitData. Desactivando modo.");
        placementMode.active = false;
        placementMode.unitData = null;
        if (typeof UIManager !== 'undefined' && UIManager.clearHighlights) UIManager.clearHighlights();
        return;
    }
    console.log("[Placement] Intentando colocar:", unitToPlace.name, "en fase:", gameState.currentPhase);

    let canPlace = !getUnitOnHex(r, c);
    let reasonForNoPlacement = canPlace ? "" : "Ya hay una unidad.";
    let forceCancelAndRefund = false;

    if (gameState.currentPhase === "deployment") {
        if (hexData.owner !== null && hexData.owner !== gameState.currentPlayer) {
            if (canPlace) reasonForNoPlacement = "No en territorio enemigo.";
            canPlace = false;
        }
        if (canPlace && gameState.isCampaignBattle && gameState.currentScenarioData?.playerSetup?.startHexes) {
            const playerStartZones = gameState.currentScenarioData.playerSetup.startHexes;
            if (playerStartZones && playerStartZones.length > 0) {
                if (!playerStartZones.some(zone => zone.r === r && zone.c === c)) {
                    if (canPlace) reasonForNoPlacement = "Solo en zonas de inicio designadas.";
                    canPlace = false;
                }
            }
        }
    } else if (gameState.currentPhase === "play") {
        let isRecruitmentHex = hexData.owner === gameState.currentPlayer && (hexData.isCity || hexData.structure === "Fortaleza");
        if (!isRecruitmentHex) {
            reasonForNoPlacement = canPlace ? "Solo en ciudades/fortalezas propias." : reasonForNoPlacement + " Y solo en ciudades/fortalezas propias.";
            canPlace = false;
            forceCancelAndRefund = true;
        } else if (!canPlace && isRecruitmentHex) {
            reasonForNoPlacement = "Lugar de reclutamiento ocupado.";
        }
    } else {
        reasonForNoPlacement = "Fase incorrecta: " + gameState.currentPhase;
        canPlace = false;
        forceCancelAndRefund = true;
    }

    if (canPlace) {
        placeFinalizedDivision(unitToPlace, r, c); // Pasa el unitData como está
        placementMode.active = false;
        placementMode.unitData = null;
        if (typeof logMessage === "function") logMessage(`${unitToPlace.name} colocada.`);
        if (gameState.currentPhase === "play") {
            if (typeof deselectUnit === "function") deselectUnit();
            if (typeof UIManager !== 'undefined' && UIManager.updateSelectedUnitInfoPanel) UIManager.updateSelectedUnitInfoPanel();
        }
        if (typeof UIManager !== 'undefined' && UIManager.updatePlayerAndPhaseInfo) UIManager.updatePlayerAndPhaseInfo();
        if (typeof UIManager !== 'undefined' && UIManager.clearHighlights) UIManager.clearHighlights();
    } else {
        if (typeof logMessage === "function") logMessage(`No se puede colocar: ${reasonForNoPlacement}`);
        if (forceCancelAndRefund && unitToPlace) {
            if (unitToPlace.cost) {
                for (const resourceType in unitToPlace.cost) {
                    if (gameState.playerResources[gameState.currentPlayer][resourceType] !== undefined) {
                        gameState.playerResources[gameState.currentPlayer][resourceType] += unitToPlace.cost[resourceType];
                    }
                }
                if (typeof UIManager !== 'undefined' && UIManager.updatePlayerAndPhaseInfo) UIManager.updatePlayerAndPhaseInfo();
                if (typeof logMessage === "function") logMessage("Recursos reembolsados.");
            }
            placementMode.active = false;
            placementMode.unitData = null;
            if (typeof UIManager !== 'undefined' && UIManager.clearHighlights) UIManager.clearHighlights();
            if (typeof deselectUnit === "function") deselectUnit();
            if (typeof UIManager !== 'undefined' && UIManager.updateSelectedUnitInfoPanel) UIManager.updateSelectedUnitInfoPanel();
        } else {
             if (typeof logMessage === "function") logMessage("Intenta en otro hexágono.");
        }
    }
}


function placeFinalizedDivision(unitData, r, c) {
    console.log(`[PFD] Colocando ${unitData.name} en (${r},${c})`);
    if (!unitData) { console.error("[PFD] ERROR: unitData es null."); return; }

    const unitElement = document.createElement('div');
    unitElement.classList.add('unit', `player${unitData.player}`);
    unitElement.textContent = unitData.sprite || '?';
    unitElement.dataset.id = unitData.id;
    const strengthDisplay = document.createElement('div');
    strengthDisplay.classList.add('unit-strength');
    strengthDisplay.textContent = unitData.currentHealth;
    unitElement.appendChild(strengthDisplay);

    if (gameBoard && typeof gameBoard.appendChild === "function") { gameBoard.appendChild(unitElement); }
    else { console.error("[PFD] ERROR: gameBoard no disponible."); return; }

    unitData.r = r;
    unitData.c = c;
    unitData.element = unitElement;

    // Asegurar que 'movement' y 'attackRange' base estén en unitData
    // Estas propiedades DEBEN venir de REGIMENT_TYPES al crear unitData
    if (typeof unitData.movement !== 'number' || unitData.movement <= 0) {
        console.warn(`[PFD] ${unitData.name} no tiene 'movement' válido (valor: ${unitData.movement}). Asignando fallback 3.`);
        unitData.movement = 3; 
    }
    if (typeof unitData.attackRange !== 'number' || unitData.attackRange < 0) { // USANDO attackRange
        console.warn(`[PFD] ${unitData.name} no tiene 'attackRange' válido (valor: ${unitData.attackRange}). Asignando fallback.`);
        unitData.attackRange = (unitData.attack && unitData.attack > 0) ? 1 : 0; 
    }
    unitData.currentMovement = unitData.movement;
    unitData.hasMoved = false;
    unitData.hasAttacked = false;
    console.log(`[PFD - Init] ${unitData.name}: baseMovement=${unitData.movement}, currentMovement=${unitData.currentMovement}, hasMoved=${unitData.hasMoved}, attackRange=${unitData.attackRange}`);

    const targetHexData = board[r]?.[c];
    if (targetHexData) {
        targetHexData.unit = unitData;
        if (targetHexData.owner !== unitData.player) {
            targetHexData.owner = unitData.player;
            if (typeof renderSingleHexVisuals === "function") renderSingleHexVisuals(r, c);
        }
    } else { console.error(`[PFD] ERROR: Hex destino (${r},${c}) no encontrado.`); if (unitElement.parentElement) unitElement.remove(); return; }
    
    if (units && typeof units.push === "function") { units.push(unitData); }
    else { console.error("[PFD] ERROR: Array 'units' no disponible."); return; }

    if (typeof positionUnitElement === "function") positionUnitElement(unitData);
    if (typeof UIManager !== 'undefined' && UIManager.updateUnitStrengthDisplay) UIManager.updateUnitStrengthDisplay(unitData);

    if (gameState.currentPhase === "deployment") {
        // ... (lógica de contador de despliegue como estaba) ...
        if (!gameState.unitsPlacedByPlayer) gameState.unitsPlacedByPlayer = {1:0, 2:0};
        gameState.unitsPlacedByPlayer[unitData.player] = (gameState.unitsPlacedByPlayer[unitData.player] || 0) + 1;
        if (typeof logMessage === "function") { logMessage(`J${unitData.player} desplegó ${gameState.unitsPlacedByPlayer[unitData.player]}/${gameState.deploymentUnitLimit === Infinity ? '∞' : gameState.deploymentUnitLimit}.`); }
        if (typeof floatingCreateDivisionBtn !== 'undefined' && floatingCreateDivisionBtn && unitData.player === gameState.currentPlayer && gameState.unitsPlacedByPlayer[unitData.player] >= gameState.deploymentUnitLimit) {
            floatingCreateDivisionBtn.disabled = true;
        }
    }
}

// ---------------------------------------------------------------------------------
// SELECCIÓN Y ACCIONES DE UNIDADES EN JUEGO (usando handleActionWithSelectedUnit que retorna booleano)
// ---------------------------------------------------------------------------------
function handleActionWithSelectedUnit(r_target, c_target, clickedUnitOnTargetHex) {
    // ... (función completa como te la di en la respuesta anterior, que retorna true/false) ...
    if (!selectedUnit) {
        console.error("CRITICAL: handleActionWithSelectedUnit sin selectedUnit.");
        return false; 
    }
    // console.log(`[handleAction] Unidad: ${selectedUnit.name}, Target: (${r_target},${c_target}), UnidadEnTarget: ${clickedUnitOnTargetHex?.name}`);
    // console.log(`   L-> Estado ${selectedUnit.name}: mov=${selectedUnit.currentMovement}, moved=${selectedUnit.hasMoved}, attacked=${selectedUnit.hasAttacked}`);

    if (clickedUnitOnTargetHex && clickedUnitOnTargetHex.id === selectedUnit.id) {
        if (typeof deselectUnit === "function") deselectUnit();
        return false; 
    }
    if (clickedUnitOnTargetHex && clickedUnitOnTargetHex.player !== selectedUnit.player) {
        if (isValidAttack(selectedUnit, clickedUnitOnTargetHex)) {
            if (typeof attackUnit === "function") {
                attackUnit(selectedUnit, clickedUnitOnTargetHex); 
                return true; 
            }
        } else {
            if (typeof logMessage === "function") logMessage(`${selectedUnit.name} no puede atacar a ${clickedUnitOnTargetHex.name}.`);
        }
        return false; 
    }
    if (!clickedUnitOnTargetHex) {
        if (isValidMove(selectedUnit, r_target, c_target)) {
            if (typeof moveUnit === "function") {
                moveUnit(selectedUnit, r_target, c_target); 
                return true; 
            }
        } else {
            if (typeof logMessage === "function") logMessage(`Movimiento de ${selectedUnit.name} a (${r_target},${c_target}) no válido.`);
        }
        return false; 
    }
    if (clickedUnitOnTargetHex && clickedUnitOnTargetHex.player === selectedUnit.player) {
        if (typeof selectUnit === "function") selectUnit(clickedUnitOnTargetHex); 
        return false; 
    }
    return false; 
}


function selectUnit(unit) {
    // ... (función selectUnit como estaba, asegurando que llama a deselectUnit() al principio) ...
    if (!unit) { console.warn("selectUnit con unidad nula."); return; }
    if (gameState.currentPhase === 'play' && unit.player !== gameState.currentPlayer) { // RESTRICCIÓN JUGADOR ACTUAL
        if (typeof logMessage === "function") logMessage(`No puedes seleccionar unidades del Jugador ${unit.player}.`);
        if (typeof UIManager !== 'undefined' && UIManager.showUnitContextualInfo) UIManager.showUnitContextualInfo(unit, true); 
        return;
    }
    if (typeof deselectUnit === "function") deselectUnit();
    selectedUnit = unit;
    if (unit.element) { unit.element.classList.add('selected-unit'); }
    else { console.error(`ERROR: Unidad ${unit.name} no tiene .element!`); selectedUnit = null; return; }
    if (typeof logMessage === "function") logMessage(`${unit.name} seleccionada.`);
    let canStillAct = false;
    if (gameState.currentPhase === 'play') {
        const canPerformMovementAction = !unit.hasMoved && unit.currentMovement > 0;
        const canPerformAttackAction = !unit.hasAttacked;
        canStillAct = canPerformMovementAction || canPerformAttackAction;
        if (!canStillAct) { if(typeof logMessage === "function") logMessage(`${unit.name} ya ha actuado.`); }
    } else { canStillAct = true; }
    if (canStillAct || gameState.currentPhase !== 'play') {
        if (typeof highlightPossibleActions === "function") highlightPossibleActions(unit);
    }
}

function deselectUnit() {
    // ... (función deselectUnit como estaba) ...
    if (selectedUnit && selectedUnit.element) {
        selectedUnit.element.classList.remove('selected-unit');
    }
    selectedUnit = null;
    if (typeof UIManager !== 'undefined' && UIManager.clearHighlights) UIManager.clearHighlights();
    else if (typeof clearHighlights === "function") clearHighlights();
}

function highlightPossibleActions(unit) {
    // ... (función highlightPossibleActions como estaba, debe usar isValidAttack e isValidMove) ...
    if (typeof UIManager !== 'undefined' && UIManager.clearHighlights) UIManager.clearHighlights();
    else if (typeof clearHighlights === "function") clearHighlights();
    if (!unit || !board || board.length === 0) return;
    for (let r_idx = 0; r_idx < board.length; r_idx++) {
        for (let c_idx = 0; c_idx < board[0].length; c_idx++) {
            const hexData = board[r_idx]?.[c_idx];
            if (!hexData || !hexData.element) continue;
            if (gameState.currentPhase === "play" && hexData.visibility && typeof hexData.visibility === 'object' && hexData.visibility[`player${gameState.currentPlayer}`] === 'hidden') continue;
            if (gameState.currentPhase === 'play' && !unit.hasMoved && unit.currentMovement > 0 && isValidMove(unit, r_idx, c_idx)) {
                 hexData.element.classList.add('highlight-move');
            }
            const targetUnitOnHex = getUnitOnHex(r_idx, c_idx);
            if (gameState.currentPhase === 'play' && !unit.hasAttacked && targetUnitOnHex && targetUnitOnHex.player !== unit.player && isValidAttack(unit, targetUnitOnHex)) {
                hexData.element.classList.add('highlight-attack');
            }
        }
    }
}

function clearHighlights() {
    // ... (función clearHighlights como estaba) ...
    document.querySelectorAll('.hex.highlight-move, .hex.highlight-attack, .hex.highlight-build, .hex.highlight-place').forEach(h => {
        h.classList.remove('highlight-move', 'highlight-attack', 'highlight-build', 'highlight-place');
    });
}

// ---------------------------------------------------------------------------------
// LÓGICA DE MOVIMIENTO
// ---------------------------------------------------------------------------------
function getMovementCost(unit, r_start, c_start, r_target, c_target) {
    // ... (función getMovementCost como estaba) ...
    if (!unit) { return Infinity; }
    if (r_start === r_target && c_start === c_target) return 0;
    if (unit.currentMovement <= 0) return Infinity;
    let queue = [{ r: r_start, c: c_start, cost: 0 }]; 
    let visited = new Set();
    visited.add(`${r_start},${c_start}`);
    const maxSearchDepth = unit.currentMovement;
    let iterations = 0;
    while (queue.length > 0 && iterations < 1000) { 
        iterations++;
        let current = queue.shift();
        if (current.cost >= maxSearchDepth) continue;
        let neighbors = getHexNeighbors(current.r, current.c);
        for (const neighbor of neighbors) {
            const costToEnterNeighbor = current.cost + 1;
            if (neighbor.r === r_target && neighbor.c === c_target) {
                if (!getUnitOnHex(neighbor.r, neighbor.c)) return costToEnterNeighbor;
                else continue; 
            }
            const visitedKey = `${neighbor.r},${neighbor.c}`;
            if (!visited.has(visitedKey)) {
                if (board[neighbor.r]?.[neighbor.c] && !getUnitOnHex(neighbor.r, neighbor.c)) {
                    visited.add(visitedKey);
                    queue.push({ r: neighbor.r, c: neighbor.c, cost: costToEnterNeighbor });
                }
            }
        }
    }
    return Infinity;
}

function isValidMove(unit, toR, toC) {
    // ... (función isValidMove como estaba) ...
    if (!unit) return false; 
    if (gameState.currentPhase === 'play' && unit.hasMoved) return false; 
    if (unit.currentMovement <= 0) return false; 
    if (unit.r === toR && unit.c === toC) return false; 
    if (getUnitOnHex(toR, toC)) return false; 
    const cost = getMovementCost(unit, unit.r, unit.c, toR, toC);
    return cost !== Infinity && cost <= unit.currentMovement;
}

async function moveUnit(unit, toR, toC) {
    // ... (función moveUnit como estaba, asegurando que actualiza hasMoved y currentMovement) ...
    const fromR = unit.r;
    const fromC = unit.c;
    const costOfThisMove = getMovementCost(unit, fromR, fromC, toR, toC);
    // console.log(`[moveUnit] ${unit.name} de (${fromR},${fromC}) a (${toR},${toC}). Costo:${costOfThisMove}. Mov antes:${unit.currentMovement}, moved:${unit.hasMoved}`);
    if (costOfThisMove === Infinity || costOfThisMove > unit.currentMovement || (gameState.currentPhase === 'play' && unit.hasMoved) || unit.currentMovement <= 0) {
        console.error(`[moveUnit] MOVIMIENTO INVÁLIDO (CHEQUEO ROBUSTO) para ${unit.name}.`);
        if (typeof logMessage === "function") logMessage("Movimiento inválido (interno).");
        if (selectedUnit && selectedUnit.id === unit.id && typeof highlightPossibleActions === "function") highlightPossibleActions(unit);
        return;
    }
    if (board[fromR]?.[fromC]) board[fromR][fromC].unit = null;
    if (typeof renderSingleHexVisuals === "function") renderSingleHexVisuals(fromR, fromC);
    unit.r = toR;
    unit.c = toC;
    unit.currentMovement -= costOfThisMove;
    if (gameState.currentPhase === 'play') { unit.hasMoved = true; }
    // console.log(`   L-> DESPUÉS ${unit.name}: mov=${unit.currentMovement}, moved=${unit.hasMoved}`);
    const targetHexData = board[toR]?.[toC];
    if (targetHexData) {
        targetHexData.unit = unit;
        if (targetHexData.owner !== unit.player) { 
            targetHexData.owner = unit.player;
            const city = gameState.cities.find(ci => ci.r === toR && ci.c === toC);
            if (city && city.owner !== unit.player) {
                city.owner = unit.player;
                if (typeof logMessage === "function") logMessage(`¡Ciudad ${city.name} capturada por Jugador ${unit.player}!`);
                if (typeof UIManager !== 'undefined' && UIManager.updateCityInfo) UIManager.updateCityInfo(city);
            }
        }
        if (typeof renderSingleHexVisuals === "function") renderSingleHexVisuals(toR, toC);
    } else { 
        console.error(`[moveUnit] Error crítico: Hex destino (${toR},${toC}) no encontrado.`);
        unit.r = fromR; unit.c = fromC; unit.currentMovement += costOfThisMove; 
        if (gameState.currentPhase === 'play') unit.hasMoved = false; 
        if (board[fromR]?.[fromC]) board[fromR][fromC].unit = unit; 
        if (typeof renderSingleHexVisuals === "function") renderSingleHexVisuals(fromR, fromC); 
        return; 
    }
    if (typeof positionUnitElement === "function") positionUnitElement(unit);
    if (typeof logMessage === "function") logMessage(`${unit.name} movida. Mov. restante: ${unit.currentMovement}.`);
    if (typeof UIManager !== 'undefined' && UIManager.updateSelectedUnitInfoPanel) UIManager.updateSelectedUnitInfoPanel();
    if (typeof UIManager !== 'undefined' && UIManager.updatePlayerAndPhaseInfo) UIManager.updatePlayerAndPhaseInfo(); 
    if (gameState.currentPhase === 'play' && typeof checkVictory === "function") { if (checkVictory()) return; }
    if (selectedUnit && selectedUnit.id === unit.id) {
        const canStillAttack = gameState.currentPhase === 'play' && !unit.hasAttacked; 
        if (unit.hasMoved && !canStillAttack) { 
             if (typeof UIManager !== 'undefined' && UIManager.clearHighlights) UIManager.clearHighlights();
        } else if (unit.hasMoved && canStillAttack) { 
            if (typeof highlightPossibleActions === "function") highlightPossibleActions(unit);
        } else {
            if (typeof highlightPossibleActions === "function") highlightPossibleActions(unit);
        }
    }
}

function positionUnitElement(unit) {
    // ... (función positionUnitElement como estaba) ...
    if (!unit || !unit.element || !(unit.element instanceof HTMLElement)) { console.error("[positionUnitElement] Unidad o elemento no válido.", unit); return; }
    if (typeof HEX_WIDTH === 'undefined' || typeof HEX_VERT_SPACING === 'undefined' || typeof HEX_HEIGHT === 'undefined') {
        console.error("[positionUnitElement] Constantes de hexágono no definidas.");
        unit.element.style.left = (unit.c * 60) + 'px'; unit.element.style.top = (unit.r * 70) + 'px';  
        unit.element.style.display = 'flex'; return;
    }
    const unitWidth = unit.element.offsetWidth || parseInt(unit.element.style.width) || 36;
    const unitHeight = unit.element.offsetHeight || parseInt(unit.element.style.height) || 36;
    const xPos = unit.c * HEX_WIDTH + (unit.r % 2 !== 0 ? HEX_WIDTH / 2 : 0) + (HEX_WIDTH - unitWidth) / 2;
    const yPos = unit.r * HEX_VERT_SPACING + (HEX_HEIGHT - unitHeight) / 2;
    if (isNaN(xPos) || isNaN(yPos)) {
        console.error(`[positionUnitElement] xPos o yPos es NaN para ${unit.name}.`);
        unit.element.style.left = '10px'; unit.element.style.top = '10px'; 
    } else {
        unit.element.style.left = `${xPos}px`; unit.element.style.top = `${yPos}px`;
    }
    unit.element.style.display = 'flex'; 
}

// ---------------------------------------------------------------------------------
// LÓGICA DE COMBATE
// ---------------------------------------------------------------------------------
function isValidAttack(attacker, defender) {
    if (!attacker || !defender) { return false; }
    if (attacker.player === gameState.currentPlayer && gameState.currentPhase === 'play' && attacker.hasAttacked) { return false; } // Solo chequear hasAttacked para el jugador actual
    if (attacker.id === defender.id) { return false; }
    if (attacker.player === defender.player) { return false; }

    // USANDO attacker.attackRange
    const distance = getHexDistance({r: attacker.r, c: attacker.c, attackRange: attacker.attackRange}, {r: defender.r, c: defender.c});
    const range = attacker.attackRange === undefined ? 1 : attacker.attackRange; // USANDO attackRange
    
    // console.log(`[isValidAttack] ${attacker.name} (J${attacker.player}, Rng:${range}) vs ${defender.name} (J${defender.player}). Dist: ${distance}`);
    return distance !== Infinity && distance <= range;
}

async function attackUnit(attacker, defender) {
    // ... (función attackUnit como estaba, pero usando attacker.attackRange y defender.attackRange si es necesario en contraataque) ...
    if (!attacker || !defender) { console.error("attackUnit: Atacante o defensor nulo."); return; }
    if (attacker.player === gameState.currentPlayer && gameState.currentPhase === 'play' && attacker.hasAttacked) { // Solo chequear para el jugador actual
        if (typeof logMessage === "function") logMessage(`${attacker.name} ya ha atacado.`); return;
    }
    console.log(`[Combat] ${attacker.name} (J${attacker.player}) ataca a ${defender.name} (J${defender.player})`);
    if (typeof logMessage === "function") logMessage(`${attacker.name} ataca a ${defender.name}!`);
    if (typeof applyFlankingPenalty === "function") applyFlankingPenalty(defender, attacker);
    let damageDealtToDefender = 0;
    if (typeof applyDamage === "function") damageDealtToDefender = applyDamage(attacker, defender);
    else console.warn("applyDamage no definida.");
    if (typeof showCombatAnimation === "function") await showCombatAnimation(defender, attacker, damageDealtToDefender > 0 ? 'melee_hit' : 'miss');
    if (typeof UIManager !== 'undefined' && UIManager.updateUnitStrengthDisplay) UIManager.updateUnitStrengthDisplay(defender);
    if (defender.currentHealth <= 0) {
        if (typeof handleUnitDestroyed === "function") handleUnitDestroyed(defender, attacker);
    } else {
        const defenderCanCounterAttack = gameState.currentPhase === 'play' && (!defender.hasAttacked || defender.player !== gameState.currentPlayer) ; // IA o jugador que no es el actual puede contraatacar aunque haya "atacado" en su turno.
        if (defenderCanCounterAttack && isValidAttack(defender, attacker)) { 
            if (typeof logMessage === "function") logMessage(`${defender.name} contraataca!`);
            let damageDealtToAttacker = 0;
            if (typeof applyDamage === "function") damageDealtToAttacker = applyDamage(defender, attacker);
            if (typeof showCombatAnimation === "function") await showCombatAnimation(attacker, defender, damageDealtToAttacker > 0 ? 'counter_attack_hit' : 'miss');
            if (typeof UIManager !== 'undefined' && UIManager.updateUnitStrengthDisplay) UIManager.updateUnitStrengthDisplay(attacker);
            if (attacker.currentHealth <= 0) {
                if (typeof handleUnitDestroyed === "function") handleUnitDestroyed(attacker, defender);
            }
        }
    }
    if (gameState.currentPhase === 'play' && attacker.currentHealth > 0 && attacker.player === gameState.currentPlayer) { // Solo marcar hasAttacked para el jugador actual
        attacker.hasAttacked = true;
        // console.log(`   L-> DESPUÉS de atacar ${attacker.name}: ... attacked=${attacker.hasAttacked}`);
    }
    if (attacker.currentHealth > 0 && typeof handlePostBattleRetreat === "function") handlePostBattleRetreat(attacker);
    if (typeof UIManager !== 'undefined' && UIManager.updateSelectedUnitInfoPanel) UIManager.updateSelectedUnitInfoPanel();
    if (typeof UIManager !== 'undefined' && UIManager.updatePlayerAndPhaseInfo) UIManager.updatePlayerAndPhaseInfo();
    if (gameState.currentPhase === 'play' && typeof checkVictory === "function") { if(checkVictory()) return; }
    if (selectedUnit && selectedUnit.id === attacker.id && attacker.currentHealth > 0) {
        const noMoreMovement = attacker.hasMoved || attacker.currentMovement <= 0;
        if (noMoreMovement && attacker.hasAttacked && attacker.player === gameState.currentPlayer) { // Solo para el jugador actual
             if (typeof UIManager !== 'undefined' && UIManager.clearHighlights) UIManager.clearHighlights();
        } else { 
            if (typeof highlightPossibleActions === "function") highlightPossibleActions(attacker);
        }
    } else if (selectedUnit && selectedUnit.id === attacker.id && attacker.currentHealth <= 0) { 
        if (typeof deselectUnit === "function") deselectUnit(); 
    }
}

const COMBAT_ANIMATION_DURATION = 500; 
async function showCombatAnimation(targetUnit, attackerUnit, type) { /* ... */ }
function applyDamage(attacker, target) { /* ... (usando attacker.attack y target.defense) ... */ 
    if (!attacker || !target) return 0;
    let baseDamage = attacker.attack || 0; 
    let defensePower = target.defense || 0; 
    let terrainDefenseBonus = board[target.r]?.[target.c]?.terrain?.defenseBonus || 0; 
    defensePower += terrainDefenseBonus;
    let flankingMultiplier = target.isFlanked ? 1.25 : 1.0; 
    let effectiveAttack = baseDamage * flankingMultiplier;
    let damageDealt = Math.max(0, Math.round(effectiveAttack - defensePower)); 
    if (effectiveAttack > 0 && damageDealt === 0) damageDealt = 1; 
    damageDealt = Math.min(damageDealt, target.currentHealth); 
    // console.log(`[DamageCalc] ... Daño: ${damageDealt}`);
    target.currentHealth -= damageDealt;
    if (typeof logMessage === "function") logMessage(`${attacker.name} inflige ${damageDealt} daño a ${target.name}.`);
    target.isFlanked = false; 
    return damageDealt;
}

// En unit_Actions.js

function handleUnitDestroyed(destroyedUnit, victorUnit) {
    if (!destroyedUnit) {
        console.warn("[handleUnitDestroyed] Se intentó destruir una unidad nula.");
        return;
    }
    console.log(`[UnitDestroyed] ¡${destroyedUnit.name} (Jugador ${destroyedUnit.player}) ha sido destruida!`);
    if (typeof logMessage === "function") logMessage(`¡${destroyedUnit.name} ha sido destruida!`);

    // 1. Quitar del tablero (estado lógico en la 'board')
    const hexOfUnit = board[destroyedUnit.r]?.[destroyedUnit.c];
    if (hexOfUnit && hexOfUnit.unit && hexOfUnit.unit.id === destroyedUnit.id) {
        hexOfUnit.unit = null; // Quitar la referencia de la unidad del hexágono en el estado
        console.log(`[UnitDestroyed] Unidad ${destroyedUnit.name} eliminada del estado del hex (${destroyedUnit.r},${destroyedUnit.c}).`);
        if (typeof renderSingleHexVisuals === "function") {
            // renderSingleHexVisuals podría redibujar el hex sin la unidad, pero no elimina el elemento de la unidad en sí.
            // Esto es más para actualizar el fondo del hex o mostrar que está vacío.
            renderSingleHexVisuals(destroyedUnit.r, destroyedUnit.c);
        }
    } else {
        console.warn(`[UnitDestroyed] No se encontró la unidad ${destroyedUnit.name} en el estado del hex (${destroyedUnit.r},${destroyedUnit.c}) o el ID no coincidía.`);
    }

    // 2. Quitar el elemento DOM de la unidad del gameBoard
    // ----- ESTA ES LA PARTE CRUCIAL PARA EL PROBLEMA VISUAL -----
    if (destroyedUnit.element && destroyedUnit.element.parentElement) {
        console.log(`[UnitDestroyed] Eliminando elemento DOM de ${destroyedUnit.name} de su padre:`, destroyedUnit.element.parentElement);
        destroyedUnit.element.remove(); // Método estándar para quitar un elemento del DOM
    } else if (destroyedUnit.element && !destroyedUnit.element.parentElement) {
        console.warn(`[UnitDestroyed] El elemento DOM de ${destroyedUnit.name} existe pero no tiene padre. No se puede eliminar (quizás ya se eliminó o nunca se añadió correctamente).`);
    } else {
        console.warn(`[UnitDestroyed] La unidad ${destroyedUnit.name} no tiene una propiedad .element o es nula. No se puede eliminar el elemento DOM.`);
        // Como fallback, si el elemento no está enlazado pero sabemos su ID, podríamos intentar buscarlo en el DOM,
        // aunque esto es menos ideal y sugiere un problema en cómo se enlaza .element.
        const elementInDomById = document.querySelector(`.unit[data-id="${destroyedUnit.id}"]`);
        if (elementInDomById && elementInDomById.parentElement) {
            console.warn(`[UnitDestroyed] Fallback: Encontrado y eliminando elemento por data-id="${destroyedUnit.id}".`);
            elementInDomById.remove();
        }
    }
    // ----- FIN DE LA PARTE CRUCIAL -----

    // 3. Quitar del array global de unidades ('units')
    const index = units.findIndex(u => u.id === destroyedUnit.id);
    if (index > -1) {
        units.splice(index, 1);
        console.log(`[UnitDestroyed] Unidad ${destroyedUnit.name} eliminada del array 'units'.`);
    } else {
        console.warn(`[UnitDestroyed] No se encontró la unidad ${destroyedUnit.name} en el array 'units' para eliminarla.`);
    }

    // 4. Otorgar experiencia/recursos al vencedor (si existe)
    if (victorUnit) {
        // ... (lógica de XP y oro como estaba) ...
        const experienceGained = destroyedUnit.experienceValue || 10;
        victorUnit.experience = (victorUnit.experience || 0) + experienceGained;
        if (typeof logMessage === "function") logMessage(`${victorUnit.name} gana ${experienceGained} XP.`);
        const goldPlundered = destroyedUnit.goldValue || 5;
        if (gameState.playerResources[victorUnit.player]) {
            gameState.playerResources[victorUnit.player].oro = (gameState.playerResources[victorUnit.player].oro || 0) + goldPlundered;
            if (typeof logMessage === "function") logMessage(`${victorUnit.name} saquea ${goldPlundered} de oro.`);
        }
        if (typeof UIManager !== 'undefined' && UIManager.updateUnitStrengthDisplay) UIManager.updateUnitStrengthDisplay(victorUnit); 
    }
    
    // 5. Actualizar UI general
    if (selectedUnit && selectedUnit.id === destroyedUnit.id) {
        selectedUnit = null; // La unidad seleccionada fue destruida
        if (typeof UIManager !== 'undefined' && UIManager.hideContextualPanel) UIManager.hideContextualPanel();
        else if (typeof UIManager !== 'undefined' && UIManager.updateSelectedUnitInfoPanel) UIManager.updateSelectedUnitInfoPanel(); // Para limpiar el panel
    }
    if (typeof UIManager !== 'undefined' && UIManager.updatePlayerAndPhaseInfo) UIManager.updatePlayerAndPhaseInfo();

    // 6. Comprobar condiciones de victoria
    if (typeof checkVictory === "function") checkVictory();
}

// ---------------------------------------------------------------------------------
// ACCIÓN DE REFUERZO DE UNIDAD
// ---------------------------------------------------------------------------------
function handleReinforceUnitAction() {
    console.log("%c[Reinforce] Iniciando acción de refuerzo...", "color: darkviolet; font-weight:bold;");
    if (!selectedUnit) { 
        if(typeof logMessage === "function") logMessage("Selecciona una unidad para reforzar.");
        return; 
    }
    if (selectedUnit.currentHealth >= selectedUnit.maxHealth) {
        if(typeof logMessage === "function") logMessage(`${selectedUnit.name} ya tiene la salud máxima.`);
        return;
    }
    if (gameState.currentPhase === 'play' && (selectedUnit.hasMoved || selectedUnit.hasAttacked)) {
        if(typeof logMessage === "function") logMessage(`${selectedUnit.name} ya ha actuado este turno, no puede reforzar.`);
        return;
    }

    const unitHexData = board[selectedUnit.r]?.[selectedUnit.c];
    if (!(unitHexData && unitHexData.owner === gameState.currentPlayer && (unitHexData.isCity || unitHexData.structure === "Fortaleza"))) {
        if(typeof logMessage === "function") logMessage("Solo puedes reforzar unidades en tus propias ciudades o fortalezas.");
        return;
    }

    const healthToRestore = selectedUnit.maxHealth - selectedUnit.currentHealth;
    const unitTypeDefinition = (typeof UNIT_TYPES !== 'undefined' && UNIT_TYPES[selectedUnit.type]) ? UNIT_TYPES[selectedUnit.type] : {};
    const costPerHp = selectedUnit.reinforceCostPerHp || unitTypeDefinition.reinforceCostPerHp || Math.ceil((unitTypeDefinition.cost?.oro || 20) / (selectedUnit.maxHealth || 10) / 2) || 1; // Costo base por HP
    const totalCost = Math.max(1, healthToRestore * costPerHp); // Asegurar un costo mínimo

    if (gameState.playerResources[gameState.currentPlayer].oro < totalCost) {
        if(typeof logMessage === "function") logMessage(`No tienes suficiente oro para reforzar. Necesitas ${totalCost}, tienes ${gameState.playerResources[gameState.currentPlayer].oro}.`);
        return;
    }

    const confirmationMessage = `Reforzar ${selectedUnit.name} por ${healthToRestore} HP costará ${totalCost} de oro. ¿Continuar?`;
    
    const performReinforcement = () => {
        gameState.playerResources[gameState.currentPlayer].oro -= totalCost;
        selectedUnit.currentHealth = selectedUnit.maxHealth;
        if (gameState.currentPhase === 'play') {
            selectedUnit.hasMoved = true; 
            selectedUnit.hasAttacked = true; 
        }
        if(typeof logMessage === "function") logMessage(`${selectedUnit.name} reforzada a salud máxima. Costo: ${totalCost} oro.`);
        console.log(`[ReinforceAction] ${selectedUnit.name} reforzada.`);

        if (typeof UIManager !== 'undefined') {
            if (UIManager.updatePlayerAndPhaseInfo) UIManager.updatePlayerAndPhaseInfo();
            if (UIManager.updateSelectedUnitInfoPanel) UIManager.updateSelectedUnitInfoPanel(); 
            if (UIManager.updateUnitStrengthDisplay) UIManager.updateUnitStrengthDisplay(selectedUnit);
            if (UIManager.clearHighlights) UIManager.clearHighlights(); 
        }
    };

    if (typeof UIManager !== 'undefined' && UIManager.showConfirmationDialog) {
        UIManager.showConfirmationDialog(confirmationMessage, performReinforcement);
    } else { 
        if (window.confirm(confirmationMessage)) {
            performReinforcement();
        } else {
            if(typeof logMessage === "function") logMessage("Refuerzo cancelado.");
        }
    }
}

// ---------------------------------------------------------------------------------
// LÓGICA DE RETIRADA
// ---------------------------------------------------------------------------------
function findSafeRetreatHex(unit, attacker) {
    if (!unit) return null;
    const neighbors = getHexNeighbors(unit.r, unit.c);
    const potentialRetreatHexes = [];

    for (const n_coord of neighbors) {
        const hexData = board[n_coord.r]?.[n_coord.c];
        if (hexData && !hexData.unit) { // Casilla vacía
            // Prioridad 1: Casilla propia
            if (hexData.owner === unit.player) {
                potentialRetreatHexes.push({ ...n_coord, priority: 1 });
            }
            // Prioridad 2: Casilla neutral
            else if (hexData.owner === null) {
                potentialRetreatHexes.push({ ...n_coord, priority: 2 });
            }
            // No retirarse a casilla enemiga directamente adyacente (a menos que no haya otra opción y se implemente)
        }
    }

    // Filtrar hexes que estén en la Zona de Control del atacante (si se define)
    // Por ahora, simplemente ordena por prioridad
    potentialRetreatHexes.sort((a,b) => a.priority - b.priority);

    if (potentialRetreatHexes.length > 0) {
        // Podrías añadir lógica para evitar retirarse a un hex adyacente al 'attacker' si es posible
        return potentialRetreatHexes[0]; // Devuelve el mejor hex seguro encontrado
    }
    
    console.log(`[findSafeRetreatHex] ${unit.name} no encontró hex para retirarse.`);
    return null;
}

function handlePostBattleRetreat(unit, attacker) { // Attacker es quien causó el chequeo de moral/retirada
    if (!unit || unit.currentHealth <= 0) return;

    // Lógica de chequeo de moral (ejemplo simple)
    // Podrías tener una propiedad 'moral' en la unidad o calcularla.
    // Aquí, un simple chequeo de salud.
    const healthPercentage = unit.currentHealth / unit.maxHealth;
    let mustRetreat = false;

    if (healthPercentage < 0.25) { // Por debajo del 25% de salud
        mustRetreat = true;
        if (typeof logMessage === "function") logMessage(`${unit.name} tiene muy poca salud (${Math.round(healthPercentage*100)}%)! Chequeando retirada.`);
    }
    // Podrías añadir chequeos si está flanqueada, superada en número, etc.

    if (mustRetreat) {
        const hexData = board[unit.r]?.[unit.c];
        const inOwnDefensiveStructure = hexData && hexData.owner === unit.player && (hexData.isCity || hexData.structure === "Fortaleza");

        if (inOwnDefensiveStructure) {
            if (typeof logMessage === "function") logMessage(`${unit.name} está en una posición defensiva, no se retirará.`);
            return;
        }

        const retreatHexCoords = findSafeRetreatHex(unit, attacker);
        if (retreatHexCoords) {
            if (typeof logMessage === "function") logMessage(`${unit.name} se retira a (${retreatHexCoords.r},${retreatHexCoords.c})!`);
            
            // Lógica para mover la unidad al hex de retirada.
            // Esto debería ser un movimiento especial que no consume acción normal
            // y puede tener diferentes reglas. Por simplicidad, aquí solo actualizamos el estado.
            const fromR = unit.r;
            const fromC = unit.c;

            if (board[fromR]?.[fromC]) board[fromR][fromC].unit = null;
            
            unit.r = retreatHexCoords.r;
            unit.c = retreatHexCoords.c;
            
            if (board[unit.r]?.[unit.c]) board[unit.r][unit.c].unit = unit;
            else { console.error(`[Retreat] Hex de retirada (${unit.r},${unit.c}) inválido.`); return; }

            if (typeof positionUnitElement === "function") positionUnitElement(unit);
            if (typeof renderSingleHexVisuals === "function") {
                renderSingleHexVisuals(fromR, fromC);
                renderSingleHexVisuals(unit.r, unit.c);
            }
            // Si la unidad retirada era la seleccionada, actualizar la UI
            if (selectedUnit && selectedUnit.id === unit.id) {
                if (typeof UIManager !== 'undefined' && UIManager.updateSelectedUnitInfoPanel) UIManager.updateSelectedUnitInfoPanel();
                if (typeof UIManager !== 'undefined' && UIManager.clearHighlights) UIManager.clearHighlights(); // Ya no puede actuar
            }

        } else {
            if (typeof logMessage === "function") logMessage(`${unit.name} no pudo encontrar un lugar seguro para retirarse y debe luchar! (O se rinde/destruye si la moral es 0)`);
            // Aquí podrías implementar rendición o destrucción si no hay retirada posible.
        }
    }
}

// ---------------------------------------------------------------------------------
// LÓGICA DE FLANQUEO
// ---------------------------------------------------------------------------------
function applyFlankingPenalty(targetUnit, mainAttacker) {
    if (!targetUnit || !mainAttacker || !board) return;

    targetUnit.isFlanked = false; // Resetear por defecto
    let flankingAttackersCount = 0;
    const neighbors = getHexNeighbors(targetUnit.r, targetUnit.c);

    for (const n_coord of neighbors) {
        const neighborUnit = getUnitOnHex(n_coord.r, n_coord.c);
        // Un enemigo está flanqueando si:
        // 1. Es una unidad
        // 2. No es del mismo jugador que la unidad objetivo
        // 3. No es el atacante principal (ya que ese es el ataque directo, no el de flanqueo)
        // 4. (Opcional) Puede atacar a la unidad objetivo (ej. está en su rango de ataque y tiene línea de visión)
        if (neighborUnit && 
            neighborUnit.player !== targetUnit.player && 
            neighborUnit.id !== mainAttacker.id) {
            
            // Para un chequeo más avanzado, verificar si esta unidad flanqueadora PUEDE atacar al objetivo
            // if (isValidAttack(neighborUnit, targetUnit)) { // ¡CUIDADO CON RECURSIÓN INFINITA SI isValidAttack LLAMA A ESTO!
            //    flankingAttackersCount++;
            // }
            // Por ahora, una simplificación: si es un enemigo adyacente (que no es el atacante principal), cuenta.
            flankingAttackersCount++;
        }
    }

    if (flankingAttackersCount > 0) {
        targetUnit.isFlanked = true; // Esta propiedad se usaría en applyDamage
        console.log(`[Flanking] ${targetUnit.name} está flanqueada por ${flankingAttackersCount} unidad(es) enemiga(s) adicional(es).`);
        if (typeof logMessage === "function") logMessage(`${targetUnit.name} está siendo flanqueada! (- Defensa)`);
    }
}

// ---------------------------------------------------------------------------------
// FUNCIÓN DE RESETEO DE TURNO
// ---------------------------------------------------------------------------------
function resetUnitsForNewTurn(playerNumber) { 
    console.log(`%c[TurnStart] Reseteando unidades para Jugador ${playerNumber}`, "color: blue; font-weight: bold;");
    if (!units || !Array.isArray(units)) { console.error("[TurnStart] 'units' no disponible."); return; }
    units.forEach(unit => {
        if (unit.player === playerNumber) {
            if (typeof unit.movement !== 'number' || unit.movement <= 0) {
                const unitTypeMovement = (typeof UNIT_TYPES !== 'undefined' && UNIT_TYPES[unit.type]) ? UNIT_TYPES[unit.type].movement : null;
                unit.movement = unitTypeMovement || 3;
            }
            // CORREGIDO AQUÍ PARA USAR unit.attackRange consistente con REGIMENT_TYPES
            if (typeof unit.attackRange !== 'number' || unit.attackRange < 0) {
                const unitTypeAttackRange = (typeof UNIT_TYPES !== 'undefined' && UNIT_TYPES[unit.type]) ? UNIT_TYPES[unit.type].attackRange : undefined;
                console.warn(`[TurnStart] ${unit.name} (tipo ${unit.type}) no tiene 'attackRange' válido (valor: ${unit.attackRange}). Usando ${unitTypeAttackRange !== undefined ? unitTypeAttackRange : ((unit.attack||0) > 0 ? 1 : 0)}.`);
                unit.attackRange = unitTypeAttackRange !== undefined ? unitTypeAttackRange : ((unit.attack||0) > 0 ? 1 : 0);
            }

            unit.currentMovement = unit.movement;
            unit.hasMoved = false;
            unit.hasAttacked = false;
            unit.isFlanked = false; 
            // console.log(`   L-> ${unit.name} reseteada: mov=${unit.currentMovement}, attackRange=${unit.attackRange}`);
        }
    });
    if (typeof deselectUnit === "function") deselectUnit(); 
    if (typeof UIManager !== 'undefined') {
        if (UIManager.updateSelectedUnitInfoPanel) UIManager.updateSelectedUnitInfoPanel(); 
        if (UIManager.updatePlayerAndPhaseInfo) UIManager.updatePlayerAndPhaseInfo(); 
    }
}

console.log("unit_Actions.js CARGA COMPLETA (Corregido para usar 'attackRange')");