/**
 * js/modules/cart.js
 * 
 * Gerencia todas as operações relacionadas ao carrinho de compras,
 * como adicionar, remover, editar e exibir itens.
 */

import { getState, setState } from '../state.js';

// Funções de outros módulos que serão usadas aqui (via window)
// const { getState, setState } = window; // Removido, agora importado diretamente

// --- Manipulação de Itens do Carrinho ---

/**
 * Adiciona um produto ao carrinho. Se o produto já existir, incrementa a quantidade.
 * @param {{name: string, price: number, quantity: number}} product - O produto a ser adicionado.
 */
export function addProduct(name, price) {
    const { cart } = getState();
    const newCart = [...cart]; // Cria uma cópia para evitar mutação direta

    // Tratamento para o item "Outros"
    if (name === 'Outros') {
        newCart.unshift({
            name: 'Outros',
            price: price,
            quantity: 1,
            total: price,
            isOther: true
        });
    } else {
        const existingIndex = newCart.findIndex(item => item.name === name && !item.isOther);
        if (existingIndex >= 0) {
            newCart[existingIndex].quantity++;
            newCart[existingIndex].total = newCart[existingIndex].quantity * newCart[existingIndex].price;
        } else {
            newCart.unshift({
                name: name,
                price: price,
                quantity: 1,
                total: price,
                isOther: false
            });
        }
    }

    setState({ cart: newCart });
    updateCart();
    
    // Atualiza valores de pagamento se já tiver método selecionado
    const { paymentMethod } = getState();
    if (paymentMethod === 'Cash') {
        window.calculateChange(); // Recalcula o troco
    } else if (paymentMethod === 'Card/PIX') {
        window.updateCardDisplay(); // Atualiza o total do cartão
    }
}

/**
 * Remove um item do carrinho pelo seu índice.
 * @param {number} index - O índice do item a ser removido.
 */
export function removeItem(index) {
    const { cart } = getState();
    const newCart = [...cart];
    newCart.splice(index, 1);
    
    setState({ cart: newCart });
    updateCart();
}

// --- Edição de Itens ---

/**
 * Abre o teclado virtual para editar a quantidade de um item.
 * @param {number} index - O índice do item a ser editado.
 */
export function openItemEditor(index) {
    const { cart } = getState();
    const item = cart[index];

    if (item.isOther) {
        // Este caminho não deve mais ser acionado pela UI principal.
        console.warn("openItemEditor chamado para item 'Outros' indevidamente.");
        return;
    }
    
    // Abre o teclado para editar a QUANTIDADE de um item padrão
    window.openKeyboard('quantity', { itemIndex: index });
}

/**
 * Edita a quantidade de um item no carrinho.
 * Chamada pelo módulo do teclado.
 * @param {number} index - O índice do item a ser editado.
 * @param {number} newQuantity - A nova quantidade.
 */
export function editItemQuantity(index, newQuantity) {
    if (newQuantity <= 0) {
        removeItem(index);
        return;
    }
    
    const { cart } = getState();
    const newCart = [...cart];
    const item = newCart[index];

    item.quantity = newQuantity;
    item.total = item.price * newQuantity;

    setState({ cart: newCart });
    updateCart();
}

// --- Atualização da UI ---

/**
 * Atualiza a exibição do carrinho na interface, recalculando totais e renderizando os itens.
 */
export function updateCart() {
    const { cart } = getState();
    const summaryList = document.getElementById('summaryList');

    if (cart.length === 0) {
        summaryList.innerHTML = '<div class="empty-cart"><i class="fas fa-shopping-cart"></i><p>Nenhum item adicionado</p></div>';
    } else {
        summaryList.innerHTML = cart.map((item, i) => {
            if (!item || typeof item.price !== 'number' || typeof item.total !== 'number') {
                console.error('❌ Item inválido no carrinho:', item);
                return ''; // Retorna string vazia para item inválido
            }

            if (item.isOther) {
                // Template para itens "Outros", com edição de nome e preço
                return `
                    <div class="summary-item is-others">
                        <div>
                            <div class="item-label editable" onclick="event.stopPropagation(); window.editOtherName(${i})">
                                ${item.name} <i class="fas fa-pen fa-xs"></i>
                            </div>
                            <div class="item-quantity">${item.quantity}x R$ ${item.price.toFixed(2).replace('.', ',')}</div>
                        </div>
                        <div class="item-price editable" onclick="event.stopPropagation(); window.editOtherPrice(${i})">
                            R$ ${item.total.toFixed(2).replace('.', ',')} <i class="fas fa-pen fa-xs"></i>
                        </div>
                        <button class="btn-delete" onclick="event.stopPropagation(); window.removeItem(${i})"><i class="fas fa-trash"></i></button>
                    </div>
                `;
            } else {
                // Template para itens padrão, com edição de quantidade
                return `
                    <div class="summary-item" onclick="window.openItemEditor(${i})">
                        <div>
                            <div class="item-label">${item.name}</div>
                            <div class="item-quantity">${item.quantity}x R$ ${item.price.toFixed(2).replace('.', ',')}</div>
                        </div>
                        <div class="item-price">R$ ${item.total.toFixed(2).replace('.', ',')}</div>
                        <button class="btn-delete" onclick="event.stopPropagation(); window.removeItem(${i})"><i class="fas fa-trash"></i></button>
                    </div>
                `;
            }
        }).join('');

    }

    // Recalcula o total e atualiza o estado
    const total = cart.reduce((acc, item) => acc + (item.total || 0), 0);
    setState({ total });

    // Atualiza a UI
    document.getElementById('totalAmount').textContent = 'R$ ' + total.toFixed(2).replace('.', ',');

    // Atualiza outras partes da UI que dependem do total
    const { paymentMethod, receivedAmount } = getState();
    if (paymentMethod === 'Card/PIX') {
        window.updateCardDisplay();
    }
    if (paymentMethod === 'Cash' && receivedAmount > 0) {
        window.calculateChange();
    }
}

/**
 * Permite renomear um item "Outros" do carrinho.
 * @param {number} index - O índice do item no carrinho.
 */
export function editOtherName(index) {
    const { cart } = getState();
    const item = cart[index];
    
    if (!item || !item.isOther) {
        window.showNotification('Este item não pode ser renomeado', 'warning');
        return;
    }
    
    const newName = prompt('Novo nome do produto:', item.name);
    
    if (newName === null) return; // Usuário cancelou
    
    if (!newName.trim()) {
        window.showNotification('O nome não pode estar vazio', 'warning');
        return;
    }
    
    const newCart = [...cart];
    newCart[index].name = newName.trim();
    
    setState({ cart: newCart });
    updateCart();
    window.showNotification('Nome atualizado com sucesso!', 'success');
}

/**
 * Permite alterar o preço de um item "Outros" do carrinho.
 * @param {number} index - O índice do item no carrinho.
 */
export function editOtherPrice(index) {
    const { cart } = getState();
    const item = cart[index];
    
    if (!item || !item.isOther) {
        window.showNotification('Este item não permite edição de preço', 'warning');
        return;
    }
    
    // Abre o teclado para editar o preço
    window.openKeyboard('otherPrice', { itemIndex: index });
}
