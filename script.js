(() => {
  // Theme toggle and SW registration
  const root = document.documentElement;
  const toggle = document.getElementById('theme-toggle');
  const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  if (savedTheme === 'dark') root.classList.add('dark');
  const pos = JSON.parse(localStorage.getItem('togglePos')||'{"top":20,"left":20}');
  toggle.style.top=pos.top+'px'; toggle.style.left=pos.left+'px';
  toggle.addEventListener('pointerdown', e=>{e.preventDefault();const shiftX=e.clientX-toggle.getBoundingClientRect().left, shiftY=e.clientY-toggle.getBoundingClientRect().top;function onMove(ev){let x=ev.clientX-shiftX, y=ev.clientY-shiftY; x=Math.min(window.innerWidth-toggle.offsetWidth, Math.max(0,x)); y=Math.min(window.innerHeight-toggle.offsetHeight, Math.max(0,y)); toggle.style.left=x+'px'; toggle.style.top=y+'px';} document.addEventListener('pointermove',onMove); document.addEventListener('pointerup',()=>{document.removeEventListener('pointermove',onMove); localStorage.setItem('togglePos', JSON.stringify({top:parseInt(toggle.style.top),left:parseInt(toggle.style.left)}));},{once:true});});
  toggle.ondragstart=()=>false; toggle.addEventListener('click',()=>{root.classList.toggle('dark'); localStorage.setItem('theme', root.classList.contains('dark')?'dark':'light');});
  window.addEventListener('load',()=>{'serviceWorker' in navigator && navigator.serviceWorker.register('service-worker.js')});

  // Sale logic
  const products=document.querySelectorAll('.product');
  const summaryList=document.getElementById('summary-list');
  const totalEl=document.getElementById('total');
  const receivedEl=document.getElementById('received');
  const customInput=document.getElementById('custom-value');
  const changeEl=document.getElementById('change');
  const messageEl=document.getElementById('message');
  const finalizeBtn=document.getElementById('finalize');
  const clearBtn=document.getElementById('clear');
  const historyList=document.getElementById('history-list');
  const keypad=document.getElementById('keypad');
  const display=document.getElementById('kbd-display');
  const keys=keypad.querySelectorAll('.key');
  const keyClear=document.getElementById('key-clear');
  const keyBack=document.getElementById('key-back');
  const keyOk=document.getElementById('key-ok');
  let sale={items:[],total:0}, history=JSON.parse(localStorage.getItem('history')||'[]'), activeInput=null, activeMode='', inputBuffer='';

  const fmtCur=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
  function formatCurrency(buf){return fmtCur.format((parseInt(buf||'0',10)/100));}
  function parseCurrency(buf){return parseInt(buf||'0',10);}

  function updateSummary(){ summaryList.innerHTML=''; sale.items.forEach(i=>{const li=document.createElement('li'); li.textContent=i.custom?`Outros: ${fmtCur.format(i.price)}`:`${i.name} x${i.qty} = R$ ${(i.qty*i.price).toFixed(2)}`; summaryList.append(li); }); }
  function updateTotal(){ sale.total=sale.items.reduce((s,i)=>s+(i.custom?i.price:(i.qty*i.price)),0); totalEl.textContent=sale.total.toFixed(2); updateSummary(); finalizeBtn.disabled=sale.items.length===0; }
  function showError(msg){ messageEl.textContent=msg; messageEl.style.display='block'; }
  function clearError(){ messageEl.style.display='none'; messageEl.textContent=''; }
  function renderHistory(){ historyList.innerHTML=''; history.forEach(e=>{const li=document.createElement('li'); li.textContent=e; historyList.append(li);}); }

  function showKeypad(input, mode){
    const mainEl = document.querySelector('main'); activeInput=input; activeMode=mode; inputBuffer=''; display.textContent=''; keypad.classList.remove('hidden');
    // adjust padding so keypad doesn't cover inputs
    if (typeof mainEl !== 'undefined') mainEl.style.paddingBottom = `${keypad.offsetHeight}px`; }
  function hideKeypad(){ keypad.classList.add('hidden');
    // reset padding
    if (typeof document.querySelector === 'function') document.querySelector('main').style.paddingBottom = ''; clearError(); }

  keys.forEach(btn=>btn.addEventListener('click',()=>{
    if(inputBuffer.length<9){ inputBuffer+=btn.textContent;
      if(activeMode==='integer-count'){ // update count live
        const prod=activeInput.closest('.product');
        prod.querySelector('.count').textContent=inputBuffer;
      } else if(activeMode==='currency-custom'){ customInput.value=formatCurrency(inputBuffer); }
      else if(activeMode==='currency-received'){ receivedEl.value=formatCurrency(inputBuffer); }
    }
  }));
  keyClear.addEventListener('click',()=>{ inputBuffer=''; display.textContent=''; if(activeMode==='integer-count'){activeInput.closest('.product').querySelector('.count').textContent='0';} else activeInput.value=''; });
  keyBack.addEventListener('click',()=>{ inputBuffer=inputBuffer.slice(0,-1);
    if(activeMode==='integer-count'){ activeInput.closest('.product').querySelector('.count').textContent=inputBuffer||'0'; }
    else if(activeMode==='currency-custom'){ customInput.value=formatCurrency(inputBuffer); }
    else if(activeMode==='currency-received'){ receivedEl.value=formatCurrency(inputBuffer); }
  });
  keyOk.addEventListener('click',()=>{
    if(!activeInput) return;
    if(activeMode==='integer-count'){
      // sync qty
      const prod=activeInput.closest('.product');
      const newQty=parseInt(inputBuffer||'0',10);
      prod.querySelector('.count').textContent=newQty;
      const name=prod.dataset.name, price=parseFloat(prod.dataset.price);
      const existing=sale.items.find(i=>i.name===name&&!i.custom);
      if(newQty>0){ existing? existing.qty=newQty : sale.items.push({name, price, qty:newQty}); }
      else if(existing){ sale.items=sale.items.filter(i=>i!==existing); }
      updateTotal();
    } else if(activeMode==='currency-custom'){
      const cents=parseCurrency(inputBuffer); const price=cents/100;
      sale.items.push({name:'Outros', price, qty:1, custom:true});
      updateTotal();
      customInput.value='';
    } else if(activeMode==='currency-received'){
      const cents=parseCurrency(inputBuffer); receivedEl.value=formatCurrency(inputBuffer);
      const rec=cents/100; changeEl.textContent=(rec - sale.total).toFixed(2);
    }
    hideKeypad();
  });

  products.forEach(prod=>{
    const countInput=prod.querySelector('.count-input');
    prod.querySelector('.pencil').addEventListener('click',()=>{
      const current=parseInt(prod.querySelector('.count').textContent,10);
      inputBuffer=current.toString(); showKeypad(countInput,'integer-count');
    });
    prod.addEventListener('click',e=>{
      if(e.target.classList.contains('pencil')) return;
      const countEl=prod.querySelector('.count');
      let qty=parseInt(countEl.textContent,10)+1;
      countEl.textContent=qty;
      const name=prod.dataset.name, price=parseFloat(prod.dataset.price);
      const existing=sale.items.find(i=>i.name===name&&!i.custom);
      existing? existing.qty=qty : sale.items.push({name, price, qty});
      updateTotal();
    });
  });

  customInput.addEventListener('click',()=>showKeypad(customInput,'currency-custom'));
  receivedEl.addEventListener('click',()=>showKeypad(receivedEl,'currency-received'));

  finalizeBtn.addEventListener('click',()=>{
    clearError();
    const rec=parseFloat(receivedEl.value.replace(/[^0-9,\.]/g,''))||0;
    if(receivedEl.value===''){ showError('Falta inserir valor recebido.'); return; }
    if(rec<sale.total){ showError('Valor insuficiente.'); return; }
    const ts=new Date().toLocaleString();
    const lines=sale.items.map(i=>i.custom?`Outros: ${fmtCur.format(i.price)}`:`${i.name} x${i.qty} = R$ ${(i.qty*i.price).toFixed(2)}`);
    lines.push(`Total: R$ ${sale.total.toFixed(2)}`,`Recebido: R$ ${rec.toFixed(2)}`,`Troco: R$ ${(rec-sale.total).toFixed(2)}`);
    history.unshift(`${ts} | ${lines.join(' | ')}`);
    localStorage.setItem('history',JSON.stringify(history));
    renderHistory();
    
    // clear sale for next
    resetSale();
    saleFinalized = true;
  });

  clearBtn.addEventListener('click',()=>{
    sale={items:[],total:0};
    products.forEach(p=>p.querySelector('.count').textContent='0');
    totalEl.textContent='0.00'; changeEl.textContent='0.00';
    receivedEl.value=''; clearError(); finalizeBtn.disabled=true;
  });

  renderHistory(); 
    // clear sale for next
    resetSale();
    finalizeBtn.disabled=true;
})();