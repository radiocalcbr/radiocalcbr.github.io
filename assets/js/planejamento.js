function calcularPlanejamentoSimplificado() {
    const isotopo = document.getElementById('planIsotopo').value;
    const numPacientes = parseInt(document.getElementById('planNumPacientes').value) || 1;
    const dosePorPaciente = parseFloat(document.getElementById('planDosePorPaciente').value) || 0;
    const margemPercent = parseFloat(document.getElementById('planMargemSeguranca').value) || 10;
    const intervaloMin = parseFloat(document.getElementById('planIntervaloInjecoes').value) || 30;
    const horarioMarcacao = new Date(document.getElementById('planHorarioMarcacao').value);
    const horarioPrimeira = new Date(document.getElementById('planHorarioPrimeira').value);
    const meiaVida = MEIA_VIDA_MIN[isotopo];
    const lambda = getLambda(isotopo);
    const nomeIsot = NOME_ISOTOPO[isotopo];
    const cor = COR_ISOTOPO[isotopo];

    // Gera horários dos pacientes
    const pacientesOrdenados = [];
    for (let i = 0; i < numPacientes; i++) {
        const horario = new Date(horarioPrimeira.getTime() + i * intervaloMin * 60000);
        const dtMin = (horario - horarioMarcacao) / (1000 * 60);
        pacientesOrdenados.push({ index: i, horario, dtMin: Math.max(0, dtMin), doseAlvo: dosePorPaciente });
    }

    // ====== CÁLCULO DA ATIVIDADE EXATA (SEM MARGEM) - CORRIGIDO ======
    // Simula com 1 mCi para encontrar o fator de correção
    let atividadeSimulada = 1;
    let somaDosesAjustadas = 0;
    let atividadeAtual = atividadeSimulada;

    // A simulação agora respeita a ordem correta: decaimento → subtração da dose
    for (let i = 0; i < pacientesOrdenados.length; i++) {
        const p = pacientesOrdenados[i];
        
        // Calcula o intervalo desde a injeção anterior (ou desde a marcação)
        let intervaloMin = p.dtMin;
        if (i > 0) {
            const anterior = pacientesOrdenados[i - 1];
            intervaloMin = (p.horario - anterior.horario) / (1000 * 60);
        }

        // Aplica o decaimento desde a última subtração
        if (intervaloMin > 0) {
            const fatorDec = Math.exp(-lambda * intervaloMin);
            atividadeAtual = atividadeAtual * fatorDec;
        }

        // Verifica se a dose está disponível
        if (atividadeAtual < 1) {
            // Se não houver atividade suficiente para 1 mCi, a correção aumenta
            atividadeAtual = 1; // Reseta para evitar números negativos
        }

        // Subtrai a dose simulada (1 mCi)
        atividadeAtual = Math.max(0, atividadeAtual - 1);
        somaDosesAjustadas += 1;
    }

    // O fator de correção é a razão entre a soma das doses ajustadas e o número de pacientes
    const fatorCorrecao = somaDosesAjustadas / numPacientes;
    const atividadeExata = (dosePorPaciente * numPacientes) * fatorCorrecao;

    // ====== APLICA A MARGEM DE SEGURANÇA ======
    const margem = atividadeExata * (margemPercent / 100);
    let atividadeMarcacao = atividadeExata + margem;

    // ====== OTIMIZAÇÃO PARA SOBRA MÍNIMA ======
    // Arredonda para cima em múltiplos de 0.5 ou 1.0 para facilitar a marcação
    let atividadeSugerida = Math.ceil(atividadeMarcacao / 0.5) * 0.5; // Arredonda para 0.5 mCi

    // Verifica se com este valor todos os pacientes são atendidos
    let atividadeTeste = atividadeSugerida;
    let atividadeRestante = atividadeTeste;
    let todosAtendidos = true;

    for (let i = 0; i < pacientesOrdenados.length; i++) {
        const p = pacientesOrdenados[i];
        if (i === 0) {
            const fatorDec = Math.exp(-lambda * p.dtMin);
            atividadeRestante = atividadeRestante * fatorDec;
        } else {
            const anterior = pacientesOrdenados[i - 1];
            const dtDiferenca = (p.horario - anterior.horario) / (1000 * 60);
            if (dtDiferenca > 0) {
                const fatorDecEntre = Math.exp(-lambda * dtDiferenca);
                atividadeRestante = atividadeRestante * fatorDecEntre;
            }
        }
        const doseDisponivel = atividadeRestante;
        if (doseDisponivel < p.doseAlvo * 0.98) {
            todosAtendidos = false;
            break;
        }
        atividadeRestante = Math.max(0, atividadeRestante - p.doseAlvo);
    }

    // Se não atendeu todos, aumenta em 0.5 mCi até atender
    while (!todosAtendidos) {
        atividadeSugerida += 0.5;
        atividadeRestante = atividadeSugerida;
        todosAtendidos = true;
        
        for (let i = 0; i < pacientesOrdenados.length; i++) {
            const p = pacientesOrdenados[i];
            if (i === 0) {
                const fatorDec = Math.exp(-lambda * p.dtMin);
                atividadeRestante = atividadeRestante * fatorDec;
            } else {
                const anterior = pacientesOrdenados[i - 1];
                const dtDiferenca = (p.horario - anterior.horario) / (1000 * 60);
                if (dtDiferenca > 0) {
                    const fatorDecEntre = Math.exp(-lambda * dtDiferenca);
                    atividadeRestante = atividadeRestante * fatorDecEntre;
                }
            }
            const doseDisponivel = atividadeRestante;
            if (doseDisponivel < p.doseAlvo * 0.98) {
                todosAtendidos = false;
                break;
            }
            atividadeRestante = Math.max(0, atividadeRestante - p.doseAlvo);
        }
    }

    // Usa o valor otimizado
    atividadeMarcacao = atividadeSugerida;

    // ====== SIMULAÇÃO REAL COM O VALOR OTIMIZADO ======
    atividadeRestante = atividadeMarcacao;
    const distribuicao = [];
    let statusGeral = 'ok';
    let statusMsg = translations[currentLang].status_ok;
    let somaDosesRetiradas = 0;

    for (let i = 0; i < pacientesOrdenados.length; i++) {
        const p = pacientesOrdenados[i];
        
        if (i === 0) {
            const fatorDec = Math.exp(-lambda * p.dtMin);
            atividadeRestante = atividadeRestante * fatorDec;
        } else {
            const anterior = pacientesOrdenados[i - 1];
            const dtDiferenca = (p.horario - anterior.horario) / (1000 * 60);
            if (dtDiferenca > 0) {
                const fatorDecEntre = Math.exp(-lambda * dtDiferenca);
                atividadeRestante = atividadeRestante * fatorDecEntre;
            }
        }
        
        const doseDisponivel = atividadeRestante;
        const doseRetirada = Math.min(p.doseAlvo, doseDisponivel);
        atividadeRestante = Math.max(0, atividadeRestante - doseRetirada);
        somaDosesRetiradas += doseRetirada;
        
        let status = '', statusClass = '';
        if (doseDisponivel >= p.doseAlvo * 0.98) {
            status = translations[currentLang].status_adequado;
            statusClass = 'ok';
        } else if (doseDisponivel >= p.doseAlvo * 0.7) {
            status = translations[currentLang].status_baixo;
            statusClass = 'alerta';
            if (statusGeral !== 'erro') statusGeral = 'alerta';
        } else {
            status = translations[currentLang].status_insuficiente;
            statusClass = 'erro';
            statusGeral = 'erro';
        }
        
        const dtAcumulado = (p.horario - horarioMarcacao) / (1000 * 60);
        distribuicao.push({
            numero: i + 1,
            horario: p.horario,
            dtMin: dtAcumulado,
            doseAlvo: p.doseAlvo,
            doseDisponivel: Math.max(0, doseDisponivel),
            doseRetirada: doseRetirada,
            atividadeRestante: Math.max(0, atividadeRestante),
            fatorDecaimento: Math.exp(-lambda * Math.max(0, dtAcumulado)),
            status: status,
            statusClass: statusClass
        });
    }

    // ====== ATUALIZA INTERFACE ======
    const tempoTotalMin = pacientesOrdenados.length > 0 ? 
        Math.max(0, pacientesOrdenados[pacientesOrdenados.length - 1].dtMin - pacientesOrdenados[0].dtMin) : 0;
    const horas = Math.floor(tempoTotalMin / 60);
    const minutos = Math.round(tempoTotalMin % 60);

    // Calcula a sobra REAL
    const sobraReal = atividadeRestante;
    const sobraPercentual = (sobraReal / atividadeMarcacao) * 100;

    // Atualiza os cards de resultado
    atualizarResultadosPlanejamento(
        isotopo, nomeIsot, cor, meiaVida, lambda,
        numPacientes, dosePorPaciente, margemPercent, margem,
        atividadeMarcacao, sobraReal, somaDosesRetiradas,
        pacientesOrdenados, distribuicao, statusGeral,
        statusGeral === 'ok' ? translations[currentLang].status_ok : 
        statusGeral === 'alerta' ? translations[currentLang].status_alerta : 
        translations[currentLang].status_erro,
        horas, minutos
    );
    
    atualizarGraficoPlanejamento(isotopo, nomeIsot, cor, lambda, atividadeMarcacao, distribuicao, horarioMarcacao, dosePorPaciente);
    atualizarTabelaDistribuicao(distribuicao);
    
   // Recomendação com valor otimizado
const recomendacao = document.getElementById('recomendacaoPlanejamento');
recomendacao.style.cssText = `
    text-align: left !important;
    display: block;
    width: 100%;
    padding-left: 0;
    margin-left: 0;
`;
recomendacao.innerHTML = `
    <strong style="color: #00ff64;">✅ Planejamento Otimizado!</strong>
    <br><br>
    Para atender <strong>${numPacientes} pacientes</strong> com ${nomeIsot} (meia-vida: ${meiaVida} min):
    <br><br>
    <strong>Dose por paciente:</strong> ${dosePorPaciente.toFixed(2)} mCi
    <br>
    <strong>Tempo total de injeções:</strong> ${horas}h ${minutos}min
    <br><br>
    <strong style="color: #ffd700; font-size: 1.1rem;">🎯 ATIVIDADE IDEAL PARA MARCAR O KIT:</strong>
    <br>
    <strong style="color: #00ff64; font-size: 1.4rem;">${atividadeMarcacao.toFixed(2)} mCi</strong>
    <br><br>
    <strong style="color: ${sobraReal < 0.1 ? '#00ff64' : sobraReal < 0.5 ? '#ffd700' : '#ff6b6b'};">✅ Sobra no frasco:</strong> 
    ${sobraReal.toFixed(3)} mCi (${sobraPercentual.toFixed(2)}% da atividade total)
    <br>
    <span style="color: ${sobraReal < 0.1 ? '#00ff64' : '#ffd700'};">
        ${sobraReal < 0.1 ? '🎯 Otimização perfeita! Aproveitamento máximo do radiofármaco!' : 
          sobraReal < 0.5 ? '✅ Ótima otimização! Sobra mínima.' : 
          '⚠️ Sobra considerável. Considere ajustar a margem.'}
    </span>
`;
}

// ====== PLANEJAMENTO - MODO AGENDA (CORRIGIDO) ======
// ====== PLANEJAMENTO - MODO AGENDA (OTIMIZADO PARA SOBRA MÍNIMA) ======
function calcularPlanejamentoAgenda() {
    const isotopo = document.getElementById('planIsotopoAgenda').value;
    const dosePorPaciente = parseFloat(document.getElementById('planDosePorPacienteAgenda').value) || 0;
    const margemPercent = parseFloat(document.getElementById('planMargemSegurancaAgenda').value) || 10;
    const horarioMarcacao = new Date(document.getElementById('planHorarioMarcacaoAgenda').value);
    const meiaVida = MEIA_VIDA_MIN[isotopo];
    const lambda = getLambda(isotopo);
    const nomeIsot = NOME_ISOTOPO[isotopo];
    const cor = COR_ISOTOPO[isotopo];

    // Coleta os pacientes da tabela agenda
    const tbody = document.getElementById('corpoAgenda');
    const rows = tbody.querySelectorAll('tr');
    const pacientesAgenda = [];

    rows.forEach((row, index) => {
        const horaInput = document.getElementById(`agendaHora_${index}`);
        if (horaInput) {
            const horario = new Date(horaInput.value);
            if (!isNaN(horario.getTime())) {
                pacientesAgenda.push({
                    index: index,
                    horario: horario,
                    dtMin: Math.max(0, (horario - horarioMarcacao) / (1000 * 60)),
                    doseAlvo: dosePorPaciente
                });
            }
        }
    });

    const numPacientes = pacientesAgenda.length;
    if (numPacientes === 0) { 
        alert('⚠️ Adicione pelo menos um paciente com horário válido na agenda.');
        return; 
    }
    pacientesAgenda.sort((a, b) => a.horario - b.horario);

    // ====== CÁLCULO DA ATIVIDADE EXATA (SEM MARGEM) - CORRIGIDO ======
    let atividadeSimulada = 1;
    let somaDosesAjustadas = 0;
    let atividadeAtual = atividadeSimulada;

    // A simulação agora respeita a ordem correta: decaimento → subtração da dose
    for (let i = 0; i < pacientesAgenda.length; i++) {
        const p = pacientesAgenda[i];
        
        // Calcula o intervalo desde a injeção anterior (ou desde a marcação)
        let intervaloMin = p.dtMin;
        if (i > 0) {
            const anterior = pacientesAgenda[i - 1];
            intervaloMin = (p.horario - anterior.horario) / (1000 * 60);
        }

        // Aplica o decaimento desde a última subtração
        if (intervaloMin > 0) {
            const fatorDec = Math.exp(-lambda * intervaloMin);
            atividadeAtual = atividadeAtual * fatorDec;
        }

        // Verifica se a dose está disponível
        if (atividadeAtual < 1) {
            // Se não houver atividade suficiente para 1 mCi, a correção aumenta
            atividadeAtual = 1; // Reseta para evitar números negativos
        }

        // Subtrai a dose simulada (1 mCi)
        atividadeAtual = Math.max(0, atividadeAtual - 1);
        somaDosesAjustadas += 1;
    }

    // O fator de correção é a razão entre a soma das doses ajustadas e o número de pacientes
    const fatorCorrecao = somaDosesAjustadas / pacientesAgenda.length;
    const atividadeExata = (dosePorPaciente * pacientesAgenda.length) * fatorCorrecao;

    // ====== APLICA A MARGEM DE SEGURANÇA ======
    const margem = atividadeExata * (margemPercent / 100);
    let atividadeMarcacao = atividadeExata + margem;

    // ====== OTIMIZAÇÃO PARA SOBRA MÍNIMA ======
    // Arredonda para cima em múltiplos de 0.5 para facilitar a marcação
    let atividadeSugerida = Math.ceil(atividadeMarcacao / 0.5) * 0.5;

    // Verifica se com este valor todos os pacientes são atendidos
    let atividadeTeste = atividadeSugerida;
    let atividadeRestante = atividadeTeste;
    let todosAtendidos = true;

    for (let i = 0; i < pacientesAgenda.length; i++) {
        const p = pacientesAgenda[i];
        if (i === 0) {
            const fatorDec = Math.exp(-lambda * p.dtMin);
            atividadeRestante = atividadeRestante * fatorDec;
        } else {
            const anterior = pacientesAgenda[i - 1];
            const dtDiferenca = (p.horario - anterior.horario) / (1000 * 60);
            if (dtDiferenca > 0) {
                const fatorDecEntre = Math.exp(-lambda * dtDiferenca);
                atividadeRestante = atividadeRestante * fatorDecEntre;
            }
        }
        const doseDisponivel = atividadeRestante;
        if (doseDisponivel < p.doseAlvo * 0.98) {
            todosAtendidos = false;
            break;
        }
        atividadeRestante = Math.max(0, atividadeRestante - p.doseAlvo);
    }

    // Se não atendeu todos, aumenta em 0.5 mCi até atender
    while (!todosAtendidos) {
        atividadeSugerida += 0.5;
        atividadeRestante = atividadeSugerida;
        todosAtendidos = true;
        
        for (let i = 0; i < pacientesAgenda.length; i++) {
            const p = pacientesAgenda[i];
            if (i === 0) {
                const fatorDec = Math.exp(-lambda * p.dtMin);
                atividadeRestante = atividadeRestante * fatorDec;
            } else {
                const anterior = pacientesAgenda[i - 1];
                const dtDiferenca = (p.horario - anterior.horario) / (1000 * 60);
                if (dtDiferenca > 0) {
                    const fatorDecEntre = Math.exp(-lambda * dtDiferenca);
                    atividadeRestante = atividadeRestante * fatorDecEntre;
                }
            }
            const doseDisponivel = atividadeRestante;
            if (doseDisponivel < p.doseAlvo * 0.98) {
                todosAtendidos = false;
                break;
            }
            atividadeRestante = Math.max(0, atividadeRestante - p.doseAlvo);
        }
    }

    // Usa o valor otimizado
    atividadeMarcacao = atividadeSugerida;

    // ====== SIMULAÇÃO REAL COM O VALOR OTIMIZADO ======
    atividadeRestante = atividadeMarcacao;
    const distribuicao = [];
    let statusGeral = 'ok';
    let statusMsg = translations[currentLang].status_ok;
    let somaDosesRetiradas = 0;

    for (let i = 0; i < pacientesAgenda.length; i++) {
        const p = pacientesAgenda[i];
        
        if (i === 0) {
            const fatorDec = Math.exp(-lambda * p.dtMin);
            atividadeRestante = atividadeRestante * fatorDec;
        } else {
            const anterior = pacientesAgenda[i - 1];
            const dtDiferenca = (p.horario - anterior.horario) / (1000 * 60);
            if (dtDiferenca > 0) {
                const fatorDecEntre = Math.exp(-lambda * dtDiferenca);
                atividadeRestante = atividadeRestante * fatorDecEntre;
            }
        }
        
        const doseDisponivel = atividadeRestante;
        const doseRetirada = Math.min(p.doseAlvo, doseDisponivel);
        atividadeRestante = Math.max(0, atividadeRestante - doseRetirada);
        somaDosesRetiradas += doseRetirada;
        
        let status = '', statusClass = '';
        if (doseDisponivel >= p.doseAlvo * 0.98) {
            status = translations[currentLang].status_adequado;
            statusClass = 'ok';
        } else if (doseDisponivel >= p.doseAlvo * 0.7) {
            status = translations[currentLang].status_baixo;
            statusClass = 'alerta';
            if (statusGeral !== 'erro') statusGeral = 'alerta';
        } else {
            status = translations[currentLang].status_insuficiente;
            statusClass = 'erro';
            statusGeral = 'erro';
        }
        
        const dtAcumulado = (p.horario - horarioMarcacao) / (1000 * 60);
        distribuicao.push({
            numero: p.index + 1,
            horario: p.horario,
            dtMin: dtAcumulado,
            doseAlvo: p.doseAlvo,
            doseDisponivel: Math.max(0, doseDisponivel),
            doseRetirada: doseRetirada,
            atividadeRestante: Math.max(0, atividadeRestante),
            fatorDecaimento: Math.exp(-lambda * Math.max(0, dtAcumulado)),
            status: status,
            statusClass: statusClass
        });
    }

    // ====== ATUALIZA INTERFACE ======
    const tempoTotalMin = pacientesAgenda.length > 0 ? 
        Math.max(0, pacientesAgenda[pacientesAgenda.length - 1].dtMin - pacientesAgenda[0].dtMin) : 0;
    const horas = Math.floor(tempoTotalMin / 60);
    const minutos = Math.round(tempoTotalMin % 60);

    const sobraReal = atividadeRestante;
    const sobraPercentual = (sobraReal / atividadeMarcacao) * 100;

    atualizarResultadosPlanejamento(
        isotopo, nomeIsot, cor, meiaVida, lambda,
        numPacientes, dosePorPaciente, margemPercent, margem,
        atividadeMarcacao, sobraReal, somaDosesRetiradas,
        pacientesAgenda, distribuicao, statusGeral,
        statusGeral === 'ok' ? translations[currentLang].status_ok : 
        statusGeral === 'alerta' ? translations[currentLang].status_alerta : 
        translations[currentLang].status_erro,
        horas, minutos
    );
    
    atualizarGraficoPlanejamento(isotopo, nomeIsot, cor, lambda, atividadeMarcacao, distribuicao, horarioMarcacao, dosePorPaciente);
    atualizarTabelaDistribuicao(distribuicao);
    
    // Recomendação com valor otimizado
    const recomendacao = document.getElementById('recomendacaoPlanejamento');
    recomendacao.style.textAlign = 'left';
    recomendacao.innerHTML = `
        <strong style="color: #00ff64;">✅ Planejamento Otimizado (Agenda)!</strong>
        <br><br>
        Para atender <strong>${numPacientes} pacientes</strong> com ${nomeIsot} (meia-vida: ${meiaVida} min):
        <br><br>
        <strong>Dose por paciente:</strong> ${dosePorPaciente.toFixed(2)} mCi
        <br>
        <strong>Tempo total de injeções:</strong> ${horas}h ${minutos}min
        <br><br>
        <strong style="color: #ffd700; font-size: 1.1rem;">🎯 ATIVIDADE IDEAL PARA MARCAR O KIT:</strong>
        <br>
        <strong style="color: #00ff64; font-size: 1.4rem;">${atividadeMarcacao.toFixed(2)} mCi</strong>
        <br><br>
        <strong style="color: ${sobraReal < 0.1 ? '#00ff64' : sobraReal < 0.5 ? '#ffd700' : '#ff6b6b'};">✅ Sobra no frasco:</strong> 
        ${sobraReal.toFixed(3)} mCi (${sobraPercentual.toFixed(2)}% da atividade total)
        <br>
        <span style="color: ${sobraReal < 0.1 ? '#00ff64' : '#ffd700'};">
            ${sobraReal < 0.1 ? '🎯 Otimização perfeita! Aproveitamento máximo do radiofármaco!' : 
              sobraReal < 0.5 ? '✅ Ótima otimização! Sobra mínima.' : 
              '⚠️ Sobra considerável. Considere ajustar a margem.'}
        </span>
    `;
    
    // Atualiza a tabela da agenda com os resultados
    atualizarTabelaAgendaResultados(pacientesAgenda, distribuicao);
}

// ====== FUNÇÕES COMPARTILHADAS DO PLANEJAMENTO ======
function atualizarResultadosPlanejamento(isotopo, nomeIsot, cor, meiaVida, lambda,
    numPacientes, dosePorPaciente, margemPercent, margem,
    atividadeMarcacao, atividadeRestante, somaDosesAjustadas,
    pacientesOrdenados, distribuicao, statusGeral, statusMsg, horas, minutos) {
    
    const tempoTotalMin = pacientesOrdenados.length > 0 ? 
        Math.max(0, pacientesOrdenados[pacientesOrdenados.length - 1].dtMin - pacientesOrdenados[0].dtMin) : 0;
    const h = horas !== undefined ? horas : Math.floor(tempoTotalMin / 60);
    const m = minutos !== undefined ? minutos : Math.round(tempoTotalMin % 60);
    const doseTotalAlvo = dosePorPaciente * numPacientes;
    const fatorDecaimentoReal = atividadeMarcacao > 0 ? 
        (atividadeMarcacao - atividadeRestante) / atividadeMarcacao : 0;
    
    if (statusGeral === 'erro') statusMsg = translations[currentLang].status_erro;
    else if (statusGeral === 'alerta') statusMsg = translations[currentLang].status_alerta;
    else statusMsg = translations[currentLang].status_ok;
    
    document.getElementById('resultadoPlanejamento').style.display = 'block';
    document.getElementById('isotopoLegenda').textContent = nomeIsot;
    document.getElementById('isotopoLegenda').className = `badge-${isotopo}`;
    document.getElementById('corDecaimento').style.background = cor;
    document.getElementById('labelDecaimento').innerHTML = translations[currentLang].plan_grafico_decaimento + ` (${nomeIsot})`;
    
    // Cards principais
    document.getElementById('planAtividadeFinal').textContent = `${atividadeMarcacao.toFixed(2)} mCi`;
    const doseTotalElement = document.getElementById('planDoseTotal');
    if (doseTotalElement) doseTotalElement.textContent = `${doseTotalAlvo.toFixed(2)} mCi`;
    document.getElementById('planSobraFinal').textContent = `${atividadeRestante.toFixed(2)} mCi`;
    document.getElementById('planSobraFinal').style.color = atividadeRestante < 0.5 ? '#00ff64' : atividadeRestante < 2 ? '#ffd700' : '#ff6b6b';
    document.getElementById('planAproveitamento').textContent = `${(fatorDecaimentoReal * 100).toFixed(1)}%`;
    
    // Stats
    document.getElementById('planPacientes').textContent = numPacientes;
    document.getElementById('planDosePaciente').textContent = `${dosePorPaciente.toFixed(2)} mCi`;
    document.getElementById('planDoseTotalSemDec').textContent = `${doseTotalAlvo.toFixed(2)} mCi`;
    document.getElementById('planTempoTotal').textContent = `${h}h ${m}min (${Math.max(0, tempoTotalMin).toFixed(0)} min)`;
    document.getElementById('planMargemDisplay').textContent = `${margemPercent}% (${margem.toFixed(2)} mCi)`;
    
    const statusEl = document.getElementById('planStatus');
    statusEl.textContent = statusMsg;
    if (statusGeral === 'ok') { statusEl.style.color = '#00ff64'; document.getElementById('planStatusCard').className = 'stat-card status-ok'; }
    else if (statusGeral === 'alerta') { statusEl.style.color = '#ffd700'; document.getElementById('planStatusCard').className = 'stat-card status-alerta'; }
    else { statusEl.style.color = '#ff6b6b'; document.getElementById('planStatusCard').className = 'stat-card status-erro'; }
    
    // Info de otimização
    const pctSobra = (atividadeRestante / atividadeMarcacao * 100);
    const infoOtimizacao = document.getElementById('infoOtimizacao');
    if (atividadeRestante < 0.1) {
        infoOtimizacao.innerHTML = `✅ <strong style="color: #00ff64;">Otimização perfeita!</strong> A sobra é de apenas <strong>${atividadeRestante.toFixed(3)} mCi</strong> (${pctSobra.toFixed(2)}% da atividade total). Aproveitamento máximo do radiofármaco!`;
    } else if (atividadeRestante < 1) {
        infoOtimizacao.innerHTML = `✅ <strong style="color: #00ff64;">Ótima otimização!</strong> Sobraram apenas <strong>${atividadeRestante.toFixed(2)} mCi</strong> (${pctSobra.toFixed(2)}% da atividade total).`;
    } else if (atividadeRestante < 3) {
        infoOtimizacao.innerHTML = `ℹ️ <strong style="color: #ffd700;">Boa otimização.</strong> Sobraram <strong>${atividadeRestante.toFixed(2)} mCi</strong> (${pctSobra.toFixed(2)}% da atividade total). Considere reduzir a margem.`;
    } else {
        infoOtimizacao.innerHTML = `⚠️ <strong style="color: #ff6b6b;">Sobra considerável.</strong> ${atividadeRestante.toFixed(2)} mCi (${pctSobra.toFixed(2)}% da atividade total). Aumente o número de pacientes ou reduza a margem.`;
    }
    
    // Alertas
    const alertContainer = document.getElementById('alertContainer');
    let alerts = '';
    if (statusGeral === 'erro') alerts += `<div class="alert-box danger">⚠️ Atenção: A atividade necessária é insuficiente para atender todos os pacientes. Aumente a atividade do kit ou reduza o número de pacientes.</div>`;
    if (statusGeral === 'alerta') alerts += `<div class="alert-box warning">⚠️ Atenção: Alguns pacientes receberão doses abaixo do ideal. Considere aumentar a atividade do kit.</div>`;
    if (atividadeRestante < 0.1) {
        alerts += `<div class="alert-box success">🎯 Otimização perfeita! Sobra de apenas ${atividadeRestante.toFixed(3)} mCi.</div>`;
    } else if (atividadeRestante < 1) {
        alerts += `<div class="alert-box success">✅ Otimização excelente! Sobra de ${atividadeRestante.toFixed(2)} mCi (${pctSobra.toFixed(1)}%).</div>`;
    } else if (atividadeRestante < 3) {
        alerts += `<div class="alert-box info">ℹ️ Sobra de ${atividadeRestante.toFixed(2)} mCi (${pctSobra.toFixed(1)}%).</div>`;
    }
    if (alerts === '') alerts = `<div class="alert-box success">✅ Planejamento otimizado! Sobra de ${atividadeRestante.toFixed(2)} mCi.</div>`;
    alertContainer.innerHTML = alerts;
    
    // Histórico
    const historicoItem = {
        data: new Date().toLocaleString('pt-BR'),
        isotopo: nomeIsot,
        pacientes: numPacientes,
        dosePorPaciente: dosePorPaciente.toFixed(2),
        doseTotal: doseTotalAlvo.toFixed(2),
        atividadeNecessaria: somaDosesAjustadas.toFixed(2),
        atividadeFinal: atividadeMarcacao.toFixed(2),
        atividadeRestante: atividadeRestante.toFixed(2),
        pctSobra: (atividadeRestante/atividadeMarcacao*100).toFixed(1),
        fatorDecaimento: (fatorDecaimentoReal * 100).toFixed(1),
        tempoTotal: `${h}h ${m}min`,
        status: statusMsg
    };
    historicoPlanejamento.unshift(historicoItem);
    if (historicoPlanejamento.length > 5) historicoPlanejamento.length = 5;
    atualizarHistorico();
}

function atualizarGraficoPlanejamento(isotopo, nomeIsot, cor, lambda, atividadeMarcacao, distribuicao, horarioMarcacao, dosePorPaciente) {
    const pontos = 100;
    const dadosDecaimento = [];
    const labels = [];
    const duracaoTotal = distribuicao.length > 0 ? 
        Math.max(distribuicao[distribuicao.length - 1].dtMin / 60 * 1.4, 2) : 2;
    const horarioInicio = horarioMarcacao || new Date();
    
    for (let i = 0; i <= pontos; i++) {
        const t = (i / pontos) * duracaoTotal;
        const fator = Math.exp(-lambda * t * 60);
        const atividade = atividadeMarcacao * fator;
        dadosDecaimento.push(atividade);
        const horario = new Date(horarioInicio.getTime() + t * 3600000);
        labels.push(horario.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    }
    
    const dadosInjecoes = [];
    for (let i = 0; i < distribuicao.length; i++) {
        const d = distribuicao[i];
        const idx = Math.round((d.dtMin / 60) / duracaoTotal * pontos);
        dadosInjecoes.push({ x: Math.min(idx, pontos), y: d.doseDisponivel });
    }
    
    const canvas = document.getElementById('graficoDecaimento');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        if (graficoDecaimento) { graficoDecaimento.destroy(); graficoDecaimento = null; }
        try {
            graficoDecaimento = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        { label: translations[currentLang].plan_grafico_decaimento + ` (${nomeIsot})`, data: dadosDecaimento, borderColor: cor, backgroundColor: `rgba(0, 210, 255, 0.05)`, borderWidth: 2.5, pointRadius: 0, tension: 0.4, fill: true },
                        { label: translations[currentLang].plan_grafico_dose_disponivel, data: dadosInjecoes, borderColor: '#ff6b6b', backgroundColor: '#ff6b6b', borderWidth: 0, pointRadius: 7, pointBackgroundColor: '#ff6b6b', pointBorderColor: '#ffffff', pointBorderWidth: 2, showLine: false, type: 'scatter' },
                        { label: translations[currentLang].plan_grafico_dose_alvo, data: Array(labels.length).fill(dosePorPaciente), borderColor: '#ffd700', backgroundColor: 'transparent', borderWidth: 1.5, borderDash: [5, 5], pointRadius: 0, fill: false }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { labels: { color: '#ccc', font: { size: 10 }, boxWidth: 15, padding: 12 } } },
                    scales: { x: { ticks: { color: '#888', font: { size: 9 } }, grid: { color: 'rgba(255, 255, 255, 0.05)' } }, y: { ticks: { color: '#888', font: { size: 10 } }, grid: { color: 'rgba(255, 255, 255, 0.05)' }, beginAtZero: true } }
                }
            });
        } catch(e) { console.error('Erro ao criar gráfico:', e); }
    }
}

function atualizarTabelaDistribuicao(distribuicao) {
    const tbodyDist = document.getElementById('tabelaDistribuicao');
    tbodyDist.innerHTML = '';
    for (const d of distribuicao) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${d.numero}</td><td>${d.horario.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td><td>${d.doseAlvo.toFixed(2)}</td><td>${d.doseDisponivel.toFixed(2)}</td><td>${d.doseRetirada.toFixed(2)}</td><td>${d.atividadeRestante.toFixed(2)}</td><td class="resultado-calc ${d.statusClass}">${d.status}</td>`;
        tbodyDist.appendChild(tr);
    }
}

function atualizarRecomendacao(numPacientes, nomeIsot, meiaVida, dosePorPaciente, somaDosesAjustadas, atividadeMarcacao, margemPercent, atividadeRestante, horas, minutos) {
    const recomendacao = document.getElementById('recomendacaoPlanejamento');
    recomendacao.style.textAlign = 'left';
    const atividadeSugerida = Math.ceil(atividadeMarcacao / 5) * 5;
    recomendacao.innerHTML = `
        Para atender <strong>${numPacientes} pacientes</strong> com ${nomeIsot} (meia-vida: ${meiaVida} min):
        <br><br>
        <strong>Dose por paciente:</strong> ${dosePorPaciente.toFixed(2)} mCi
        <br>
        <strong>Dose total necessária (sem decaimento):</strong> ${(dosePorPaciente * numPacientes).toFixed(2)} mCi
        <br>
        <strong>Tempo total de injeções:</strong> ${horas}h ${minutos}min
        <br>
        <strong style="color: #00d2ff;">Atividade necessária no kit (compensando decaimento):</strong> ${somaDosesAjustadas.toFixed(2)} mCi
        <br>
        <strong style="color: #00ff64;">Atividade final com margem de ${margemPercent}%:</strong> ${atividadeMarcacao.toFixed(2)} mCi
        <br>
        <strong style="color: ${atividadeRestante < 0.5 ? '#00ff64' : '#ffd700'};">✅ Sobra no frasco:</strong> ${atividadeRestante.toFixed(2)} mCi (${(atividadeRestante/atividadeMarcacao*100).toFixed(1)}%)
        <br><br>
        <span style="color: #ffd700;">💡 Sugestão: Marcar o kit com <strong>${atividadeSugerida} mCi</strong> para otimizar o uso e minimizar sobras.</span>
    `;
}

function atualizarTabelaAgendaResultados(pacientes, distribuicao) {
    const tbody = document.getElementById('corpoAgenda');
    const rows = tbody.querySelectorAll('tr');
    rows.forEach((row, idx) => {
        const doseDisponivelEl = document.getElementById(`agendaDoseDisponivel_${idx}`);
        const doseRetiradaEl = document.getElementById(`agendaDoseRetirada_${idx}`);
        const ativRestanteEl = document.getElementById(`agendaAtivRestante_${idx}`);
        const dtMinEl = document.getElementById(`agendaDtMin_${idx}`);
        const statusEl = document.getElementById(`agendaStatus_${idx}`);
        const doseAlvoEl = document.getElementById(`agendaDoseAlvo_${idx}`);
        
        const d = distribuicao.find(item => item.numero === idx + 1);
        if (d) {
            if (doseAlvoEl) doseAlvoEl.textContent = d.doseAlvo.toFixed(2);
            if (doseDisponivelEl) doseDisponivelEl.textContent = d.doseDisponivel.toFixed(2);
            if (doseRetiradaEl) doseRetiradaEl.textContent = d.doseRetirada.toFixed(2);
            if (ativRestanteEl) ativRestanteEl.textContent = d.atividadeRestante.toFixed(2);
            if (dtMinEl) dtMinEl.textContent = d.dtMin.toFixed(1);
            if (statusEl) {
                statusEl.textContent = d.status;
                statusEl.className = `resultado-calc ${d.statusClass}`;
            }
            if (idx === pacientes.length - 1) {
                row.classList.add('linha-ultimo-paciente');
            } else {
                row.classList.remove('linha-ultimo-paciente');
            }
        }
    });
}

// ====== FUNÇÃO PRINCIPAL DE PLANEJAMENTO (CORRIGIDA) ======
function calcularPlanejamento() {
    // Verifica se todas as datas são válidas ANTES de calcular
    const datasParaVerificar = [
        document.getElementById('planHorarioMarcacao')?.value,
        document.getElementById('planHorarioPrimeira')?.value,
        document.getElementById('planHorarioUltimo')?.value,
        document.getElementById('planHorarioMarcacaoAgenda')?.value
    ];
    
    // Se alguma data estiver incompleta, NÃO calcula
    for (const data of datasParaVerificar) {
        if (data && data.length > 0 && data.length < 16) {
            console.log('⏳ Data incompleta:', data);
            return; // Sai da função, não trava
        }
        if (data) {
            const testeData = new Date(data);
            if (isNaN(testeData.getTime())) {
                console.log('⏳ Data inválida:', data);
                return; // Sai da função, não trava
            }
        }
    }
    
    // Se chegou aqui, todas as datas são válidas
    const modo = document.querySelector('input[name="modoPlanejamento"]:checked').value;
    if (modo === 'simplificado') {
        calcularPlanejamentoSimplificado();
    } else {
        calcularPlanejamentoAgenda();
    }
    trackEvent('calcular_planejamento', 'planejamento', modo);
}
// ====== TOGGLE ENTRE MODOS ======
function toggleModoPlanejamento() {
    const modo = document.querySelector('input[name="modoPlanejamento"]:checked').value;
    const camposSimplificado = document.getElementById('camposSimplificado');
    const camposAgenda = document.getElementById('camposAgenda');
    const labelSimp = document.getElementById('labelModoSimplificado');
    const labelAgenda = document.getElementById('labelModoAgenda');
    
    if (modo === 'simplificado') {
        camposSimplificado.classList.remove('campo-oculto');
        camposAgenda.classList.add('campo-oculto');
        labelSimp.classList.add('active');
        labelAgenda.classList.remove('active');
    } else {
        camposSimplificado.classList.add('campo-oculto');
        camposAgenda.classList.remove('campo-oculto');
        labelSimp.classList.remove('active');
        labelAgenda.classList.add('active');
        const tbody = document.getElementById('corpoAgenda');
        if (tbody.querySelectorAll('tr').length === 0) {
            inicializarAgendaPadrao();
        }
    }
    calcularPlanejamento();
}

// ====== AGENDA - INICIALIZAÇÃO ======
function inicializarAgendaPadrao() {
    const tbody = document.getElementById('corpoAgenda');
    tbody.innerHTML = '';
    const horarioMarcacao = new Date(document.getElementById('planHorarioMarcacaoAgenda').value);
    const horarioBase = new Date(horarioMarcacao);
    horarioBase.setMinutes(horarioBase.getMinutes() + 30);
    
    const horarios = [
        new Date(horarioBase),
        new Date(horarioBase.getTime() + 20 * 60000),
        new Date(horarioBase.getTime() + 45 * 60000),
        new Date(horarioBase.getTime() + 95 * 60000),
        new Date(horarioBase.getTime() + 160 * 60000)
    ];
    
    horarios.forEach((horario, index) => {
        adicionarLinhaAgenda(index, horario);
    });
    atualizarContadorAgenda();
}

function atualizarHorariosAgendaPadrao() {
    const tbody = document.getElementById('corpoAgenda');
    const rows = tbody.querySelectorAll('tr');
    if (rows.length === 0) {
        inicializarAgendaPadrao();
    }
}

function adicionarLinhaAgenda(index, horario) {
    const tbody = document.getElementById('corpoAgenda');
    const tr = document.createElement('tr');
    tr.dataset.index = index;
    const horarioStr = horario ? horario.toISOString().slice(0, 16) : '';
    
    tr.innerHTML = `
        <td class="num-paciente">${index + 1}</td>
        <td><input type="datetime-local" id="agendaHora_${index}" value="${horarioStr}"></td>
        <td id="agendaDoseAlvo_${index}">--</td>
        <td id="agendaDoseDisponivel_${index}">--</td>
        <td id="agendaDoseRetirada_${index}">--</td>
        <td id="agendaAtivRestante_${index}">--</td>
        <td id="agendaDtMin_${index}">--</td>
        <td id="agendaStatus_${index}">--</td>
        <td><button class="btn-danger btn-sm" onclick="removerLinhaAgenda(${index})">✕</button></td>
    `;
    tbody.appendChild(tr);
    reordenarAgenda();
}
function adicionarPacienteAgenda() {
    const tbody = document.getElementById('corpoAgenda');
    const rows = tbody.querySelectorAll('tr');
    const ultimaHora = rows.length > 0 ? 
        document.getElementById(`agendaHora_${rows.length - 1}`)?.value : null;
    const horario = ultimaHora ? new Date(ultimaHora) : new Date();
    horario.setMinutes(horario.getMinutes() + 15);
    adicionarLinhaAgenda(rows.length, horario);
    atualizarContadorAgenda();
    calcularPlanejamento();
}

function adicionarPacientesLoteAgenda() {
    for (let i = 0; i < 5; i++) {
        adicionarPacienteAgenda();
    }
}

function removerLinhaAgenda(index) {
    const tbody = document.getElementById('corpoAgenda');
    const rows = tbody.querySelectorAll('tr');
    if (rows.length <= 1) {
        alert('É necessário manter pelo menos 1 paciente na agenda.');
        return;
    }
    const row = tbody.querySelector(`tr[data-index="${index}"]`);
    if (row) {
        row.remove();
        reordenarAgenda();
        atualizarContadorAgenda();
        calcularPlanejamento();
    }
}

function removerUltimoPacienteAgenda() {
    const tbody = document.getElementById('corpoAgenda');
    const rows = tbody.querySelectorAll('tr');
    if (rows.length <= 1) {
        alert('É necessário manter pelo menos 1 paciente na agenda.');
        return;
    }
    const lastRow = rows[rows.length - 1];
    if (lastRow) {
        lastRow.remove();
        reordenarAgenda();
        atualizarContadorAgenda();
        calcularPlanejamento();
    }
}

function limparPacientesAgenda() {
    if (confirm('Deseja limpar todos os pacientes da agenda?')) {
        const tbody = document.getElementById('corpoAgenda');
        tbody.innerHTML = '';
        adicionarPacienteAgenda();
        atualizarContadorAgenda();
        calcularPlanejamento();
    }
}

function reordenarAgenda() {
    const tbody = document.getElementById('corpoAgenda');
    const rows = tbody.querySelectorAll('tr');
    rows.forEach((row, idx) => {
        row.dataset.index = idx;
        const numCell = row.querySelector('.num-paciente');
        if (numCell) numCell.textContent = idx + 1;
        const inputs = row.querySelectorAll('input');
        inputs.forEach(input => {
            const oldId = input.id;
            if (oldId) {
                const parts = oldId.split('_');
                if (parts.length === 2) input.id = `${parts[0]}_${idx}`;
            }
        });
        const cells = ['agendaDoseAlvo', 'agendaDoseDisponivel', 'agendaDoseRetirada', 'agendaAtivRestante', 'agendaDtMin', 'agendaStatus'];
        cells.forEach(cellId => {
            const cell = row.querySelector(`#${cellId}_${idx}`);
            if (!cell) {
                const oldCell = row.querySelector(`#${cellId}`);
                if (oldCell) oldCell.id = `${cellId}_${idx}`;
            }
        });
        const btn = row.querySelector('.btn-danger');
        if (btn) btn.setAttribute('onclick', `removerLinhaAgenda(${idx})`);
    });
    atualizarContadorAgenda();
}

function atualizarContadorAgenda() {
    const tbody = document.getElementById('corpoAgenda');
    const count = tbody.querySelectorAll('tr').length;
    document.getElementById('totalPacientesAgenda').textContent = count;
}
function adicionarPacienteAgenda() {
    const tbody = document.getElementById('corpoAgenda');
    const rows = tbody.querySelectorAll('tr');
    const ultimaHora = rows.length > 0 ? 
        document.getElementById(`agendaHora_${rows.length - 1}`)?.value : null;
    const horario = ultimaHora ? new Date(ultimaHora) : new Date();
    horario.setMinutes(horario.getMinutes() + 15);
    adicionarLinhaAgenda(rows.length, horario);
    atualizarContadorAgenda();
    calcularPlanejamento();
}

function adicionarPacientesLoteAgenda() {
    for (let i = 0; i < 5; i++) {
        adicionarPacienteAgenda();
    }
}

function removerLinhaAgenda(index) {
    const tbody = document.getElementById('corpoAgenda');
    const rows = tbody.querySelectorAll('tr');
    if (rows.length <= 1) {
        alert('É necessário manter pelo menos 1 paciente na agenda.');
        return;
    }
    const row = tbody.querySelector(`tr[data-index="${index}"]`);
    if (row) {
        row.remove();
        reordenarAgenda();
        atualizarContadorAgenda();
        calcularPlanejamento();
    }
}

function removerUltimoPacienteAgenda() {
    const tbody = document.getElementById('corpoAgenda');
    const rows = tbody.querySelectorAll('tr');
    if (rows.length <= 1) {
        alert('É necessário manter pelo menos 1 paciente na agenda.');
        return;
    }
    const lastRow = rows[rows.length - 1];
    if (lastRow) {
        lastRow.remove();
        reordenarAgenda();
        atualizarContadorAgenda();
        calcularPlanejamento();
    }
}

function limparPacientesAgenda() {
    if (confirm('Deseja limpar todos os pacientes da agenda?')) {
        const tbody = document.getElementById('corpoAgenda');
        tbody.innerHTML = '';
        adicionarPacienteAgenda();
        atualizarContadorAgenda();
        calcularPlanejamento();
    }
}

function reordenarAgenda() {
    const tbody = document.getElementById('corpoAgenda');
    const rows = tbody.querySelectorAll('tr');
    rows.forEach((row, idx) => {
        row.dataset.index = idx;
        const numCell = row.querySelector('.num-paciente');
        if (numCell) numCell.textContent = idx + 1;
        const inputs = row.querySelectorAll('input');
        inputs.forEach(input => {
            const oldId = input.id;
            if (oldId) {
                const parts = oldId.split('_');
                if (parts.length === 2) input.id = `${parts[0]}_${idx}`;
            }
        });
        const cells = ['agendaDoseAlvo', 'agendaDoseDisponivel', 'agendaDoseRetirada', 'agendaAtivRestante', 'agendaDtMin', 'agendaStatus'];
        cells.forEach(cellId => {
            const cell = row.querySelector(`#${cellId}_${idx}`);
            if (!cell) {
                const oldCell = row.querySelector(`#${cellId}`);
                if (oldCell) oldCell.id = `${cellId}_${idx}`;
            }
        });
        const btn = row.querySelector('.btn-danger');
        if (btn) btn.setAttribute('onclick', `removerLinhaAgenda(${idx})`);
    });
    atualizarContadorAgenda();
}

function atualizarContadorAgenda() {
    const tbody = document.getElementById('corpoAgenda');
    const count = tbody.querySelectorAll('tr').length;
    document.getElementById('totalPacientesAgenda').textContent = count;
}
// ==========================================
// CALCULADORA DE MÚLTIPLAS ELUIÇÕES
// ==========================================
// CALCULADORA DE MÚLTIPLAS ELUIÇÕES - CORRIGIDA
// ==========================================
window.calcularMultiEluicao = function() {
    // 1. Obter dados do gerador (em mCi)
    const A_Mo_nominal_mCi = parseFloat(document.getElementById('atividade-nominal-multi').value);
    const dataCalib = new Date(document.getElementById('data-calibracao-multi').value);
    const dataUltimaEluicao = new Date(document.getElementById('data-ultima-eluicao-multi').value);
    const dataNovaEluicao = new Date(document.getElementById('data-nova-eluicao-multi').value);

    // 2. Validações
    if (!A_Mo_nominal_mCi || isNaN(dataCalib) || isNaN(dataUltimaEluicao) || isNaN(dataNovaEluicao)) {
        alert('⚠️ Preencha todos os campos corretamente!');
        return;
    }

    if (dataNovaEluicao <= dataUltimaEluicao) {
        alert('⚠️ A nova eluição deve ser após a última eluição!');
        return;
    }

    if (dataUltimaEluicao <= dataCalib) {
        alert('⚠️ A última eluição deve ser após a data de calibração!');
        return;
    }

    // 3. Constantes físicas (meia-vida: Mo-99 = 66h, Tc-99m = 6.02h)
    const lambda_Mo = 0.01050223; // h⁻¹ (ln2/66)
    const lambda_Tc = 0.114886273; // h⁻¹ (ln2/6.02)

    // 4. Calcular tempos decorridos (em horas) a partir da calibração
    const t_ultima = (dataUltimaEluicao - dataCalib) / (1000 * 60 * 60);
    const t_nova = (dataNovaEluicao - dataCalib) / (1000 * 60 * 60);
    const deltaT = t_nova - t_ultima; // Tempo entre as eluições

    // 5. Atividade do Mo-99 no momento da NOVA eluição (em mCi)
    const A_Mo_nova = A_Mo_nominal_mCi * Math.exp(-lambda_Mo * t_nova);

    // 6. Atividade do Mo-99 no momento da ÚLTIMA eluição (necessário para o cálculo)
    const A_Mo_ultima = A_Mo_nominal_mCi * Math.exp(-lambda_Mo * t_ultima);

    // 7. Cálculo da atividade de Tc-99m disponível para eluição (TEÓRICA)
    // Fórmula correta para atividade de Tc-99m em equilíbrio com Mo-99
    const A_Tc_disponivel = A_Mo_ultima * (lambda_Tc / (lambda_Tc - lambda_Mo)) * 
                            (Math.exp(-lambda_Mo * deltaT) - Math.exp(-lambda_Tc * deltaT));

    // 8. Eficiência prática de eluição (perdas no processo)
    const eficienciaEluicao = 0.90;
    const A_Tc_eluida = A_Tc_disponivel * eficienciaEluicao;

    // 9. Cálculo do equilíbrio transiente (~95% do Mo-99 após 24h)
    const A_Tc_equilibrio = A_Mo_ultima * 0.95 * (1 - Math.exp(-lambda_Tc * deltaT));
    
    // 10. Índice de recuperação (quanto % do equilíbrio foi alcançado)
    const indiceRecuperacao = A_Tc_equilibrio > 0 ? (A_Tc_disponivel / A_Tc_equilibrio) : 0;

    // 11. Exibir resultados
    exibirResultadoMultiEluicao({
        A_Mo_nova: A_Mo_nova,
        A_Mo_ultima: A_Mo_ultima,
        A_Tc_disponivel: A_Tc_disponivel,      // Teórico (100% eficiência)
        A_Tc_eluida: A_Tc_eluida,              // Prático (com 90% eficiência)
        A_Tc_equilibrio: A_Tc_equilibrio,      // Máximo possível (~95% do Mo)
        deltaT: deltaT,
        indiceRecuperacao: indiceRecuperacao,
        eficienciaEluicao: eficienciaEluicao,
        dataUltimaEluicao: dataUltimaEluicao,
        dataNovaEluicao: dataNovaEluicao,
        A_Mo_nominal_mCi: A_Mo_nominal_mCi,
        dataCalib: dataCalib
    });
};

function exibirResultadoMultiEluicao(dados) {
    const div = document.getElementById('resultado-multi-eluicoes');

    div.innerHTML = `
        <div style="background: rgba(255,255,255,0.03); border: 2px solid rgba(155, 89, 182, 0.3); padding: 20px; border-radius: 10px; margin-top: 20px;">
            <h4 style="margin-top: 0; color: #9b59b6;">✅ Resultado da Nova Eluição</h4>

            <!-- APENAS 2 CARDS: DISPONÍVEL e ELUÍDA -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0;">
                <div style="background: rgba(46, 204, 113, 0.15); padding: 20px; border-radius: 8px; border: 1px solid rgba(46, 204, 113, 0.2); text-align: center;">
                    <strong style="color: #aaa;">🧪 Tc-99m disponível</strong><br>
                    <span style="font-size: 2.2em; color: #2ecc71;">${dados.A_Tc_disponivel.toFixed(1)} mCi</span>
                    <br><small style="color: #888;">teórico (100% eficiência)</small>
                </div>
                <div style="background: rgba(0, 210, 255, 0.15); padding: 20px; border-radius: 8px; border: 1px solid rgba(0, 210, 255, 0.2); text-align: center;">
                    <strong style="color: #aaa;">💉 Atividade ELUÍDA</strong><br>
                    <span style="font-size: 2.2em; color: #00d2ff;">${dados.A_Tc_eluida.toFixed(1)} mCi</span>
                    <br><small style="color: #888;">${(dados.eficienciaEluicao * 100)}% eficiência</small>
                </div>
            </div>

            <!-- INFORMAÇÃO ADICIONAL COMPACTA (sem % do equilíbrio) -->
            <div style="background: rgba(0, 210, 255, 0.05); border: 1px solid rgba(0, 210, 255, 0.1); padding: 10px; border-radius: 8px; margin-top: 5px; text-align: center;">
                <span style="color: #aaa; font-size: 0.85rem;">
                    ⏱️ ${dados.deltaT.toFixed(1)}h desde a última eluição
                </span>
            </div>

            <!-- DATA/HORA DA NOVA ELUIÇÃO -->
            <div style="margin-top: 10px; color: #666; font-size: 0.8rem; text-align: center;">
                ${dados.dataNovaEluicao.toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}
            </div>
        </div>
    `;
}

// ==========================================
// INICIALIZAÇÃO - Preencher datas com valores padrão
// ==========================================

// Aguarda o DOM carregar para preencher os campos
document.addEventListener('DOMContentLoaded', function() {
    // Preencher data/hora atual nos campos da calculadora multi-eluicao
    const agora = new Date();
    const agoraStr = agora.toISOString().slice(0, 16);
    
    const camposData = [
        'data-calibracao-multi',
        'data-ultima-eluicao-multi',
        'data-nova-eluicao-multi'
    ];
    
    camposData.forEach(id => {
        const campo = document.getElementById(id);
        if (campo && !campo.value) {
            campo.value = agoraStr;
        }
    });

    // Sincronizar a data de calibração com a calculadora principal (se existir)
    const calibPrincipal = document.getElementById('planHorarioMarcacao');
    const calibMulti = document.getElementById('data-calibracao-multi');
    if (calibPrincipal && calibPrincipal.value && calibMulti) {
        calibMulti.value = calibPrincipal.value;
    }
});