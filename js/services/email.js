// ========================================
// 📧 SERVIÇO DE ENVIO DE E-MAIL
// ========================================

import { AUTH_CONFIG } from '../config.js';

/**
 * Inicializa o EmailJS (deve ser chamado uma vez no carregamento)
 */
export function initEmailJS() {
    if (typeof emailjs === 'undefined') {
        console.error('EmailJS não está carregado. Adicione o script no HTML.');
        return false;
    }
    
    try {
        emailjs.init(AUTH_CONFIG.EMAILJS_PUBLIC_KEY);
        return true;
    } catch (error) {
        console.error('Erro ao inicializar EmailJS:', error);
        return false;
    }
}

/**
 * Envia código de recuperação por e-mail
 * @param {string} email - E-mail do destinatário
 * @param {string} code - Código de 6 dígitos
 * @returns {Promise<boolean>}
 */
export async function sendRecoveryCode(email, code) {
    if (typeof emailjs === 'undefined') {
        throw new Error('EmailJS não está inicializado');
    }
    
    const templateParams = {
        to_email: email,
        recovery_code: code,
        expiry_time: AUTH_CONFIG.RECOVERY_CODE_TIMEOUT
    };
    
    try {
        const response = await emailjs.send(
            AUTH_CONFIG.EMAILJS_SERVICE_ID,
            AUTH_CONFIG.EMAILJS_TEMPLATE_ID,
            templateParams
        );
        
        console.log('E-mail enviado com sucesso:', response);
        return true;
    } catch (error) {
        console.error('Erro ao enviar e-mail:', error);
        throw new Error('Falha ao enviar e-mail. Verifique sua conexão.');
    }
}

/**
 * Verifica se o EmailJS está configurado corretamente
 */
export function isEmailJSConfigured() {
    return AUTH_CONFIG.EMAILJS_PUBLIC_KEY !== 'YOUR_PUBLIC_KEY_HERE' &&
           AUTH_CONFIG.EMAILJS_SERVICE_ID !== 'service_caixa_freitas' &&
           AUTH_CONFIG.EMAILJS_TEMPLATE_ID !== 'template_recovery';
}