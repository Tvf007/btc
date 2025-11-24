// js/state.js

/**
 * The initial structure for a single turn's data.
 * @returns {{totalCash: number, totalCard: number, totalPaymentsCash: number, totalPaymentsExternal: number, totalWithdrawals: number, history: Array}}
 */
const getInitialTurnData = () => ({
    totalCash: 0,
    totalCard: 0,
    totalPaymentsCash: 0,
    totalPaymentsExternal: 0,
    totalWithdrawals: 0,
    history: [],
});

/**
 * The centralized state of the application.
 * Exported to be accessible by other modules.
 */
export const appState = { // Changed to export const
    cart: [],
    total: 0,
    paymentMethod: '',
    receivedAmount: 0,
    currentTurn: null, // e.g., { type: 'morning', name: '☀️ Turno da Manhã', startTime: '...' }
    turnsData: {
        morning: getInitialTurnData(),
        afternoon: getInitialTurnData(),
    },
};

/**
 * Returns a deep copy of the current application state.
 * @returns {object} A copy of the appState.
 */
export function getState() {
    return JSON.parse(JSON.stringify(appState));
}

/**
 * Updates the application state by merging the provided updates.
 * @param {object} updates - An object containing the state properties to update.
 */
export function setState(updates) {
    Object.assign(appState, updates); // Use Object.assign to merge updates into the existing appState object
}

/**
 * Resets the cart and payment-related state to their initial values.
 * Exported as resetCart.
 */
export function resetCart() {
    const currentTurn = appState.currentTurn; // Preservar turno
    appState.cart = [];
    appState.total = 0;
    appState.paymentMethod = '';
    appState.receivedAmount = 0;
    appState.currentTurn = currentTurn; // <-- PRESERVAR
}

/**
 * Gets the data object for the currently active turn.
 * @returns {object|null} The data for the current turn, or null if no turn is active.
 */
export function getCurrentTurnData() {
    if (!appState.currentTurn || !appState.turnsData[appState.currentTurn.type]) {
        return null;
    }
    return appState.turnsData[appState.currentTurn.type];
}

/**
 * Calculates the current cash balance for the active turn.
 * @returns {number} The calculated cash balance.
 */
export function getCashBalance() {
    const turnData = getCurrentTurnData();
    if (!turnData) {
        return 0;
    }
    return turnData.totalCash - turnData.totalPaymentsCash - turnData.totalWithdrawals;
}

/**
 * Initializes the state with default values.
 * Exported to be called during application startup.
 */
export function initializeState() {
    appState.cart = [];
    appState.total = 0;
    appState.paymentMethod = '';
    appState.receivedAmount = 0;
    appState.currentTurn = null;
    appState.turnsData = {
        morning: getInitialTurnData(),
        afternoon: getInitialTurnData(),
    };
}

// Assuming resetCartState is a typo for resetCart,
// and resetCart is already exported above.
// If it's a distinct function, it needs to be defined.
// For now, I will assume it's a typo and ensure resetCart is exported.
// If the user meant a different function, they will clarify.