// constants.js

const BOARD_ROWS = 12;
const BOARD_COLS = 15;
const BOARD_SIZES = {
    'small': { rows: 12, cols: 15 },
    'medium': { rows: 18, cols: 25 },
    'large': { rows: 24, cols: 35 }
};

const HEX_WIDTH = 50;
const HEX_HEIGHT = 57.73; // HEX_WIDTH * sqrt(3) / 2 * 2 (simplificado a HEX_WIDTH * 1.1547)
const HEX_VERT_SPACING = HEX_HEIGHT * 0.75;

const XP_LEVELS = [
    { currentLevelName: "Recluta", nextLevelXp: 0, attackBonus: 0, defenseBonus: 0 },
    { currentLevelName: "Regular", nextLevelXp: 50, attackBonus: 1, defenseBonus: 0 },
    { currentLevelName: "Veterano", nextLevelXp: 200, attackBonus: 1, defenseBonus: 1 },
    { currentLevelName: "Élite", nextLevelXp: 400, attackBonus: 2, defenseBonus: 1 },
    { currentLevelName: "Héroe", nextLevelXp: 'Max', attackBonus: 2, defenseBonus: 2 } // 'Max' no hay más niveles
];

const REGIMENT_TYPES = {
    "Infantería Ligera": { cost: { oro: 10 }, attack: 2, defense: 3, health: 10, movement: 2, sprite: '🚶', visionRange: 2, attackRange: 1, initiative: 10 , goldValueOnDestroy: 7, foodConsumption: 1},
    "Infantería Pesada": { cost: { oro: 15 }, attack: 3, defense: 5, health: 15, movement: 1, sprite: '🛡️', visionRange: 1, attackRange: 1, initiative: 5 , goldValueOnDestroy: 11, foodConsumption: 1},
    "Caballería Ligera": { cost: { oro: 20 }, attack: 4, defense: 2, health: 8, movement: 4, sprite: '🐎', visionRange: 3, attackRange: 1, initiative: 15 , goldValueOnDestroy: 14, foodConsumption: 2},
    "Caballería Pesada": { cost: { oro: 30 }, attack: 5, defense: 5, health: 16, movement: 3, sprite: '🐴', visionRange: 2, attackRange: 1, initiative: 12 , goldValueOnDestroy: 20, foodConsumption: 2},
    "Arqueros":         { cost: { oro: 18 }, attack: 3, defense: 1, health: 7, movement: 2, sprite: '🏹', visionRange: 2, attackRange: 2, initiative: 8 , goldValueOnDestroy: 12, foodConsumption: 1},
    "Arcabuceros":      { cost: { oro: 24 }, attack: 5, defense: 2, health: 8, movement: 1, sprite: '💂', isionRange: 2, attackRange: 2, initiative: 7 , goldValueOnDestroy: 18, foodConsumption: 1}, 
    "Arqueros a Caballo":{ cost: { oro: 36 }, attack: 3, defense: 3, health: 12, /* Ajuste sugerido */ movement: 4, sprite: '🏇', visionRange: 3, attackRange: 2, initiative: 16 , goldValueOnDestroy: 24, foodConsumption: 1},
    "Artillería":       { cost: { oro: 50 }, attack: 8, defense: 1, health: 5, movement: 1, sprite: '💣', visionRange: 1, attackRange: 3, initiative: 2 , goldValueOnDestroy: 40, foodConsumption: 2}
};

const SKIRMISH_VICTORY_GOLD_BONUS = 10;

const MAX_REGIMENTS_PER_DIVISION = 9

const STRUCTURE_TYPES = {
    "Camino": { cost: { piedra: 5, madera: 5 }, sprite: '🟰', defenseBonus: 0, movementBonus: 1, buildableOn: ['plains', 'hills'], upkeep: {} },
    "Fortaleza": { cost: { piedra: 50, hierro: 20, oro: 30 }, sprite: '🏰', defenseBonus: 3, allowsRecruitment: true, integrity: 100, upkeep: { comida: 2, oro: 1 }, buildableOn: ['plains', 'hills', 'city'] }
};

const UPGRADE_TO_CITY_COST = { oro: 150, piedra: 50, madera: 50, comida: 20 };

const RESOURCE_NODES_DATA = { // Información sobre tipos de nodos de recursos
    'hierro': { sprite: '⛏️', income: 3, name: 'Hierro' },
    'madera': { sprite: '🌲', income: 5, name: 'Madera' },
    'piedra': { sprite: '⛰️', income: 4, name: 'Piedra' },
    'comida': { sprite: '🌾', income: 5, name: 'Comida' },
    'oro_mina': { sprite: '💰', income: 2, name: 'Oro' }, // Mina de oro, distinto de oro por ciudad
    'Puerto': {sprite: "⚓", income: 2, name: 'Oro',  buildableOn: ["coast"]}
};

const INITIAL_PLAYER_RESOURCES = [ // Para Jugador 1 y Jugador 2
    { oro: 200, hierro: 50, piedra: 150, madera: 100, comida: 50 },
    { oro: 250, hierro: 50, piedra: 100, madera: 100, comida: 50 }
];

const RESOURCE_MULTIPLIERS = {
    BASE: 1,      // Para nodos de recurso sin estructura especial
    CAMINO: 2,    // Multiplicador si el nodo tiene un camino
    FORTALEZA: 4, // Multiplicador si el nodo tiene una fortaleza (y no es ciudad)
    CIUDAD: 8     // Multiplicador si el nodo está en una ciudad
};

const TERRAIN_TYPES = {
    plains: { name: "Llanuras", defenseBonus: 0 },
    forest: { name: "Bosque", defenseBonus: 1 },
    hills: { name: "Colinas", defenseBonus: 1 },
    // ... y cualquier otro terreno que uses ...
};

const AI_RESOURCE_PRIORITY = {
    'oro': 100,       // Máxima prioridad
    'comida': 80,     // Alta prioridad
    'hierro': 30,     // Media prioridad
    'piedra': 20,     // Baja prioridad
    'madera': 10      // Menor prioridad
};

const REINFORCE_COST_PER_HP_PERCENT = 1.1

const ATTRITION_DAMAGE_PER_TURN = 1; // Salud o efectivos que se pierden por atrición
const ATTRITION_FOOD_SHORTAGE_THRESHOLD = 0; // Si la comida llega a este valor, se aplica atrición a unidades no suministradas
