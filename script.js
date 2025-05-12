(() => {
  // Theme toggle
  const root = document.documentElement;
  const toggle = document.getElementById('theme-toggle');
  const theme = localStorage.getItem('theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark':'light');
  if(theme==='dark') root.classList.add('dark');
  const pos = JSON.parse(localStorage.getItem('togglePos')||'{"top":20,"left":20}');
  toggle.style.top=pos.top+'px'; toggle.style.left=pos.left+'px';
  toggle.addEventListener('pointerdown', e=>{
    e.preventDefault();
    const shiftX = e.clientX-toggle.getBoundingClientRect().left;
    const shiftY = e.clientY-toggle.getBoundingClientRect().top;
    function onMove(ev){
      let x=ev.clientX-shiftX,y=ev.clientY-shiftY;
      x=Math.min(window.innerWidth-toggle.offsetWidth,Math.max(0,x));
      y=Math.min(window.innerHeight-toggle.offsetHeight,Math.max(0,y));
      toggle.style.left=x+'px';toggle.style.top=y+'px';
    }
    document.addEventListener('pointermove',onMove);
    document.addEventListener('pointerup',()=>{
      document.removeEventListener('pointermove',onMove);
      localStorage.setItem('togglePos',JSON.stringify({top:parseInt(toggle.style.top),left:parseInt(toggle.style.left)}));
    },{once:true});
  });
  toggle.ondragstart=()=>false;
  toggle.addEventListener('click',()=>{
    root.classList.toggle('dark');
    localStorage.setItem('theme',root.classList.contains('dark')?'dark':'light');
  });

  // PWA registration
  if('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js');

  // Elements
  const products = document.querySelectorAll('.product');
  const summaryList = document.getElementById('summary-list');
  const totalEl=document.getElementById('total');
  const receivedEl=document.getElementById('received');
  const customEl=document.getElementById('custom-value');
  const changeEl=document.getElementById('change');
  const messageEl=document.getElementById('message');
  const finalizeBtn=document.getElementById('finalize');
  const clearBtn=document.getElementById('clear');
  const historyList=document.getElementById('history-list');
  const keypad=document.getElementById('keypad');
  const display=document.getElementById('kbd-display');
  const keys=keypad.querySelectorAll('.key');
  const keyC=document.getElementById('key-clear');
  const keyB=document.getElementById('key-back');
  const keyO=document.getElementById('key-ok');

  let sale={items:[],total:0},history=JSON.parse(localStorage.getItem('history')||'[]'),activeInput=null,mode='',buffer='';

  const fmt=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});

  function resetSale(){
    sale={items:[],total:0};
    summaryList.innerHTML='';
    products.forEach(p=>p.querySelector('.count').textContent='0');
    totalEl.textContent='0.00';
    receivedEl.value='';
    changeEl.textContent='0.00';
    clearError();
    finalizeBtn.disabled=true;
  }
  function clearError(){messageEl.style.display='none';messageEl.textContent='';}
  function showError(msg){messageEl.textContent=msg;messageEl.style.display='block';}
  function renderHistory(){
    historyList.innerHTML='';
    history.forEach(h=>{const li=document.createElement('li');li.textContent=h;historyList.append(li);});
  }
  function updateSummary(){
    summaryList.innerHTML='';
    sale.items.slice().reverse().forEach(i=>{
      const li=document.createElement('li');
      li.textContent=i.custom?`Outros: ${fmt.format(i.price)}`:`${i.name} x${i.qty} = R$ ${(i.qty*i.price).toFixed(2)}`;
      summaryList.append(li);
    });
  }
  function updateTotal(){
    sale.total=sale.items.reduce((s,i)=>s+(i.custom?i.price:i.qty*i.price),0);
    totalEl.textContent=sale.total.toFixed(2);
    updateSummary();
    finalizeBtn.disabled=sale.items.length===0;
  }
  
  function showKeypad(input, mode) {
    activeInput = input;
    activeMode = mode;
    inputBuffer = '';
    display.textContent = '';
    keypad.classList.remove('hidden');
  }
  function hideKeypad() {
    keypad.classList.add('hidden');
    clearError();
  }


  // Keypad logic
  keys.forEach(k=>k.addEventListener('click',()=>{
    if(buffer.length<9){buffer+=k.textContent;
      if(mode==='integer'){activeInput.closest('.product').querySelector('.count').textContent=buffer;}
      else activeInput.value=fmt.format((parseInt(buffer,10)/100));
    }
  }));
  keyC.addEventListener('click',()=>{buffer='';display.textContent='';if(mode==='integer')activeInput.closest('.product').querySelector('.count').textContent='0';else activeInput.value='';});
  keyB.addEventListener('click',()=>{buffer=buffer.slice(0,-1);
    if(mode==='integer')activeInput.closest('.product').querySelector('.count').textContent=buffer||'0';
    else activeInput.value=fmt.format((parseInt(buffer||'0',10)/100));
  });
  keyO.addEventListener('click',()=>{
    if(!activeInput)return;
    if(mode==='integer'){
      const newQty=parseInt(buffer||'0',10);
      const prod=activeInput.closest('.product');
      prod.querySelector('.count').textContent=newQty;
      const name=prod.dataset.name,price=parseFloat(prod.dataset.price);
      const exist=sale.items.find(x=>x.name===name&&!x.custom);
      if(newQty>0){exist?exist.qty=newQty:sale.items.push({name,price,qty:newQty});}
      else if(exist){sale.items=sale.items.filter(x=>x!==exist);}
      updateTotal();
    } else if(mode==='currency-custom'){
      const price=parseInt(buffer||'0',10)/100;
      sale.items.push({name:'Outros',price,qty:1,custom:true});
      updateTotal(); customEl.value=''; 
    } else if(mode==='currency-received'){
      const rec=parseInt(buffer||'0',10)/100;
      receivedEl.value=fmt.format(rec);
      changeEl.textContent=(rec-sale.total).toFixed(2);
    }
    hideKeypad();
  });

  products.forEach(prod=>{
    const inpt=prod.querySelector('.count-input');
    prod.querySelector('.pencil').addEventListener('click', e => {
      e.stopPropagation();
      const countInput = prod.querySelector('.count-input');
      const currentQty = parseInt(prod.querySelector('.count').textContent, 10) || 0;
      countInput.value = currentQty;
      showKeypad(countInput, 'integer');
    });
    prod.addEventListener('click',e=>{if(e.target.classList.contains('pencil'))return;let c=parseInt(prod.querySelector('.count').textContent,10)+1;prod.querySelector('.count').textContent=c;
      const name=prod.dataset.name,price=parseFloat(prod.dataset.price);
      const exist=sale.items.find(x=>x.name===name&&!x.custom);
      exist?exist.qty=c:sale.items.push({name,price,qty:c});updateTotal();
    });
  });

  customEl.addEventListener('click',()=>showKeypad(customEl,'currency-custom'));
  receivedEl.addEventListener('click',()=>showKeypad(receivedEl,'currency-received'));

  finalizeBtn.addEventListener('click',()=>{
    clearError();
    const rec=parseFloat(receivedEl.value.replace(/[^0-9,-\.]/g,''))||0;
    if(!receivedEl.value){showError('Falta inserir valor recebido.');return;}
    if(rec<sale.total){showError('Valor insuficiente.');return;}
    const ts=new Date().toLocaleString();
    const lines=sale.items.map(i=>i.custom?`Outros: ${fmt.format(i.price)}`:`${i.name} x${i.qty} = R$ ${(i.qty*i.price).toFixed(2)}`);
    lines.push(`Total: R$ ${sale.total.toFixed(2)}`,`Recebido: R$ ${rec.toFixed(2)}`,`Troco: R$ ${(rec-sale.total).toFixed(2)}`);
    history.unshift(`${ts} | ${lines.join(' | ')}`);localStorage.setItem('history',JSON.stringify(history));renderHistory();
    resetSale();
  });
  clearBtn.addEventListener('click',resetSale);

  renderHistory(); resetSale();
})();