// carrega histórico do carrinho do localStorage
const cart = JSON.parse(localStorage.getItem('cart') || '[]');

(() => {
  const products = document.querySelectorAll('.product');
  const customValue = document.getElementById('custom-value');
  const receivedEl = document.getElementById('received');
  const summaryList = document.getElementById('summary-list');
  const changeEl = document.getElementById('change');
  const messageEl = document.getElementById('message');
  const finalizeBtn = document.getElementById('finalize');
  const clearBtn = document.getElementById('clear');
  const historyList = document.getElementById('history-list');
  const keypad = document.getElementById('keypad');
  const display = document.getElementById('kbd-display');
  const keyElems = keypad.querySelectorAll('.key, #key-clear, #key-back');
  const keyOk = document.getElementById('key-ok');

  // Clear all data and UI for next sale
  function clearAll() {
    sale = { items: [], total: 0 };
    // Clear summary list
    summaryList.innerHTML = '';
    // Reset product counts
    productHandlers.forEach(h => h.setQty(0));
    // Reset received value
    receivedRaw = 0;
    receivedEl.value = '';
    // Reset change and message
    changeEl.textContent = 'Aguardando pagamento';
    messageEl.textContent = 'Aguardando pagamento';
    messageEl.className = 'message';
    // Reset fixed total display
    document.getElementById('fixed-total').textContent = 'Total: R$ 0,00';
    // Reset keyboard buffer and display
    inputBuffer = '';
    display.textContent = '';
    activeInput = null;
    activeProduct = null;
    // Hide keypad if open
    if (!keypad.classList.contains('hidden')) {
      hideKeypad();
    }
    // Remove focus
    if (document.activeElement) {
      document.activeElement.blur();
    }
  }


  let sale = { items: [], total: 0 };
  let history = JSON.parse(localStorage.getItem('history') || '[]');
  let activeProduct = null;
  let activeInput = null;
  let inputBuffer = '';
  let receivedRaw = 0;
  const productHandlers = new Map();

  function formatBRL(val) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  }

  function renderSummary() {
    summaryList.innerHTML = '';
    sale.items.forEach(item => {
      const li = document.createElement('li');
      if (item.custom) li.textContent = `Outros: ${formatBRL(item.custom)}`;
      else li.textContent = `${item.name} x${item.qty} = ${formatBRL(item.qty * item.price)}`;
      summaryList.appendChild(li);
    });
  }

  function updateTotal() {
    sale.total = sale.items.reduce((sum, i) => sum + (i.custom || i.qty * i.price), 0);
    renderSummary();
  // Update fixed total display
  document.getElementById('fixed-total').textContent = `Total: ${formatBRL(sale.total)}`;
    updateChange();
  }

  function updateChange() {
    const rec = receivedRaw;
    if (!receivedEl.value) {
      messageEl.textContent = 'Aguardando pagamento';
      messageEl.className = 'message';
      changeEl.textContent = 'Aguardando pagamento';
      finalizeBtn.disabled = true;
    } else if (rec < sale.total) {
      messageEl.textContent = 'Pagamento insuficiente';
      messageEl.className = 'message error';
      changeEl.textContent = 'Valor insuficiente';
      finalizeBtn.disabled = true;
    } else {
      messageEl.textContent = 'Pagamento OK';
      messageEl.className = 'message success';
      changeEl.textContent = formatBRL(rec - sale.total);
      finalizeBtn.disabled = false;
    }
  }

  function clearSale() {
    sale = { items: [], total: 0 };
    summaryList.innerHTML = '';
    receivedEl.value = '';
    receivedRaw = 0;
    changeEl.textContent = 'Aguardando pagamento';
    messageEl.textContent = 'Aguardando pagamento';
    messageEl.className = 'message';
    finalizeBtn.disabled = true;
    productHandlers.forEach(h => h.setQty(0));
  }

  function renderHistory() {
    historyList.innerHTML = '';
    history.forEach(record => {
      const li = document.createElement('li');
      li.innerHTML = `<div class="timestamp">${record.timestamp}</div>
                      <ul class="details">${record.lines.map(l => `<li>${l}</li>`).join('')}</ul>`;
      historyList.appendChild(li);
    });
  }

  function addHistory(entry) {
    history.unshift(entry);
    localStorage.setItem('history', JSON.stringify(history));
    renderHistory();
  }

  function showKeypad(target) {
    activeProduct = target.classList.contains('product') ? target : null;
    activeInput = (target === customValue || target === receivedEl) ? target : null;
    document.querySelector('.custom').classList.toggle('active', activeInput === customValue);
    inputBuffer = '';
    display.textContent = '';
    keypad.classList.remove('hidden');
  }

  function hideKeypad() {
    keypad.classList.add('hidden');
    document.querySelector('.custom').classList.remove('active');
    const normalized = inputBuffer.replace(',', '.');
    const val = parseFloat(normalized);
    if (activeInput) {
      if (activeInput === customValue) {
        if (!isNaN(val) && val > 0) {
          sale.items.push({ custom: val });
          updateTotal();
        }
        customValue.value = '';
      } else {
        receivedRaw = isNaN(val) ? 0 : val;
        receivedEl.value = formatBRL(receivedRaw);
        updateChange();
      }
    } else if (activeProduct) {
      const handler = productHandlers.get(activeProduct);
      const intVal = parseInt(inputBuffer, 10);
      if (!isNaN(intVal) && intVal >= 0) handler.setQty(intVal);
      updateTotal();
    }
    activeProduct = null;
    activeInput = null;
  }

  keyElems.forEach(btn => btn.addEventListener('click', () => {
    const text = btn.textContent;
    if (text === 'C') {
      inputBuffer = '';
      display.textContent = '';
      if (activeInput) activeInput.value = '';
      if (activeProduct) activeProduct.querySelector('.count').textContent = '0';
    } else if (text === '←') {
      inputBuffer = inputBuffer.slice(0, -1);
      display.textContent = inputBuffer;
      if (activeInput) activeInput.value = inputBuffer;
      if (activeProduct) activeProduct.querySelector('.count').textContent = inputBuffer || '0';
    } else {
      if (inputBuffer.length < 7) {
        if (text === ',' && inputBuffer.includes(',')) return;
        inputBuffer += text;
        display.textContent = inputBuffer;
        if (activeInput) activeInput.value = inputBuffer;
        if (activeProduct) activeProduct.querySelector('.count').textContent = inputBuffer;
      }
    }
  }));

  keyOk.addEventListener('click', hideKeypad);
  customValue.addEventListener('click', () => showKeypad(customValue));
  receivedEl.addEventListener('click', () => showKeypad(receivedEl));

  products.forEach(prod => {
    const price = parseFloat(prod.dataset.price);
    let qty = 0;
    function sync() {
      prod.querySelector('.count').textContent = qty;
      const idx = sale.items.findIndex(i => i.name === prod.dataset.name && !i.custom);
      if (qty > 0) {
        if (idx >= 0) sale.items[idx].qty = qty;
        else sale.items.push({ name: prod.dataset.name, price, qty });
      } else if (idx >= 0) {
        sale.items.splice(idx, 1);
      }
      updateTotal();
    }
    productHandlers.set(prod, { setQty: v => { qty = v; sync(); } });
    prod.addEventListener('click', e => { if (!e.target.classList.contains('pencil')) { qty++; sync(); } });
    prod.querySelector('.pencil').addEventListener('click', () => showKeypad(prod));
  });

  finalizeBtn.addEventListener('click', () => {
    const ts = new Date().toLocaleString();
    const lines = sale.items.map(item => {
      if (item.custom) return `Outros: ${formatBRL(item.custom)}`;
      return `${item.name} x${item.qty} = ${formatBRL(item.qty * item.price)}`;
    });
    lines.push(`Total: ${formatBRL(sale.total)}`, `Recebido: ${formatBRL(receivedRaw)}`, `Troco: ${changeEl.textContent}`);
    addHistory({ timestamp: ts, lines });
    // Delay clear to ensure history render, then reset UI
    setTimeout(() => { clearAll(); clearSale(); }, 0);
    document.getElementById('fixed-total').textContent = 'Total: R$ 0,00';
  document.getElementById('fixed-total').textContent = 'Total: R$ 0,00';
  });

  clearBtn.addEventListener('click', clearSale);

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/service-worker.js');

  renderHistory();
  clearSale();
})();

// Theme toggle functionality
const themeToggle = document.getElementById('theme-toggle');
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    themeToggle.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
  });
  // Set initial icon based on current theme
  themeToggle.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
}

// abre modal/input ao clicar no lápis
document.querySelectorAll('.icon-pencil').forEach(icon => {
  const id = icon.getAttribute('data-id');
  icon.addEventListener('click', () => openQtyModal(id));
});
