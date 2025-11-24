import { setState } from '../state.js'; // Adicionar esta importação

// Funções de outros módulos (temporariamente via window)
const updateCart = window.updateCart;
const clearCart = window.clearCart;

/**
 * Obtém os dados do turno atualmente ativo.
 * @returns {object|null} O objeto de dados do turno ou null se nenhum turno estiver ativo.
 */
export function getCurrentTurnData() {
    if (!window.currentTurn) return null;
    return window.turnsData[window.currentTurn.type];
}

/**
 * Calcula o saldo de dinheiro em caixa para o turno atual.
 * @returns {number} O valor do saldo em caixa.
 */
export function getCashBalance() {
    const turnData = getCurrentTurnData();
    if (!turnData) return 0;
    return turnData.totalCash - turnData.totalPaymentsCash - turnData.totalWithdrawals;
}

/**
 * Inicia um novo turno (manhã ou tarde).
 * @param {string} type - O tipo de turno ('morning' ou 'afternoon').
 */
export function startTurn(type) {
    try {
        const now = new Date();
        const turnData = {
            type: type,
            name: type === 'morning' ? '☀️ Turno da Manhã' : '🌅 Turno da Tarde',
            startTime: now.toLocaleTimeString('pt-BR'),
            startDate: now.toLocaleDateString('pt-BR')
        };
        
        window.currentTurn = turnData; // Compatibilidade
        setState({ currentTurn: turnData }); // <-- ADICIONAR ESTA LINHA
        
        // Sincronizar turno com Supabase (não bloqueia)
        if (window.syncToSupabase && window.syncToSupabase.turno) {
            window.syncToSupabase.turno(turnData).catch(err => {
                console.warn('[Supabase] Erro ao sincronizar turno (continuando offline):', err);
            });
        }
        
        document.getElementById('turnSelection').style.display = 'none';
        document.getElementById('mainApp').classList.add('show');
        document.getElementById('turnText').textContent = `${turnData.name} - ${turnData.startTime}`;
    } catch (error) {
        console.error('Erro ao iniciar turno:', error);
        alert('Erro ao iniciar turno. Por favor, recarregue a página.');
    }
}

/**
 * Fecha o turno atual e retorna para a tela de seleção de turno.
 */
export function closeTurn() {
    if (!confirm('Deseja fechar o turno atual e voltar à seleção de turno?\n\nOs dados do histórico serão preservados.')) {
        return;
    }

    // Limpa o estado da venda atual, mas preserva o histórico do turno
    if (typeof clearCart === 'function') {
        clearCart();
    } else {
        // Fallback se clearCart não estiver no window
        window.cart = [];
        window.total = 0;
        window.paymentMethod = '';
        window.receivedAmount = 0;
        if (typeof updateCart === 'function') updateCart();
    }

    document.getElementById('mainApp').classList.remove('show');
    document.getElementById('turnSelection').style.display = 'flex';
    window.currentTurn = null; // Finaliza o turno
}
