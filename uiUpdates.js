// uiUpdates.js
// Funciones para actualizar la interfaz de usuario.

// Crear un objeto global para contener las funciones de UI
const UIManager = {

    updateAllUIDisplays: function() {
        // ... (sin cambios respecto a lo que me pasaste) ...
        if (typeof this.updatePlayerAndPhaseInfo === "function") this.updatePlayerAndPhaseInfo();
        else console.warn("UIManager.updatePlayerAndPhaseInfo no está definida.");

        // Ya no llamamos a updateContextualPanel directamente desde aquí, 
        // onHexClick y otras acciones se encargarán de llamar a los métodos show/hide específicos.
        // if (typeof this.updateContextualPanel === "function") this.updateContextualPanel(); 

        if (typeof updateFogOfWar === "function") updateFogOfWar(); 
        else console.warn("updateFogOfWar (global) no está definida.");

        if (typeof this.updateActionButtonsBasedOnPhase === "function") this.updateActionButtonsBasedOnPhase();
        else console.warn("UIManager.updateActionButtonsBasedOnPhase no está definida.");
    },

    updatePlayerAndPhaseInfo: function() {
        // ... (sin cambios respecto a lo que me pasaste) ...
        if (!gameState || !gameState.playerResources || !gameState.playerTypes) {
            return;
        }
        if (!floatingMenuTitle) { 
            return;
        }
        let phaseText = "";
        switch (gameState.currentPhase) {
            case "deployment": phaseText = "Despliegue"; break;
            case "play": phaseText = "En Juego"; break;
            case "gameOver": phaseText = "Fin de Partida"; break;
            case "setup": phaseText = "Preparando..."; break;
            default: phaseText = gameState.currentPhase ? gameState.currentPhase.charAt(0).toUpperCase() + gameState.currentPhase.slice(1) : "-";
        }
        const playerTypeForDisplay = gameState.playerTypes[`player${gameState.currentPlayer}`] === 'human' ?
            'Humano' :
            `IA (${gameState.playerAiLevels?.[`player${gameState.currentPlayer}`] || 'Normal'})`;

        floatingMenuTitle.innerHTML = `Fase: ${phaseText}<br>Turno <span id="turnNumberDisplay_float_val">${gameState.turnNumber}</span> - Jugador <span id="currentPlayerDisplay_float_val">${gameState.currentPlayer}</span> (${playerTypeForDisplay})`;

        const currentResources = gameState.playerResources[gameState.currentPlayer];
        const resourceValueSpans = document.querySelectorAll('#playerResourcesGrid_float .resource-values span[data-resource]');
        if (currentResources && resourceValueSpans.length > 0) {
            resourceValueSpans.forEach(span => {
                const resourceType = span.dataset.resource;
                span.textContent = currentResources[resourceType] || 0;
            });
        } else if (resourceValueSpans.length > 0) {
            resourceValueSpans.forEach(span => { span.textContent = 0; });
        }
    },

    updateActionButtonsBasedOnPhase: function() { // Esta función ya la tenías al final, la muevo aquí por orden
        // ... (sin cambios respecto a lo que me pasaste al final de tu uiUpdates.js) ...
        if (!gameState) return;

        const isDeployment = gameState.currentPhase === "deployment";
        const isPlay = gameState.currentPhase === "play";
        const isGameOver = gameState.currentPhase === "gameOver";

        if (floatingCreateDivisionBtn) {
            let canPlayerRecruit = false;
            if (isDeployment) {
                if (gameState.unitsPlacedByPlayer && gameState.deploymentUnitLimit !== undefined) {
                    canPlayerRecruit = gameState.unitsPlacedByPlayer[gameState.currentPlayer] < gameState.deploymentUnitLimit;
                } else { canPlayerRecruit = true; }
            }
            floatingCreateDivisionBtn.style.display = (isDeployment && canPlayerRecruit) ? 'flex' : 'none';
            floatingCreateDivisionBtn.disabled = !(isDeployment && canPlayerRecruit);
        }

        if (floatingEndTurnBtn) floatingEndTurnBtn.disabled = !(isDeployment || isPlay);
        if (concedeBattleBtn_float) concedeBattleBtn_float.disabled = !(isDeployment || isPlay);

        if (isGameOver) {
            if (floatingCreateDivisionBtn) floatingCreateDivisionBtn.disabled = true;
            if (floatingEndTurnBtn) floatingEndTurnBtn.disabled = true;
            if (concedeBattleBtn_float) concedeBattleBtn_float.disabled = true;
            if (contextualActions) contextualActions.innerHTML = ''; // Asumo contextualActions es global
            this.hideContextualPanel(); 
        }
    },

    // --- NUEVA FUNCIÓN AÑADIDA ---
    showUnitContextualInfo: function(unit) {
       if (!contextualInfoPanel || !contextualTitle || !contextualContent || !contextualActions) { 
           console.warn("UIManager: Elementos del panel contextual no encontrados."); 
           return; 
       }
       if (!unit) { 
           this.hideContextualPanel(); 
           return; 
       }

       // Limpiar contenido anterior del panel completo
       // Si usas divs internos (contextualTitle, contextualContent, contextualActions):
       contextualTitle.innerHTML = '';   
       contextualContent.innerHTML = ''; 
       contextualActions.innerHTML = ''; 
       // Si NO usas divs internos y todo va directo en contextualInfoPanel:
       // contextualInfoPanel.innerHTML = ''; // Descomenta esta y comenta las 3 anteriores en ese caso.


       // --- Título del Panel (si lo tienes separado) ---
       contextualTitle.textContent = `Unidad`; // O puedes poner el nombre de la unidad aquí

       // --- Contenido Principal ---
       const nameEditorDiv = document.createElement('div');
       nameEditorDiv.className = 'unit-name-editor-ctx'; 
       nameEditorDiv.style.display = 'flex';
       nameEditorDiv.style.alignItems = 'center';
       nameEditorDiv.style.marginBottom = '5px';

       const nameLabel = document.createElement('strong');
       nameLabel.textContent = 'Nombre:';
       nameLabel.style.marginRight = '5px';
       nameEditorDiv.appendChild(nameLabel);

       const nameInput = document.createElement('input');
       nameInput.type = 'text';
       nameInput.id = 'selectedUnitNameInput_ctx'; 
       nameInput.value = unit.name;
       nameInput.style.flexGrow = '1';
       nameInput.style.padding = '3px';
       if (unit.player !== gameState.currentPlayer) { // Asumo gameState es global
           nameInput.readOnly = true;
       }
       nameEditorDiv.appendChild(nameInput);

       if (unit.player === gameState.currentPlayer) {
           const saveNameBtn = document.createElement('button');
           saveNameBtn.id = 'saveUnitNameBtn_ctx_panel';
           saveNameBtn.title = 'Guardar Nombre';
           saveNameBtn.className = 'small-btn'; 
           saveNameBtn.textContent = '✔️';
           saveNameBtn.style.marginLeft = '5px';
           saveNameBtn.onclick = () => {
               const newName = nameInput.value.trim();
               if (newName && newName.length > 0 && newName.length <= 30) {
                   unit.name = newName;
                   if(typeof logMessage === "function") logMessage(`Nombre de unidad cambiado a: ${unit.name}`);
                   this.showUnitContextualInfo(unit); 
               } else {
                   if(typeof logMessage === "function") logMessage("Nombre de unidad inválido/largo.");
                   nameInput.value = unit.name; 
               }
           };
           nameInput.onkeypress = (event) => { if (event.key === 'Enter') saveNameBtn.click(); };
           nameEditorDiv.appendChild(saveNameBtn);
       }
       contextualContent.appendChild(nameEditorDiv); 

       const statsP = document.createElement('p');
       statsP.textContent = `A/D/M/I: ${unit.attack}/${unit.defense}/${unit.currentMovement || unit.movement}/${unit.initiative || '-'}`;
       contextualContent.appendChild(statsP);

       const healthP = document.createElement('p');
       healthP.textContent = `Salud: ${unit.currentHealth}/${unit.maxHealth}`;
       contextualContent.appendChild(healthP);
       
       const expP = document.createElement('p');
       expP.textContent = `EXP: ${unit.experience || 0}/${unit.maxExperience || 500}`;
       contextualContent.appendChild(expP);

       const regimentsTitle = document.createElement('h4');
       regimentsTitle.textContent = `Regimientos (${unit.regiments?.length || 0}):`;
       contextualContent.appendChild(regimentsTitle);

       const regimentsList = document.createElement('ul');
       regimentsList.className = 'regiments-detailed-list'; 
       if (unit.regiments && unit.regiments.length > 0) {
           unit.regiments.forEach(reg => {
               const regData = REGIMENT_TYPES[reg.type] || reg; // Asumo REGIMENT_TYPES es global
               const listItem = document.createElement('li');
               listItem.innerHTML = `<strong>${reg.type}</strong> (${regData.sprite || '?'}) A:${regData.attack} D:${regData.defense} HP:${regData.health}`;
               regimentsList.appendChild(listItem);
           });
       } else {
           const listItem = document.createElement('li');
           listItem.textContent = 'Sin regimientos.';
           regimentsList.appendChild(listItem);
       }
       contextualContent.appendChild(regimentsList);

       if (unit.player !== gameState.currentPlayer) {
           const enemyMsgP = document.createElement('p');
           enemyMsgP.style.color = '#c00';
           enemyMsgP.style.textAlign = 'center';
           enemyMsgP.style.marginTop = '5px';
           enemyMsgP.textContent = 'Unidad Enemiga';
           contextualContent.appendChild(enemyMsgP);
       }

       // --- Acciones ---
       // Limpiar acciones previas
       contextualActions.innerHTML = ''; 

       if (unit.player === gameState.currentPlayer && gameState.currentPhase === 'play') {
           const unitHexData = board[unit.r]?.[unit.c]; // Asumo board es global
           if (unit.currentHealth < unit.maxHealth && !unit.hasMoved && !unit.hasAttacked &&
               unitHexData && unitHexData.owner === gameState.currentPlayer && (unitHexData.isCity || unitHexData.structure === "Fortaleza")) {
               
               const regimentBaseCostSum = unit.regiments?.reduce((sum, reg) => sum + (reg.cost?.oro || 0), 0) || 0;
               const minCostToReinforce = Math.max(1, Math.ceil((regimentBaseCostSum / unit.maxHealth) * REINFORCE_COST_PER_HP_PERCENT)) || 1; // Asumo REINFORCE_COST_PER_HP_PERCENT es global

               if (gameState.playerResources[gameState.currentPlayer].oro >= minCostToReinforce) {
                    const reinforceBtnCtx = document.createElement('button');
                    reinforceBtnCtx.textContent = "Reforzar";
                    reinforceBtnCtx.onclick = () => { 
                        if (typeof handleReinforceUnitAction === "function") handleReinforceUnitAction(); // Asumo global
                        this.hideContextualPanel();
                    };
                    contextualActions.appendChild(reinforceBtnCtx);
               }
           }
           // Aquí puedes añadir los botones de Mover y Atacar que se generarían en el panel
           // si no se manejan antes en onHexClick
            const moveBtn = document.createElement('button');
            moveBtn.textContent = "Mover";
            moveBtn.onclick = () => {
                if (typeof prepareMove === 'function') prepareMove(unit.id); // de unit_Actions.js
            };
            contextualActions.appendChild(moveBtn);

            const attackBtn = document.createElement('button');
            attackBtn.textContent = "Atacar";
            attackBtn.onclick = () => {
                if (typeof prepareAttack === 'function') prepareAttack(unit.id); // de unit_Actions.js
            };
            contextualActions.appendChild(attackBtn);
       }
       
       contextualInfoPanel.classList.add('visible');
    },

    // --- FUNCIÓN EXISTENTE MODIFICADA ---
    showHexContextualInfo: function(r, c, hexData) {
        if (!contextualInfoPanel || !contextualTitle || !contextualContent || !contextualActions) {
             console.warn("UIManager: Elementos del panel contextual no encontrados.");
             return;
        }
        if (!hexData) { 
            this.hideContextualPanel();
            return;
        }

        // Limpiar contenido anterior
        contextualTitle.innerHTML = '';   
        contextualContent.innerHTML = ''; 
        contextualActions.innerHTML = ''; 
        // O contextualInfoPanel.innerHTML = ''; si todo va directo

        // --- Título del Panel ---
        contextualTitle.textContent = `Hexágono (${r},${c})`;

        // --- Contenido Principal ---
        const terrainP = document.createElement('p');
        terrainP.textContent = `Terreno: ${hexData.terrain}`;
        contextualContent.appendChild(terrainP);

        if (hexData.resourceNode && RESOURCE_NODES_DATA[hexData.resourceNode]) { // Asumo globales
            const resourceP = document.createElement('p');
            resourceP.textContent = `Recurso: ${RESOURCE_NODES_DATA[hexData.resourceNode].name}`;
            contextualContent.appendChild(resourceP);
        }
        if (hexData.isCity) {
            const cityP = document.createElement('p');
            cityP.innerHTML = `<strong>${hexData.isCapital ? 'Capital' : 'Ciudad'}</strong>`;
            contextualContent.appendChild(cityP);
        }
        if (hexData.structure && STRUCTURE_TYPES[hexData.structure]) { // Asumo globales
            const structureP = document.createElement('p');
            structureP.textContent = `Estructura: ${hexData.structure} (${STRUCTURE_TYPES[hexData.structure].sprite})`;
            contextualContent.appendChild(structureP);
        }

        // --- Acciones ---
        // Limpiar acciones previas
        contextualActions.innerHTML = '';

        const unitOnHex = typeof getUnitOnHex === "function" ? getUnitOnHex(r,c) : null; // Asumo global

        if (gameState.currentPhase === 'play' && hexData.owner === gameState.currentPlayer && !unitOnHex) {
            let canBuildStructure = false;
            if (!hexData.isCity) { 
                if (!hexData.structure && STRUCTURE_TYPES["Camino"]?.buildableOn.includes(hexData.terrain)) canBuildStructure = true;
                else if (hexData.structure === "Camino" && STRUCTURE_TYPES["Fortaleza"]?.buildableOn.includes(hexData.terrain)) canBuildStructure = true;
            }

            if (canBuildStructure) {
                const buildBtnCtx = document.createElement('button');
                buildBtnCtx.textContent = "Construir Estructura"; 
                buildBtnCtx.onclick = () => { 
                    hexToBuildOn = { r, c }; // Asumo global
                    if (typeof openBuildStructureModal === "function") openBuildStructureModal(); // de modalLogic.js
                };
                contextualActions.appendChild(buildBtnCtx);
            }
        }
        
        if (gameState.currentPhase === 'play' && hexData.owner === gameState.currentPlayer && !unitOnHex && (hexData.isCity || hexData.structure === "Fortaleza") ) {
             const createDivCtxBtn = document.createElement('button');
             createDivCtxBtn.textContent = "Crear División Aquí";
             createDivCtxBtn.onclick = () => { 
                 if (typeof openCreateDivisionModal === "function") openCreateDivisionModal(); // de modalLogic.js
             };
             contextualActions.appendChild(createDivCtxBtn);
        }
        
        if (contextualContent.children.length > 0 || contextualActions.children.length > 0) {
            contextualInfoPanel.classList.add('visible');
        } else {
            this.hideContextualPanel();
        }
    },

    // --- FUNCIÓN EXISTENTE MODIFICADA ---
    hideContextualPanel: function() {
        if (contextualInfoPanel) { 
            contextualInfoPanel.classList.remove('visible');
            setTimeout(() => {
                // Solo limpiar si todavía está oculto (para evitar limpiar si se mostró rápidamente de nuevo)
                if (!contextualInfoPanel.classList.contains('visible')) {
                    if (contextualTitle) contextualTitle.innerHTML = ''; 
                    if (contextualContent) contextualContent.innerHTML = '';
                    if (contextualActions) contextualActions.innerHTML = '';
                }
            }, 250); 
        }
    },

    // --- FUNCIÓN EXISTENTE MODIFICADA ---
    updateSelectedUnitInfoPanel: function() {
        // Ahora esta función simplemente llama a la nueva showUnitContextualInfo si es necesario
        if (selectedUnit && contextualInfoPanel ) { // Ya no chequea display style
            // Si el panel está destinado a estar visible para esta unidad, showUnitContextualInfo lo manejará
            this.showUnitContextualInfo(selectedUnit);
        } else if (!selectedUnit) {
            this.hideContextualPanel(); // Si no hay unidad seleccionada, ocultar el panel
        }
    },

    updateUnitStrengthDisplay: function(unit) {
        // ... (sin cambios respecto a lo que me pasaste) ...
        if (unit && unit.element) {
            const strengthElement = unit.element.querySelector('.unit-strength');
            if (strengthElement) strengthElement.textContent = unit.currentHealth;
        }
    }
    // La función updateActionButtonsBasedOnPhase que estaba aquí la moví más arriba para agruparla con las otras de UI.
};