// ====== INICIALIZAÇÃO PRINCIPAL ======

window.onload = function() {
    const dadosCarregados = carregarTodosOsDados();
    
    if (!dadosCarregados) {
        const agora = new Date();
        const planMarc = new Date(agora);
        planMarc.setHours(8, 0, 0, 0);
        
        const elements = ['planHorarioMarcacao', 'planHorarioMarcacaoAgenda', 'horarioMarcacaoMestre'];
        elements.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = planMarc.toISOString().slice(0, 16);
        });
        
        const planPrimeira = new Date(agora);
        planPrimeira.setHours(8, 30, 0, 0);
        const elPrimeira = document.getElementById('planHorarioPrimeira');
        if (elPrimeira) elPrimeira.value = planPrimeira.toISOString().slice(0, 16);
        
        const planUltimo = new Date(agora);
        planUltimo.setHours(14, 30, 0, 0);
        const elUltimo = document.getElementById('planHorarioUltimo');
        if (elUltimo) elUltimo.value = planUltimo.toISOString().slice(0, 16);
        
        const tbody = document.getElementById('corpoPacientes');
        if (tbody && tbody.querySelectorAll('tr').length === 0) {
            for (let i = 0; i < 5; i++) adicionarPaciente();
        }
        
        const agendaTbody = document.getElementById('corpoAgenda');
        if (agendaTbody && agendaTbody.querySelectorAll('tr').length === 0) {
            inicializarAgendaPadrao();
        }
        
        atualizarInfoIsotopo();
    }
    
    iniciarAutoSave();
    
    setTimeout(() => {
        calcularPlanejamento();
        calcularMarcacao();
        calcularPacientes();
        calcularDosePediatrica();
    }, 400);
    
    setTimeout(autoSalvar, 2000);
    
    console.log('☢️ RadioCalc BR inicializado com sucesso!');
};

// Alerta de perda de dados
window.addEventListener('beforeunload', function(e) {
    const tbody = document.getElementById('corpoPacientes');
    const temPacientes = tbody ? tbody.querySelectorAll('tr').length > 0 : false;
    const temHistorico = typeof historicoPlanejamento !== 'undefined' && historicoPlanejamento.length > 0;
    const resultPlanejamento = document.getElementById('resultadoPlanejamento');
    const temCalculos = resultPlanejamento ? resultPlanejamento.style.display !== 'none' : false;
    
    if (temPacientes || temHistorico || temCalculos) {
        e.preventDefault();
        e.returnValue = '';
        return '⚠️ ATENÇÃO: Todos os dados da sessão atual serão perdidos ao recarregar a página.';
    }
});
