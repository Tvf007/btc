/**
 * js/modules/print.js
 * 
 * Gerencia a funcionalidade de impressão de recibos e cupons.
 */

// Funções de outros módulos (temporariamente via window)
const getCurrentTurnData = window.getCurrentTurnData;

/**
 * Gera o HTML e aciona a impressão de um recibo para uma venda específica.
 * @param {number} saleIndex - O índice da venda no array de histórico do turno.
 */
export function printReceipt(saleIndex) {
    const turnData = getCurrentTurnData();
    if (!turnData) return;

    const sale = turnData.history[saleIndex];
    if (!sale || sale.type !== 'sale') return;

    let receiptHTML = `
        <div class="print-receipt">
            <div class="receipt-header">
                <div class="receipt-title">PADARIA FREITAS</div>
                <div style="font-size:11px;margin-top:5px">CUPOM NÃO FISCAL</div>
                <div style="font-size:10px;margin-top:8px">${sale.date} - ${sale.time}</div>
            </div>
            <div class="receipt-items">
    `;

    sale.items.forEach(item => {
        receiptHTML += `
            <div class="receipt-item">
                <span>${item.quantity}x ${item.name}</span>
                <span>R$ ${item.total.toFixed(2).replace('.', ',')}</span>
            </div>
        `;
    });

    receiptHTML += `
            </div>
            <div class="receipt-total">
                <div style="display:flex;justify-content:space-between;margin:5px 0">
                    <span>TOTAL:</span>
                    <span>R$ ${sale.total.toFixed(2).replace('.', ',')}</span>
                </div>
    `;

    if (sale.payment === 'Cash') {
        receiptHTML += `
            <div style="display:flex;justify-content:space-between;margin:5px 0;font-size:12px">
                <span>Pagamento:</span>
                <span>DINHEIRO</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin:5px 0;font-size:12px">
                <span>Valor Recebido:</span>
                <span>R$ ${sale.received.toFixed(2).replace('.', ',')}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin:5px 0;font-size:12px">
                <span>Troco:</span>
                <span>R$ ${sale.change.toFixed(2).replace('.', ',')}</span>
            </div>
        `;
    } else {
        receiptHTML += `
            <div style="display:flex;justify-content:space-between;margin:5px 0;font-size:12px">
                <span>Pagamento:</span>
                <span>CARTÃO/PIX</span>
            </div>
        `;
    }

    receiptHTML += `
            </div>
            <div class="receipt-footer">
                <div>Obrigado pela preferência!</div>
                <div style="margin-top:5px">Volte sempre!</div>
            </div>
        </div>
    `;

    const printArea = document.getElementById('printArea');
    printArea.innerHTML = receiptHTML;
    printArea.style.display = 'block';

    window.print();

    // Limpa a área de impressão após um tempo
    setTimeout(() => {
        printArea.style.display = 'none';
        printArea.innerHTML = '';
    }, 100);
}
