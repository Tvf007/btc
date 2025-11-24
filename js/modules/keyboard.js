/**
 * js/modules/keyboard.js
 * 
 * Manages all the logic for the virtual keyboard, including opening/closing,
 * handling input, and confirming values for different contexts.
 */

// --- State (gerenciado internamente no módulo) ---
let currentInput = '0';
let keyboardContext = {}; // Ex: { type: 'quantity', itemIndex: 0 }

import { showNotification } from './modals.js';
import { getState, setState } from '../state.js';

// --- Helper Functions (importadas via window) ---
// const showNotification = window.showNotification;

// --- Control Functions ---

/**
 * Opens the main virtual keyboard with a specific context.
 * @param {string} type - The context type (e.g., 'quantity', 'others', 'received').
 * @param {object} [options={}] - Additional data for the context (e.g., { itemIndex: 1 }).
 */
export function openKeyboard(type, options = {}) {
    keyboardContext = { type, ...options };
    currentInput = '0';
    
    const { cart } = getState();
    const display = document.getElementById('keyboardDisplay');
    const title = document.getElementById('keyboardTitle');

    switch (type) {
        case 'quantity':
            const item = cart[keyboardContext.itemIndex];
            title.textContent = `Quantidade de ${item.name}`;
            display.textContent = currentInput;
            break;
        case 'otherPrice': // CONTEXTO NOVO
            const itemToEdit = cart[keyboardContext.itemIndex];
            title.textContent = `Novo preço de "${itemToEdit.name}"`;
            display.textContent = `R$ ${currentInput}`;
            break;
        case 'others':
            title.textContent = 'Valor de "Outros"';
            display.textContent = `R$ ${currentInput}`;
            break;
        case 'received':
            title.textContent = 'Valor Recebido';
            display.textContent = `R$ ${currentInput}`;
            break;
        case 'payment':
            title.textContent = 'Valor do Pagamento';
            display.textContent = `R$ ${currentInput}`;
            break;
        case 'withdrawal':
            title.textContent = 'Valor da Sangria';
            display.textContent = `R$ ${currentInput}`;
            break;
        case 'mixedCash':
            title.textContent = 'Valor do Caixa (Misto)';
            display.textContent = `R$ ${currentInput}`;
            break;
        case 'mixedExternal':
            title.textContent = 'Valor Externo (Misto)';
            display.textContent = `R$ ${currentInput}`;
            break;
    }

    document.getElementById('virtualKeyboard').classList.add('show');
    document.body.style.overflow = 'hidden';
}

/**
 * Closes the virtual keyboard and resets its state.
 */
export function closeKeyboard() {
    document.getElementById('virtualKeyboard').classList.remove('show');
    document.body.style.overflow = '';
    currentInput = '0';
    keyboardContext = {};
}

/**
 * Confirms the value entered in the keyboard and applies it based on the context.
 */
export function confirmKeyboard() {
    const valueStr = currentInput.replace(',', '.');
    const valueNum = parseFloat(valueStr);
    const valueInt = parseInt(valueStr);

    if (isNaN(valueNum)) {
        showNotification('Insira um valor válido', 'error');
        return;
    }

    switch (keyboardContext.type) {
        case 'quantity':
            if (valueInt > 999) {
                showNotification('Quantidade máxima: 999', 'warning');
                return;
            }
            window.editItemQuantity(keyboardContext.itemIndex, valueInt);
            break;

        case 'otherPrice': // NOVO CASE
            if (valueNum <= 0) {
                showNotification('O preço deve ser maior que zero.', 'warning');
                return;
            }
            {
                const { cart } = getState();
                const newCart = [...cart];
                const item = newCart[keyboardContext.itemIndex];
                item.price = valueNum;
                item.total = item.price * item.quantity; // quantity é sempre 1

                setState({ cart: newCart });
                window.updateCart();
            }
            break;

        case 'others': // Antigo, agora é para adicionar novo item 'Outros'
            if (valueNum <= 0) {
                showNotification('Valor de "Outros" deve ser positivo', 'warning');
                return;
            }
            window.addProduct('Outros', valueNum);
            break;

        case 'received':
            setState({ receivedAmount: valueNum });
            document.getElementById('receivedInput').value = 'R$ ' + valueNum.toFixed(2).replace('.', ',');
            window.calculateChange();
            break;

        case 'payment':
            document.getElementById('paymentValue').value = 'R$ ' + valueNum.toFixed(2).replace('.', ',');
            if (getState().currentPaymentType === 'mixed') {
                window.updateMixedTotal();
            }
            break;

        case 'withdrawal':
            document.getElementById('withdrawalValue').value = 'R$ ' + valueNum.toFixed(2).replace('.', ',');
            break;

        case 'mixedCash':
            setState({ mixedCashAmount: valueNum });
            document.getElementById('mixedCashValue').value = 'R$ ' + valueNum.toFixed(2).replace('.', ',');
            window.updateMixedTotal();
            break;

        case 'mixedExternal':
            setState({ mixedExternalAmount: valueNum });
            document.getElementById('mixedExternalValue').value = 'R$ ' + valueNum.toFixed(2).replace('.', ',');
            window.updateMixedTotal();
            break;
    }

    closeKeyboard();
}


// --- Input Handling ---

/**
 * Appends a digit to the keyboard's current value.
 * @param {string} digit - The digit to add.
 */
export function inputDigit(digit) {
    if (currentInput === '0') {
        currentInput = digit;
    } else {
        if (currentInput.replace(/[,.]/, '').length >= 6) return;
        currentInput += digit;
    }
    updateKeyboardDisplay();
}

/**
 * Appends a comma to the keyboard's current value if one doesn't already exist.
 */
export function inputComma() {
    if (!currentInput.includes(',')) {
        currentInput += ',';
    }
    updateKeyboardDisplay();
}

/**
 * Removes the last character from the keyboard's value.
 */
export function backspace() {
    if (currentInput.length > 1) {
        currentInput = currentInput.slice(0, -1);
    } else {
        currentInput = '0';
    }
    updateKeyboardDisplay();
}

/**
 * Updates the keyboard's display with the current value.
 */
export function updateKeyboardDisplay() {
    const display = document.getElementById('keyboardDisplay');
    const type = keyboardContext.type;

    if (type === 'quantity') {
        display.textContent = currentInput;
    } else if (['others', 'received', 'payment', 'withdrawal', 'mixedCash', 'mixedExternal', 'otherPrice'].includes(type)) {
        display.textContent = 'R$ ' + currentInput;
    } else {
        display.textContent = currentInput;
    }
}


// --- Specific Keyboard Openers (Legacy Support) ---
// These now map to the new context-based openKeyboard function.

export function openReceivedKeyboard() {
    const { paymentMethod } = getState();
    if (!paymentMethod) {
        showNotification('Selecione um método de pagamento primeiro', 'warning');
        return;
    }
    if (paymentMethod !== 'Cash') {
        showNotification('Campo disponível apenas para pagamento em dinheiro', 'warning');
        return;
    }
    openKeyboard('received');
}

export function openPaymentKeyboard() {
    openKeyboard('payment');
}

export function openWithdrawalKeyboard() {
    openKeyboard('withdrawal');
}

export function openMixedCashKeyboard() {
    openKeyboard('mixedCash');
}

export function openMixedExternalKeyboard() {
    openKeyboard('mixedExternal');
}
