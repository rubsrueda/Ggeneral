// state.js
// Contiene las variables globales que definen el estado del juego.

let gameState = {};
// ... (tus variables existentes: board, units, selectedUnit, etc.) ...
let board = []; // Representación lógica del tablero (array de arrays de hexágonos)
let units = []; // Array de todas las unidades en el juego
let selectedUnit = null; // Referencia a la unidad actualmente seleccionada por el jugador
let unitIdCounter = 0; // Para generar IDs únicos para las unidades

// Modo de colocación de unidades (usado en la fase de despliegue)
let placementMode = {
    active: false,
    unitData: null, // Objeto de datos de la unidad a colocar (pre-configurado)
    unitType: null  // Tipo de unidad si se crea desde cero (ej. 'INFANTRY_LIGHT')
};

const GAME_DATA_REGISTRY = {
    scenarios: {},
    maps: {} 
};

console.log('GAME_DATA_REGISTRY definido:', typeof GAME_DATA_REGISTRY, GAME_DATA_REGISTRY); // Log para confirmar

// Función original para escaramuzas
function resetGameStateVariables() {
    console.log("state.js: Ejecutando resetGameStateVariables()...");

    gameState = {
        currentPlayer: 1,
        currentPhase: "setup", // "setup", "deployment", "play", "gameOver"
        turnNumber: 1,

        playerTypes: { // Tipos de jugador (human, ai_easy, ai_normal, ai_hard)
            player1: 'human',
            player2: 'ai_normal'
        },
        playerAiLevels: { // Niveles de IA si el jugador es IA
            // player1: 'normal', // Solo si player1 es IA
            player2: 'normal'
        },
        playerResources: { // Recursos iniciales o actuales por jugador
            1: { oro: 100, hierro: 0, piedra: 0, madera: 0, comida: 20 }, // Ejemplo para Jugador 1
            2: { oro: 100, hierro: 0, piedra: 0, madera: 0, comida: 20 }  // Ejemplo para Jugador 2
        },
        
        deploymentUnitLimit: 3, // Límite de unidades a desplegar por jugador
        unitsPlacedByPlayer: { 1: 0, 2: 0 }, // Contador de unidades desplegadas

        isCampaignBattle: false,
        currentCampaignId: null,
        currentCampaignTerritoryId: null,
        currentScenarioId: null, // ID del escenario actual (de campaignManager o skirmish)
        currentMapId: null,      // ID del mapa táctico actual

        // Variables que podrían ser parte de un escenario cargado
        currentScenarioData: null, // Objeto completo del escenario cargado
        currentMapData: null,      // Objeto completo del mapa táctico cargado

        cities: [], // Array de objetos ciudad en el mapa actual
        
        // Para la lógica de paneo
        justPanned: false,

        // Puedes añadir más propiedades según las necesidades de tu juego
        // Por ejemplo, tecnologías investigadas, etc.
        // researchedTechnologies: { 1: [], 2: [] },
    };

    // Resetear otras variables globales si es necesario
    board = [];
    units = [];
    selectedUnit = null;
    unitIdCounter = 0; // O podrías querer que persista entre algunas cosas
    placementMode = { active: false, unitData: null, unitType: null };

    console.log("state.js: gameState reseteado:", JSON.parse(JSON.stringify(gameState))); // Usar stringify para una copia profunda en el log
}


// Nueva función para configurar el estado para una batalla de campaña
// async function resetAndSetupTacticalGame(scenarioData, mapTacticalData) { // Versión anterior
async function resetAndSetupTacticalGame(scenarioData, mapTacticalData, campaignTerritoryId) { // <<<< AÑADIR campaignTerritoryId
    console.log("Resetting and setting up tactical game for scenario:", scenarioData.scenarioId, "on campaign territory:", campaignTerritoryId);
    gameState = {
        currentPhase: "deployment",
        playerTypes: {
            player1: "human",
            player2: scenarioData.enemySetup.aiProfile || "ai_simple"
        },
        currentPlayer: 1,
        turnNumber: 1,
        playerResources: [
            {},
            JSON.parse(JSON.stringify(scenarioData.playerSetup.initialResources || INITIAL_PLAYER_RESOURCES[0])),
            JSON.parse(JSON.stringify(scenarioData.enemySetup.initialResources || INITIAL_PLAYER_RESOURCES[1]))
        ],
        cities: [],
        isCampaignBattle: true,
        currentScenarioData: scenarioData,
        currentMapData: mapTacticalData,
        currentCampaignTerritoryId: campaignTerritoryId, // <<<< ALMACENAR EL ID DEL TERRITORIO
    };

    await initializeGameBoardForScenario(mapTacticalData, scenarioData);
    

    board = [];
    units = [];
    selectedUnit = null;
    unitIdCounter = 0;
    placementMode = { active: false, unitData: null };
    currentDivisionBuilder = [];
    hexToBuildOn = null;
    selectedStructureToBuild = null;

    // La llamada a initializeGameBoardForScenario ya no necesita ser await si la función es síncrona
    initializeGameBoardForScenario(mapTacticalData, scenarioData); // Esta es la función en boardManager.js

    updateAllUIDisplays();
    if (gameState.currentPhase === "deployment") {
        populateAvailableRegimentsForModal();
        logMessage(`Despliegue para ${scenarioData.displayName}. Jugador 1, coloca tus fuerzas.`);
    } else {
        logMessage(`¡Comienza la batalla por ${scenarioData.displayName}!`);
    }
}