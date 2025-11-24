/**
 * js/modules/payment.js
 * 
 * Gerencia a lógica de pagamentos, processamento de vendas, sangrias
 * e outras operações financeiras.
 */

import { showNotification } from './modals.js';
import { getState, setState, resetCart, getCurrentTurnData, getCashBalance } from '../state.js';

// Funções de outros módulos (via window)
// const showNotification = window.showNotification;

// --- Seleção de Pagamento ---

/**
 * Seleciona o método de pagamento (Dinheiro ou Cartão/PIX) e atualiza a UI.
 * @param {string} method - O método de pagamento ('Cash' ou 'Card/PIX').
 * @param {Event} event - O evento de clique do botão.
 */
export function selectPayment(method, event) {
    setState({ paymentMethod: method, receivedAmount: 0 });

    document.querySelectorAll('.payment-btn').forEach(btn => {
        btn.classList.remove('selected', 'card-selected');
    });

    if (event && event.target) {
        event.target.closest('.payment-btn').classList.add('selected');
    }

    const receivedSection = document.getElementById('receivedSection');
    const receivedInput = document.getElementById('receivedInput');
    const changeAmount = document.getElementById('changeAmount');

    receivedInput.value = '';
    changeAmount.style.display = 'none';
    updateCardDisplay(); // Limpa o display de cartão/pix

    if (method === 'Cash') {
        receivedSection.classList.add('show'); // ← ADICIONAR ESTA LINHA
        setState({ paymentMethod: method });
        window.openReceivedKeyboard(); // Abre o teclado
    } else if (method === 'Card/PIX') {
        receivedSection.classList.add('show');
        receivedInput.style.display = 'none';
        if (event && event.target) {
            event.target.closest('.payment-btn').classList.add('card-selected');
        }
        updateCardDisplay(); // Mostra o display de cartão/pix
    }
}

// --- Processamento de Vendas ---

/**
 * Processa a venda atual, valida os dados e registra no histórico.
 */
export function processNext() {
    // Verificar se há turno ativo
    const currentAppState = getState();
    if (!currentAppState.currentTurn || !currentAppState.currentTurn.type) {
        showNotification('⚠️ Nenhum turno ativo. Inicie um turno primeiro!', 'error');
        return;
    }
    const { cart, total, paymentMethod, receivedAmount } = getState();

    if (cart.length === 0) {
        showNotification('Adicione itens ao carrinho', 'warning');
        return;
    }
    if (!paymentMethod) {
        showNotification('Selecione um método de pagamento', 'warning');
        return;
    }

    let changeValue = 0;
    if (paymentMethod === 'Cash') {
        if (receivedAmount < total) {
            showNotification('Valor recebido é insuficiente', 'error');
            return;
        }
        changeValue = receivedAmount - total;
    }

    const sale = {
        type: 'sale',
        time: new Date().toLocaleTimeString('pt-BR'),
        date: new Date().toLocaleDateString('pt-BR'),
        items: [...cart],
        total: total,
        payment: paymentMethod,
        received: paymentMethod === 'Cash' ? receivedAmount : total,
        change: changeValue,
    };

    const currentTurnType = currentAppState.currentTurn.type;
    const turnDataToModify = currentAppState.turnsData[currentTurnType];

    if (turnDataToModify) {
        turnDataToModify.history.push(sale);
        if (paymentMethod === 'Cash') {
            turnDataToModify.totalCash += total;
        } else {
            turnDataToModify.totalCard += total;
        }
        setState({ turnsData: currentAppState.turnsData, lastCreatedSale: sale });

        // Sincronizar venda com Supabase (não bloqueia)
        if (window.syncToSupabase && window.syncToSupabase.venda) {
            window.syncToSupabase.venda(sale).catch(err => {
                console.warn('[Supabase] Erro ao sincronizar venda (continuando offline):', err);
            });
        }
    }

    showNotification('Venda registrada com sucesso! ✓', 'success');
    clearCart();
}

/**
 * Limpa o carrinho e redefine o estado de pagamento.
 */
export function clearCart() {
    resetCart(); // Usa a função do state.js para limpar o estado do carrinho

    document.querySelectorAll('.payment-btn').forEach(btn => {
        btn.classList.remove('selected', 'card-selected');
    });

    updateCardDisplay(); // Remove display de cartão
    document.getElementById('receivedSection').classList.remove('show');
    document.getElementById('receivedInput').value = '';
    document.getElementById('changeAmount').style.display = 'none';

    window.updateCart(); // Atualiza a UI do carrinho
}

// --- Pagamento a Fornecedor ---

/**
 * Submete o formulário de pagamento a fornecedor.
 * @param {Event} e - O evento de submit do formulário.
 */
export function submitPayment(e) {
    e.preventDefault();
    // Verificar se há turno ativo
    const currentAppState = getState();
    if (!currentAppState.currentTurn || !currentAppState.currentTurn.type) {
        showNotification('⚠️ Nenhum turno ativo. Inicie um turno primeiro!', 'error');
        return;
    }
    const { currentPaymentType, mixedCashAmount, mixedExternalAmount } = getState();

    const supplierName = document.getElementById('supplierName').value;
    const paymentValueStr = document.getElementById('paymentValue').value;
    if (!paymentValueStr || !currentPaymentType) {
        showNotification('Preencha o valor e a forma de pagamento', 'warning');
        return;
    }

    const paymentValue = parseFloat(paymentValueStr.replace('R$ ', '').replace(',', '.'));
    const cashBalance = getCashBalance();
    let fromCashAmount = 0;
    let externalAmount = 0;

    if (currentPaymentType === 'cash') {
        fromCashAmount = paymentValue;
        if (paymentValue > cashBalance) {
            showNotification(`Saldo insuficiente! Saldo: R$ ${cashBalance.toFixed(2)}`, 'error');
            return;
        }
    } else if (currentPaymentType === 'external') {
        externalAmount = paymentValue;
    } else if (currentPaymentType === 'mixed') {
        fromCashAmount = mixedCashAmount;
        externalAmount = mixedExternalAmount;
        const totalMixed = fromCashAmount + externalAmount;
        if (Math.abs(totalMixed - paymentValue) > 0.01) {
            showNotification('A soma dos valores não corresponde ao total', 'error');
            return;
        }
        if (fromCashAmount > cashBalance) {
            showNotification(`Saldo em caixa insuficiente! Saldo: R$ ${cashBalance.toFixed(2)}`, 'error');
            return;
        }
    }

    const payment = {
        type: 'payment',
        time: new Date().toLocaleTimeString('pt-BR'),
        date: new Date().toLocaleDateString('pt-BR'),
        supplier: supplierName || 'Não informado',
        value: paymentValue,
        fromCashAmount,
        externalAmount,
        paymentType: currentPaymentType,
    };

    const currentTurnType = currentAppState.currentTurn.type;
    const turnDataToModify = currentAppState.turnsData[currentTurnType];

    if (turnDataToModify) {
        turnDataToModify.history.push(payment);
        if (fromCashAmount > 0) turnDataToModify.totalPaymentsCash += fromCashAmount;
        if (externalAmount > 0) turnDataToModify.totalPaymentsExternal += externalAmount;
        setState({ turnsData: currentAppState.turnsData, lastCreatedPayment: payment });

        // Sincronizar pagamento com Supabase (não bloqueia)
        if (window.syncToSupabase && window.syncToSupabase.pagamentoFornecedor) {
            window.syncToSupabase.pagamentoFornecedor(payment).catch(err => {
                console.warn('[Supabase] Erro ao sincronizar pagamento (continuando offline):', err);
            });
        }
    }

    showNotification('Pagamento registrado com sucesso! ✓', 'success');
    window.closePaymentModal(); // FECHA O MODAL
}

/**
 * Seleciona o tipo de pagamento para fornecedor (do caixa, externo ou misto).
 * @param {string} type - O tipo de pagamento ('cash', 'external', 'mixed').
 */
export function selectPaymentType(type) {
    setState({ currentPaymentType: type, mixedCashAmount: 0, mixedExternalAmount: 0 });

    document.getElementById('paymentTypeCash').checked = (type === 'cash');
    document.getElementById('paymentTypeExternal').checked = (type === 'external');
    document.getElementById('paymentTypeMixed').checked = (type === 'mixed');

    document.getElementById('mixedPaymentSection').style.display = (type === 'mixed') ? 'block' : 'none';
    document.getElementById('cashBalanceInfo').style.display = (type === 'cash' || type === 'mixed') ? 'block' : 'none';

    if (type === 'mixed') {
        updateMixedTotal();
    }
}

/**
 * Atualiza o total exibido no modal de pagamento misto.
 */
export function updateMixedTotal() {
    const { mixedCashAmount, mixedExternalAmount } = getState();
    const total = (mixedCashAmount || 0) + (mixedExternalAmount || 0);
    document.getElementById('mixedTotal').textContent = 'R$ ' + total.toFixed(2).replace('.', ',');

    const paymentValueStr = document.getElementById('paymentValue').value;
    if (paymentValueStr) {
        const expectedTotal = parseFloat(paymentValueStr.replace('R$ ', '').replace(',', '.'));
        const warningDiv = document.getElementById('mixedWarning');
        warningDiv.style.display = Math.abs(total - expectedTotal) > 0.01 ? 'block' : 'none';
    }
}

// --- Sangria ---

/**
 * Submete o formulário de sangria (retirada de caixa).
 * @param {Event} e - O evento de submit do formulário.
 */
export function submitWithdrawal(e) {
    e.preventDefault();
    // Verificar se há turno ativo
    const currentAppState = getState();
    if (!currentAppState.currentTurn || !currentAppState.currentTurn.type) {
        showNotification('⚠️ Nenhum turno ativo. Inicie um turno primeiro!', 'error');
        return;
    }
    const withdrawalValueStr = document.getElementById('withdrawalValue').value;
    if (!withdrawalValueStr) {
        showNotification('Informe o valor da sangria', 'warning');
        return;
    }

    const withdrawalValue = parseFloat(withdrawalValueStr.replace('R$ ', '').replace(',', '.'));
    const cashBalance = getCashBalance();
    if (withdrawalValue <= 0 || withdrawalValue > cashBalance) {
        showNotification(`Valor inválido ou insuficiente! Saldo: R$ ${cashBalance.toFixed(2)}`, 'error');
        return;
    }

    const withdrawal = {
        type: 'withdrawal',
        time: new Date().toLocaleTimeString('pt-BR'),
        date: new Date().toLocaleDateString('pt-BR'),
        value: withdrawalValue,
        reason: document.getElementById('withdrawalReason').value || 'Não informado',
    };

    const currentTurnType = currentAppState.currentTurn.type;
    const turnDataToModify = currentAppState.turnsData[currentTurnType];

    if (turnDataToModify) {
        turnDataToModify.history.push(withdrawal);
        turnDataToModify.totalWithdrawals += withdrawalValue;
        setState({ turnsData: currentAppState.turnsData, lastCreatedWithdrawal: withdrawal });

        // Sincronizar sangria com Supabase (não bloqueia)
        if (window.syncToSupabase && window.syncToSupabase.sangria) {
            window.syncToSupabase.sangria(withdrawal).catch(err => {
                console.warn('[Supabase] Erro ao sincronizar sangria (continuando offline):', err);
            });
        }
    }

    showNotification('Sangria registrada com sucesso! ✓', 'success');
    window.closeWithdrawalModal(); // FECHA O MODAL
}

// --- Utilitários ---

/**
 * Calcula e exibe o troco para pagamentos em dinheiro.
 */
export function calculateChange() {
    const { total, receivedAmount } = getState();
    console.log('calculateChange - total:', total, 'receivedAmount:', receivedAmount);
    
    const receivedInput = document.getElementById('receivedInput');
    const changeDiv = document.getElementById('changeAmount');

    // Atualiza o campo de valor recebido (caso ainda não esteja atualizado)
    if (receivedAmount > 0) {
        receivedInput.value = 'R$ ' + receivedAmount.toFixed(2).replace('.', ',');
        
        // Calcula e exibe o troco
        const change = receivedAmount - total;
        if (change >= 0) {
            changeDiv.textContent = 'Troco: R$ ' + change.toFixed(2).replace('.', ',');
            changeDiv.style.color = '#28a745';
            changeDiv.style.display = 'block';
        } else {
            changeDiv.textContent = 'Valor insuficiente! Faltam R$ ' + Math.abs(change).toFixed(2).replace('.', ',');
            changeDiv.style.color = '#E53935';
            changeDiv.style.display = 'block';
        }
    } else {
        receivedInput.value = '';
        changeDiv.style.display = 'none';
    }
}

/**
 * Atualiza a exibição do valor total para pagamentos com Cartão/PIX.
 */
export function updateCardDisplay() {
    const { paymentMethod, total } = getState();
    const receivedSection = document.getElementById('receivedSection');
    let cardDisplay = receivedSection.querySelector('.card-total-display');

    if (cardDisplay) {
        cardDisplay.remove();
    }

    if (paymentMethod === 'Card/PIX') {
        cardDisplay = document.createElement('div');
        cardDisplay.className = 'card-total-display';
        cardDisplay.textContent = 'Total: R$ ' + total.toFixed(2).replace('.', ',');
        receivedSection.appendChild(cardDisplay);
    }
}
