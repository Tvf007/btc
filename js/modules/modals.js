/**
 * js/modules/modals.js
 * 
 * Controla a exibição e o comportamento de todos os modais da aplicação,
 * como pagamentos, sangrias, histórico e notificações.
 */

import { getCurrentTurnData, getCashBalance } from '../state.js';
import { SHEET_URL } from '../config.js';

// Funções de outros módulos (temporariamente via window)
const printReceipt = window.printReceipt;
// const SHEET_URL = window.SHEET_URL; // Assumindo que estará no state/config

// --- Controle Genérico de Modal ---

/**
 * Abre um modal e trava o scroll do body.
 * @param {string} modalId - O ID do elemento do modal.
 */
function openModal(modalId) {
    document.getElementById(modalId).classList.add('show');
    document.body.style.overflow = 'hidden';
}

/**
 * Fecha um modal e restaura o scroll do body.
 * @param {string} modalId - O ID do elemento do modal.
 */
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
    document.body.style.overflow = '';
}

// --- Modal de Pagamento a Fornecedor ---

/**
 * Abre e inicializa o modal de pagamento a fornecedor.
 */
export function openPaymentModal() {
    openModal('paymentModal');
    document.getElementById('supplierName').value = '';
    document.getElementById('paymentValue').value = '';
    document.getElementById('paymentTypeCash').checked = false;
    document.getElementById('paymentTypeExternal').checked = false;
    document.getElementById('paymentTypeMixed').checked = false;
    document.getElementById('mixedPaymentSection').style.display = 'none';
    document.getElementById('cashBalanceInfo').style.display = 'none';
    document.getElementById('mixedCashValue').value = '';
    document.getElementById('mixedExternalValue').value = '';
    document.getElementById('mixedTotal').textContent = 'R$ 0,00';
    document.getElementById('mixedWarning').style.display = 'none';
    window.currentPaymentType = '';
    window.mixedCashAmount = 0;
    window.mixedExternalAmount = 0;

    const cashBalance = getCashBalance();
    document.getElementById('currentCashBalance').textContent = 'R$ ' + cashBalance.toFixed(2).replace('.', ',');
}

/**
 * Fecha o modal de pagamento a fornecedor.
 */
export function closePaymentModal() {
    closeModal('paymentModal');
}

// --- Modal de Sangria ---

/**
 * Abre e inicializa o modal de sangria.
 */
export function openWithdrawalModal() {
    openModal('withdrawalModal');
    document.getElementById('withdrawalValue').value = '';
    document.getElementById('withdrawalReason').value = '';
}

/**
 * Fecha o modal de sangria.
 */
export function closeWithdrawalModal() {
    closeModal('withdrawalModal');
}

// --- Modal de Histórico ---

/**
 * Abre o modal de histórico e atualiza seu conteúdo.
 */
export function openHistoryModal() {
    openModal('historyModal');
    updateHistoryDisplay();
}

/**
 * Fecha o modal de histórico.
 */
export function closeHistoryModal() {
    closeModal('historyModal');
}

/**
 * Atualiza a exibição dos dados no modal de histórico do turno.
 */
export function updateHistoryDisplay() {
    const turnData = getCurrentTurnData();
    if (!turnData) return;

    document.getElementById('historyCash').textContent = 'R$ ' + turnData.totalCash.toFixed(2).replace('.', ',');
    document.getElementById('historyCard').textContent = 'R$ ' + turnData.totalCard.toFixed(2).replace('.', ',');
    document.getElementById('historyPaymentsCash').textContent = 'R$ ' + turnData.totalPaymentsCash.toFixed(2).replace('.', ',');
    document.getElementById('historyPaymentsExternal').textContent = 'R$ ' + turnData.totalPaymentsExternal.toFixed(2).replace('.', ',');
    document.getElementById('historyWithdrawals').textContent = 'R$ ' + turnData.totalWithdrawals.toFixed(2).replace('.', ',');

    const totalSales = turnData.totalCash + turnData.totalCard;
    document.getElementById('historyTotal').textContent = 'R$ ' + totalSales.toFixed(2).replace('.', ',');

    const cashBalance = getCashBalance();
    document.getElementById('historyCashBalance').textContent = 'R$ ' + cashBalance.toFixed(2).replace('.', ',');

    const historyList = document.getElementById('historyList');
    if (turnData.history.length === 0) {
        historyList.innerHTML = '<div class="empty-cart"><i class="fas fa-history"></i><p>Nenhuma movimentação registrada</p></div>';
        return;
    }

    let html = '';
    // Itera do mais recente para o mais antigo
    for (let i = turnData.history.length - 1; i >= 0; i--) {
        const item = turnData.history[i];
        
        if (item.type === 'sale') {
            html += '<div class="history-card cash">';
            html += '<div class="history-header">';
            html += '<span class="history-time"><i class="fas fa-clock"></i> ' + item.time + '</span>';
            html += '<span class="history-payment ' + (item.payment === 'Cash' ? 'cash' : 'card') + '">';
            html += '<i class="fas fa-' + (item.payment === 'Cash' ? 'money-bill-wave' : 'credit-card') + '"></i> ';
            html += (item.payment === 'Cash' ? 'Dinheiro' : 'Cartão/PIX');
            html += '</span></div>';
            
            for (let j = 0; j < item.items.length; j++) {
                const prod = item.items[j];
                html += '<div class="history-item">';
                html += '<span>' + prod.quantity + 'x ' + prod.name + '</span>';
                html += '<span>R$ ' + prod.total.toFixed(2).replace('.', ',') + '</span>';
                html += '</div>';
            }
            
            html += '<div class="history-total">';
            html += '<span>TOTAL</span>';
            html += '<span>R$ ' + item.total.toFixed(2).replace('.', ',') + '</span>';
            html += '</div>';
            html += '<button class="btn-print" onclick="window.printReceipt(' + i + ')">'; // Usar window.printReceipt
            html += '<i class="fas fa-print"></i> Imprimir Cupom';
            html += '</button>';
            html += '</div>';
            
        } else if (item.type === 'payment') {
            html += '<div class="history-card payment">';
            html += '<div class="history-header">';
            html += '<span class="history-time"><i class="fas fa-clock"></i> ' + item.time + '</span>';
            
            if (item.paymentType === 'cash') {
                html += '<span class="badge from-cash">DO CAIXA</span>';
            } else if (item.paymentType === 'external') {
                html += '<span class="badge external">EXTERNO</span>';
            } else if (item.paymentType === 'mixed') {
                html += '<span class="badge" style="background:rgba(255,152,0,0.1);color:#FF9800">MISTO</span>';
            } else {
                html += '<span class="badge ' + (item.fromCash ? 'from-cash' : 'external') + '">';
                html += (item.fromCash ? 'DO CAIXA' : 'EXTERNO');
                html += '</span>';
            }
            
            html += '</div>';
            html += '<div class="history-item">';
            html += '<span><strong>Fornecedor:</strong> ' + item.supplier + '</span>';
            html += '</div>';
            
            if (item.paymentType === 'mixed') {
                html += '<div style="background:rgba(248,249,250,.8);border-radius:8px;padding:10px;margin:8px 0;border:1px solid #dee2e6">';
                html += '<div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:.85rem">';
                html += '<span>💵 Do Caixa:</span>';
                html += '<span style="font-weight:700;color:#E53935">R$ ' + item.fromCashAmount.toFixed(2).replace('.', ',') + '</span>';
                html += '</div>';
                html += '<div style="display:flex;justify-content:space-between;font-size:.85rem">';
                html += '<span>🏦 Externo:</span>';
                html += '<span style="font-weight:700;color:#6c757d">R$ ' + item.externalAmount.toFixed(2).replace('.', ',') + '</span>';
                html += '</div>';
                html += '</div>';
            }
            
            html += '<div class="history-total">';
            html += '<span>VALOR TOTAL</span>';
            html += '<span>R$ ' + item.value.toFixed(2).replace('.', ',') + '</span>';
            html += '</div></div>';
            
        } else if (item.type === 'withdrawal') {
            html += '<div class="history-card withdrawal">';
            html += '<div class="history-header">';
            html += '<span class="history-time"><i class="fas fa-clock"></i> ' + item.time + '</span>';
            html += '<span style="color:#E53935;font-weight:700">SANGRIA</span>';
            html += '</div>';
            html += '<div class="history-item">';
            html += '<span><strong>Motivo:</strong> ' + item.reason + '</span>';
            html += '</div>';
            html += '<div class="history-total">';
            html += '<span>VALOR RETIRADO</span>';
            html += '<span>R$ ' + item.value.toFixed(2).replace('.', ',') + '</span>';
            html += '</div></div>';
        }
    }
    historyList.innerHTML = html;
}


// --- Modais do Sistema Pro ---

/**
 * Abre o modal de senha para o acesso Pro.
 */
export function openProModal() {
    if (!window.validProPasswords) {
        window.validProPasswords = ['admin123', '1234'];
        window.proPasswordsLoaded = false;
    }
    openModal('proPasswordModal');
    document.getElementById('proPassword').value = '';
    document.getElementById('proPasswordError').style.display = 'none';
    if (!window.proPasswordsLoaded) {
        loadProPasswords();
    }
}

/**
 * Fecha o modal de senha Pro.
 */
export function closeProPasswordModal() {
    closeModal('proPasswordModal');
}

/**
 * Carrega as senhas de acesso Pro a partir da planilha Google.
 */
export async function loadProPasswords() {
    try {
        showNotification('Carregando senhas...', 'warning');
        const response = await fetch(`${SHEET_URL}?action=getPasswords`);
        if (response.ok) {
            const data = await response.json();
            if (data.passwords && Array.isArray(data.passwords)) {
                window.validProPasswords = data.passwords.filter(p => p && p.trim() !== '');
                window.proPasswordsLoaded = true;
                showNotification('Senhas carregadas!', 'success');
            }
        }
    } catch (error) {
        console.warn('[Pro] Erro ao carregar senhas. Usando senhas de fallback.', error);
        window.validProPasswords = ['admin123', '1234']; // Fallback
        showNotification('Usando senhas padrão', 'warning');
    }
}

/**
 * Valida a senha Pro inserida.
 * @param {Event} e - O evento de submit do formulário.
 */
export function validateProPassword(e) {
    e.preventDefault();
    const password = document.getElementById('proPassword').value;
    const isValid = window.validProPasswords.includes(password);

    if (isValid) {
        document.getElementById('proPasswordError').style.display = 'none';
        closeProPasswordModal();
        openProHistoryModal();
    } else {
        document.getElementById('proPasswordError').style.display = 'block';
        document.getElementById('proPassword').value = '';
        document.getElementById('proPassword').focus();
    }
}

/**
 * Abre o modal de histórico profissional.
 */
export function openProHistoryModal() {
    openModal('proHistoryModal');
    updateProHistoryDisplay();
}

/**
 * Fecha o modal de histórico profissional.
 */
export function closeProHistoryModal() {
    closeModal('proHistoryModal');
    document.getElementById('proTurnDetails').style.display = 'none';
}

/**
 * Atualiza a exibição do resumo no modal de histórico Pro.
 */
export function updateProHistoryDisplay() {
    const morningTotal = (window.turnsData.morning.totalCash || 0) + (window.turnsData.morning.totalCard || 0);
    const afternoonTotal = (window.turnsData.afternoon.totalCash || 0) + (window.turnsData.afternoon.totalCard || 0);

    document.getElementById('proMorningTotal').textContent = 'R$ ' + morningTotal.toFixed(2).replace('.', ',');
    document.getElementById('proAfternoonTotal').textContent = 'R$ ' + afternoonTotal.toFixed(2).replace('.', ',');
}

/**
 * Exibe os detalhes de um turno específico no modal Pro.
 * @param {string} turnType - O turno a ser exibido ('morning' ou 'afternoon').
 */
export function showProTurn(turnType) {
    const turnData = window.turnsData[turnType];
    const turnName = turnType === 'morning' ? '☀️ Turno da Manhã' : '🌅 Turno da Tarde';

    document.getElementById('proTurnTitle').textContent = turnName;
    // ... (restante da lógica para preencher os detalhes do turno pro)
    
    document.getElementById('proTurnDetails').style.display = 'block';
}


// --- Notificações ---

/**
 * Exibe uma notificação na tela.
 * @param {string} message - A mensagem a ser exibida.
 * @param {string} type - O tipo de notificação ('success', 'warning', 'error').
 */
export function showNotification(message, type) {
    const notification = document.getElementById('notification');
    const messageEl = document.getElementById('notificationMessage');
    const icon = notification.querySelector('.notification-icon');

    messageEl.textContent = message;
    notification.className = 'notification ' + type; // Reseta classes e adiciona a nova

    if (type === 'error') icon.className = 'notification-icon fas fa-exclamation-circle';
    else if (type === 'warning') icon.className = 'notification-icon fas fa-exclamation-triangle';
    else if (type === 'success') icon.className = 'notification-icon fas fa-check-circle';

    notification.classList.add('show');
    setTimeout(hideNotification, 4000);
}

/**
 * Oculta a notificação.
 */
export function hideNotification() {
    document.getElementById('notification').classList.remove('show');
}
