// js/services/persistence.js

import { API_URL, DB_NAME, DB_VERSION } from '../config.js';
import { supabase } from './supabase.js';

let idbDB = null;

/**
 * Initializes the IndexedDB database.
 * @returns {Promise<void>}
 */
export function dbInit() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('state')) db.createObjectStore('state');
      if (!db.objectStoreNames.contains('outbox')) db.createObjectStore('outbox', { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = (e) => { idbDB = e.target.result; resolve(); };
    req.onerror = (e) => reject(e.target.error);
  });
}

function dbPut(store, key, value) {
  return new Promise((resolve, reject) => {
    const tx = idbDB.transaction([store], 'readwrite');
    const s = tx.objectStore(store);
    const r = s.put(value, key);
    r.onsuccess = () => resolve();
    r.onerror = (ev) => reject(ev.target.error);
  });
}

function dbGet(store, key) {
  return new Promise((resolve, reject) => {
    const tx = idbDB.transaction([store], 'readonly');
    const s = tx.objectStore(store);
    const r = s.get(key);
    r.onsuccess = () => resolve(r.result);
    r.onerror = (ev) => reject(ev.target.error);
  });
}

function dbAddOutbox(item) {
  return new Promise((resolve, reject) => {
    const tx = idbDB.transaction(['outbox'], 'readwrite');
    const s = tx.objectStore('outbox');
    const r = s.add(item);
    r.onsuccess = () => resolve(r.result);
    r.onerror = (ev) => reject(ev.target.error);
  });
}

function dbGetAllOutbox() {
  return new Promise((resolve, reject) => {
    const tx = idbDB.transaction(['outbox'], 'readonly');
    const s = tx.objectStore('outbox');
    const r = s.getAll();
    r.onsuccess = () => resolve(r.result || []);
    r.onerror = (ev) => reject(ev.target.error);
  });
}

function dbDeleteOutbox(id) {
  return new Promise((resolve, reject) => {
    const tx = idbDB.transaction(['outbox'], 'readwrite');
    const s = tx.objectStore('outbox');
    const r = s.delete(id);
    r.onsuccess = () => resolve();
    r.onerror = (ev) => reject(ev.target.error);
  });
}

/**
 * Saves the entire application state to IndexedDB.
 */
export async function saveAppState() {
  if (!idbDB) return;
  try {
    const state = {
      cart: (window.cart !== undefined) ? window.cart : null,
      total: (window.total !== undefined) ? window.total : null,
      paymentMethod: (window.paymentMethod !== undefined) ? window.paymentMethod : null,
      turnsData: (window.turnsData !== undefined) ? window.turnsData : null,
      currentTurn: (window.currentTurn !== undefined) ? window.currentTurn : null,
      receivedAmount: (window.receivedAmount !== undefined) ? window.receivedAmount : null,
      savedAt: new Date().toISOString()
    };
    await dbPut('state', 'appState', state);
  } catch (e) {
    console.warn('[persist] saveAppState error', e);
  }
}

/**
 * Loads the application state from IndexedDB into the global window object.
 * @returns {Promise<object|null>} The loaded state object or null.
 */
export async function loadAppState() {
  if (!idbDB) return null;
  try {
    const state = await dbGet('state', 'appState');
    if (!state) return null;
    // This part will be refactored to not use window globals
    if (state.cart !== undefined) window.cart = state.cart || [];
    if (state.total !== undefined) window.total = state.total || 0;
    if (state.paymentMethod !== undefined) window.paymentMethod = state.paymentMethod || '';
    if (state.turnsData !== undefined) window.turnsData = state.turnsData || {};
    if (state.currentTurn !== undefined) window.currentTurn = state.currentTurn || null;
    if (state.receivedAmount !== undefined) window.receivedAmount = state.receivedAmount || 0;
    if (typeof window.updateCart === 'function') {
      try { window.updateCart(); } catch(e){}
    }
    return state;
  } catch (e) {
    console.warn('[persist] loadAppState error', e);
    return null;
  }
}

/**
 * Adds an item to the synchronization outbox.
 * @param {object} item - The item to be synced.
 */
export async function enqueueSync(item) {
  if (!idbDB) return;
  try {
    item.createdAt = new Date().toISOString();
    item.synced = false;
    await dbAddOutbox(item);
    console.log('[outbox] Item enfileirado:', item.type);
    trySync();
  } catch (e) {
    console.warn('[outbox] enqueue error', e);
  }
}

let syncRunning = false;
/**
 * Attempts to sync all items in the outbox with the Google Sheets API.
 */
export async function trySync() {
  if (!navigator.onLine) {
    console.log('[sync] Offline - aguardando conexão');
    return;
  }
  if (!idbDB) return;
  if (syncRunning) return;
  
  syncRunning = true;
  try {
    const out = await dbGetAllOutbox();
    console.log('[sync] Itens pendentes:', out.length);
    
    for (const item of out) {
      try {
        console.log('[sync] Enviando:', item.type);
        const resp = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
          mode: 'no-cors'
        });
        
        console.log('[sync] Resposta recebida para:', item.type);
        await dbDeleteOutbox(item.id);
        console.log('[sync] Item sincronizado e removido:', item.type);
        
      } catch (err) {
        console.warn('[sync] Erro de rede:', err);
        break; // Stop on error to retry later
      }
    }
  } finally {
    syncRunning = false;
  }
}

// ==================== SUPABASE SYNC ====================

/**
 * Sincroniza turno com Supabase
 */
async function syncTurnoToSupabase(turno) {
    try {
        console.log('[Supabase] Sincronizando turno...', turno);
        
        if (!turno || (!turno.tipo && !turno.type)) {
            console.warn('[Supabase] Turno inválido, ignorando sincronização');
            return;
        }

        // Buscar se já existe no Supabase
        const existente = await supabase.buscarTurnoAberto();
        
        if (existente && existente.tipo === turno.tipo) {
            console.log('[Supabase] Turno já existe, pulando criação');
            return existente;
        }

        // Criar novo turno
        const tipo = turno.tipo || (turno.type === 'morning' ? 'manha' : 'tarde');
        const resultado = await supabase.criarTurno(
            tipo,
            turno.valorInicial || turno.initialValue || 0
        );
        
        console.log('[Supabase] Turno sincronizado:', resultado);
        return resultado;
    } catch (error) {
        console.error('[Supabase] Erro ao sincronizar turno:', error);
        // Não falha - continua funcionando offline
        return null;
    }
}

/**
 * Sincroniza venda com Supabase
 */
async function syncVendaToSupabase(venda) {
    try {
        console.log('[Supabase] Sincronizando venda...', venda);
        
        // Buscar turno aberto no Supabase
        const turnoSupabase = await supabase.buscarTurnoAberto();
        
        if (!turnoSupabase) {
            console.warn('[Supabase] Nenhum turno aberto no Supabase');
            return null;
        }

        // Criar venda
        const vendaResult = await supabase.criarVenda(turnoSupabase.id, {
            total: venda.total,
            metodoPagamento: venda.paymentMethod || venda.method || 'dinheiro',
            valorRecebido: venda.received || null,
            troco: venda.change || null,
            valorDinheiro: venda.cashAmount || null,
            valorCartao: venda.cardAmount || null
        });

        if (vendaResult && vendaResult.length > 0) {
            // Criar itens da venda
            await supabase.criarItensVenda(vendaResult[0].id, venda.items);
            console.log('[Supabase] Venda sincronizada:', vendaResult[0]);
            return vendaResult[0];
        }

        return null;
    } catch (error) {
        console.error('[Supabase] Erro ao sincronizar venda:', error);
        return null;
    }
}

/**
 * Sincroniza sangria com Supabase
 */
async function syncSangriaToSupabase(sangria) {
    try {
        console.log('[Supabase] Sincronizando sangria...', sangria);
        
        const turnoSupabase = await supabase.buscarTurnoAberto();
        
        if (!turnoSupabase) {
            console.warn('[Supabase] Nenhum turno aberto no Supabase');
            return null;
        }

        const resultado = await supabase.criarSangria(
            turnoSupabase.id,
            sangria.value,
            sangria.reason
        );

        console.log('[Supabase] Sangria sincronizada:', resultado);
        return resultado;
    } catch (error) {
        console.error('[Supabase] Erro ao sincronizar sangria:', error);
        return null;
    }
}

/**
 * Sincroniza pagamento a fornecedor com Supabase
 */
async function syncPagamentoFornecedorToSupabase(pagamento) {
    try {
        console.log('[Supabase] Sincronizando pagamento fornecedor...', pagamento);
        
        const turnoSupabase = await supabase.buscarTurnoAberto();
        
        if (!turnoSupabase) {
            console.warn('[Supabase] Nenhum turno aberto no Supabase');
            return null;
        }

        // Mapear tipo de pagamento com fallback seguro
        let tipoPagamento = 'dinheiro'; // valor padrão

        if (pagamento.paymentType) {
            if (pagamento.paymentType === 'cash' || pagamento.paymentType === 'dinheiro') {
                tipoPagamento = 'dinheiro';
            } else if (pagamento.paymentType === 'external' || pagamento.paymentType === 'pix') {
                tipoPagamento = 'pix';
            } else if (pagamento.paymentType === 'card' || pagamento.paymentType === 'cartao') {
                tipoPagamento = 'cartao';
            }
        }

        const resultado = await supabase.criarPagamentoFornecedor(
            turnoSupabase.id,
            pagamento.supplier,
            pagamento.value,
            tipoPagamento
        );

        console.log('[Supabase] Pagamento fornecedor sincronizado:', resultado);
        return resultado;
    } catch (error) {
        console.error('[Supabase] Erro ao sincronizar pagamento:', error);
        return null;
    }
}

// Expor funções de sincronização
window.syncToSupabase = {
    turno: syncTurnoToSupabase,
    venda: syncVendaToSupabase,
    sangria: syncSangriaToSupabase,
    pagamentoFornecedor: syncPagamentoFornecedorToSupabase
};
