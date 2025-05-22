// modalLogic.js
// Lógica para manejar los modales de creación de división y construcción de estructuras.


function addModalEventListeners() {
    // Listeners para cerrar modales (botón 'x' y clic fuera)
    document.querySelectorAll('.modal .close-button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) modal.style.display = 'none';
            if (modal === createDivisionModal) currentDivisionBuilder = [];
            if (modal === buildStructureModal) selectedStructureToBuild = null;
        });
    });
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
            if (event.target === createDivisionModal) currentDivisionBuilder = [];
            if (event.target === buildStructureModal) selectedStructureToBuild = null;
        }
    });


    /*
    // Listeners para botones que abren los modales (desde el sidebar)
    if (createDivisionBtn) createDivisionBtn.addEventListener('click', openCreateDivisionModal);
    if (buildStructureBtn) buildStructureBtn.addEventListener('click', openBuildStructureModal);
    */
   
    // Listeners para botones DENTRO de los modales (finalizar acciones)
    if (finalizeDivisionBtn) finalizeDivisionBtn.addEventListener('click', handleFinalizeDivision);
     else console.warn("modalLogic: finalizeDivisionBtn no encontrado.");
    if (confirmBuildBtn) confirmBuildBtn.addEventListener('click', handleConfirmBuildStructure);
    else console.warn("modalLogic: confirmBuildBtn no encontrado.");
}

// --- LÓGICA DEL MODAL DE CREACIÓN DE DIVISIÓN ---
function openCreateDivisionModal() {
    if (gameState.currentPhase === "play") {
        let canRecruit = gameState.cities.some(city => 
            city.owner === gameState.currentPlayer && 
            board[city.r]?.[city.c] && 
            (board[city.r][city.c].isCapital || board[city.r][city.c].structure === "Fortaleza")
        );
        if (!canRecruit) {
            logMessage("Debes controlar una Capital o Fortaleza para crear unidades durante la partida.");
            return;
        }
    }
    currentDivisionBuilder = []; 
    populateAvailableRegimentsForModal(); 
    updateCreateDivisionModalDisplay(); 
    if (divisionNameInput) divisionNameInput.value = `División P${gameState.currentPlayer} #${units.filter(u => u.player === gameState.currentPlayer).length + 1}`;
    if (createDivisionModal) createDivisionModal.style.display = 'flex';
}

function populateAvailableRegimentsForModal() {
    if (!availableRegimentsListEl) return;
    availableRegimentsListEl.innerHTML = '';
    for (const type in REGIMENT_TYPES) {
        const reg = REGIMENT_TYPES[type];
        const li = document.createElement('li');
        let costText = "";
        for(const res in reg.cost) { costText += `${reg.cost[res]} ${res.charAt(0).toUpperCase()}, `;} // Muestra solo la primera letra del recurso para brevedad
        costText = costText.length > 2 ? costText.slice(0,-2) : "Gratis"; 

        li.textContent = `${type} (Coste: ${costText} | A:${reg.attack}/D:${reg.defense}/S:${reg.health}/M:${reg.movement}/V:${reg.visionRange}/R.Atk:${reg.attackRange})`;
        li.dataset.type = type;
        li.addEventListener('click', () => addRegimentToBuilder(type));
        availableRegimentsListEl.appendChild(li);
    }
}

function addRegimentToBuilder(type) {
    if (!REGIMENT_TYPES[type]) { console.warn("Tipo de regimiento desconocido:", type); return; }
    currentDivisionBuilder.push({ ...REGIMENT_TYPES[type], type: type }); 
    updateCreateDivisionModalDisplay();
}

function removeRegimentFromBuilder(index) {
    if (index >= 0 && index < currentDivisionBuilder.length) {
        currentDivisionBuilder.splice(index, 1); 
        updateCreateDivisionModalDisplay();
    }
}

function updateCreateDivisionModalDisplay() {
    if (!currentDivisionRegimentsListEl || !totalDivisionCostDisplay || !totalDivisionStatsDisplay || !finalizeDivisionBtn) return;
    
    currentDivisionRegimentsListEl.innerHTML = '';
    let calculatedTotalCost = { oro: 0 }; // Asumiendo que solo oro por ahora para regimientos
    let calculatedTotalAttack = 0, calculatedTotalDefense = 0, calculatedTotalHealth = 0;
    let calculatedMinMovement = Infinity, calculatedMaxVision = 0, calculatedMaxAttackRange = 0;

    currentDivisionBuilder.forEach((reg, index) => {
        const li = document.createElement('li');
        li.textContent = `${reg.type} (Quitar)`;
        li.addEventListener('click', () => removeRegimentFromBuilder(index));
        currentDivisionRegimentsListEl.appendChild(li);

        if(reg.cost.oro) calculatedTotalCost.oro += reg.cost.oro;
        // Aquí sumarías otros costes de recursos si los regimientos los tuvieran
        calculatedTotalAttack += reg.attack;
        calculatedTotalDefense += reg.defense;
        calculatedTotalHealth += reg.health;
        calculatedMinMovement = Math.min(calculatedMinMovement, reg.movement);
        calculatedMaxVision = Math.max(calculatedMaxVision, reg.visionRange);
        calculatedMaxAttackRange = Math.max(calculatedMaxAttackRange, reg.attackRange);
    });

    totalDivisionCostDisplay.textContent = `${calculatedTotalCost.oro} Oro`; // Actualizar para más recursos si es necesario
    totalDivisionStatsDisplay.textContent = 
        `${calculatedTotalAttack}A / ${calculatedTotalDefense}D / ${calculatedTotalHealth}S / ` +
        `${calculatedMinMovement === Infinity ? 0 : calculatedMinMovement}M / ` +
        `${calculatedMaxVision}V / ${calculatedMaxAttackRange}R.A`;
    finalizeDivisionBtn.disabled = currentDivisionBuilder.length === 0;
}

function handleFinalizeDivision() {
    if (!currentDivisionBuilder || currentDivisionBuilder.length === 0) { // Comprobar currentDivisionBuilder
        if (typeof logMessage === "function") logMessage("La división debe tener al menos un regimiento.");
        return;
    }
    const name = divisionNameInput.value.trim() || "División Anónima";

    let finalCost = { oro: 0 };
    let finalAttack = 0, finalDefense = 0, finalHealth = 0;
    let finalMovement = Infinity, finalVision = 0, finalAttackRange = 0, finalInitiative = 0;
    let baseSprite = currentDivisionBuilder.length > 0 ? currentDivisionBuilder[0].sprite : '❓';

    currentDivisionBuilder.forEach(reg => {
        if (reg.cost) {
            for (const resourceType in reg.cost) {
                finalCost[resourceType] = (finalCost[resourceType] || 0) + reg.cost[resourceType];
            }
        }
        finalAttack += reg.attack || 0;
        finalDefense += reg.defense || 0;
        finalHealth += reg.health || 0;
        finalMovement = Math.min(finalMovement, reg.movement || 1);
        finalVision = Math.max(finalVision, reg.visionRange || 0);
        finalAttackRange = Math.max(finalAttackRange, reg.attackRange || 0);
        finalInitiative = Math.max(finalInitiative, reg.initiative || 0);
    });
    finalMovement = (finalMovement === Infinity) ? 1 : finalMovement;

    let canAfford = true;
    for (const resourceType in finalCost) {
        if ((gameState.playerResources[gameState.currentPlayer][resourceType] || 0) < finalCost[resourceType]) {
            canAfford = false;
            if (typeof logMessage === "function") logMessage(`No tienes suficiente ${resourceType}. Necesitas ${finalCost[resourceType]}.`);
            break;
        }
    }

    if (!canAfford) {
        return;
    }

    // Descontar recursos
    for (const resourceType in finalCost) {
        gameState.playerResources[gameState.currentPlayer][resourceType] -= finalCost[resourceType];
    }

    // LLAMAR A LA FUNCIÓN A TRAVÉS DE UIManager
    if (typeof UIManager !== 'undefined' && typeof UIManager.updatePlayerAndPhaseInfo === 'function') {
        UIManager.updatePlayerAndPhaseInfo(); // Actualizar UI de recursos y fase/turno/jugador
    } else {
        console.warn("modalLogic: UIManager.updatePlayerAndPhaseInfo no disponible para actualizar UI de recursos.");
        // Fallback si UIManager no está, intenta llamar a la global (aunque no debería ser necesario)
        if (typeof updatePlayerInfoDisplay === "function") updatePlayerInfoDisplay();
    }

    const newDivisionDataObject = {
        id: `u${unitIdCounter++}`,
        player: gameState.currentPlayer,
        name: name,
        regiments: JSON.parse(JSON.stringify(currentDivisionBuilder)),
        attack: finalAttack, defense: finalDefense, maxHealth: finalHealth, currentHealth: finalHealth,
        movement: finalMovement, currentMovement: finalMovement,
        visionRange: finalVision, attackRange: finalAttackRange, initiative: finalInitiative,
        experience: 0, maxExperience: 500, hasRetaliatedThisTurn: false,
        r: -1, c: -1,
        sprite: baseSprite,
        element: null,
        hasMoved: gameState.currentPhase === 'play',
        hasAttacked: gameState.currentPhase === 'play',
        cost: JSON.parse(JSON.stringify(finalCost))
    };

    placementMode = { active: true, unitData: newDivisionDataObject };
    if (createDivisionModal) createDivisionModal.style.display = 'none';
    currentDivisionBuilder = [];
    // updateCreateDivisionModalDisplay(); // Ya no es necesario si se oculta el modal

    if (typeof logMessage === "function") logMessage(`División "${name}" creada. Haz clic para colocarla.`);
}

// --- LÓGICA DEL MODAL DE CONSTRUCCIÓN DE ESTRUCTURAS ---
function openBuildStructureModal() {
    if (!hexToBuildOn) { 
        logMessage("Error: No hay hexágono seleccionado en el mapa para construir."); 
        if (buildStructureBtn) buildStructureBtn.disabled = true; 
        return; 
    }
    if (buildHexCoordsDisplay) buildHexCoordsDisplay.textContent = `${hexToBuildOn.r},${hexToBuildOn.c}`;
    populateAvailableStructuresForModal(hexToBuildOn.r, hexToBuildOn.c);
    if (buildStructureModal) buildStructureModal.style.display = 'flex';
}

function populateAvailableStructuresForModal(r, c) {
    if (!availableStructuresListModalEl || !confirmBuildBtn) return;
    availableStructuresListModalEl.innerHTML = '';
    selectedStructureToBuild = null;
    confirmBuildBtn.disabled = true;

    const hexData = board[r]?.[c];
    if (!hexData) { logMessage("Error interno: datos de hexágono no encontrados para construcción."); return; }

    if (hexData.isCity) {
        availableStructuresListModalEl.innerHTML = '<li>No se pueden construir Caminos o Fortalezas en una Ciudad.</li>';
        // logMessage("Este hexágono ya es una ciudad..."); // Log ya se hace en onHexClick o no es necesario si la UI es clara
        return; 
    }

    let structureOffered = false;
    for (const type in STRUCTURE_TYPES) {
        const structInfo = STRUCTURE_TYPES[type];
        let canBuildReason = "";
        let canBuildThisStructure = true;

        if (type === "Fortaleza") {
            if (hexData.structure === "Camino") { 
                // (Opcional: checkear terreno base si es relevante para fortalezas sobre caminos)
                // if (!structInfo.buildableOn.includes(hexData.terrain)) {
                //    canBuildThisStructure = false; canBuildReason = "[Terreno base no apto]";
                // }
            } else {
                canBuildThisStructure = false; canBuildReason = "[Requiere Camino]";
            }
        } else if (type === "Camino") {
            if (!structInfo.buildableOn.includes(hexData.terrain)) {
                canBuildThisStructure = false; canBuildReason = "[Terreno no apto]";
            }
            if (hexData.structure) { 
                canBuildThisStructure = false; canBuildReason = "[Hexágono ya tiene estructura]";
            }
        } else { 
            console.warn("Tipo de estructura no manejado en populateAvailableStructuresForModal:", type);
            canBuildThisStructure = false; canBuildReason = "[Tipo desconocido]";
        }

        let hasEnoughResources = true;
        let costString = "";
        for (const resourceType in structInfo.cost) {
            const costAmount = structInfo.cost[resourceType];
            const playerResourceAmount = gameState.playerResources[gameState.currentPlayer]?.[resourceType] || 0;
            const resourceDisplayName = RESOURCE_NODES_DATA[resourceType]?.name || resourceType.charAt(0).toUpperCase() + resourceType.slice(1);
            costString += `${costAmount} ${resourceDisplayName.substring(0,3)}, `; // Mostrar solo las primeras 3 letras del recurso
            
            if (playerResourceAmount < costAmount) {
                hasEnoughResources = false;
            }
        }
        costString = costString.length > 2 ? costString.slice(0, -2) : "Gratis";

        const li = document.createElement('li');
        li.textContent = `${type} (Coste: ${costString}) ${canBuildReason} ${!hasEnoughResources ? "[Recursos insuficientes]" : ""}`;
        li.dataset.type = type;

        if (canBuildThisStructure && hasEnoughResources) {
            structureOffered = true;
            li.addEventListener('click', () => {
                availableStructuresListModalEl.querySelectorAll('li').forEach(item => item.classList.remove('selected-structure'));
                li.classList.add('selected-structure');
                selectedStructureToBuild = type;
                confirmBuildBtn.disabled = false;
            });
        } else {
            li.style.opacity = 0.6;
            li.style.cursor = 'not-allowed';
        }
        availableStructuresListModalEl.appendChild(li);
    }
    if (!structureOffered && !hexData.isCity) { 
         availableStructuresListModalEl.innerHTML = '<li>No hay estructuras disponibles para construir aquí o con tus recursos.</li>';
    }
}

function handleConfirmBuildStructure() {
    if (!selectedStructureToBuild || !hexToBuildOn) {
        if (typeof logMessage === "function") logMessage("Error: No hay estructura seleccionada o hexágono de destino.");
        else console.error("Error: No hay estructura seleccionada o hexágono de destino.");
        return;
    }

    const structureTypeKey = selectedStructureToBuild;
    const r = hexToBuildOn.r;
    const c = hexToBuildOn.c;
    const structureData = STRUCTURE_TYPES[structureTypeKey]; // STRUCTURE_TYPES de constants.js
    const hexCurrentData = board[r]?.[c]; // board de state.js

    if (!hexCurrentData) {
        if (typeof logMessage === "function") logMessage("Error: Hexágono no válido para construir.");
        return;
    }

    // Re-validar condiciones (por si el estado cambió desde que se abrió el modal)
    if (hexCurrentData.isCity) {
        if (typeof logMessage === "function") logMessage("No se puede construir aquí, ya es una ciudad.");
        return;
    }
    if (structureTypeKey === "Fortaleza" && hexCurrentData.structure !== "Camino") {
        if (typeof logMessage === "function") logMessage("La Fortaleza requiere un Camino existente en este hexágono.");
        return;
    }
    if (structureTypeKey === "Camino" && hexCurrentData.structure) {
        if (typeof logMessage === "function") logMessage("Ya hay una estructura aquí, no se puede construir un Camino.");
        return;
    }

    // Re-verificar y deducir recursos
    for (const resourceType in structureData.cost) {
        if ((gameState.playerResources[gameState.currentPlayer][resourceType] || 0) < structureData.cost[resourceType]) {
            if (typeof logMessage === "function") logMessage(`No tienes suficientes ${resourceType} para construir ${structureTypeKey}.`);
            return;
        }
    }
    for (const resourceType in structureData.cost) {
        gameState.playerResources[gameState.currentPlayer][resourceType] -= structureData.cost[resourceType];
    }

    hexCurrentData.structure = structureTypeKey;
    if (typeof logMessage === "function") logMessage(`${structureTypeKey} construido en (${r},${c}).`);

    if (typeof renderSingleHexVisuals === "function") { // renderSingleHexVisuals de boardManager.js
        renderSingleHexVisuals(r, c);
    } else {
        console.warn("handleConfirmBuildStructure: renderSingleHexVisuals no está definida.");
    }

    // LLAMAR A LA FUNCIÓN A TRAVÉS DE UIManager
    if (typeof UIManager !== 'undefined' && typeof UIManager.updatePlayerAndPhaseInfo === 'function') {
        UIManager.updatePlayerAndPhaseInfo(); // <<<< CAMBIO AQUÍ (usa la función combinada)
    } else {
        console.warn("handleConfirmBuildStructure: UIManager.updatePlayerAndPhaseInfo no disponible para actualizar UI de recursos.");
        // Fallback si UIManager no está, intenta llamar a la global (aunque no debería ser necesario si UIManager está bien)
        // if (typeof updatePlayerInfoDisplay === "function") updatePlayerInfoDisplay();
    }

    if (buildStructureModal) buildStructureModal.style.display = 'none'; // Ocultar el modal
    if (typeof deselectUnit === "function") deselectUnit(); // Deseleccionar unidad para limpiar highlights, etc.
    else console.warn("handleConfirmBuildStructure: deselectUnit no definida.");
    
    // El botón buildStructureBtn global ya no existe, el panel contextual se actualiza/oculta
    // if (buildStructureBtn) buildStructureBtn.disabled = true;
    if (typeof UIManager !== 'undefined' && typeof UIManager.hideContextualPanel === 'function') {
        UIManager.hideContextualPanel(); // Ocultar panel contextual
    }

    hexToBuildOn = null;
    selectedStructureToBuild = null; // Resetear selección
    if (confirmBuildBtn) confirmBuildBtn.disabled = true; // Deshabilitar botón del modal
}
