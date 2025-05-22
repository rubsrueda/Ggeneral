// main.js
// Punto de entrada para la lógica de batalla táctica y listeners de UI táctica.

function onHexClick(r, c) {
    // ----- MODO DE DEPURACIÓN VISUAL DE getHexNeighbors (COMENTADO POR DEFECTO) -----
    /*
    console.log(`%cDEBUG MODE: Hex Click para depurar getHexNeighbors en (${r},${c})`, "color: orange; font-weight:bold;");
    document.querySelectorAll('.hex.debug-neighbor').forEach(h => h.classList.remove('debug-neighbor'));
    document.querySelectorAll('.hex').forEach(h => {
        if (!(h.dataset.r === r.toString() && h.dataset.c === c.toString())) h.style.outline = "";
    });
    const hexElementClickedDebug = board[r]?.[c]?.element;
    if (hexElementClickedDebug) hexElementClickedDebug.style.outline = "3px solid yellow";
    if (typeof getHexNeighbors === "function") { // Asume que getHexNeighbors es accesible
        const neighbors = getHexNeighbors(r, c);
        console.log(`DEBUG: Vecinos calculados por getHexNeighbors para (${r}, ${c}):`, JSON.parse(JSON.stringify(neighbors)));
        neighbors.forEach(n => {
            const neighborHexData = board[n.r]?.[n.c];
            if (neighborHexData && neighborHexData.element) neighborHexData.element.classList.add('debug-neighbor');
        });
    } else { console.error("DEBUG MODE ERROR: getHexNeighbors no definida."); }
    return; 
    */
    if (typeof gameState !== 'undefined' && gameState.justPanned) { // Comprobar si gameState existe
        console.log(`%cON_HEX_CLICK: Ignorado (${r},${c}) porque se acaba de panear.`, "color: orange;");
        // gameState.justPanned = false; // Se resetea con timeout o en touchcancel
        return; 
    }
    // ----- FIN MODO DEPURACIÓN -----


    // ----- LÓGICA NORMAL DEL JUEGO onHexClick -----
    console.log(
        `%cON_HEX_CLICK: (${r},${c})`, "color: teal;",
        `Placement: ${placementMode.active}, UnitToPlace: ${placementMode.unitData?.name || 'null'}, Selected: ${selectedUnit?.name || 'null'}, Fase: ${gameState.currentPhase}`
    );

    if (placementMode.active) {
        if (typeof handlePlacementModeClick === "function") handlePlacementModeClick(r, c);
        else console.error("onHexClick Error: handlePlacementModeClick no definida.");
        return; 
    }

    if (gameState.currentPhase === "gameOver") {
        if (typeof logMessage === "function") logMessage("La batalla ha terminado.");
        if (typeof UIManager !== 'undefined' && UIManager.hideContextualPanel) UIManager.hideContextualPanel();
        return;
    }

    const hexDataClicked = board[r]?.[c];
    if (!hexDataClicked) {
        console.error(`MAIN: Datos de hexágono inválidos para (${r},${c}).`);
        if (typeof UIManager !== 'undefined' && UIManager.hideContextualPanel) UIManager.hideContextualPanel();
        return;
    }

    if (gameState.currentPhase === "play" && 
        hexDataClicked.visibility && 
        typeof hexDataClicked.visibility === 'object' &&
        hexDataClicked.visibility[`player${gameState.currentPlayer}`] === 'hidden') {
        if (typeof logMessage === "function") logMessage("Hexágono oculto por niebla de guerra.");
        if (typeof UIManager !== 'undefined' && UIManager.hideContextualPanel) UIManager.hideContextualPanel();
        return;
    }

    const clickedUnitObject = typeof getUnitOnHex === "function" ? getUnitOnHex(r, c) : null;
    let actionWasInitiatedByHandler = false; 

    // --- Lógica Principal de Interacción ---
    if (selectedUnit) {
        // Ya hay una unidad seleccionada. Intentar realizar una acción con ella.
        if (typeof handleActionWithSelectedUnit === "function") {
            actionWasInitiatedByHandler = handleActionWithSelectedUnit(r, c, clickedUnitObject);
        } else { 
            console.error("onHexClick Error: handleActionWithSelectedUnit no está definida.");
            if (typeof deselectUnit === "function") deselectUnit(); // Fallback
        }

        // Si handleActionWithSelectedUnit NO inició una acción principal (mover/atacar)
        // Y el clic fue sobre una unidad diferente a la actualmente seleccionada, o en un hex vacío.
        if (!actionWasInitiatedByHandler) {
            if (clickedUnitObject && (!selectedUnit || clickedUnitObject.id !== selectedUnit.id)) {
                // Se hizo clic en una unidad diferente (amiga o enemiga) Y NO se inició una acción.
                // Entonces, el nuevo foco es esta unidad clicada.
                console.log(`[onHexClick] No se inició acción con ${selectedUnit?.name || 'ninguna'}. Clic en ${clickedUnitObject.name}. Seleccionando ${clickedUnitObject.name}.`);
                if (typeof selectUnit === "function") selectUnit(clickedUnitObject);
            } else if (!clickedUnitObject && selectedUnit) { 
                // Se hizo clic en un hexágono vacío Y NO se inició una acción (ej. movimiento inválido).
                // Deseleccionar la unidad actual.
                console.log(`[onHexClick] No se inició acción con ${selectedUnit.name}. Clic en hex vacío. Deseleccionando.`);
                if (typeof deselectUnit === "function") deselectUnit();
            }
        }
        // Si actionWasInitiatedByHandler es true, las funciones moveUnit/attackUnit ya se encargaron
        // del estado de la unidad y la posible deselección/re-highlight.

    } else if (clickedUnitObject) { 
        // No había unidad seleccionada ANTES, pero se hizo clic en una unidad. Seleccionarla.
        console.log(`[onHexClick] No había selectedUnit. Clic en ${clickedUnitObject.name}. Seleccionando.`);
        if (typeof selectUnit === "function") selectUnit(clickedUnitObject);
        else console.error("onHexClick Error: selectUnit no está definida.");
    } else { 
        // No había unidad seleccionada Y se hizo clic en un hexágono vacío.
        // Asegurarse de que no quede nada seleccionado y se limpien highlights.
        console.log(`[onHexClick] No había selectedUnit. Clic en hex vacío. Deseleccionando (si algo estaba seleccionado).`);
        if (typeof deselectUnit === "function") deselectUnit(); 
    }

    // --- Actualizar Panel Contextual al final, basado en el estado actual ---
    if (selectedUnit) { // Si AHORA hay una unidad seleccionada (podría haber cambiado)
        if (typeof UIManager !== 'undefined' && UIManager.showUnitContextualInfo) {
            UIManager.showUnitContextualInfo(selectedUnit);
        }
    } else if (hexDataClicked) { // Si no hay unidad seleccionada, mostrar info del hex clicado
        if (typeof UIManager !== 'undefined' && UIManager.showHexContextualInfo) {
            UIManager.showHexContextualInfo(r, c, hexDataClicked);
        }
    } else { // Fallback si no hay ni unidad seleccionada ni hexDataClicked
        if (typeof UIManager !== 'undefined' && UIManager.hideContextualPanel) {
            UIManager.hideContextualPanel();
        }
    }
}


function initApp() {
    console.log("main.js: DOMContentLoaded -> initApp INICIADO.");

    if (typeof initializeDomElements === "function") {
        initializeDomElements();
        console.log("main.js: initializeDomElements() llamado.");
    } else {
        console.error("CRITICAL MAIN INIT ERROR: initializeDomElements no definida..."); return;
    }

    if (typeof addModalEventListeners === "function") {
        addModalEventListeners();
        console.log("main.js: addModalEventListeners() llamado.");
    } else {
        console.warn("main.js: addModalEventListeners no está definida (de modalLogic.js).");
    }

    // setupUnitNameEditorListenersGlobal(); // Implementar esto en UIManager si se desea

    if (typeof setupMainMenuListeners === "function") { // De campaignManager.js
        setupMainMenuListeners();
        console.log("main.js: setupMainMenuListeners() llamado.");
    } else {
        console.warn("main.js: setupMainMenuListeners no está definida (de campaignManager.js).");
    }


    if (startGameBtn) { // Asumo que startGameBtn se obtiene de domElements.js
    startGameBtn.addEventListener('click', () => {
        console.log("main.js: Botón 'Empezar Juego (Escaramuza)' clickeado.");

        // 1. Resetear el estado del juego a los valores por defecto.
        // Ya no es necesaria la comprobación typeof si state.js se carga antes y define la función.
        // Si state.js falla al cargar o definirla, tendrás un error de "not a function" más adelante,
        // lo cual también es informativo.
        resetGameStateVariables(); 

        // 2. Aplicar configuraciones específicas de la escaramuza basadas en la UI.
        // Estas líneas sobrescribirán los valores por defecto establecidos por resetGameStateVariables.
        gameState.isCampaignBattle = false;
        gameState.currentScenarioData = null; // Para escaramuza, no hay datos de escenario predefinidos de esta manera
        gameState.currentMapData = null;      // El mapa se genera o se carga uno por defecto en initializeNewGameBoardDOMAndData

        // Configurar tipos de jugador y niveles de IA
        gameState.playerTypes.player1 = player1TypeSelect.value; 
        if (player1TypeSelect.value.startsWith('ai_')) {
            // gameState.playerAiLevels se inicializa como {} en resetGameStateVariables si es necesario,
            // o puedes asegurarte de que esté allí.
            gameState.playerAiLevels.player1 = player1TypeSelect.value.split('_')[1] || 'normal';
        } else {
            // Si player1 es humano, eliminar su configuración de nivel de IA (si existiera)
            if (gameState.playerAiLevels && gameState.playerAiLevels.hasOwnProperty('player1')) {
                delete gameState.playerAiLevels.player1;
            }
        }

        gameState.playerTypes.player2 = player2TypeSelect.value;
        if (player2TypeSelect.value.startsWith('ai_')) {
            gameState.playerAiLevels.player2 = player2TypeSelect.value.split('_')[1] || 'normal';
        } else {
            if (gameState.playerAiLevels && gameState.playerAiLevels.hasOwnProperty('player2')) {
                delete gameState.playerAiLevels.player2;
            }
        }

        // Configurar límite de despliegue
        const selectedInitialUnits = initialUnitsCountSelect.value;
        gameState.deploymentUnitLimit = selectedInitialUnits === "unlimited" ? Infinity : parseInt(selectedInitialUnits);
        
        // Asegurar que el contador de unidades colocadas se resetea (ya debería hacerlo resetGameStateVariables)
        // gameState.unitsPlacedByPlayer = { 1: 0, 2: 0 }; // Hecho por resetGameStateVariables

        // Podrías querer guardar el nivel de recursos seleccionado en gameState si se usa en otra parte
        // gameState.currentResourceLevelSetting = resourceLevelSelect.value; // Ejemplo

        console.log("Iniciando Partida Rápida (Escaramuza):", 
            "P1:", gameState.playerTypes.player1, gameState.playerAiLevels?.player1 || "", 
            "P2:", gameState.playerTypes.player2, gameState.playerAiLevels?.player2 || ""
        );

        // 3. Transición de UI y preparación del tablero
        if (typeof showScreen === "function" && typeof gameContainer !== 'undefined') { // gameContainer de domElements.js
            showScreen(gameContainer); 
        } else { 
            if (typeof setupScreen !== 'undefined') setupScreen.style.display = 'none'; // setupScreen de domElements.js
            if (typeof gameContainer !== 'undefined') gameContainer.style.display = 'flex';
            console.warn("main.js: showScreen no definida o gameContainer no disponible, usando fallback de display.");
        }

        gameState.currentPhase = "deployment"; // Establecer la fase de juego

        // ----- INICIO DE LA MODIFICACIÓN EXACTA -----
        console.log("MAIN.JS --- DEBUG ---> ANTES de llamar a initializeNewGameBoardDOMAndData");
        if (typeof initializeNewGameBoardDOMAndData === 'function') {
            const selectedResourceLevel = resourceLevelSelect.value;
            initializeNewGameBoardDOMAndData(selectedResourceLevel);
            console.log("MAIN.JS --- DEBUG ---> DESPUÉS de llamar a initializeNewGameBoardDOMAndData (si fue función)");
        } else {
            console.error("CRITICAL: initializeNewGameBoardDOMAndData NO es una función.");
            console.log("MAIN.JS --- DEBUG ---> initializeNewGameBoardDOMAndData NO FUE UNA FUNCION");
        }

        // 4. Actualizaciones de UI y lógica post-inicialización del tablero
        if (typeof UIManager !== 'undefined' && typeof UIManager.updateAllUIDisplays === 'function') {
            UIManager.updateAllUIDisplays(); // uiUpdates.js
        } else {
            console.warn("main.js: UIManager.updateAllUIDisplays no definida.");
            // Como fallback, podrías llamar a funciones específicas de uiUpdates si UIManager no existe
            // if (typeof updatePlayerInfo === 'function') updatePlayerInfo();
            // if (typeof updateResourcesUI === 'function') updateResourcesUI();
        }

        if (typeof populateAvailableRegimentsForModal === 'function') {
            populateAvailableRegimentsForModal(); // modalLogic.js
        } else {
            console.error("CRITICAL: populateAvailableRegimentsForModal no definida.");
        }

        if (typeof logMessage === "function") {
            logMessage(`Fase de Despliegue. Jugador 1 (Límite: ${gameState.deploymentUnitLimit === Infinity ? 'Ilimitado' : gameState.deploymentUnitLimit}).`);
        }
    });
    } else {
        console.warn("main.js: startGameBtn no encontrado.");
    }

// ... (resto de main.js) ...

    if (floatingEndTurnBtn) { // endTurnBtn ahora es floatingEndTurnBtn
        floatingEndTurnBtn.addEventListener('click', () => {
            if (typeof handleEndTurn === "function") handleEndTurn(); else console.error("main.js Error: handleEndTurn no definida.");
        });
    } else { console.warn("main.js: floatingEndTurnBtn no encontrado."); }

    if (floatingMenuBtn && floatingMenuPanel) {
        floatingMenuBtn.addEventListener('click', () => {
            const isVisible = floatingMenuPanel.style.display === 'block' || floatingMenuPanel.style.display === 'flex';
            floatingMenuPanel.style.display = isVisible ? 'none' : 'block';
            if (!isVisible && typeof UIManager !== 'undefined' && typeof UIManager.updatePlayerAndPhaseInfo === "function") {
                 UIManager.updatePlayerAndPhaseInfo(); // Actualizar info al abrir menú
            }
            if (isVisible && typeof UIManager !== 'undefined' && typeof UIManager.hideContextualPanel === "function") UIManager.hideContextualPanel();
        });
    }  else { console.warn("main.js: floatingMenuBtn o floatingMenuPanel no encontrado."); }

    if (closeContextualPanelBtn && contextualInfoPanel) {
        closeContextualPanelBtn.addEventListener('click', () => {
             if (typeof UIManager !== 'undefined' && typeof UIManager.hideContextualPanel === "function") UIManager.hideContextualPanel();
             else if (contextualInfoPanel) contextualInfoPanel.style.display = 'none';
        });
    } else { console.warn("main.js: closeContextualPanelBtn o contextualInfoPanel no encontrado."); }

    if (saveGameBtn_float) {
        saveGameBtn_float.addEventListener('click', () => { if (typeof handleSaveGame === "function") handleSaveGame(); else console.error("main.js Error: handleSaveGame no definida."); });
    }
    if (loadGameInput_float) {
        loadGameInput_float.addEventListener('click', (event) => { event.target.value = null; });
        loadGameInput_float.addEventListener('change', (event) => { if (typeof handleLoadGame === "function") handleLoadGame(event); else console.error("main.js Error: handleLoadGame no definida.");});
    }
    if (concedeBattleBtn_float) {
        concedeBattleBtn_float.addEventListener('click', () => {
            if (typeof logMessage === "function") logMessage("Batalla concedida.");
            if (gameState.isCampaignBattle && typeof campaignManager !== 'undefined' && typeof campaignManager.handleTacticalBattleResult === 'function') {
                 campaignManager.handleTacticalBattleResult(false, gameState.currentCampaignTerritoryId);
            } else {
                gameState.currentPhase = "gameOver";
                if (typeof UIManager !== 'undefined' && typeof UIManager.updateAllUIDisplays === "function") UIManager.updateAllUIDisplays();
                alert("Has concedido la escaramuza.");
                if (typeof showScreen === "function" && mainMenuScreenEl) showScreen(mainMenuScreenEl); // showScreen de campaignManager
            }
        });
    }
    if (backToMainFromBattleBtn) {
        backToMainFromBattleBtn.addEventListener('click', () => {
            if (confirm("¿Seguro que quieres salir y volver al menú principal? El progreso de esta batalla no se guardará.")) {
                if (typeof UIManager !== 'undefined' && typeof UIManager.hideContextualPanel === "function") UIManager.hideContextualPanel();
                if (floatingMenuPanel) floatingMenuPanel.style.display = 'none';

                if (gameState.isCampaignBattle && typeof campaignManager !== 'undefined' && typeof campaignManager.handleTacticalBattleResult === 'function') {
                    campaignManager.handleTacticalBattleResult(false, gameState.currentCampaignTerritoryId);
                } else {
                    gameState.currentPhase = "gameOver";
                    if (typeof showScreen === "function" && mainMenuScreenEl) showScreen(mainMenuScreenEl);
                }
            }
        });
    }
    // Listener para ABRIR el modal de crear división (desde el botón flotante)
    if (floatingCreateDivisionBtn) { // Usar la referencia correcta
        floatingCreateDivisionBtn.addEventListener('click', () => {
            if (typeof openCreateDivisionModal === "function") { // de modalLogic.js
                openCreateDivisionModal();
                if (floatingMenuPanel) floatingMenuPanel.style.display = 'none';
            } else {
                console.error("main.js: openCreateDivisionModal no está definida.");
            }
        });
    } else {
        console.warn("main.js: floatingCreateDivisionBtn no encontrado.");
    }

    if (typeof showScreen === "function" && mainMenuScreenEl) {
        showScreen(mainMenuScreenEl);
        console.log("main.js: Pantalla de menú principal mostrada vía campaignManager.showScreen().");
    } else {
        console.error("main.js: showScreen (de campaignManager) o mainMenuScreenEl no disponibles.");
        if (setupScreen) setupScreen.style.display = 'flex';
    }
    if (typeof logMessage === "function") logMessage("Bienvenido a Hex General Evolved.");
    console.log("main.js: initApp() FINALIZADO.");
}

document.addEventListener('DOMContentLoaded', initApp);