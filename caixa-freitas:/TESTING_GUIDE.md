# 🧪 Guia de Teste Manual - Caixa Freitas

**Versão:** 1.0.0 (Pós-Refatoração)
**Data:** 16/11/2025

Este guia fornece um roteiro detalhado para testar todas as funcionalidades do sistema **Caixa Freitas** após a grande refatoração para uma arquitetura modular em JavaScript.

---

## 1. PREPARAÇÃO DO AMBIENTE DE TESTE

Para que o aplicativo funcione corretamente, ele precisa ser servido por um servidor web local. Abrir o `index.html` diretamente no navegador (`file:///...`) **não funcionará** devido às restrições de segurança (CORS) dos Módulos ES6 (`import`/`export`).

### Ferramentas Necessárias

Você precisará de um servidor web local. Aqui estão duas opções fáceis:

#### Opção A: Live Server (Extensão do VS Code)
1.  **Instale a extensão:** No Visual Studio Code, vá para a aba de Extensões (Ctrl+Shift+X) e procure por `Live Server`. Instale-a.
2.  **Inicie o servidor:** Com o projeto aberto no VS Code, clique com o botão direito no arquivo `index.html` e selecione `Open with Live Server`.
3.  Seu navegador padrão abrirá automaticamente com o endereço `http://127.0.0.1:5500/` (ou uma porta similar).

#### Opção B: Servidor Python (se você tiver Python instalado)
1.  **Abra um terminal** na pasta raiz do projeto (`caixa-freitas`).
2.  Execute o seguinte comando:
    ```bash
    python3 -m http.server
    ```
3.  **Abra o navegador:** Acesse o endereço `http://localhost:8000`.

### Abrindo o Console do Desenvolvedor (DevTools)

É **essencial** manter o console aberto durante todos os testes para verificar a ocorrência de erros.

1.  Com a página do Caixa Freitas aberta no navegador, pressione `F12` ou `Ctrl+Shift+I` (Windows/Linux) ou `Cmd+Opt+I` (Mac).
2.  Clique na aba **"Console"**. Deixe esta janela visível durante os testes.

---

## 2. TESTES BÁSICOS (FLUXO PRINCIPAL)

O objetivo aqui é validar o fluxo de uma venda simples.

1.  **Seleção de Turno:**
    - [ ] Na tela inicial, clique em `☀️ Turno da Manhã`.
    - **Validação:** A tela principal da aplicação deve aparecer, e o cabeçalho deve exibir "☀️ Turno da Manhã" com a hora de início.

2.  **Adicionar Produtos:**
    - [ ] Clique no botão `Pão de Sal` duas vezes.
    - [ ] Clique no botão `Pão Doce Especial` uma vez.
    - **Validação:** O item "Pão de Sal" deve aparecer no pedido com quantidade "2x", e o "Pão Doce Especial" com "1x". O total deve ser calculado corretamente (R$ 2,20).

3.  **Selecionar Pagamento (Dinheiro):**
    - [ ] Clique no botão `Dinheiro`.
    - **Validação:** O botão deve ficar destacado, e o campo "Valor recebido" deve aparecer.

4.  **Informar Valor Recebido:**
    - [ ] Clique no campo "Valor recebido". O teclado virtual deve aparecer.
    - [ ] Digite `5`, `,`, `0`, `0` e clique em `Confirmar`.
    - **Validação:** O campo deve exibir "R$ 5,00" e a seção de troco deve mostrar "Troco: R$ 2,80".

5.  **Processar Venda:**
    - [ ] Clique no botão `Próximo Cliente`.
    - **Validação:** O carrinho deve ser limpo, a seleção de pagamento resetada e uma notificação de sucesso deve aparecer no canto inferior.

---

## 3. TESTES AVANÇADOS

Vamos testar as funcionalidades mais complexas.

1.  **Pagamento a Fornecedor (Misto):**
    - [ ] Clique no botão `Pagamento` (ícone de mão com dinheiro). O modal deve abrir.
    - [ ] Preencha o nome do fornecedor (ex: "Fornecedor Teste").
    - [ ] Clique no campo "Valor Total", digite `100` e confirme.
    - [ ] Selecione a forma de pagamento `🔀 Misto`. A seção de divisão deve aparecer.
    - [ ] No campo "Valor do Caixa", digite `40`.
    - [ ] No campo "Valor Externo", digite `60`.
    - **Validação:** O "Total Informado" deve ser "R$ 100,00" e o aviso de soma incorreta não deve aparecer.
    - [ ] Clique em `Registrar Pagamento`. O modal deve fechar e uma notificação de sucesso aparecer.

2.  **Sangria (Retirada de Caixa):**
    - [ ] Clique no botão `Sangria`. O modal deve abrir.
    - [ ] Clique no campo "Valor da Sangria", digite `20` e confirme.
    - [ ] Adicione um motivo (ex: "Troco para o dia seguinte").
    - [ ] Clique em `Confirmar Sangria`.
    - **Validação:** O modal deve fechar e uma notificação de sucesso deve aparecer.

3.  **Histórico Pro (com Senha):**
    - [ ] Clique no botão `Pro`. O modal de senha deve aparecer.
    - [ ] Digite a senha `admin123` e clique em `Acessar`.
    - **Validação:** O modal de senha deve fechar e o modal "Histórico Profissional" deve abrir, mostrando os totais dos turnos.
    - [ ] Clique em `Ver Manhã` ou `Ver Tarde` para ver os detalhes.

---

## 4. VALIDAÇÕES GERAIS

Estes testes garantem a robustez e a experiência do usuário.

1.  **Verificar Console:**
    - [ ] Durante todos os testes acima, observe o console do DevTools.
    - **Validação:** Nenhum erro em vermelho deve aparecer. Mensagens de log (iniciando app, estado salvo, etc.) são normais.

2.  **Testar Persistência:**
    - [ ] Adicione alguns itens ao carrinho.
    - [ ] Recarregue a página (`F5` ou `Cmd+R`).
    - **Validação:** A página deve recarregar e o carrinho deve manter os itens que você adicionou, provando que o estado foi salvo e restaurado do IndexedDB.

3.  **Validar Cálculo de Troco:**
    - [ ] Adicione um item de R$ 1,50. Selecione `Dinheiro`. Informe um valor recebido de R$ 1,30.
    - **Validação:** A mensagem "Valor insuficiente!" deve ser exibida em vermelho.

4.  **Confirmar Impressão de Cupom:**
    - [ ] Faça uma venda.
    - [ ] Abra o `Histórico` (botão com ícone de relógio).
    - [ ] Encontre a venda que você acabou de fazer e clique em `Imprimir Cupom`.
    - **Validação:** A caixa de diálogo de impressão do seu navegador deve aparecer. Você pode cancelar a impressão.

---

## 5. CHECKLIST FINAL

- [ ] Turno inicia corretamente e a UI principal é exibida.
- [ ] Produtos são adicionados/removidos/editados e o carrinho atualiza.
- [ ] Cálculos de total e troco estão corretos.
- [ ] Pagamentos (Dinheiro, Cartão/PIX, Fornecedor, Misto) funcionam.
- [ ] Histórico exibe vendas, pagamentos e sangrias corretamente.
- [ ] Impressão de cupom aciona a caixa de diálogo do navegador.
- [ ] Persistência funciona ao recarregar a página.

---

## 6. SOLUÇÃO DE PROBLEMAS (TROUBLESHOOTING)

- **Problema:** A página aparece em branco ou os botões não fazem nada.
  - **Causa Provável:** Você abriu o `index.html` diretamente.
  - **Solução:** Use uma das opções de servidor web descritas na Seção 1. Verifique o console; você provavelmente verá um erro de `CORS`.

- **Problema:** Os dados (carrinho, turno) não são salvos quando recarrego a página.
  - **Causa Provável:** Erro na inicialização do IndexedDB ou no carregamento do `main.js`.
  - **Solução:** Verifique o console em busca de erros. Limpe os dados do site no seu navegador (Cache e IndexedDB) e tente novamente.

- **Problema:** A senha do modo "Pro" não funciona.
  - **Causa Provável:** A "planilha" (simulada por uma URL) pode não ter carregado.
  - **Solução:** Verifique o console. Você deve ver uma mensagem "Carregando senhas...". Se houver um erro de rede, o sistema usará as senhas de fallback (`admin123`, `1234`).
