(() => {
  const root = document.documentElement;
  const toggle = document.getElementById('theme-toggle');
  // Load theme
  const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  if (savedTheme === 'dark') root.classList.add('dark');
  // Position
  const pos = JSON.parse(localStorage.getItem('togglePos') || '{"top":20,"left":20}');
  toggle.style.top = pos.top + 'px';
  toggle.style.left = pos.left + 'px';
  // Drag
  toggle.addEventListener('pointerdown', e => {
    e.preventDefault();
    const shiftX = e.clientX - toggle.getBoundingClientRect().left;
    const shiftY = e.clientY - toggle.getBoundingClientRect().top;
    function onMove(ev) {
      let x = ev.clientX - shiftX, y = ev.clientY - shiftY;
      x = Math.min(window.innerWidth - toggle.offsetWidth, Math.max(0, x));
      y = Math.min(window.innerHeight - toggle.offsetHeight, Math.max(0, y));
      toggle.style.left = x + 'px'; toggle.style.top = y + 'px';
    }
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', () => {
      document.removeEventListener('pointermove', onMove);
      localStorage.setItem('togglePos', JSON.stringify({ top: parseInt(toggle.style.top), left: parseInt(toggle.style.left) }));
    }, { once: true });
  });
  toggle.ondragstart = () => false;
  // Click to toggle theme
  toggle.addEventListener('click', () => {
    root.classList.toggle('dark');
    const theme = root.classList.contains('dark') ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
  });

  // Existing functionality
  const products = document.querySelectorAll('.product');
  const totalEl = document.getElementById('total');
  const receivedEl = document.getElementById('received');
  const changeEl = document.getElementById('change');
  const messageEl = document.getElementById('message');
  const addCustom = document.getElementById('add-custom');
  const customValue = document.getElementById('custom-value');
  const finalizeBtn = document.getElementById('finalize');
  const clearBtn = document.getElementById('clear');
  const historyList = document.getElementById('history-list');
  const keypad = document.getElementById('keypad');
  const display = document.getElementById('kbd-display');
  const keys = keypad.querySelectorAll('.key');
  const keyClear = document.getElementById('key-clear');
  const keyBack = document.getElementById('key-back');
  const keyOk = document.getElementById('key-ok');
  let sale = { items: [], total: 0 };
  let history = JSON.parse(localStorage.getItem('history') || '[]');
  let activeInput = null;
  let inputBuffer = '';

  function updateTotal() {
    sale.total = sale.items.reduce((s, i) => s + (i.custom || i.qty * i.price), 0);
    totalEl.textContent = sale.total.toFixed(2);
    updateChange();
  }
  function updateChange() {
    const rec = parseFloat(receivedEl.value) || 0;
    if (!receivedEl.value) {
      messageEl.textContent = 'Aguardando pagamento'; messageEl.className = 'message'; changeEl.textContent = 'Aguardando pagamento'; finalizeBtn.disabled = true;
    } else if (rec < sale.total) {
      messageEl.textContent = 'Pagamento insuficiente'; messageEl.className = 'message error'; changeEl.textContent = 'Valor insuficiente'; finalizeBtn.disabled = true;
    } else {
      const troco = (rec - sale.total).toFixed(2); messageEl.textContent = 'Pagamento OK'; messageEl.className = 'message success'; changeEl.textContent = troco; finalizeBtn.disabled = false;
    }
  }
  function renderHistory() { historyList.innerHTML = ''; history.forEach(e => { const li = document.createElement('li'); li.textContent = e; historyList.append(li); }); }
  function addHistory(ent) { history.unshift(ent); localStorage.setItem('history', JSON.stringify(history)); renderHistory(); }

  function showKeypad(input) { activeInput = input; inputBuffer = ''; display.textContent = ''; keypad.classList.remove('hidden'); }
  function hideKeypad() { keypad.classList.add('hidden'); if (activeInput === receivedEl) updateChange(); activeInput = null; }
  keys.forEach(btn => btn.addEventListener('click', () => { if (inputBuffer.length < 7) { inputBuffer += btn.textContent; display.textContent = inputBuffer; } }));
  keyClear.addEventListener('click', () => { inputBuffer = ''; display.textContent = ''; });
  keyBack.addEventListener('click', () => { inputBuffer = inputBuffer.slice(0, -1); display.textContent = inputBuffer; });
  keyOk.addEventListener('click', () => { if (!activeInput) return; activeInput.value = inputBuffer; if (activeInput === customValue) addCustom.click(); hideKeypad(); });

  customValue.addEventListener('click', () => showKeypad(customValue));
  receivedEl.addEventListener('click', () => showKeypad(receivedEl));

  products.forEach(prod => {
    const name = prod.dataset.name; const price = parseFloat(prod.dataset.price); let qty = 0;
    function sync() {
      prod.querySelector('.count').textContent = qty;
      const i = sale.items.findIndex(it => it.name === name);
      if (qty > 0) {
        if (i >= 0) sale.items[i].qty = qty; else sale.items.push({ name, price, qty });
      } else if (i >= 0) sale.items.splice(i, 1);
      updateTotal();
    }
    prod.addEventListener('click', e => { if (!e.target.classList.contains('pencil')) { qty++; sync(); } });
    prod.querySelector('.pencil').addEventListener('click', () => {
      const val = parseInt(prompt(`Qtd ${name}:`, qty), 10); if (!isNaN(val) && val >= 0) { qty = val; sync(); }
    });
  });

  addCustom.addEventListener('click', () => {
    const val = parseFloat(customValue.value); if (!isNaN(val) && val > 0) { sale.items.push({ name: 'Outros', custom: val }); updateTotal(); customValue.value = ''; }
  });

  finalizeBtn.addEventListener('click', () => {
    const ts = new Date().toLocaleString();
    const lines = sale.items.map(i => i.custom ? `Outros: R$ ${i.custom.toFixed(2)}` : `${i.name} x${i.qty} = R$ ${(i.qty * i.price).toFixed(2)}`);
    lines.push(`Total: R$ ${sale.total.toFixed(2)}`, `Recebido: R$ ${receivedEl.value}`, `Troco: R$ ${changeEl.textContent}`);
    addHistory(`${ts} | ${lines.join(' | ')}`); clearBtn.click();
  });

  clearBtn.addEventListener('click', () => {
    sale = { items: [], total: 0 }; products.forEach(p => p.querySelector('.count').textContent = '0');
    totalEl.textContent = '0.00'; receivedEl.value = ''; changeEl.textContent = 'Aguardando pagamento';
    messageEl.textContent = 'Aguardando pagamento'; messageEl.className = 'message'; finalizeBtn.disabled = true;
  });

  renderHistory(); finalizeBtn.disabled = true;

  // Register service worker
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js');
})();