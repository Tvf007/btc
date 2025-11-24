// js/config.js

export const API_URL = 'https://script.google.com/macros/s/AKfycbxdXh5kBkQbQ44MLHmZiVG_tBdp-CJ5XVfy7Bq2ep_dOCOMEJEFTcpQrlpbfcp2CZWI/exec';
export const SHEET_URL = 'https://script.google.com/macros/s/AKfycby-z8gSUpveeO066zL_9eRUGQ1HG-GWBpKni8-l6U8RdmuJVFwPQ69JHHsqQF6nybQj/exec?action=getPasswords';

export const DB_NAME = 'caixa_freitas_db';
export const DB_VERSION = 1;

export const FALLBACK_PRO_PASSWORDS = ['admin123', '1234'];

export const PRODUCTS = [
    { name: 'Pão de Sal', price: 0.70 },
    { name: 'Pão Doce Comum', price: 0.70 },
    { name: 'Pão Doce Especial', price: 0.80 }
];

export const SUPABASE = {
    url: 'https://hujxkodtvwrwaazgiytz.supabase.co',
    key: 'sb_publishable_X-xg4mr3DSfg4Jjzo9uQPw_GHcnUFcp'
};

// Other potential configurations can be added here
// For example, payment methods, notification durations, etc.

// ========================================
// 🔐 CONFIGURAÇÕES DE AUTENTICAÇÃO
// ========================================
export const AUTH_CONFIG = {
    // Senha padrão de fábrica
    DEFAULT_PASSWORD: 'admin123',
    
    // Código Master de emergência (caso e-mail não funcione)
    MASTER_CODE: 'FREITAS2025RESET',
    
    // Chaves de armazenamento
    STORAGE_KEY: 'caixa_freitas_custom_password',
    EMAIL_KEY: 'caixa_freitas_admin_email',
    SESSION_KEY: 'caixa_freitas_session',
    RECOVERY_CODE_KEY: 'caixa_freitas_recovery_code',
    RECOVERY_TIMESTAMP_KEY: 'caixa_freitas_recovery_timestamp',
    
    // Tempo de sessão (minutos)
    SESSION_TIMEOUT: 30,
    
    // Tempo de validade do código de recuperação (minutos)
    RECOVERY_CODE_TIMEOUT: 15,
    
    // Configurações EmailJS (vamos configurar depois)
    EMAILJS_SERVICE_ID: 'service_caixa_freitas',
    EMAILJS_TEMPLATE_ID: 'template_recovery',
    EMAILJS_PUBLIC_KEY: 'YOUR_PUBLIC_KEY_HERE'
};
