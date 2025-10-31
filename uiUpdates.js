// uiUpdates.js

/**
 * Comprueba si una unidad enemiga está dentro del rango de visión de un explorador del jugador actual.
 * @param {object} enemyUnit - La unidad enemiga seleccionada.
 * @returns {boolean} - True si un explorador la ve, false en caso contrario.
 */
function isEnemyScouted(enemyUnit) {
    const currentPlayer = gameState.currentPlayer;
    const playerScoutUnits = units.filter(unit => 
        unit.player === currentPlayer && 
        unit.regiments.some(reg => reg.type === "Explorador")
    );

    if (playerScoutUnits.length === 0) {
        return false;
    }

    // Comprueba si alguna de las unidades exploradoras está en rango
    for (const scoutUnit of playerScoutUnits) {
        const distance = hexDistance(scoutUnit.r, scoutUnit.c, enemyUnit.r, enemyUnit.c);
        const scoutRange = scoutUnit.visionRange || 2; // Rango de visión del explorador
        if (distance <= scoutRange) {
            console.log(`[Scout Check] Unidad enemiga ${enemyUnit.name} está en rango del explorador ${scoutUnit.name}.`);
            return true;
        }
    }
    
    return false;
}

const UIManager = {
    domElements: null,
    _tutorialMessagePanel: null, 
    _originalEndTurnButtonListener: null, 
    _lastTutorialHighlightElementId: null, 
    _lastTutorialHighlightHexes: [],      
    _combatPredictionPanel: null, 
    _currentAttackPredictionListener: null, 
    _hidePredictionTimeout: null, 
    _domElements: null, 
    _restoreTimeout: null,
    _autoCloseTimeout: null,
    _lastShownInfo: { type: null, data: null }, // Para recordar qué se mostró por última vez
    _reopenBtn: null, // Guardará la referencia al botón ▲
    
    setDomElements: function(domElementsRef) {
        this._domElements = domElementsRef; 
        this._combatPredictionPanel = document.getElementById('combatPredictionPanel');
        if (!this._combatPredictionPanel) console.error("UIManager Error: No se encontró el #combatPredictionPanel en el DOM.");
        this.hideAllActionButtons();
    },
    
    setEndTurnButtonToFinalizeTutorial: function() {
        const btn = this._domElements.floatingEndTurnBtn;
        if (!btn) return;

        // 1. Guardar el listener original si no lo hemos hecho ya
        if (typeof handleEndTurn === 'function' && !this._originalEndTurnButtonListener) {
            // Guardamos una referencia a la función en sí
            this._originalEndTurnButtonListener = handleEndTurn; 
        }

        // 2. Eliminar cualquier listener anterior que pueda tener
        // Hacemos esto clonando el nodo, que es una forma segura de limpiarlo
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        this._domElements.floatingEndTurnBtn = newBtn; // Actualizamos la referencia

        // 3. Configurar el botón para el final del tutorial
        newBtn.innerHTML = "🏁"; // Bandera de meta
        newBtn.title = "Finalizar Tutorial";
        newBtn.disabled = false;
        this.highlightTutorialElement(newBtn.id);

        // 4. Añadir el NUEVO y ÚNICO listener para esta acción final
        const finalizeAction = () => {
            if (domElements.tacticalUiContainer) {
                domElements.tacticalUiContainer.style.display = 'none';
            }
            TutorialManager.stop(); // Llama al stop que ya limpia y vuelve al menú.
        };
        newBtn.addEventListener('click', finalizeAction);
    },

    restoreEndTurnButton: function() {
        const btn = this._domElements.floatingEndTurnBtn;
        if (!btn) return;
        
        // 1. Limpiamos el botón clonándolo. Esto elimina CUALQUIER listener anterior (sea del tutorial o no).
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        this._domElements.floatingEndTurnBtn = newBtn; // Actualizamos la referencia

        // 2. Restauramos la apariencia original
        newBtn.innerHTML = "►";
        newBtn.title = "Finalizar Turno";
        newBtn.classList.remove('tutorial-highlight');
        
        // 3. <<== LÓGICA DE RESTAURACIÓN INTELIGENTE ==>>
        // Si HEMOS guardado un listener original (porque el tutorial se usó), lo restauramos.
        if (this._originalEndTurnButtonListener) {
            console.log("[UIManager] Restaurando listener de fin de turno guardado (post-tutorial).");
            newBtn.addEventListener('click', this._originalEndTurnButtonListener);
        } 
        // Si NO hemos guardado un listener (porque el tutorial nunca se ejecutó), 
        // simplemente añadimos el listener estándar del juego.
        else if (typeof handleEndTurn === "function") {
            console.log("[UIManager] Añadiendo listener de fin de turno estándar (sin tutorial previo).");
            newBtn.addEventListener('click', handleEndTurn);
        } else {
            console.error("CRÍTICO: no se puede restaurar el listener del botón Fin de Turno porque handleEndTurn no está definido.");
        }
    },

    clearHighlights: function() {
        // Tu lógica de limpiar highlights de movimiento, ataque, etc.
        if (board && board.length > 0) {
             document.querySelectorAll('.hex.highlight-move, .hex.highlight-attack, .hex.highlight-build, .hex.highlight-place').forEach(h => {
                 h.classList.remove('highlight-move', 'highlight-attack', 'highlight-build', 'highlight-place');
             });
        }
        
        // NO TOCAMOS los highlights del tutorial. Dejamos que el UIManager los gestione.
        // Se elimina la limpieza de 'tutorial-highlight' y 'tutorial-highlight-hex' de aquí.
    },
    
    showCombatPrediction: function(outcome, targetUnit, event) {
        if (!this._combatPredictionPanel) return;
        
        if (this._hidePredictionTimeout) clearTimeout(this._hidePredictionTimeout);

        let html = `<h4>Predicción de Combate</h4><p>Atacando a: <strong>${targetUnit.name} (${targetUnit.currentHealth} HP)</strong></p><p>Daño infligido: <span class="attacker-damage">${outcome.damageToDefender}</span></p>`;
        
        if (outcome.defenderDies) {
            html += `<span class="critical-info">¡OBJETIVO DESTRUIDO!</span>`;
        } else {
            html += `<p>Daño recibido: <span class="defender-damage">${outcome.damageToAttacker}</span></p>`;
            if (outcome.attackerDiesInRetaliation) {
                html += `<span class="critical-info">¡TU UNIDAD SERÁ DESTRUIDA!</span>`;
            }
        }
        
        this._combatPredictionPanel.innerHTML = html;
        this._combatPredictionPanel.style.display = 'block';
        
        const panelWidth = this._combatPredictionPanel.offsetWidth;
        const panelHeight = this._combatPredictionPanel.offsetHeight;
        let left = event.clientX + 20;
        let top = event.clientY - panelHeight - 10;

        if (left + panelWidth > window.innerWidth) left = event.clientX - panelWidth - 20;
        if (top < 0) top = event.clientY + 20;

        this._combatPredictionPanel.style.left = `${left}px`;
        this._combatPredictionPanel.style.top = `${top}px`;
        this._combatPredictionPanel.classList.add('visible');
    },
    
    hideCombatPrediction: function() {
        if (!this._combatPredictionPanel) return;
        if (this._hidePredictionTimeout) clearTimeout(this._hidePredictionTimeout);
        this._hidePredictionTimeout = setTimeout(() => {
            if (this._combatPredictionPanel) this._combatPredictionPanel.classList.remove('visible');
        }, 100);
    },

    attachAttackPredictionListener: function(selectedUnit) {
        if (!this._domElements.gameBoard || !selectedUnit) return;
        
        if (this._currentAttackPredictionListener) {
            this._domElements.gameBoard.removeEventListener('mousemove', this._currentAttackPredictionListener);
        }
        
        this._currentAttackPredictionListener = (event) => {
            const hexEl = event.target.closest('.hex');
            if (!hexEl) { this.hideCombatPrediction(); return; }
            const r = parseInt(hexEl.dataset.r);
            const c = parseInt(hexEl.dataset.c);
            const targetUnit = getUnitOnHex(r, c);
            if (hexEl.classList.contains('highlight-attack') && targetUnit && isValidAttack(selectedUnit, targetUnit)) {
                const outcome = predictCombatOutcome(selectedUnit, targetUnit);
                this.showCombatPrediction(outcome, targetUnit, event);
            } else {
                this.hideCombatPrediction();
            }
        };
        this._domElements.gameBoard.addEventListener('mousemove', this._currentAttackPredictionListener);
    },
    
    removeAttackPredictionListener: function() {
        if (this._currentAttackPredictionListener && this._domElements.gameBoard) {
            this._domElements.gameBoard.removeEventListener('mousemove', this._currentAttackPredictionListener);
            this._currentAttackPredictionListener = null;
            this.hideCombatPrediction();
        }
    },
    
    highlightPossibleActions: function(unit) {
        // Llama al método centralizado de limpieza para empezar de cero.
        this.clearHighlights(); 
    
        // Guarda de seguridad: si no hay unidad o tablero, no hacemos nada.
        if (!unit || !board || board.length === 0) {
            return;
        }
    
        // Recorre cada hexágono del tablero para evaluarlo.
        for (let r_idx = 0; r_idx < board.length; r_idx++) {
            for (let c_idx = 0; c_idx < board[0].length; c_idx++) {
                const hexData = board[r_idx]?.[c_idx];
                // Si el hexágono no existe o no tiene un elemento DOM, lo saltamos.
                if (!hexData || !hexData.element) {
                    continue;
                }
    
                // No mostrar resaltados en hexágonos ocultos por la niebla de guerra.
                if (gameState.currentPhase === "play" && hexData.visibility?.[`player${gameState.currentPlayer}`] === 'hidden') {
                    continue;
                }
    
                // Llama a la lógica de `unit_Actions.js` (`isValidMove`) para saber si el movimiento es válido.
                // Si lo es, aplica la clase CSS visual 'highlight-move'.
                if (gameState.currentPhase === 'play' && !unit.hasMoved && unit.currentMovement > 0 && isValidMove(unit, r_idx, c_idx)) {
                    hexData.element.classList.add('highlight-move');
                }
    
                // Comprueba si hay un enemigo en el hexágono.
                const targetUnitOnHex = getUnitOnHex(r_idx, c_idx);
                // Llama a la lógica de `unit_Actions.js` (`isValidAttack`) para saber si el ataque es válido.
                // Si lo es, aplica la clase CSS visual 'highlight-attack'.
                if (gameState.currentPhase === 'play' && !unit.hasAttacked && targetUnitOnHex && targetUnitOnHex.player !== unit.player && isValidAttack(unit, targetUnitOnHex)) {
                    hexData.element.classList.add('highlight-attack');
                }
            }
        }
    },
     
    highlightPossibleSplitHexes: function (unit) {
        if (typeof UIManager !== 'undefined' && UIManager.clearHighlights) UIManager.clearHighlights();
        else if (typeof clearHighlights === "function") clearHighlights();
        if (!unit || !board || board.length === 0) return;

        const neighbors = getHexNeighbors(unit.r, unit.c);
        for (const n of neighbors) {
            const hexData = board[n.r]?.[n.c];
            if (!hexData) continue; // Hexágono inválido

            // Un hexágono es válido para la división si:
            // 1. Está vacío (no hay otra unidad).
            // 2. No es un terreno intransitable (ej. agua).
            if (!hexData.unit && !TERRAIN_TYPES[hexData.terrain]?.isImpassableForLand) {
                hexData.element.classList.add('highlight-place'); // Usaremos 'highlight-place' o una nueva clase
            }
        }
    },

    hideAllActionButtons: function() {
        if (!this._domElements) return;
        console.trace("¡ALERTA! hideAllActionButtons() ha sido llamada.");
        const contextualButtons = [
            'floatingUndoMoveBtn', 'floatingReinforceBtn', 'floatingSplitBtn', 
            'floatingBuildBtn', 'floatingPillageBtn', 'setAsCapitalBtn', 
            'floatingConsolidateBtn', 'floatingAssignGeneralBtn', 'floatingCreateDivisionBtn'
        ];
        contextualButtons.forEach(id => {
            if (this._domElements[id]) {
                this._domElements[id].style.display = 'none';
            }
        });
    },

    updateAllUIDisplays: function() {
        // Si no hay juego o estamos en una fase sin jugador (como el menú), no hacer nada.
        if (!gameState || !gameState.currentPlayer) {
            return;
        }

        // --- 1. Actualizar la Barra Superior (Menú ☰) ---
        // Esta llamada ahora es el método principal y constante para actualizar la info del jugador.
        if (typeof this.updateTopBarInfo === 'function') {
            this.updateTopBarInfo();
        }

        // --- 2. Actualizar el Indicador de Turno y el Bloqueador de Pantalla ---
        // (Esto gestiona el panel "Esperando al Oponente...")
        if (typeof this.updateTurnIndicatorAndBlocker === 'function') {
            this.updateTurnIndicatorAndBlocker();
        }

        // --- 3. Actualizar la Información del Panel Contextual Inferior (si está visible) ---
        // Si hay una unidad o hexágono seleccionado, esta lógica refrescará su información
        // para reflejar cambios (como vida perdida, recursos gastados, etc.).
        if (this._lastShownInfo && this._lastShownInfo.type) {
            if (document.getElementById('contextualInfoPanel')?.classList.contains('visible')) {
                if (this._lastShownInfo.type === 'unit') {
                    // El `true` o `false` determina si se muestran los botones de acción
                    const unitOwner = this._lastShownInfo.data.player;
                    this.showUnitContextualInfo(this._lastShownInfo.data, unitOwner === gameState.currentPlayer);
                } else if (this._lastShownInfo.type === 'hex') {
                    const { r, c, hexData } = this._lastShownInfo.data;
                    this.showHexContextualInfo(r, c, hexData);
                }
            }
        }
        
        // --- 4. (Legado) Limpieza del Antiguo Panel Flotante Izquierdo ---
        // Esta sección actualizaba el panel que hemos reemplazado.
        // La mantenemos por si la reutilizas o tienes referencias a ella,
        // pero idealmente, se podría eliminar en el futuro si todo se maneja en la barra superior.
        const oldMenuPanel = document.getElementById('floatingMenuPanel');
        if (oldMenuPanel && (oldMenuPanel.style.display === 'block' || oldMenuPanel.style.display === 'flex')) {
            if (typeof this.updatePlayerAndPhaseInfo === 'function') {
                this.updatePlayerAndPhaseInfo(); // Asumimos que esta función actualiza ESE panel
            }
        }

        //--- 5. Niebla de guerra
        this.updatePlayerAndPhaseInfo();
            if (typeof updateFogOfWar === "function") updateFogOfWar(); 
            this.updateActionButtonsBasedOnPhase();

        // Puedes añadir aquí cualquier otra llamada de actualización específica que necesites
        // Por ejemplo:
        // this.updateMinimap(); 
        // this.updateObjectiveTracker();
    },
    
    updatePlayerAndPhaseInfo: function() {
        if (!gameState || !this._domElements) return;
        let phaseText = gameState.currentPhase ? gameState.currentPhase.charAt(0).toUpperCase() + gameState.currentPhase.slice(1) : "-";
        switch (gameState.currentPhase) {
            case "deployment": phaseText = "Despliegue"; break;
            case "play": phaseText = "En Juego"; break;
            case "gameOver": phaseText = "Fin de Partida"; break;
        }
        const playerType = gameState.playerTypes?.[`player${gameState.currentPlayer}`] === 'human' ? 'Humano' : `IA (${gameState.playerAiLevels?.[`player${gameState.currentPlayer}`] || 'Normal'})`;
        if(this._domElements.floatingMenuTitle) this._domElements.floatingMenuTitle.innerHTML = `Fase: ${phaseText}<br>Turno ${gameState.turnNumber} - Jugador ${gameState.currentPlayer} (${playerType})`;

        const resources = gameState.playerResources?.[gameState.currentPlayer];
        const resourceSpans = document.querySelectorAll('#playerResourcesGrid_float .resource-values span[data-resource]');
        if (resources && resourceSpans.length > 0) {
            resourceSpans.forEach(span => {
                const resType = span.dataset.resource;
                span.textContent = resources[resType] || 0;
            });
        }
    },
    
    // Esta función será llamada por el tutorial para forzar la actualización.
    refreshActionButtons: function() {
        if (!gameState || !this._domElements) return;
        const { currentPhase, playerTypes, currentPlayer, unitsPlacedByPlayer, deploymentUnitLimit } = gameState;
        
        // ... (Aquí va toda la lógica que antes estaba en updateActionButtonsBasedOnPhase)
        const isPlay = currentPhase === "play";
        const isGameOver = currentPhase === "gameOver";

        if (this._domElements.floatingTechTreeBtn) this._domElements.floatingTechTreeBtn.style.display = isPlay ? 'flex' : 'none';
        if (this._domElements.floatingEndTurnBtn) this._domElements.floatingEndTurnBtn.disabled = isGameOver;

        if (this._domElements.floatingCreateDivisionBtn) {
            const isHumanPlayerTurn = playerTypes?.[`player${currentPlayer}`] === 'human';
            const unitsPlaced = unitsPlacedByPlayer?.[currentPlayer] || 0;
            const canDeploy = unitsPlaced < deploymentUnitLimit;
            this._domElements.floatingCreateDivisionBtn.style.display = (currentPhase === "deployment" && isHumanPlayerTurn && canDeploy) ? 'flex' : 'none';
        }

        if (this._domElements.floatingNextUnitBtn) {
            const hasIdleUnits = units.some(u => u.player === currentPlayer && u.currentHealth > 0 && !u.hasMoved && !u.hasAttacked);
            const isHumanPlayerTurn = gameState.playerTypes[`player${currentPlayer}`] === 'human';
            if (currentPhase === "play" && isHumanPlayerTurn && hasIdleUnits) {
                this._domElements.floatingNextUnitBtn.style.display = 'flex';
            } else {
                this._domElements.floatingNextUnitBtn.style.display = 'none';
            }
        }

        if (isGameOver) {
             ['floatingMenuBtn', 'floatingTechTreeBtn', 'floatingEndTurnBtn', 'floatingCreateDivisionBtn'].forEach(id => {
                if(this._domElements[id]) this._domElements[id].style.display = 'none';
             });
             this.hideAllActionButtons();
             this.hideContextualPanel(); 
        }
    },

    // <<< FUNCIÓN ANTIGUA, AHORA MÁS SIMPLE >>>
    // El juego normal llamará a esta, que se detiene durante el tutorial.
    updateActionButtonsBasedOnPhase: function() {
        if (gameState.isTutorialActive) return; // El "guardia de seguridad" se queda aquí.
        
        this.refreshActionButtons(); // Llama a la función que hace el trabajo.
    },
  
    // ======================================================================
    // === FUNCIÓN DE MENSAJES TEMPORALES (VERSIÓN SEGURA Y REVISADA) ===
    // ======================================================================
    showMessageTemporarily: function(message, duration = 3000, isError = false) {
        // 1. Obtener referencias directas a los elementos del panel de notificaciones.
        const panel = document.getElementById('tutorialMessagePanel');
        const textSpan = document.getElementById('tutorialMessageText');

        // 2. Comprobación de seguridad: si los elementos no existen en el DOM,
        // se evita el error fatal y se informa en la consola.
        if (!panel || !textSpan) {
            console.error("Error en showMessageTemporarily: No se encontraron los elementos #tutorialMessagePanel o #tutorialMessageText. No se puede mostrar el mensaje:", message);
            // Como plan B, usamos un 'alert' para que la información no se pierda.
            alert(message);
            return;
        }

        // 3. Si hay un mensaje anterior mostrándose, se limpia su temporizador.
        if (this._messageTimeout) {
            clearTimeout(this._messageTimeout);
        }

        // 4. Se asigna el contenido y se ajusta el estilo si es un mensaje de error.
        textSpan.innerHTML = message;
        
        if (isError) {
            panel.style.borderColor = '#c0392b'; // Rojo
        } else {
            panel.style.borderColor = 'rgba(135, 118, 70, 0.7)'; // Color por defecto
        }

        // 5. Se muestra el panel añadiendo la clase CSS correspondiente.
        panel.classList.add('visible');

        // 6. Se crea un nuevo temporizador para ocultar el panel.
        this._messageTimeout = setTimeout(() => {
            panel.classList.remove('visible');
            this._messageTimeout = null;
        }, duration);
    },

    hideContextualPanel: function() {
        if (this._restoreTimeout) {
            clearTimeout(this._restoreTimeout);
            this._restoreTimeout = null;
        }
        
        const panel = this._domElements?.contextualInfoPanel;
        if (panel) {
            panel.classList.remove('visible');
        }
        
        this.removeAttackPredictionListener();
        this.hideAllActionButtons();
        if (typeof selectedUnit !== 'undefined') selectedUnit = null;
        if (typeof hexToBuildOn !== 'undefined') hexToBuildOn = null;
    },
    
    _buildUnitDetailsHTML: function(unit) {
        let html = '';

        // <<== INICIO DE LA CORRECCIÓN: Sección del General con Imagen ==>>
        if (unit.commander && COMMANDERS[unit.commander]) {
            const cmdr = COMMANDERS[unit.commander];
            const cmdrSpriteValue = cmdr.sprite;
            let commanderSpriteHTML = '';

            // Si el sprite es una ruta de imagen...
            if (cmdrSpriteValue.includes('.png') || cmdrSpriteValue.includes('.jpg')) {
                // ...creamos una etiqueta <img>
                commanderSpriteHTML = `<img src="${cmdrSpriteValue}" alt="${cmdr.name}" style="width: 24px; height: 24px; border-radius: 50%; vertical-align: middle; margin-right: 5px;">`;
            } else {
                // ...si no, lo tratamos como un emoji (fallback).
                commanderSpriteHTML = `<span style="font-size: 20px; vertical-align: middle; margin-right: 5px;">${cmdrSpriteValue}</span>`;
            }

            html += `<p style="text-align: center; font-weight: bold; color: gold; margin-bottom: 5px; display: flex; align-items: center; justify-content: center;">
                Liderada por: ${commanderSpriteHTML} ${cmdr.name}, ${cmdr.title}
            </p>`;
        }

            // --- Línea 1: Stats Consolidados de la Unidad ---
            // Salud
        const healthStr = `Salud: ${unit.currentHealth}/${unit.maxHealth}`;
        
            // Moral (con colores)
        let moralStatus = "Normal", moralColor = "#f0f0f0";
        if (unit.morale > 100) { moralStatus = "Exaltada"; moralColor = "#2ecc71"; }
        else if (unit.morale <= 24) { moralStatus = "Vacilante"; moralColor = "#e74c3c"; }
        else if (unit.morale < 50) { moralStatus = "Baja"; moralColor = "#f39c12"; }
        const moraleStr = `Moral: <strong style="color:${moralColor};">${unit.morale || 50}/${unit.maxMorale || 125} (${moralStatus})</strong>`;

            // Experiencia (con valores numéricos)
        const levelData = XP_LEVELS[unit.level || 0];
        let xpStr = "Experiencia: ";
        if (levelData) {
            const nextLevelXP = levelData.nextLevelXp;
            if (nextLevelXP !== 'Max') {
                xpStr += `${unit.experience || 0}/${nextLevelXP} (${levelData.currentLevelName})`;
            } else {
                xpStr += `Máxima (${levelData.currentLevelName})`;
            }
        }

        // Movimiento
        const moveStr = `Mov: ${unit.currentMovement || unit.movement}`;
        
        // Consumo de Comida
        const foodConsumption = (unit.regiments || []).reduce((sum, reg) => sum + (REGIMENT_TYPES[reg.type]?.foodConsumption || 0), 0);
        const upkeep = (unit.regiments || []).reduce((sum, reg) => sum + (REGIMENT_TYPES[reg.type]?.cost.upkeep || 0), 0);
        const upkeepStr = `Mant: ${upkeep} Oro, ${foodConsumption} Comida`;


        // Construir la primera línea del HTML. Usamos separadores para claridad.
        // <<== MODIFICA ESTA LÍNEA para añadir upkeepStr ==>>
        html += `<p>${healthStr} &nbsp;|&nbsp; ${moraleStr} &nbsp;|&nbsp; ${xpStr} &nbsp;|&nbsp; ${moveStr} &nbsp;|&nbsp; ${upkeepStr}</p>`;

        // --- Líneas 2 y 3: Información de la Casilla ---
        const hexData = board[unit.r]?.[unit.c];
        if (hexData) {
                // Terreno y Coordenadas
            const terrainName = TERRAIN_TYPES[hexData.terrain]?.name || 'Desconocido';
            html += `<p>En Terreno: ${terrainName} (${unit.r},${unit.c})</p>`;
            
                // Dueño, Estabilidad y Nacionalidad
            if (hexData.owner !== null) {
                html += `<p>Dueño: J${hexData.owner} &nbsp;|&nbsp; Est: ${hexData.estabilidad}/${MAX_STABILITY} &nbsp;|&nbsp; Nac: ${hexData.nacionalidad[hexData.owner] || 0}/${MAX_NACIONALIDAD}</p>`;
            } else {
                html += `<p>Territorio Neutral</p>`;
            }
        }
        
        return html;
    },
       
    _buildHexDetailsHTML: function(hexData) {
        let contentParts = [];
        
        // Parte 1: Dueño y Territorio
        if (hexData.owner !== null) {
            contentParts.push(`Dueño: J${hexData.owner}`);
            contentParts.push(`Est: ${hexData.estabilidad}/${MAX_STABILITY}`);
            contentParts.push(`Nac: ${hexData.nacionalidad[hexData.owner] || 0}/${MAX_NACIONALIDAD}`);
        } else {
            contentParts.push("Territorio Neutral");
        }

        // Parte 2: Estructura
        if (hexData.structure) {
            contentParts.push(`Estructura: ${STRUCTURE_TYPES[hexData.structure]?.name || hexData.structure}`);
        } else if (hexData.isCity) {
            contentParts.push(hexData.isCapital ? 'Capital' : 'Ciudad');
        }
        
        return `<p>${contentParts.join(' | ')}</p>`;
    },

    updateSelectedUnitInfoPanel: function() {
        if (selectedUnit) {
            this.showUnitContextualInfo(selectedUnit, (selectedUnit.player === gameState.currentPlayer));
        } else {
            this.hideContextualPanel();
        }
    },
    
    updateUnitStrengthDisplay: function(unit) {
        if (!unit?.element) return;
        const s = unit.element.querySelector('.unit-strength');
        if (s) {
            s.textContent = unit.currentHealth;
            s.style.color = unit.currentHealth <= 0 ? 'red' : unit.currentHealth < unit.maxHealth / 2 ? 'orange' : '';
        }
    },

    updateTurnIndicatorAndBlocker: function() {
        // En lugar de this.domElements.turnBlocker...
        // Buscamos el elemento directamente en la página.
        // Esto funciona aunque la inicialización haya fallado.
        const turnBlocker = document.getElementById('turnBlocker');

        if (!turnBlocker || !gameState) {
            return;
        }

        const isMyTurn = gameState.currentPlayer === gameState.myPlayerNumber;

        if (isNetworkGame() && !isMyTurn) {
            turnBlocker.textContent = `Esperando al Jugador ${gameState.currentPlayer}...`;
            turnBlocker.style.display = 'flex';
        } else {
            turnBlocker.style.display = 'none';
        }
    },

    /**
     * (NUEVA FUNCIÓN) Borra todas las unidades visuales del tablero y las vuelve a crear
     * desde el array de datos `units`. Es la solución definitiva para problemas de desincronización del DOM.
     */
    renderAllUnitsFromData: function() {
        if (!this._domElements.gameBoard) return;

        console.log(`[RENDER ALL] Iniciando re-dibujado completo de ${units.length} unidades.`);

        // Paso 1: Eliminar todos los divs de unidades existentes.
        this._domElements.gameBoard.querySelectorAll('.unit').forEach(el => el.remove());

        // Paso 2: Volver a crear cada unidad desde la fuente de datos `units`.
        for (const unit of units) {
            // Se recrea el elemento DOM para cada unidad en la lista de datos.
            const unitElement = document.createElement('div');
            unitElement.className = `unit player${unit.player}`;
            unitElement.dataset.id = unit.id;
            
            // Contenedor principal para alinear el contenido dentro del círculo
            const mainContent = document.createElement('div');
            mainContent.style.position = 'relative';
            mainContent.style.display = 'flex';
            mainContent.style.alignItems = 'center';
            mainContent.style.justifyContent = 'center';
            mainContent.style.width = '100%';
            mainContent.style.height = '100%';

            // Lógica HÍBRIDA para el sprite de la unidad (emoji o imagen)
            const unitSpriteValue = unit.sprite || '?';
            if (unitSpriteValue.includes('.') || unitSpriteValue.includes('/')) {
                unitElement.style.backgroundImage = `url('${unitSpriteValue}')`;
            } else {
                unitElement.style.backgroundImage = 'none';
                mainContent.textContent = unitSpriteValue; // El emoji va dentro del contenedor
            }

            unitElement.appendChild(mainContent);

            // <<== INICIO DE LA CORRECCIÓN: Lógica para el estandarte del Comandante ==>>
            if (unit.commander && COMMANDERS[unit.commander]) {
                const commanderData = COMMANDERS[unit.commander];
                const commanderSpriteValue = commanderData.sprite;

                const commanderBanner = document.createElement('span');
                commanderBanner.className = 'commander-banner';
                commanderBanner.innerHTML = ''; // Limpiar cualquier contenido previo

                // Si el sprite del comandante es una ruta de imagen...
                if (commanderSpriteValue.includes('.png') || commanderSpriteValue.includes('.jpg')) {
                    // ...creamos una etiqueta <img>
                    const img = document.createElement('img');
                    img.src = commanderSpriteValue;
                    img.alt = commanderData.name.substring(0, 1);
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.borderRadius = '50%'; // Para que la imagen sea redonda dentro del estandarte
                    commanderBanner.appendChild(img);
                } else {
                    // ...si no, lo tratamos como un emoji (fallback).
                    commanderBanner.textContent = commanderSpriteValue;
                }
                
                mainContent.appendChild(commanderBanner);
            }
            // <<== FIN DE LA CORRECCIÓN ==>>

            // Añadir el indicador de salud
            const strengthDisplay = document.createElement('div');
            strengthDisplay.className = 'unit-strength';
            strengthDisplay.textContent = unit.currentHealth;
            unitElement.appendChild(strengthDisplay);
            
            // Re-asignamos la nueva referencia y lo añadimos al tablero.
            unit.element = unitElement;

                        // Lo añadimos al tablero.
            this._domElements.gameBoard.appendChild(unitElement);

                        // Y lo posicionamos.
            if (typeof positionUnitElement === 'function') {
                positionUnitElement(unit);
            }
        }
        console.log("[RENDER ALL] Re-dibujado completo finalizado.");
    },

    showRewardToast: function(message, icon = '🏆') {
        if (!this._domElements.gameBoard) return;
        
        const toast = document.createElement('div');
        toast.className = 'reward-toast';
        toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
        
        // Posicionarlo en el centro horizontal y un poco arriba
        toast.style.left = '50%';
        toast.style.top = '25%';
        toast.style.transform = 'translateX(-50%)'; // Centrarlo correctamente

        this._domElements.gameBoard.appendChild(toast);

        // Se autodestruye cuando termina la animación
        setTimeout(() => {
            toast.remove();
        }, 2500); // La duración de la animación
    },

    showUnitContextualInfo: function(unit, isOwnUnit = true) {
        if (!this._domElements.contextualInfoPanel || !unit) return;

        // Limpia cualquier temporizador de autocierre anterior.
        if (this._autoCloseTimeout) clearTimeout(this._autoCloseTimeout);
        this.removeAttackPredictionListener();
        
        // --- Prepara el contenido del panel ---
        const line1 = document.getElementById('contextual-line-1');
        const line2 = document.getElementById('contextual-line-2');
        line1.innerHTML = this._buildUnitLine(unit);
        line2.innerHTML = this._buildHexLine(unit.r, unit.c);
        line1.style.display = 'block';
        line2.style.display = 'block';

        // --- Muestra el panel ---
        this._domElements.contextualInfoPanel.classList.add('visible');
        if (this._reopenBtn) this._reopenBtn.style.display = 'none';

        // --- Guarda la información para poder reabrirla ---
        this._lastShownInfo = { type: 'unit', data: unit };
        
        // --- Inicia el temporizador de autocierre ---
        this._autoCloseTimeout = setTimeout(() => {
            console.log("Autocerrando panel contextual de unidad...");
            this._domElements.contextualInfoPanel.classList.remove('visible');
                // Usa this._reopenBtn para mostrar el botón
            if (this._reopenBtn) this._reopenBtn.style.display = 'block'; 
            //this.hideAllActionButtons();
        }, 3000);
        
        // --- Lógica para mostrar los botones de acción ---
        //this.hideAllActionButtons();
        const isPlayerUnit = unit.player === gameState.currentPlayer;
        const isScoutedEnemy = !isPlayerUnit && isEnemyScouted(unit);
        
        if (isPlayerUnit || isScoutedEnemy) {
            if (this._domElements.floatingReinforceBtn) {
                this._domElements.floatingReinforceBtn.style.display = 'flex';
                this._domElements.floatingReinforceBtn.title = isPlayerUnit ? "Gestionar/Reforzar Unidad" : "Ver Detalles";
                this._domElements.floatingReinforceBtn.innerHTML = isPlayerUnit ? "💪" : "👁️";
            }
        }
        
        if (isPlayerUnit && gameState.currentPhase === 'play') {
            const canAct = !unit.hasMoved && !unit.hasAttacked;
            if (unit.lastMove && !unit.hasAttacked) {
                if (this._domElements.floatingUndoMoveBtn) this._domElements.floatingUndoMoveBtn.style.display = 'flex';
            }
            if (canAct) {
                if ((unit.regiments?.length || 0) > 1 && this._domElements.floatingSplitBtn) {
                    this._domElements.floatingSplitBtn.style.display = 'flex';
                }
                if (this._domElements.floatingAssignGeneralBtn) {
                    const playerTechs = gameState.playerResources[unit.player]?.researchedTechnologies || [];
                    const hasLeadershipTech = playerTechs.includes("LEADERSHIP");
                    const hasHQ = unit.regiments.some(r => r.type === "Cuartel General");
                    const unitHex = board[unit.r]?.[unit.c];
                    let isAtRecruitmentPoint = false;
                    if (unitHex && (unitHex.isCity || unitHex.isCapital || unitHex.structure === "Fortaleza")) {
                        isAtRecruitmentPoint = true;
                    }
                    if (!unit.commander && hasLeadershipTech && hasHQ && isAtRecruitmentPoint) {
                        this._domElements.floatingAssignGeneralBtn.style.display = 'flex';
                    }
                }
                const unitHex = board[unit.r]?.[unit.c];
                if (unitHex) {
                    if (unitHex.owner !== null && unitHex.owner !== unit.player && this._domElements.floatingPillageBtn) {
                        this._domElements.floatingPillageBtn.style.display = 'flex';
                    }
                    const isBuilderUnit = unit.regiments.some(reg => REGIMENT_TYPES[reg.type]?.abilities?.includes("build_road"));
                    if (isBuilderUnit && this._domElements.floatingBuildBtn) {
                        hexToBuildOn = { r: unit.r, c: unit.c };
                        this._domElements.floatingBuildBtn.style.display = 'flex';
                    }
                }
                const hasDamagedDuplicates = [...new Set(unit.regiments.map(r => r.type))].some(type => {
                    const group = unit.regiments.filter(r => r.type === type);
                    return group.length > 1 && group.some(r => r.health < REGIMENT_TYPES[type].health);
                });
                if (hasDamagedDuplicates && this._domElements.floatingConsolidateBtn) {
                    this._domElements.floatingConsolidateBtn.style.display = 'flex';
                }
            }
            const hexUnderUnit = board[unit.r]?.[unit.c];
            if (hexUnderUnit && this._domElements.setAsCapitalBtn) {
                const isEligibleCity = hexUnderUnit.isCity || ['Aldea', 'Ciudad', 'Metrópoli'].includes(hexUnderUnit.structure);
                if (isOwnUnit && isEligibleCity && !hexUnderUnit.isCapital) {
                    this._domElements.setAsCapitalBtn.style.display = 'flex';
                }
            }
        }
        if (isOwnUnit && gameState.currentPhase === 'play' && !unit.hasAttacked) {
            this.attachAttackPredictionListener(unit);
        } else { 
            this.removeAttackPredictionListener();
        }

        if (this.preventNextAutoclose) {
            this.preventNextAutoclose = false;
        } else {
            this._startAutocloseTimer();
        }
    },

    showHexContextualInfo: function(r, c, hexData) {
        if (!this._domElements.contextualInfoPanel || !hexData) return;

        // Limpia cualquier temporizador de autocierre anterior.
        if (this._autoCloseTimeout) clearTimeout(this._autoCloseTimeout);
        this.removeAttackPredictionListener();

        // --- Prepara el contenido del panel ---
        const line1 = document.getElementById('contextual-line-1');
        const line2 = document.getElementById('contextual-line-2');
        line1.innerHTML = '';
        line1.style.display = 'none';
        line2.innerHTML = this._buildHexLine(r, c);
        line2.style.display = 'block';

        // --- Muestra el panel ---
        this._domElements.contextualInfoPanel.classList.add('visible');
        if (this._reopenBtn) this._reopenBtn.style.display = 'none';
        
        // --- Guarda la información ---
        this._lastShownInfo = { type: 'hex', data: { r, c, hexData } };
        
        // --- Inicia el temporizador de autocierre ---
        this._autoCloseTimeout = setTimeout(() => {
            console.log("Autocerrando panel contextual de hexágono...");
            this._domElements.contextualInfoPanel.classList.remove('visible');
                // Usa this._reopenBtn para mostrar el botón
            if (this._reopenBtn) this._reopenBtn.style.display = 'block'; 
            //this.hideAllActionButtons();
        }, 3000);

        // --- Lógica para mostrar los botones de acción ---
        //this.hideAllActionButtons();
        
        const isPlayerTerritory = hexData.owner === gameState.currentPlayer;
        const isUnitPresent = getUnitOnHex(r, c);
        const canActHere = gameState.currentPhase === 'play' && isPlayerTerritory && !isUnitPresent;
        
        if (canActHere) {
            const playerTechs = gameState.playerResources[gameState.currentPlayer]?.researchedTechnologies || [];
            if (playerTechs.includes('ENGINEERING')) {
                if (this._domElements.floatingBuildBtn) this._domElements.floatingBuildBtn.style.display = 'flex';
                hexToBuildOn = {r, c};
            }
            const currentStructureInfo = hexData.structure ? STRUCTURE_TYPES[hexData.structure] : null;
            const isRecruitmentPoint = hexData.isCity || hexData.isCapital || (currentStructureInfo && currentStructureInfo.allowsRecruitment);
            if (isRecruitmentPoint && this._domElements.floatingCreateDivisionBtn) {
                console.error("¡DIAGNÓSTICO! El código para mostrar el botón 'Crear Unidad' SÍ SE ESTÁ EJECUTANDO.");
                this._domElements.floatingCreateDivisionBtn.style.display = 'flex';
                hexToBuildOn = {r, c};
            }
        }
        
        const setCapitalBtn = this._domElements.setAsCapitalBtn;
        if(setCapitalBtn) {
            const isEligibleCity = hexData.isCity || ['Aldea', 'Ciudad', 'Metrópoli'].includes(hexData.structure);
            if(isPlayerTerritory && isEligibleCity && !hexData.isCapital) {
                setCapitalBtn.style.display = 'flex';
            }
        }

        if (this.preventNextAutoclose) {
            this.preventNextAutoclose = false;
        } else {
            this._startAutocloseTimer(true);
        }

    },

    hideContextualPanel: function() {
        if (this._domElements.contextualInfoPanel) {
            this._domElements.contextualInfoPanel.classList.remove('visible');
        }
        this.removeAttackPredictionListener();
        this.hideAllActionButtons();
    },

    _buildUnitLine: function(unit) {
        const levelData = XP_LEVELS[unit.level || 0];
        const xpStr = (levelData.nextLevelXp === 'Max') ? 'Max' : `${unit.experience || 0}/${levelData.nextLevelXp}`;
        const food = (unit.regiments || []).reduce((sum, reg) => sum + (REGIMENT_TYPES[reg.type]?.foodConsumption || 0), 0);
        const upkeep = (unit.regiments || []).reduce((sum, reg) => sum + (REGIMENT_TYPES[reg.type]?.cost.upkeep || 0), 0);
        return `<strong>Unidad:</strong> ${unit.name} (J${unit.player}) &nbsp;•&nbsp; <strong>S:</strong> ${unit.currentHealth}/${unit.maxHealth} &nbsp;•&nbsp; <strong>M:</strong> ${unit.morale || 50}/${unit.maxMorale || 125} &nbsp;•&nbsp; <strong>Exp:</strong> ${xpStr} &nbsp;•&nbsp; <strong>Mov:</strong> ${unit.currentMovement || unit.movement} &nbsp;•&nbsp; <strong>Mt:</strong> ${upkeep} Oro, ${food} Comida`;
    },

    _buildHexLine: function(r, c) {
        const hexData = board[r]?.[c];
        if (!hexData) return 'Datos no disponibles.';
        const terrainName = TERRAIN_TYPES[hexData.terrain]?.name || 'Desconocido';
        if (hexData.owner !== null) {
            return `${terrainName} (${r},${c}): <strong>J${hexData.owner}</strong> &nbsp;|&nbsp; Est: ${hexData.estabilidad}/${MAX_STABILITY} &nbsp;|&nbsp; Nac: ${hexData.nacionalidad[hexData.owner] || 0}/${MAX_NACIONALIDAD}`;
        } else {
            return `${terrainName} (${r},${c}): <strong>N</strong>`;
        }
    },
    
    showTutorialMessage: function(message) {
        // Si el panel de INFORMACIÓN está visible, lo cerramos forzosamente.
        if (this._domElements.contextualInfoPanel && this._domElements.contextualInfoPanel.classList.contains('visible')) {
            this._domElements.contextualInfoPanel.classList.remove('visible');
            const reopenBtn = document.getElementById('reopenContextualPanelBtn');
            if (reopenBtn) reopenBtn.style.display = 'block';
        }

        // Y luego mostramos el mensaje del tutorial
        if (!this._tutorialMessagePanel) this._tutorialMessagePanel = document.getElementById('tutorialMessagePanel');
        const tutorialTextElement = document.getElementById('tutorialMessageText');
        if (tutorialTextElement && this._tutorialMessagePanel) {
            tutorialTextElement.innerHTML = message;
            this._tutorialMessagePanel.classList.add('visible');
        }
    },

    hideTutorialMessage: function() {
        if (!this._tutorialMessagePanel) this._tutorialMessagePanel = document.getElementById('tutorialMessagePanel');
        if (this._tutorialMessagePanel) {
            this._tutorialMessagePanel.classList.remove('visible');
        }
    },

    // Función para limpiar CUALQUIER resaltado del tutorial
    clearTutorialHighlights: function() {
        // 1. Limpia el resaltado de botones/UI si lo hubiera
        if (this._lastTutorialHighlightElementId) {
            const oldElement = document.getElementById(this._lastTutorialHighlightElementId);
            if (oldElement) oldElement.classList.remove('tutorial-highlight');
            this._lastTutorialHighlightElementId = null;
        }
        
        // 2. Busca y elimina TODOS los "aros de luz" que puedan existir
        const existingOverlays = document.querySelectorAll('.tutorial-hex-overlay');
        existingOverlays.forEach(overlay => overlay.remove());
    },

    // Función para crear los resaltados
    highlightTutorialElement: function(elementId = null, hexCoords = null) {
        // SIEMPRE limpiamos cualquier resaltado anterior para empezar de cero
        this.clearTutorialHighlights();

        // Lógica para resaltar botones (esta no cambia)
        if (elementId) {
            const element = document.getElementById(elementId);
            if (element) {
                element.classList.add('tutorial-highlight');
                this._lastTutorialHighlightElementId = elementId; 
            }
        }
        
        // Lógica para resaltar hexágonos (creando el "aro de luz")
        if (hexCoords) {
            const coords = (typeof hexCoords === 'function') ? hexCoords() : hexCoords;
            coords.forEach(coord => {
                const hexData = board[coord.r]?.[coord.c];
                if (hexData && hexData.element) {
                    // 1. Creamos el nuevo div para el "aro de luz"
                    const overlay = document.createElement('div');
                    overlay.className = 'tutorial-hex-overlay';
                    
                    // 2. Lo posicionamos exactamente encima del hexágono
                    overlay.style.left = hexData.element.style.left;
                    overlay.style.top = hexData.element.style.top;
                    
                    // 3. Lo añadimos al tablero de juego
                    this._domElements.gameBoard.appendChild(overlay);
                }
            });
        }
    },

    //función para la información en pantalla
    updateTopBarInfo: function() {
        // 1. Verificar si el menú y los datos existen antes de hacer nada
        const topBar = document.getElementById('top-bar-menu');
        if (!topBar || topBar.style.display === 'none' || !gameState || !gameState.playerResources) {
            return; // No hacer nada si el menú está cerrado o los datos no están listos
        }

        const infoContainer = document.getElementById('top-bar-info');
        if (!infoContainer) return;
        
        // --- 2. CORRECCIÓN: FASE Y TURNO ---
        const phaseTurnEl = document.getElementById('top-bar-phase-turn');
        if (phaseTurnEl) {
            const playerType = gameState.playerTypes && gameState.playerTypes[`player${gameState.currentPlayer}`] 
                            ? (gameState.playerTypes[`player${gameState.currentPlayer}`].includes('ai') ? 'IA' : 'Humano') 
                            : 'Desconocido';
            phaseTurnEl.textContent = `Fase: ${gameState.currentPhase} | Turno: ${gameState.turnNumber} | J${gameState.currentPlayer} (${playerType})`;
        }
        
        // --- 3. CORRECCIÓN: RUTA A LOS RECURSOS ---
        const resourcesData = gameState.playerResources[gameState.currentPlayer];
        if (!resourcesData) return; // Salir si el jugador actual no tiene recursos definidos

        for (const resKey in resourcesData) {
            const el = infoContainer.querySelector(`strong[data-resource="${resKey}"]`);
            if (el) {
                // Formatear números grandes (opcional pero muy útil)
                el.textContent = resourcesData[resKey] >= 1000 ? `${(resourcesData[resKey] / 1000).toFixed(1)}k` : resourcesData[resKey];
            }
        }
    },

    // =============================================================
    // ==   FUNCIÓN DE AUTOCIERRE QUE FALTABA                     ==
    // =============================================================
    _startAutocloseTimer: function(isHexPanel = false) {
        // 1. Limpiar cualquier temporizador anterior para evitar cierres conflictivos
        if (this._autoCloseTimeout) {
            clearTimeout(this._autoCloseTimeout);
        }

        // 2. Definir la duración del temporizador
        // 8 segundos para paneles de unidad, 4 segundos para paneles de hexágono (más simples)
        const duration = isHexPanel ? 4000 : 8000;
        
        // 3. Crear el nuevo temporizador
        this._autoCloseTimeout = setTimeout(() => {
            const infoPanel = document.getElementById('contextualInfoPanel');
            if (infoPanel && infoPanel.classList.contains('visible')) {
                console.log("Cerrando panel contextual automáticamente...");
                infoPanel.classList.remove('visible');

                // También mostramos el botón de reabrir
                const reopenBtn = document.getElementById('reopenContextualPanelBtn');
                if (reopenBtn) {
                    reopenBtn.style.display = 'block';
                }

                // Y ocultamos los botones de acción para que no queden flotando
                this.hideAllActionButtons();
            }
            // Limpiar la referencia al temporizador una vez ejecutado
            this._autoCloseTimeout = null;
        }, duration);
    },
    
};