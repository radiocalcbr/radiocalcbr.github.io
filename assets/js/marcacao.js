// ====== FUNÇÕES DE MARCAÇÃO ======

function atualizarInfoIsotopo() {
    const select = document.getElementById('radiofarmacoMestre');
    const selectedOption = select.options[select.selectedIndex];
    const isotopo = selectedOption.getAttribute('data-isotopo') || 'tc';
    isotopoAtual = isotopo;
    
    const infoDiv = document.getElementById('infoIsotopoSelecionado');
    const meiaVida = MEIA_VIDA_MIN[isotopo];
    const nome = NOME_ISOTOPO[isotopo];
    const cor = COR_ISOTOPO[isotopo];
    infoDiv.textContent = `🔬 Isótopo: ${nome} | Meia-vida: ${meiaVida} minutos`;
    infoDiv.className = `info-isotopo ${isotopo}`;
    
    document.getElementById('meiaVidaDisplay').textContent = `${meiaVida} min`;
    document.getElementById('meiaVidaDisplay').style.color = cor;
    const lambda = 0.693 / meiaVida;
    document.getElementById('lambdaDisplay').textContent = lambda.toFixed(6);
    
    const planIsotopo = document.getElementById('planIsotopo');
    const planIsotopoAgenda = document.getElementById('planIsotopoAgenda');
    if (planIsotopo) planIsotopo.value = isotopo;
    if (planIsotopoAgenda) planIsotopoAgenda.value = isotopo;
    
    const agora = new Date();
    const horarioMarcacao = document.getElementById('planHorarioMarcacao');
    const horarioUltimo = document.getElementById('planHorarioUltimo');
    const horarioPrimeira = document.getElementById('planHorarioPrimeira');
    const horarioMarcacaoAgenda = document.getElementById('planHorarioMarcacaoAgenda');
    
    if (horarioMarcacao && !horarioMarcacao.value) {
        const marc = new Date(agora);
        marc.setHours(8, 0, 0, 0);
        horarioMarcacao.value = marc.toISOString().slice(0, 16);
    }
    if (horarioMarcacaoAgenda && !horarioMarcacaoAgenda.value) {
        const marc = new Date(agora);
        marc.setHours(8, 0, 0, 0);
        horarioMarcacaoAgenda.value = marc.toISOString().slice(0, 16);
    }
    if (horarioPrimeira && !horarioPrimeira.value) {
        const primeira = new Date(agora);
        primeira.setHours(8, 30, 0, 0);
        horarioPrimeira.value = primeira.toISOString().slice(0, 16);
    }
    if (horarioUltimo && !horarioUltimo.value) {
        const ultimo = new Date(agora);
        ultimo.setHours(14, 30, 0, 0);
        horarioUltimo.value = ultimo.toISOString().slice(0, 16);
    }
    
   if (typeof atualizarHorariosAgendaPadrao === 'function') {
    atualizarHorariosAgendaPadrao();
} else {
    console.warn('⚠️ atualizarHorariosAgendaPadrao não está disponível - ignorando');
}
}

function calcularMarcacao() {
    const ativMarcacao = parseFloat(document.getElementById('atividadeMarcacaoMestre').value) || 0;
    const ativDisponivel = parseFloat(document.getElementById('atividadeDisponivelMestre').value) || 0;
    
    // Verifica se os elementos existem antes de tentar modificá-los
    const totalMarcado = document.getElementById('totalMarcado');
    const disponivelGerador = document.getElementById('disponivelGerador');
    const diferencaMarcacao = document.getElementById('diferencaMarcacao');
    const resultadoContainer = document.getElementById('resultadoMarcacaoContainer');
    
    // Se os elementos não existirem, apenas mostra um alerta ou log
    if (!totalMarcado || !disponivelGerador || !diferencaMarcacao) {
        console.log('📊 Marcação calculada:', {
            atividadeMarcacao: ativMarcacao.toFixed(2) + ' mCi',
            atividadeDisponivel: ativDisponivel.toFixed(2) + ' mCi',
            diferenca: (ativDisponivel - ativMarcacao).toFixed(2) + ' mCi'
        });
        return;
    }
    
    totalMarcado.textContent = `${ativMarcacao.toFixed(2)} mCi`;
    disponivelGerador.textContent = `${ativDisponivel.toFixed(2)} mCi`;
    const diferenca = ativDisponivel - ativMarcacao;
    diferencaMarcacao.textContent = `${diferenca.toFixed(2)} mCi`;
    diferencaMarcacao.style.color = diferenca >= 0 ? '#00ff64' : '#ff6b6b';
    if (resultadoContainer) {
        resultadoContainer.classList.add('ativo');
    }
}


function aplicarPlanejamento() {
    const ativFinal = document.getElementById('planAtividadeFinal').textContent;
    const valor = parseFloat(ativFinal) || 0;
    if (valor <= 0) { alert('⚠️ Calcule o planejamento primeiro!'); return; }
    document.getElementById('atividadeMarcacaoMestre').value = valor.toFixed(1);
    document.getElementById('atividadeDisponivelMestre').value = (valor * 1.05).toFixed(1);
    
    const modo = document.querySelector('input[name="modoPlanejamento"]:checked').value;
    let horarioMarcacao;
    if (modo === 'simplificado') {
        horarioMarcacao = document.getElementById('planHorarioMarcacao').value;
    } else {
        horarioMarcacao = document.getElementById('planHorarioMarcacaoAgenda').value;
    }
    if (horarioMarcacao) document.getElementById('horarioMarcacaoMestre').value = horarioMarcacao;
    
    trocarAba('marcacao');
    setTimeout(() => { calcularMarcacao(); calcularPacientes(); }, 100);
}

// ==========================================
// EFICIÊNCIA DE MARCAÇÃO - COM DUAS PLACAS
// ==========================================

const KITS_MARCACAO = {
    eluato: {
        nome: 'Eluato',
        formula: 'Placa = (F1/F1+F2)×100',
        purezaMinima: 95,
        descricao: 'Análise de pureza do eluato | Pureza ≥ 95%',
        apenasUmaPlaca: true
    },
    kardia: {
        nome: 'KARDIA (MIBI)',
        formula: 'Placa 1 = (F2/F1+F2)×100 | Placa 2 = (F1/F1+F2)×100',
        purezaMinima: 90,
        descricao: '100 – (impureza placa 1 + impureza placa 2) ≥ 90%'
    },
    osteo: {
        nome: 'OSTEO (MDP)',
        formula: 'Placa 1 = (F1/F1+F2)×100 | Placa 2 = (F2/F1+F2)×100',
        purezaMinima: 90,
        descricao: '100 – (impureza placa 1 + impureza placa 2) ≥ 90%'
    },
    limpha: {
        nome: 'LIMPHA (FITATO)',
        formula: 'Placa = (F1/F1+F2)×100 ≤ 5%',
        purezaMinima: 95,
        descricao: '100 – (impureza placa) ≥ 95%',
        apenasUmaPlaca: true
    },
    reno: {
        nome: 'RENO (DMSA)',
        formula: 'Placa 1 = (F1/F1+F2)×100 | Placa 2 = (F2/F1+F2)×100',
        purezaMinima: 90,
        descricao: '100 – (impureza placa 1 + impureza placa 2) ≥ 90%'
    },
    nefro: {
        nome: 'NEFRO (DTPA)',
        formula: 'Placa 1 = (F1/F1+F2)×100 | Placa 2 = (F2/F1+F2)×100',
        purezaMinima: 90,
        descricao: '100 – (impureza placa 1 + impureza placa 2) ≥ 90%'
    },
    piro: {
        nome: 'PIRO',
        formula: 'Placa 1 = (F1/F1+F2)×100 | Placa 2 = (F2/F1+F2)×100',
        purezaMinima: 90,
        descricao: '100 – (%TcO4 + %TcO2) ≥ 90%'
    }
};

function atualizarCamposEficiencia() {
    const kit = document.getElementById('kitMarcacao').value;
    const info = KITS_MARCACAO[kit];
    
    if (info) {
        document.getElementById('infoKitTexto').innerHTML = `
            <strong style="color: #ffd700;">${info.nome}</strong><br>
            ${info.formula}<br>
            <span style="color: #00d2ff;">Pureza mínima exigida: ≥ ${info.purezaMinima}%</span><br>
            <span style="color: #888; font-size: 0.85rem;">${info.descricao}</span>
        `;
    }
}

function calcularEficienciaMarcacao() {
    const kit = document.getElementById('kitMarcacao').value;
    const info = KITS_MARCACAO[kit];
    
    // ====== DADOS DA PLACA 1 ======
    const p1f1 = parseFloat(document.getElementById('placa1Fracao1').value) || 0;
    const p1f2 = parseFloat(document.getElementById('placa1Fracao2').value) || 0;
    const totalPlaca1 = p1f1 + p1f2;
    
    // ====== DADOS DA PLACA 2 ======
    const p2f1 = parseFloat(document.getElementById('placa2Fracao1').value) || 0;
    const p2f2 = parseFloat(document.getElementById('placa2Fracao2').value) || 0;
    const totalPlaca2 = p2f1 + p2f2;
    
    console.log('📊 Dados lidos:');
    console.log('Placa 1 - F1:', p1f1, 'F2:', p1f2, 'Total:', totalPlaca1);
    console.log('Placa 2 - F1:', p2f1, 'F2:', p2f2, 'Total:', totalPlaca2);
    
    // Validação
    if (totalPlaca1 === 0 && totalPlaca2 === 0) {
        document.getElementById('resultadoEficienciaMarcacao').style.display = 'none';
        console.log('⚠️ Nenhum dado para calcular');
        return;
    }
    
    let placa1 = 0, placa2 = 0, pureza = 0;
    
    // ====== CÁLCULO PARA KARDIA ======
    if (kit === 'kardia') {
        // KARDIA: PLACA 1 = (F2/F1+F2)×100 | PLACA 2 = (F1/F1+F2)×100
        if (totalPlaca1 > 0) placa1 = (p1f2 / totalPlaca1) * 100;
        if (totalPlaca2 > 0) placa2 = (p2f1 / totalPlaca2) * 100;
        pureza = 100 - (placa1 + placa2);
        console.log('📌 KARDIA - Placa1:', placa1, 'Placa2:', placa2, 'Pureza:', pureza);
    }
    // ====== CÁLCULO PARA ELUATO E LIMPHA ======
    else if (kit === 'limpha' || kit === 'eluato') {
        // LIMPHA e ELUATO: PLACA = (F1/F1+F2)×100 | Pureza = 100 - placa
        if (totalPlaca1 > 0) placa1 = (p1f1 / totalPlaca1) * 100;
        placa2 = 0;
        pureza = 100 - placa1;
        console.log('📌 ELUATO/LIMPHA - Placa1:', placa1, 'Pureza:', pureza);
    }
    // ====== CÁLCULO PARA OSTEO, RENO, NEFRO, PIRO ======
    else {
        // PLACA 1 = (F1/F1+F2)×100 | PLACA 2 = (F2/F1+F2)×100
        if (totalPlaca1 > 0) placa1 = (p1f1 / totalPlaca1) * 100;
        if (totalPlaca2 > 0) placa2 = (p2f2 / totalPlaca2) * 100;
        pureza = 100 - (placa1 + placa2);
        console.log('📌 OSTEO/RENO/NEFRO/PIRO - Placa1:', placa1, 'Placa2:', placa2, 'Pureza:', pureza);
    }
    
    // Arredondar para 1 casa decimal
    placa1 = Math.round(placa1 * 10) / 10;
    placa2 = Math.round(placa2 * 10) / 10;
    pureza = Math.round(pureza * 10) / 10;
    
    // Status
    const aprovado = pureza >= info.purezaMinima;
    const statusCor = aprovado ? '#2ecc71' : '#ff6b6b';
    const statusBg = aprovado ? 'rgba(46, 204, 113, 0.05)' : 'rgba(255, 107, 107, 0.05)';
    const statusBorder = aprovado ? '#2ecc71' : '#ff6b6b';
    
    // Exibir resultados
    const resultadoDiv = document.getElementById('resultadoEficienciaMarcacao');
    resultadoDiv.style.display = 'block';
    document.getElementById('resultadoPlaca1').textContent = placa1 + '%';
    document.getElementById('resultadoPlaca2').textContent = (kit === 'limpha' || kit === 'eluato' ? '---' : placa2 + '%');
    document.getElementById('resultadoPureza').textContent = pureza + '%';
    document.getElementById('resultadoPureza').style.color = aprovado ? '#2ecc71' : '#ff6b6b';
    
    // Detalhes das placas
    document.getElementById('placa1Detalhe').textContent = `F1: ${p1f1} | F2: ${p1f2} | Total: ${totalPlaca1}`;
    document.getElementById('placa2Detalhe').textContent = `F1: ${p2f1} | F2: ${p2f2} | Total: ${totalPlaca2}`;
    
    // Detalhes do kit
    document.getElementById('kitNomeResultado').textContent = info.nome;
    document.getElementById('formulaEficiencia').textContent = info.formula;
    
    // Status
    const statusContainer = document.getElementById('statusEficienciaContainer');
    const statusTitulo = document.getElementById('statusEficienciaTitulo');
    const statusTexto = document.getElementById('statusEficienciaTexto');
    
    statusContainer.style.borderLeftColor = statusBorder;
    statusContainer.style.background = statusBg;
    
    if (aprovado) {
        statusTitulo.style.color = '#2ecc71';
        statusTitulo.textContent = '✅ APROVADO';
        statusTexto.textContent = `Pureza: ${pureza}% (≥ ${info.purezaMinima}%) - Aprovado!`;
    } else {
        statusTitulo.style.color = '#ff6b6b';
        statusTitulo.textContent = '❌ REPROVADO';
        statusTexto.textContent = `Pureza: ${pureza}% (< ${info.purezaMinima}%) - Reprovado! Verifique o processo de marcação.`;
    }
    
    console.log('✅ Resultado exibido com sucesso!');
}


function limparCamposEficiencia() {
    document.getElementById('placa1Fracao1').value = '';
    document.getElementById('placa1Fracao2').value = '';
    document.getElementById('placa2Fracao1').value = '';
    document.getElementById('placa2Fracao2').value = '';
    document.getElementById('resultadoEficienciaMarcacao').style.display = 'none';
}

// Inicializar
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        atualizarCamposEficiencia();
    }, 100);
});
