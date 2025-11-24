import { supabase } from './services/supabase.js';

async function testarConexao() {
    console.log('🧪 Testando conexão com Supabase...');
    
    try {
        // Teste 1: Buscar turno aberto (deve retornar null se não houver)
        console.log('📋 Teste 1: Buscar turno aberto...');
        const turnoAberto = await supabase.buscarTurnoAberto();
        console.log('✅ Resultado:', turnoAberto);
        
        // Teste 2: Criar turno de teste
        console.log('📋 Teste 2: Criar turno de teste...');
        const novoTurno = await supabase.criarTurno('manha', 100);
        console.log('✅ Turno criado:', novoTurno);
        
        // Teste 3: Buscar o turno criado
        console.log('📋 Teste 3: Buscar turno criado...');
        const turnoEncontrado = await supabase.buscarTurnoAberto();
        console.log('✅ Turno encontrado:', turnoEncontrado);
        
        console.log('🎉 Todos os testes passaram! Supabase está funcionando!');
        return true;
    } catch (error) {
        console.error('❌ Erro nos testes:', error);
        return false;
    }
}

// Executar teste automaticamente
testarConexao();