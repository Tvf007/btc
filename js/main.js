/**
 * =================================================================================
 * js/main.js
 * =================================================================================
 * 
 * Ponto de Entrada Principal (Entry Point) da Aplicação Caixa Freitas.
 * 
 * Responsabilidades:
 * 1.  **Importar Módulos**: Carrega todas as funcionalidades dos diferentes
 *     módulos da aplicação (config, state, cart, payment, etc.).
 * 2.  **Inicialização (Bootstrap)**: Orquestra a sequência de inicialização do
 *     aplicativo, incluindo a configuração do banco de dados (IndexedDB) e o
 *     carregamento do estado salvo anteriormente.
 * 3.  **Exposição Global (Window)**: Atribui as funções dos módulos ao objeto
 *     `window`. Isso serve como uma camada de compatibilidade temporária,
 *     permitindo que os `onclick` no arquivo `index.html` continuem funcionando
 *     sem a necessidade de reescrevê-los imediatamente.
 * 4.  **Configuração de Eventos Globais**: Adiciona listeners para eventos
 *     importantes, como o de 'online' para acionar a sincronização de dados
 *     e o salvamento automático do estado em ações críticas.
 * 
 * Este arquivo é o "maestro" que conecta todas as partes da aplicação.
 */

// --- 1. IMPORTAÇÃO DE MÓDULOS ---

// Configurações estáticas da aplicação
import * as config from './config.js';

// Gerenciamento centralizado do estado da aplicação
import { appState, getState, setState, initializeState, resetCart } from './state.js';

// Serviços de persistência (IndexedDB) e sincronização
import { dbInit, saveAppState, loadAppState, enqueueSync, trySync } from './services/persistence.js';

// Módulos de funcionalidades específicas da UI
import * as cart from './modules/cart.js';
import * as keyboard from './modules/keyboard.js';
import * as modals from './modules/modals.js';
import * as payment from './modules/payment.js';
import * as print from './modules/print.js';
import * as turns from './modules/turns.js';
import * as auth from './services/auth.js';
import * as emailService from './services/email.js';

// --- 2. EXPOSIÇÃO GLOBAL (CAMADA DE COMPATIBILIDADE) ---

/**
 * Atribui as funções dos módulos ao objeto `window` para que possam ser
 * chamadas diretamente pelos atributos `onclick` no HTML.
 * Esta é uma medida de compatibilidade para a refatoração.
 */
function exposeFunctionsToWindow() {
    // ============================================
    // EXPOSIÇÃO GLOBAL (para onclick do HTML)
    // ============================================
    window.startTurn = turns.startTurn;
    window.addProduct = cart.addProduct;
    window.selectPayment = payment.selectPayment;
    window.openReceivedKeyboard = keyboard.openReceivedKeyboard;
    window.processNext = payment.processNext;
    window.clearCart = payment.clearCart;
    window.openPaymentModal = modals.openPaymentModal;
    window.closePaymentModal = modals.closePaymentModal;
    window.submitPayment = payment.submitPayment;
    window.selectPaymentType = payment.selectPaymentType;
    window.openPaymentKeyboard = keyboard.openPaymentKeyboard;
    window.openMixedCashKeyboard = keyboard.openMixedCashKeyboard;
    window.openMixedExternalKeyboard = keyboard.openMixedExternalKeyboard;
    window.openWithdrawalModal = modals.openWithdrawalModal;
    window.closeWithdrawalModal = modals.closeWithdrawalModal;
    window.submitWithdrawal = payment.submitWithdrawal;
    window.openWithdrawalKeyboard = keyboard.openWithdrawalKeyboard;
    window.closeTurn = turns.closeTurn;
    window.openHistoryModal = modals.openHistoryModal;
    window.closeHistoryModal = modals.closeHistoryModal;
    window.openProModal = modals.openProModal;
    window.closeProPasswordModal = modals.closeProPasswordModal;
    window.validateProPassword = modals.validateProPassword;
    window.closeProHistoryModal = modals.closeProHistoryModal;
    window.showProTurn = modals.showProTurn;
    window.openKeyboard = keyboard.openKeyboard;
    window.closeKeyboard = keyboard.closeKeyboard;
    window.inputDigit = keyboard.inputDigit;
    window.inputComma = keyboard.inputComma;
    window.backspace = keyboard.backspace;
    window.confirmKeyboard = keyboard.confirmKeyboard;
    window.hideNotification = modals.hideNotification;
    window.showNotification = modals.showNotification; // <-- ADICIONADO
    window.printReceipt = print.printReceipt;

    // Funções adicionais que podem ser chamadas dinamicamente ou por outras funções
    window.removeItem = cart.removeItem;
    window.editItemQuantity = cart.editItemQuantity;
    window.openItemEditor = cart.openItemEditor;
    window.updateCart = cart.updateCart;
    window.calculateChange = payment.calculateChange;
    window.updateCardDisplay = payment.updateCardDisplay;
    window.updateMixedTotal = payment.updateMixedTotal;
    window.editOtherItem = cart.editOtherItem;
    window.editOtherName = cart.editOtherName;
    window.editOtherPrice = cart.editOtherPrice;
    window.toggleMenu = toggleMenu;
    window.closeMenu = closeMenu;

    // ========================================
    // 🔐 FUNÇÕES DE AUTENTICAÇÃO
    // ========================================

    // Inicializar EmailJS quando a página carregar
    document.addEventListener('DOMContentLoaded', () => {
        emailService.initEmailJS();
        
        // Event listeners para Enter nos campos
        const loginPassword = document.getElementById('loginPassword');
        if (loginPassword) {
            loginPassword.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') window.attemptLogin();
            });
        }
        
        const setupPassword = document.getElementById('setupPasswordConfirm');
        if (setupPassword) {
            setupPassword.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') window.submitSetup();
            });
        }
        
        const recoveryEmail = document.getElementById('recoveryEmail');
        if (recoveryEmail) {
            recoveryEmail.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') window.requestRecoveryCode();
            });
        }
        
        const resetPasswordConfirm = document.getElementById('resetPasswordConfirm');
        if (resetPasswordConfirm) {
            resetPasswordConfirm.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') window.submitNewPassword();
            });
        }
    });

    // Abrir relatórios (verifica se precisa setup ou login)
    window.openReports = function() {
        // Verifica se é primeiro acesso
        if (!auth.hasConfiguration()) {
            const setupModal = document.getElementById('setupModal');
            setupModal.style.display = 'flex';
            setTimeout(() => document.getElementById('setupEmail').focus(), 100);
            return;
        }
        
        // Verifica se tem sessão ativa
        if (auth.hasActiveSession()) {
            window.location.href = 'relatorios.html';
            return;
        }
        
        // Abre modal de login
        const loginModal = document.getElementById('loginModal');
        const loginPassword = document.getElementById('loginPassword');
        const loginError = document.getElementById('loginError');
        
        loginPassword.value = '';
        loginError.style.display = 'none';
        loginModal.style.display = 'flex';
        setTimeout(() => loginPassword.focus(), 100);
    };

    // Configuração inicial (primeiro acesso)
    window.submitSetup = function() {
        const emailInput = document.getElementById('setupEmail');
        const passwordInput = document.getElementById('setupPassword');
        const confirmInput = document.getElementById('setupPasswordConfirm');
        const errorElement = document.getElementById('setupError');
        
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        const confirm = confirmInput.value.trim();
        
        // Validações
        if (!email || !email.includes('@')) {
            errorElement.textContent = '❌ Digite um e-mail válido';
            errorElement.style.display = 'block';
            emailInput.focus();
            return;
        }
        
        if (password.length < 4) {
            errorElement.textContent = '❌ Senha deve ter no mínimo 4 caracteres';
            errorElement.style.display = 'block';
            passwordInput.focus();
            return;
        }
        
        if (password !== confirm) {
            errorElement.textContent = '❌ As senhas não coincidem';
            errorElement.style.display = 'block';
            confirmInput.focus();
            return;
        }
        
        try {
            auth.setConfiguration(email, password);
            auth.startSession();
            
            // Fecha modal e redireciona
            document.getElementById('setupModal').style.display = 'none';
            window.showNotification('✅ Configuração salva com sucesso!', 'success');
            
            setTimeout(() => {
                window.location.href = 'relatorios.html';
            }, 1000);
        } catch (error) {
            errorElement.textContent = '❌ ' + error.message;
            errorElement.style.display = 'block';
        }
    };

    // Login normal
    window.attemptLogin = function() {
        const passwordInput = document.getElementById('loginPassword');
        const errorElement = document.getElementById('loginError');
        const input = passwordInput.value;
        
        if (auth.validatePassword(input)) {
            auth.startSession();
            window.location.href = 'relatorios.html';
        } else {
            errorElement.textContent = '❌ Senha incorreta!';
            errorElement.style.display = 'block';
            passwordInput.value = '';
            passwordInput.focus();
        }
    };

    window.closeLoginModal = function() {
        document.getElementById('loginModal').style.display = 'none';
    };

    // Recuperação de senha - Abrir modal
    window.openRecoveryModal = function() {
        document.getElementById('loginModal').style.display = 'none';
        
        const recoveryModal = document.getElementById('recoveryModal');
        const recoveryEmail = document.getElementById('recoveryEmail');
        const recoveryError = document.getElementById('recoveryError');
        const recoverySuccess = document.getElementById('recoverySuccess');
        
        recoveryEmail.value = '';
        recoveryError.style.display = 'none';
        recoverySuccess.style.display = 'none';
        
        recoveryModal.style.display = 'flex';
        setTimeout(() => recoveryEmail.focus(), 100);
    };

    window.closeRecoveryModal = function() {
        document.getElementById('recoveryModal').style.display = 'none';
    };

    // Solicitar código de recuperação
    window.requestRecoveryCode = async function() {
        const emailInput = document.getElementById('recoveryEmail');
        const errorElement = document.getElementById('recoveryError');
        const successElement = document.getElementById('recoverySuccess');
        const email = emailInput.value.trim();
        
        errorElement.style.display = 'none';
        successElement.style.display = 'none';
        
        // Validar e-mail
        if (!auth.validateEmail(email)) {
            errorElement.textContent = '❌ E-mail não encontrado no sistema';
            errorElement.style.display = 'block';
            return;
        }
        
        try {
            // Gera código
            const code = auth.generateRecoveryCode();
            auth.saveRecoveryCode(code);
            
            // Envia e-mail
            successElement.textContent = '📧 Enviando código...';
            successElement.style.display = 'block';
            
            await emailService.sendRecoveryCode(email, code);
            
            successElement.textContent = '✅ Código enviado! Verifique seu e-mail.';
            
            // Aguarda 2 segundos e abre modal de reset
            setTimeout(() => {
                document.getElementById('recoveryModal').style.display = 'none';
                window.openResetPasswordModal();
            }, 2000);
            
        } catch (error) {
            errorElement.textContent = '❌ ' + error.message;
            errorElement.style.display = 'block';
        }
    };

    // Abrir modal de nova senha
    window.openResetPasswordModal = function() {
        const resetModal = document.getElementById('resetPasswordModal');
        const resetCode = document.getElementById('resetCode');
        const resetPassword = document.getElementById('resetPassword');
        const resetPasswordConfirm = document.getElementById('resetPasswordConfirm');
        const resetError = document.getElementById('resetError');
        
        resetCode.value = '';
        resetPassword.value = '';
        resetPasswordConfirm.value = '';
        resetError.style.display = 'none';
        
        resetModal.style.display = 'flex';
        setTimeout(() => resetCode.focus(), 100);
    };

    window.closeResetPasswordModal = function() {
        document.getElementById('resetPasswordModal').style.display = 'none';
        auth.clearRecoveryCode();
    };

    // Redefinir senha
    window.submitNewPassword = function() {
        const codeInput = document.getElementById('resetCode');
        const passwordInput = document.getElementById('resetPassword');
        const confirmInput = document.getElementById('resetPasswordConfirm');
        const errorElement = document.getElementById('resetError');
        
        const code = codeInput.value.trim();
        const password = passwordInput.value.trim();
        const confirm = confirmInput.value.trim();
        
        // Validações
        if (!auth.validateRecoveryCode(code)) {
            errorElement.textContent = '❌ Código inválido ou expirado';
            errorElement.style.display = 'block';
            codeInput.focus();
            return;
        }
        
        if (password.length < 4) {
            errorElement.textContent = '❌ Senha deve ter no mínimo 4 caracteres';
            errorElement.style.display = 'block';
            passwordInput.focus();
            return;
        }
        
        if (password !== confirm) {
            errorElement.textContent = '❌ As senhas não coincidem';
            errorElement.style.display = 'block';
            confirmInput.focus();
            return;
        }
        
        try {
            auth.updatePassword(password);
            auth.clearRecoveryCode();
            
            document.getElementById('resetPasswordModal').style.display = 'none';
            window.showNotification('✅ Senha redefinida com sucesso!', 'success');
            
            // Abre modal de login
            setTimeout(() => {
                window.openReports();
            }, 1500);
            
        } catch (error) {
            errorElement.textContent = '❌ ' + error.message;
            errorElement.style.display = 'block';
        }
    };
}

export function toggleMenu() {
    const dropdownMenu = document.getElementById('dropdownMenu');
    dropdownMenu.classList.toggle('show-menu');
}

export function closeMenu() {
    const dropdownMenu = document.getElementById('dropdownMenu');
    dropdownMenu.classList.remove('show-menu');
}

// --- 3. LÓGICA DE INICIALIZAÇÃO DA APLICAÇÃO ---

/**
 * Orquestra a inicialização completa da aplicação.
 */
async function initializeApp() {
    console.log("🚀 Caixa Freitas - Iniciando aplicação...");

    // Passo 1: Inicializa o estado com valores padrão
    initializeState();
    console.log("✅ Estado inicializado.");

    // Passo 2: Expõe todas as funções na window para o HTML
    exposeFunctionsToWindow();
    console.log("✅ Funções expostas no objeto window.");

    // Passo 3: Inicializa o banco de dados IndexedDB
    try {
        await dbInit(config.DB_NAME, config.DB_VERSION);
        console.log("✅ Banco de dados (IndexedDB) inicializado.");

        // Passo 4: Carrega o último estado salvo da aplicação
        await loadAppState();
        console.log("✅ Estado da aplicação carregado do IndexedDB.");

        // Se um turno já estava ativo, restaura a UI principal
        if (getState().currentTurn) {
            document.getElementById('turnSelection').style.display = 'none';
            document.getElementById('mainApp').classList.add('show');
            const turn = getState().currentTurn;
            document.getElementById('turnText').textContent = `${turn.name} - ${turn.startTime}`;
        }
        
        // Atualiza a UI com os dados carregados
        cart.updateCart();

    } catch (err) {
        console.error("❌ Falha crítica na inicialização do banco de dados:", err);
        modals.showNotification("Erro ao carregar dados. Tente recarregar.", "error");
    }

    // Passo 5: Configura a sincronização de dados
    setupSync();
    console.log("🔄 Serviço de sincronização configurado.");

    // Passo 6: Configura o salvamento automático do estado
    setupAutoSave();
    console.log("💾 Serviço de salvamento automático configurado.");

    console.log("🎉 Aplicação pronta!");
}

/**
 * Configura os gatilhos para a sincronização de dados com o backend.
 */
function setupSync() {
    // Tenta sincronizar imediatamente ao carregar
    trySync(config.API_URL);

    // Tenta sincronizar a cada 60 segundos
    setInterval(() => trySync(config.API_URL), 60000);

    // Tenta sincronizar quando o navegador fica online
    window.addEventListener('online', () => {
        console.log("🌐 Conexão restaurada. Tentando sincronizar...");
        modals.showNotification("Conexão restaurada. Sincronizando dados...", "success");
        trySync(config.API_URL);
    });

    window.addEventListener('offline', () => {
        console.log("🔌 Conexão perdida. Operando em modo offline.");
        modals.showNotification("Conexão perdida. Você está em modo offline.", "warning");
    });
}

/**
 * "Envolve" as funções críticas para que salvem o estado da aplicação
 * e/ou enfileirem dados para sincronização após serem executadas.
 */
function setupAutoSave() {
    const functionsToSaveState = [
        'addProduct', 'removeItem', 'updateCart', 'editItemQuantity', 'editOtherItem',
        'editOtherName', 'editOtherPrice', // Added new functions
        'selectPayment', 'clearCart', 'startTurn', 'closeTurn', 'confirmKeyboard'
    ];

    functionsToSaveState.forEach(fnName => {
        const originalFn = window[fnName];
        if (typeof originalFn === 'function') {
            window[fnName] = function(...args) {
                const result = originalFn.apply(this, args);
                saveAppState(); // Salva o estado após a execução
                return result;
            };
        }
    });

    // Funções que também precisam enfileirar dados para sincronização
    const functionsToSync = {
        'processNext': (state) => ({ type: 'sale', payload: state.lastCreatedSale }),
        'submitPayment': (state) => ({ type: 'payment', payload: state.lastCreatedPayment }),
        'submitWithdrawal': (state) => ({ type: 'withdrawal', payload: state.lastCreatedWithdrawal }),
    };

    Object.entries(functionsToSync).forEach(([fnName, payloadBuilder]) => {
        const originalFn = window[fnName];
        if (typeof originalFn === 'function') {
            window[fnName] = function(...args) {
                const result = originalFn.apply(this, args);
                const state = getState();
                const payload = payloadBuilder(state);
                if (payload && payload.payload) {
                    enqueueSync(payload);
                }
                saveAppState(); // Salva o estado também
                return result;
            };
        }
    });
}


// --- 4. PONTO DE PARTIDA ---

// Inicia a aplicação quando o DOM estiver completamente carregado.
document.addEventListener('DOMContentLoaded', initializeApp);
