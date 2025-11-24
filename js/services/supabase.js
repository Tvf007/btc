import { SUPABASE } from '../config.js';

class SupabaseClient {
    constructor() {
        this.url = SUPABASE.url;
        this.key = SUPABASE.key;
        this.headers = {
            'apikey': this.key,
            'Authorization': `Bearer ${this.key}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        };
    }

    async request(method, endpoint, data = null) {
        const options = {
            method,
            headers: this.headers
        };

        if (data && (method === 'POST' || method === 'PATCH')) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(`${this.url}/rest/v1/${endpoint}`, options);
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Erro na requisição');
            }

            if (method === 'DELETE' && response.status === 204) {
                return { success: true };
            }

            return await response.json();
        } catch (error) {
            console.error('Erro na requisição Supabase:', error);
            throw error;
        }
    }

    async criarTurno(tipo, valorInicial = 0) {
        return await this.request('POST', 'turnos', {
            tipo,
            valor_inicial: valorInicial,
            status: 'aberto'
        });
    }

    async buscarTurnoAberto() {
        const turnos = await this.request('GET', 'turnos?status=eq.aberto&order=data_abertura.desc&limit=1');
        return turnos.length > 0 ? turnos[0] : null;
    }

    async fecharTurno(turnoId, valorFinal, observacoes = null) {
        return await this.request('PATCH', `turnos?id=eq.${turnoId}`, {
            status: 'fechado',
            data_fechamento: new Date().toISOString(),
            valor_final: valorFinal,
            observacoes
        });
    }

    async buscarTurnosPorPeriodo(dataInicio, dataFim) {
        const inicio = new Date(dataInicio).toISOString();
        const fim = new Date(dataFim).toISOString();
        return await this.request('GET', 
            `turnos?data_abertura=gte.${inicio}&data_abertura=lte.${fim}&order=data_abertura.desc`
        );
    }

    async criarVenda(turnoId, venda) {
        const vendaData = {
            turno_id: turnoId,
            total: venda.total,
            metodo_pagamento: venda.metodoPagamento,
            valor_recebido: venda.valorRecebido || null,
            troco: venda.troco || null,
            valor_dinheiro: venda.valorDinheiro || null,
            valor_cartao: venda.valorCartao || null,
            observacoes: venda.observacoes || null
        };

        return await this.request('POST', 'vendas', vendaData);
    }

    async criarItensVenda(vendaId, itens) {
        const itensData = itens.map(item => ({
            venda_id: vendaId,
            produto_nome: item.name,
            quantidade: item.quantity,
            preco_unitario: item.price,
            total: item.price * item.quantity
        }));

        return await this.request('POST', 'itens_venda', itensData);
    }

    async buscarVendasPorTurno(turnoId) {
        return await this.request('GET', `vendas?turno_id=eq.${turnoId}&order=data_hora.desc`);
    }

    async buscarVendasPorPeriodo(dataInicio, dataFim) {
        const inicio = new Date(dataInicio).toISOString();
        const fim = new Date(dataFim).toISOString();
        return await this.request('GET', 
            `vendas?data_hora=gte.${inicio}&data_hora=lte.${fim}&order=data_hora.desc`
        );
    }

    async criarSangria(turnoId, valor, motivo) {
        return await this.request('POST', 'sangrias', {
            turno_id: turnoId,
            valor,
            motivo
        });
    }

    async buscarSangriasPorTurno(turnoId) {
        return await this.request('GET', `sangrias?turno_id=eq.${turnoId}&order=data_hora.desc`);
    }

    async criarPagamentoFornecedor(turnoId, fornecedor, valor, tipoPagamento, observacoes = null) {
        return await this.request('POST', 'pagamentos_fornecedor', {
            turno_id: turnoId,
            fornecedor,
            valor,
            tipo_pagamento: tipoPagamento,
            observacoes
        });
    }

    async buscarPagamentosPorTurno(turnoId) {
        return await this.request('GET', `pagamentos_fornecedor?turno_id=eq.${turnoId}&order=data_hora.desc`);
    }

    async buscarResumoTurno(turnoId) {
        const resumo = await this.request('GET', `vw_resumo_turnos?turno_id=eq.${turnoId}`);
        return resumo.length > 0 ? resumo[0] : null;
    }

    async buscarVendasCompletas(limite = 100) {
        return await this.request('GET', `vw_vendas_completas?limit=${limite}&order=data_hora.desc`);
    }
}

const supabase = new SupabaseClient();

export { supabase };