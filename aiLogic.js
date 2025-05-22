// aiLogic.js

function deployUnitsAI(playerNumber) {
    if (gameState.currentPhase !== "deployment") return;
    if (!gameState.playerTypes[`player${playerNumber}`].startsWith('ai_')) return;

    const aiLevel = gameState.playerAiLevels?.[`player${playerNumber}`] || 'normal';
    const unitLimit = gameState.deploymentUnitLimit;
    let unitsToDeployCount = 0;

    if (unitLimit === Infinity) {
        // Decidir un número razonable si es ilimitado, basado en el nivel de IA o recursos iniciales
        unitsToDeployCount = (aiLevel === 'easy') ? 2 : (aiLevel === 'normal' ? 3 : 4);
    } else {
        unitsToDeployCount = unitLimit - gameState.unitsPlacedByPlayer[playerNumber];
    }

    if (unitsToDeployCount <= 0) {
        logMessage(`IA (Jugador ${playerNumber}) ya ha desplegado su límite de unidades.`);
        // Si la IA ha terminado, y el otro jugador es humano y también ha terminado, o es IA, pasar el turno.
        // Esta lógica es compleja y podría estar mejor en handleEndTurn.
        // Por ahora, si la IA no tiene más que desplegar, podría terminar su turno de despliegue.
        // if (endTurnBtn && !endTurnBtn.disabled && gameState.currentPlayer === playerNumber) endTurnBtn.click();
        return;
    }

    logMessage(`IA (Jugador ${playerNumber}, Nivel: ${aiLevel}) desplegará ${unitsToDeployCount} unidades.`);

    // --- Estrategia de Composición de Unidades de la IA ---
    // Esto puede ser muy simple o muy complejo.
    // Fácil: Solo infantería ligera.
    // Normal: Mezcla de infantería ligera y pesada, quizás algunos arqueros.
    // Difícil: Composición más balanceada o que contrarreste al jugador (si tuviera información).
    const availableRegimentTypes = Object.keys(REGIMENT_TYPES);
    let unitsDeployedThisCall = 0;

    for (let i = 0; i < unitsToDeployCount; i++) {
        if (gameState.unitsPlacedByPlayer[playerNumber] >= unitLimit) break;

        let regimentsForNewDivision = [];
        let divisionName = `División IA ${playerNumber} #${gameState.unitsPlacedByPlayer[playerNumber] + 1}`;
        let divisionCost = { oro: 0 }; // Y otros recursos si aplica

        // Elegir tipo de regimiento(s) para la división
        // Ejemplo simple:
        if (aiLevel === 'easy') {
            regimentsForNewDivision.push({ ...REGIMENT_TYPES["Infantería Ligera"], type: "Infantería Ligera" });
        } else if (aiLevel === 'normal') {
            if (i % 2 === 0) {
                regimentsForNewDivision.push({ ...REGIMENT_TYPES["Infantería Pesada"], type: "Infantería Pesada" });
            } else {
                regimentsForNewDivision.push({ ...REGIMENT_TYPES["Arqueros"], type: "Arqueros" });
            }
        } else { // 'hard'
            // Una composición más variada o estratégica
            const randType = availableRegimentTypes[Math.floor(Math.random() * availableRegimentTypes.length)];
            regimentsForNewDivision.push({ ...REGIMENT_TYPES[randType], type: randType });
            if (Math.random() > 0.5 && Object.keys(REGIMENT_TYPES).length > 1) { // A veces una segunda unidad diferente
                 let randType2 = availableRegimentTypes[Math.floor(Math.random() * availableRegimentTypes.length)];
                 while(randType2 === randType && availableRegimentTypes.length > 1) { // Evitar duplicado exacto si hay más opciones
                    randType2 = availableRegimentTypes[Math.floor(Math.random() * availableRegimentTypes.length)];
                 }
                 regimentsForNewDivision.push({ ...REGIMENT_TYPES[randType2], type: randType2 });
            }
        }
        // Calcular coste de la división
        regimentsForNewDivision.forEach(reg => {
            if (reg.cost) {
                for (const res in reg.cost) {
                    divisionCost[res] = (divisionCost[res] || 0) + reg.cost[res];
                }
            }
        });

        // Verificar si la IA puede pagar esta división
        let canAfford = true;
        for (const res in divisionCost) {
            if ((gameState.playerResources[playerNumber][res] || 0) < divisionCost[res]) {
                canAfford = false;
                break;
            }
        }

        if (!canAfford) {
            logMessage(`IA (Jugador ${playerNumber}) no puede permitirse ${divisionName}. Intentando unidad más barata o finalizando despliegue.`);
            // Podría intentar con un regimiento más barato o simplemente parar si no puede con la composición actual.
            // Para simplificar, si no puede, no crea esta unidad y podría intentar otra en la siguiente iteración o parar.
            if (unitsToDeployCount > 1 && i < unitsToDeployCount -1 ) continue; // Si le quedan más por desplegar, intenta otra
            else break; // No puede hacer más o era la última
        }

        // Descontar recursos
        for (const res in divisionCost) {
            gameState.playerResources[playerNumber][res] -= divisionCost[res];
        }
        // No es necesario updatePlayerInfoDisplay() aquí, se hará al final del turno general

        // Crear el objeto de datos de la unidad (similar a handleFinalizeDivision en modalLogic.js)
        let finalAttack = 0, finalDefense = 0, finalHealth = 0;
        let finalMovement = Infinity, finalVision = 0, finalAttackRange = 0, finalInitiative = 0;
        let baseSprite = regimentsForNewDivision.length > 0 ? regimentsForNewDivision[0].sprite : '❓';

        regimentsForNewDivision.forEach(reg => {
            finalAttack += reg.attack; finalDefense += reg.defense; finalHealth += reg.health;
            finalMovement = Math.min(finalMovement, reg.movement);
            finalVision = Math.max(finalVision, reg.visionRange);
            finalAttackRange = Math.max(finalAttackRange, reg.attackRange);
            finalInitiative = Math.max(finalInitiative, reg.initiative || 0); // Asumiendo que queremos la iniciativa más alta
        });
        finalMovement = (finalMovement === Infinity) ? 1 : finalMovement;

        const newUnitData = {
            id: `u${unitIdCounter++}`, player: playerNumber, name: divisionName,
            regiments: regimentsForNewDivision,
            attack: finalAttack, defense: finalDefense, maxHealth: finalHealth, currentHealth: finalHealth,
            movement: finalMovement, currentMovement: finalMovement,
            visionRange: finalVision, attackRange: finalAttackRange, initiative: finalInitiative,
            experience: 0, maxExperience: 500, hasRetaliatedThisTurn: false,
            r: -1, c: -1, sprite: baseSprite, element: null,
            hasMoved: false, hasAttacked: false, // En despliegue, no han actuado
            cost: divisionCost
        };

        // --- Estrategia de Colocación de la IA ---
        // Buscar un hexágono válido.
        // Fácil: Aleatorio en su mitad del mapa o cerca de su capital.
        // Normal/Difícil: Cerca de su capital, en posiciones defensivas o estratégicas.
        let placed = false;
        let placementAttempts = 0;
        const maxPlacementAttempts = 50; // Evitar bucles infinitos

        // Definir zonas de despliegue para la IA (podría venir del escenario o ser genérico)
        let aiDeploymentZones = [];
        if (gameState.isCampaignBattle && gameState.currentScenarioData?.enemySetup?.startHexes) {
            aiDeploymentZones = gameState.currentScenarioData.enemySetup.startHexes;
        } else { // Reglas genéricas para escaramuza
            const numRows = gameState.currentMapData?.rows || BOARD_ROWS;
            const numCols = gameState.currentMapData?.cols || BOARD_COLS;
            if (playerNumber === 1) { // IA es P1 (raro, pero posible)
                for (let r_zone = 0; r_zone < Math.floor(numRows / 3); r_zone++) { for (let c_zone = 0; c_zone < numCols; c_zone++) aiDeploymentZones.push({r: r_zone, c: c_zone}); }
            } else { // IA es P2
                for (let r_zone = numRows - 1; r_zone > numRows - 1 - Math.floor(numRows / 3) ; r_zone--) { for (let c_zone = 0; c_zone < numCols; c_zone++) aiDeploymentZones.push({r: r_zone, c: c_zone}); }
            }
        }


        while (!placed && placementAttempts < maxPlacementAttempts) {
            let r_place, c_place;
            if (aiDeploymentZones.length > 0) {
                // Elegir aleatoriamente de las zonas de despliegue disponibles y vacías
                const availableSpotsInZone = aiDeploymentZones.filter(spot => !getUnitOnHex(spot.r, spot.c));
                if (availableSpotsInZone.length > 0) {
                    const spot = availableSpotsInZone[Math.floor(Math.random() * availableSpotsInZone.length)];
                    r_place = spot.r;
                    c_place = spot.c;
                } else { // No hay spots en la zona, la IA podría no poder colocar
                    break; 
                }
            } else { // Si no hay zonas específicas, usar aleatorio (no ideal pero es un fallback)
                r_place = Math.floor(Math.random() * (gameState.currentMapData?.rows || BOARD_ROWS));
                c_place = Math.floor(Math.random() * (gameState.currentMapData?.cols || BOARD_COLS));
            }

            const hexData = board[r_place]?.[c_place];
            if (hexData && !getUnitOnHex(r_place, c_place) && (hexData.owner === null || hexData.owner === playerNumber)) {
                // placeFinalizedDivision (de unitActions.js) se encarga de actualizar el contador gameState.unitsPlacedByPlayer
                placeFinalizedDivision(newUnitData, r_place, c_place);
                logMessage(`IA (Jugador ${playerNumber}) desplegó ${newUnitData.name} en (${r_place},${c_place}).`);
                placed = true;
                unitsDeployedThisCall++;
            }
            placementAttempts++;
        }
        if (!placed) {
            logMessage(`IA (Jugador ${playerNumber}) no pudo colocar ${newUnitData.name} tras ${maxPlacementAttempts} intentos. Reembolsando...`);
            // Reembolsar si no se pudo colocar
            for (const res in newUnitData.cost) {
                gameState.playerResources[playerNumber][res] += newUnitData.cost[res];
            }
        }
    } // Fin del bucle for unidades a desplegar

    logMessage(`IA (Jugador ${playerNumber}) ha terminado su fase de despliegue.`);
    // Es importante que después del despliegue de la IA, el flujo del juego continúe.
    // Si la IA es el jugador actual, y era su turno de despliegue, debe llamar a handleEndTurn.
    if (gameState.currentPlayer === playerNumber && endTurnBtn && !endTurnBtn.disabled) {
        // Opcional: Pequeño delay antes de que la IA termine su turno de despliegue
        // para que el jugador pueda ver lo que hizo.
        // setTimeout(() => {
        //    if (gameState.currentPhase === "deployment") { // Re-verificar por si acaso
        //        console.log(`IA ${playerNumber} llamando a endTurnBtn.click() desde deployUnitsAI`);
        //        endTurnBtn.click();
        //    }
        // }, 500);
        // Nota: La lógica en handleEndTurn ahora maneja si el siguiente jugador debe desplegar
        // o si se debe pasar a la fase "play".
        // Si la IA ya desplegó su límite, handleEndTurn debería avanzar.
        // Si no, el log de "aún puedes desplegar" no debería aparecer para la IA.
        // Considera que handleEndTurn ya se llamó para llegar aquí.
        // La IA simplemente completa sus acciones DENTRO del turno de despliegue del jugador actual (que es la IA).
        // El jugador humano (si lo hay) o la lógica de handleEndTurn avanzarán el juego.
    }
    // renderFullBoardVisualState(); // Se llamará en updateAllUIDisplays
    // updateAllUIDisplays(); // Se llamará en handleEndTurn
}