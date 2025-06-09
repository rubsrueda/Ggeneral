// Variables globales para el builder de unidades
let currentDivisionBuilder = [];
let hexToBuildOn = null; // Para la construcción de estructuras
let selectedStructureToBuild = null; // Para la construcción de estructuras

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

    // Listeners para botones DENTRO de los modales (finalizar acciones)
    if (finalizeDivisionBtn) finalizeDivisionBtn.addEventListener('click', handleFinalizeDivision);
    else console.warn("modalLogic: finalizeDivisionBtn no encontrado.");
    if (confirmBuildBtn) confirmBuildBtn.addEventListener('click', handleConfirmBuildStructure);
    else console.warn("modalLogic: confirmBuildBtn no encontrado.");
}

// --- LÓGICA DEL MODAL DE CREACIÓN DE DIVISIÓN ---
function openCreateDivisionModal() {
    console.log("%c[DEBUG MODAL] Intentando abrir el modal de Creación de División.", "color: lightgreen; font-weight: bold;");

    if (gameState.currentPhase === "play") {
        let canRecruit = gameState.cities.some(city => 
            city.owner === gameState.currentPlayer && 
            board[city.r]?.[city.c] && // Acceso correcto a city.c
            (board[city.r][city.c].isCapital || board[city.r][city.c].structure === "Fortaleza") &&
            !getUnitOnHex(city.r, city.c) // Asegurarse que la ciudad/fortaleza está vacía para reclutar
        );
        if (!canRecruit) {
            logMessage("Debes controlar una Capital o Fortaleza VACÍA para crear unidades durante la partida.");
            return;
        }
    } else if (gameState.currentPhase === "deployment") {
        // En fase de despliegue, la validación se hace en UIManager.updateActionButtonsBasedOnPhase
        // Si el botón ya está visible y clicable, significa que la validación ya pasó.
        // No necesitamos una validación adicional aquí que pueda fallar.
    } else { // Otras fases donde no se permite reclutar
        logMessage("No se pueden crear unidades en esta fase del juego.");
        return;
    }

    currentDivisionBuilder = []; 
    populateAvailableRegimentsForModal(); 
    updateCreateDivisionModalDisplay(); 
    if (divisionNameInput) divisionNameInput.value = `División P${gameState.currentPlayer} #${units.filter(u => u.player === gameState.currentPlayer).length + 1}`;
    if (createDivisionModal) createDivisionModal.style.display = 'flex';
}

function populateAvailableRegimentsForModal() {
    // Asegúrate que availableRegimentsListEl (de domElements.js), REGIMENT_TYPES (constants.js),
    // gameState, y TECHNOLOGY_TREE_DATA (technologyTree.js) estén disponibles.
    if (!availableRegimentsListEl || typeof REGIMENT_TYPES === 'undefined' || !gameState || !gameState.playerResources || typeof TECHNOLOGY_TREE_DATA === 'undefined') {
        console.error("populateAvailableRegimentsForModal: Faltan dependencias (elementos DOM, constantes, gameState o TECHNOLOGY_TREE_DATA).");
        if(availableRegimentsListEl) availableRegimentsListEl.innerHTML = '<li>Error al cargar regimientos.</li>';
        return;
    }
    
    availableRegimentsListEl.innerHTML = ''; // Limpiar lista previa
    const currentPlayer = gameState.currentPlayer;
    const playerResearchedTechs = gameState.playerResources[currentPlayer]?.researchedTechnologies || [];

    console.log(`[ModalTechCheck] Tecnologías Investigadas por Jugador ${currentPlayer}:`, playerResearchedTechs);

    let unlockedUnitTypesByTech = new Set();

    // Recorrer las tecnologías investigadas por el jugador
    for (const techId of playerResearchedTechs) {
        const techData = TECHNOLOGY_TREE_DATA[techId];
        if (techData && techData.unlocksUnits && Array.isArray(techData.unlocksUnits)) {
            techData.unlocksUnits.forEach(unitTypeKey => {
                unlockedUnitTypesByTech.add(unitTypeKey);
            });
        }
    }

    console.log("[ModalTechCheck] Tipos de Unidades Desbloqueadas por tecnología:", Array.from(unlockedUnitTypesByTech));

    // Iterar sobre todos los tipos de regimientos definidos en constants.js
    for (const regimentKey in REGIMENT_TYPES) {
        if (unlockedUnitTypesByTech.has(regimentKey)) {
            const regiment = REGIMENT_TYPES[regimentKey];
            const listItem = document.createElement('li');
            
            let regimentInfo = `${regimentKey}`;
            if (regiment.cost && typeof regiment.cost.oro === 'number') {
                regimentInfo += ` (Oro: ${regiment.cost.oro}`;
                if (regiment.cost.comida && typeof regiment.cost.comida === 'number') { 
                    regimentInfo += `, Comida: ${regiment.cost.comida}`;
                }
                regimentInfo += `)`;
            }
            
            listItem.textContent = regimentInfo;
            listItem.dataset.type = regimentKey; 
            
            if (typeof addRegimentToBuilder === "function") { 
                listItem.onclick = () => addRegimentToBuilder(regimentKey); 
            } else {
                console.warn(`Función addRegimentToBuilder no definida.`); 
            }
            availableRegimentsListEl.appendChild(listItem);
        }
    }

    if (availableRegimentsListEl.children.length === 0) {
        availableRegimentsListEl.innerHTML = '<li>No hay regimientos disponibles para reclutar (investiga más tecnologías).</li>';
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
    let calculatedTotalCost = { oro: 0 }; 
    let calculatedTotalAttack = 0, calculatedTotalDefense = 0, calculatedTotalHealth = 0;
    let calculatedMinMovement = Infinity, calculatedMaxVision = 0, calculatedMaxAttackRange = 0;

    currentDivisionBuilder.forEach((reg, index) => {
        const li = document.createElement('li');
        li.textContent = `${reg.type} (Quitar)`;
        li.addEventListener('click', () => removeRegimentFromBuilder(index));
        currentDivisionRegimentsListEl.appendChild(li);

        if(reg.cost.oro) calculatedTotalCost.oro += reg.cost.oro;
        calculatedTotalAttack += reg.attack;
        calculatedTotalDefense += reg.defense;
        calculatedTotalHealth += reg.health;
        calculatedMinMovement = Math.min(calculatedMinMovement, reg.movement);
        calculatedMaxVision = Math.max(calculatedMaxVision, reg.visionRange);
        calculatedMaxAttackRange = Math.max(calculatedMaxAttackRange, reg.attackRange);
    });

    totalDivisionCostDisplay.textContent = `${calculatedTotalCost.oro} Oro`; 
    totalDivisionStatsDisplay.textContent = 
        `${calculatedTotalAttack}A / ${calculatedTotalDefense}D / ${calculatedTotalHealth}S / ` +
        `${calculatedMinMovement === Infinity ? 0 : calculatedMinMovement}M / ` +
        `${calculatedMaxVision}V / ${calculatedMaxAttackRange}R.A`;
    finalizeDivisionBtn.disabled = currentDivisionBuilder.length === 0;
}

function handleFinalizeDivision() {
    if (!currentDivisionBuilder || currentDivisionBuilder.length === 0) { 
        logMessage("La división debe tener al menos un regimiento.");
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
            logMessage(`No tienes suficiente ${resourceType}. Necesitas ${finalCost[resourceType]}.`);
            break;
        }
    }

    if (!canAfford) {
        return;
    }

    for (const resourceType in finalCost) {
        gameState.playerResources[gameState.currentPlayer][resourceType] -= finalCost[resourceType];
    }

    if (typeof UIManager !== 'undefined' && typeof UIManager.updatePlayerAndPhaseInfo === 'function') {
        UIManager.updatePlayerAndPhaseInfo(); 
    } else {
        console.warn("modalLogic: UIManager.updatePlayerAndPhaseInfo no disponible para actualizar UI de recursos.");
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

    logMessage(`División "${name}" creada. Haz clic para colocarla.`);
}

// --- LÓGICA DEL MODAL DE CONSTRUCCIÓN DE ESTRUCTURAS ---
function openBuildStructureModal() {
    if (!hexToBuildOn) { 
        logMessage("Error: No hay hexágono seleccionado en el mapa para construir."); 
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
        availableStructuresListModalEl.innerHTML = '<li>No se pueden construir Caminos o Fortalezas directamente en una Ciudad.</li>';
        return; 
    }

    const currentPlayer = gameState.currentPlayer;
    const playerResources = gameState.playerResources[currentPlayer];
    const playerResearchedTechs = playerResources?.researchedTechnologies || [];

    let structureOffered = false;

    for (const type in STRUCTURE_TYPES) {
        const structInfo = STRUCTURE_TYPES[type];
        let canBuildThisStructure = false;
        let reasonForNotBuilding = "";

        // --- LÓGICA DE DESBLOQUEO POR TECNOLOGÍA ---
        let techUnlocked = false;
        if (type === "Camino" && playerResearchedTechs.includes("ENGINEERING")) {
            techUnlocked = true;
        } else if (type === "Fortaleza" && playerResearchedTechs.includes("FORTIFICATIONS")) {
            techUnlocked = true;
        }

        if (!techUnlocked) {
            reasonForNotBuilding = "[Tecnología no investigada]";
        } else {
            // Comprobaciones de terreno y pre-estructura
            if (type === "Camino") {
                if (!structInfo.buildableOn.includes(hexData.terrain)) {
                    reasonForNotBuilding = "[Terreno no apto]";
                } else if (hexData.structure) { 
                    reasonForNotBuilding = "[Hexágono ya tiene estructura]";
                } else {
                    canBuildThisStructure = true;
                }
            } else if (type === "Fortaleza") {
                if (hexData.structure !== "Camino") { 
                    reasonForNotBuilding = "[Requiere Camino]";
                } else if (!structInfo.buildableOn.includes(hexData.terrain)) {
                    reasonForNotBuilding = "[Terreno base no apto]";
                } else {
                    canBuildThisStructure = true;
                }
            } else { 
                console.warn("Tipo de estructura no manejado en populateAvailableStructuresForModal:", type);
                reasonForNotBuilding = "[Tipo desconocido]";
            }
        }

        // Comprobar recursos
        let hasEnoughResources = true;
        let costString = "";
        if (structInfo.cost) {
            for (const resourceType in structInfo.cost) {
                const costAmount = structInfo.cost[resourceType];
                const playerResourceAmount = playerResources[resourceType] || 0;
                costString += `${costAmount} ${resourceType.charAt(0).toUpperCase() + resourceType.slice(1).substring(0,2)}, `;
                if (playerResourceAmount < costAmount) {
                    hasEnoughResources = false;
                }
            }
            costString = costString.length > 2 ? costString.slice(0, -2) : "Gratis";
        } else {
            costString = "Gratis";
        }
        if (!hasEnoughResources) {
            reasonForNotBuilding += " [Recursos insuficientes]";
        }

        const li = document.createElement('li');
        li.textContent = `${type} (Costo: ${costString}) ${reasonForNotBuilding}`;
        li.dataset.type = type;

        if (canBuildThisStructure && hasEnoughResources && techUnlocked) {
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
    
    // Esta sección se movió a populateAvailableRegimentsForModal, aquí no aplica
    // for (const techId of playerResearchedTechs) {
    //     const techData = TECHNOLOGY_TREE_DATA[techId];
    //     if (techData && techData.unlocksUnits && Array.isArray(techData.unlocksUnits)) {
    //         techData.unlocksUnits.forEach(unitTypeKey => {
    //             unlockedUnitTypesByTech.add(unitTypeKey);
    //         });
    //     }
    // }

    if (!structureOffered && !hexData.isCity) { 
         availableStructuresListModalEl.innerHTML = '<li>No hay estructuras disponibles para construir aquí o con tus recursos.</li>';
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
        logMessage("La división debe tener al menos un regimiento.");
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
            logMessage(`No tienes suficiente ${resourceType}. Necesitas ${finalCost[resourceType]}.`);
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

    logMessage(`División "${name}" creada. Haz clic para colocarla.`);
}

function handleConfirmBuildStructure() {
    if (!selectedStructureToBuild || !hexToBuildOn) {
        logMessage("Error: No hay estructura seleccionada o hexágono de destino.");
        return;
    }

    const structureTypeKey = selectedStructureToBuild;
    const r = hexToBuildOn.r;
    const c = hexToBuildOn.c;
    const structureData = STRUCTURE_TYPES[structureTypeKey];
    const hexCurrentData = board[r]?.[c];

    if (!hexCurrentData) {
        logMessage("Error: Hexágono no válido para construir.");
        return;
    }

    if (hexCurrentData.isCity) {
        logMessage("No se puede construir aquí, ya es una ciudad.");
        return;
    }
    if (structureTypeKey === "Fortaleza" && hexCurrentData.structure !== "Camino") {
        logMessage("La Fortaleza requiere un Camino existente en este hexágono.");
        return;
    }
    if (structureTypeKey === "Camino" && hexCurrentData.structure) {
        logMessage("Ya hay una estructura aquí, no se puede construir un Camino.");
        return;
    }

    for (const resourceType in structureData.cost) {
        if ((gameState.playerResources[gameState.currentPlayer][resourceType] || 0) < structureData.cost[resourceType]) {
            logMessage(`No tienes suficientes ${resourceType} para construir ${structureTypeKey}.`);
            return;
        }
    }
    for (const resourceType in structureData.cost) {
        gameState.playerResources[gameState.currentPlayer][resourceType] -= structureData.cost[resourceType];
    }

    hexCurrentData.structure = structureTypeKey;
    logMessage(`${structureTypeKey} construido en (${r},${c}).`);

    if (typeof renderSingleHexVisuals === "function") {
        renderSingleHexVisuals(r, c);
    } else {
        console.warn("handleConfirmBuildStructure: renderSingleHexVisuals no está definida.");
    }

    if (typeof UIManager !== 'undefined' && typeof UIManager.updatePlayerAndPhaseInfo === 'function') {
        UIManager.updatePlayerAndPhaseInfo();
    } else {
        console.warn("handleConfirmBuildStructure: UIManager.updatePlayerAndPhaseInfo no disponible para actualizar UI de recursos.");
    }

    if (buildStructureModal) buildStructureModal.style.display = 'none';
    if (typeof deselectUnit === "function") deselectUnit();
    
    if (typeof UIManager !== 'undefined' && typeof UIManager.hideContextualPanel === 'function') {
        UIManager.hideContextualPanel();
    }

    hexToBuildOn = null;
    selectedStructureToBuild = null;
    if (confirmBuildBtn) confirmBuildBtn.disabled = true;
}
