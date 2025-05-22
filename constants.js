// constants.js

const BOARD_ROWS = 12;
const BOARD_COLS = 15;
const HEX_WIDTH = 50;
const HEX_HEIGHT = 57.73; // HEX_WIDTH * sqrt(3) / 2 * 2 (simplificado a HEX_WIDTH * 1.1547)
const HEX_VERT_SPACING = HEX_HEIGHT * 0.75;

const REGIMENT_TYPES = {
    "Infantería Ligera": { cost: { oro: 10 }, attack: 2, defense: 3, health: 10, movement: 2, sprite: '🚶', visionRange: 2, attackRange: 1, initiative: 10 },
    "Infantería Pesada": { cost: { oro: 15 }, attack: 3, defense: 5, health: 15, movement: 1, sprite: '🛡️', visionRange: 1, attackRange: 1, initiative: 5 },
    "Caballería Ligera": { cost: { oro: 20 }, attack: 4, defense: 2, health: 8, movement: 4, sprite: '🐎', visionRange: 3, attackRange: 1, initiative: 15 },
    "Caballería Pesada": { cost: { oro: 30 }, attack: 5, defense: 5, health: 16, movement: 3, /* Ajuste sugerido */ sprite: '🐴', /* Caballo más grande + escudo */ visionRange: 2, /* Un poco menos que ligera */ attackRange: 1, initiative: 12 },
    "Arqueros":         { cost: { oro: 18 }, attack: 3, defense: 1, health: 7, movement: 2, sprite: '🏹', visionRange: 2, attackRange: 2, initiative: 8 },
    "Arcabuceros":      { cost: { oro: 24 }, attack: 5, defense: 2, health: 8, movement: 1, sprite: '💂', /* Persona + Fuego */ visionRange: 2, attackRange: 2, initiative: 7 }, /* Más lentos que arqueros, iniciativa menor */
    "Arqueros a Caballo":{ cost: { oro: 36 }, attack: 3, defense: 3, health: 12, /* Ajuste sugerido */ movement: 4, sprite: '🏇', visionRange: 3, attackRange: 2, initiative: 16 },
    "Artillería":       { cost: { oro: 50 }, attack: 8, defense: 1, health: 5, movement: 1, sprite: '💣', visionRange: 1, attackRange: 3, initiative: 2 }
};

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
    'oro_mina': { sprite: '💰', income: 2, name: 'Oro' } // Mina de oro, distinto de oro por ciudad
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

const REINFORCE_COST_PER_HP_PERCENT = 0.1