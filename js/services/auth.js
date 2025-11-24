// ========================================
// 🔐 SERVIÇO DE AUTENTICAÇÃO
// ========================================

import { AUTH_CONFIG } from '../config.js';

/**
 * Obtém a senha atual (personalizada ou padrão)
 */
export function getPassword() {
    const customPassword = localStorage.getItem(AUTH_CONFIG.STORAGE_KEY);
    return customPassword || AUTH_CONFIG.DEFAULT_PASSWORD;
}

/**
 * Obtém o e-mail cadastrado
 */
export function getEmail() {
    return localStorage.getItem(AUTH_CONFIG.EMAIL_KEY);
}

/**
 * Verifica se já existe configuração (senha + e-mail)
 */
export function hasConfiguration() {
    return localStorage.getItem(AUTH_CONFIG.STORAGE_KEY) !== null &&
           localStorage.getItem(AUTH_CONFIG.EMAIL_KEY) !== null;
}

/**
 * Define senha e e-mail pela primeira vez
 */
export function setConfiguration(email, password) {
    if (!email || !email.includes('@')) {
        throw new Error('E-mail inválido');
    }
    if (!password || password.trim().length < 4) {
        throw new Error('Senha deve ter no mínimo 4 caracteres');
    }
    
    localStorage.setItem(AUTH_CONFIG.EMAIL_KEY, email.trim().toLowerCase());
    localStorage.setItem(AUTH_CONFIG.STORAGE_KEY, password.trim());
    return true;
}

/**
 * Atualiza apenas a senha (mantém e-mail)
 */
export function updatePassword(newPassword) {
    if (!newPassword || newPassword.trim().length < 4) {
        throw new Error('Senha deve ter no mínimo 4 caracteres');
    }
    localStorage.setItem(AUTH_CONFIG.STORAGE_KEY, newPassword.trim());
    return true;
}

/**
 * Valida se a senha fornecida está correta (ou código master)
 */
export function validatePassword(inputPassword) {
    // Verifica código master primeiro (emergência)
    if (inputPassword === AUTH_CONFIG.MASTER_CODE) {
        return true;
    }
    return inputPassword === getPassword();
}

/**
 * Valida se o e-mail fornecido corresponde ao cadastrado
 */
export function validateEmail(inputEmail) {
    const storedEmail = getEmail();
    if (!storedEmail) return false;
    return inputEmail.trim().toLowerCase() === storedEmail;
}

/**
 * Verifica se há uma sessão ativa
 */
export function hasActiveSession() {
    const sessionData = localStorage.getItem(AUTH_CONFIG.SESSION_KEY);
    if (!sessionData) return false;
    
    try {
        const { timestamp } = JSON.parse(sessionData);
        const now = Date.now();
        const sessionAge = (now - timestamp) / 1000 / 60; // em minutos
        
        return sessionAge < AUTH_CONFIG.SESSION_TIMEOUT;
    } catch (e) {
        return false;
    }
}

/**
 * Inicia uma nova sessão
 */
export function startSession() {
    const sessionData = {
        timestamp: Date.now()
    };
    localStorage.setItem(AUTH_CONFIG.SESSION_KEY, JSON.stringify(sessionData));
}

/**
 * Encerra a sessão atual
 */
export function endSession() {
    localStorage.removeItem(AUTH_CONFIG.SESSION_KEY);
}

/**
 * Gera código de recuperação de 6 dígitos
 */
export function generateRecoveryCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Salva código de recuperação com timestamp
 */
export function saveRecoveryCode(code) {
    const data = {
        code: code,
        timestamp: Date.now()
    };
    localStorage.setItem(AUTH_CONFIG.RECOVERY_CODE_KEY, JSON.stringify(data));
}

/**
 * Valida código de recuperação
 */
export function validateRecoveryCode(inputCode) {
    const data = localStorage.getItem(AUTH_CONFIG.RECOVERY_CODE_KEY);
    if (!data) return false;
    
    try {
        const { code, timestamp } = JSON.parse(data);
        const now = Date.now();
        const age = (now - timestamp) / 1000 / 60; // em minutos
        
        // Código expirou?
        if (age > AUTH_CONFIG.RECOVERY_CODE_TIMEOUT) {
            clearRecoveryCode();
            return false;
        }
        
        return inputCode === code;
    } catch (e) {
        return false;
    }
}

/**
 * Limpa código de recuperação
 */
export function clearRecoveryCode() {
    localStorage.removeItem(AUTH_CONFIG.RECOVERY_CODE_KEY);
}

/**
 * Reseta configuração completa (senha + e-mail)
 */
export function resetConfiguration() {
    localStorage.removeItem(AUTH_CONFIG.STORAGE_KEY);
    localStorage.removeItem(AUTH_CONFIG.EMAIL_KEY);
    endSession();
    clearRecoveryCode();
    return AUTH_CONFIG.DEFAULT_PASSWORD;
}