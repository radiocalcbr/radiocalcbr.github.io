// ====== SALVAR E CARREGAR DADOS ======

function salvarTodosOsDados() {
    try {
        const dados = {
            pacientes: [],
            planSimplificado: {
                isotopo: document.getElementById('planIsotopo')?.value || '',
                numPacientes: document.getElementById('planNumPacientes')?.value || '',
                dosePorPaciente: document.getElementById('planDosePorPaciente')?.value || '',
                margem: document.getElementById('planMargemSeguranca')?.value || '',
                intervalo: document.getElementById('planIntervaloInjecoes')?.value || '',
                horarioMarcacao: document.getElementById('planHorarioMarcacao')?.value || '',
                horarioPrimeira: document.getElementById('planHorarioPrimeira')?.value || '',
                horarioUltimo: document.getElementById('planHorarioUltimo')?.value || ''
            },
            planAgenda: {
                isotopo: document.getElementById('planIsotopoAgenda')?.value || '',
                dosePorPaciente: document.getElementById('planDosePorPacienteAgenda')?.value || '',
                margem: document.getElementById('planMargemSegurancaAgenda')?.value || '',
                horarioMarcacao: document.getElementById('planHorarioMarcacaoAgenda')?.value || '',
                pacientes: []
            },
            marcacao: {
                radiofarmaco: document.getElementById('radiofarmacoMestre')?.value || '',
                horario: document.getElementById('horarioMarcacaoMestre')?.value || '',
                atividadeTotal: document.getElementById('atividadeMarcacaoMestre')?.value || '',
                atividadeDisponivel: document.getElementById('atividadeDisponivelMestre')?.value || ''
            },
            pediatrica: {
                radiofarmaco: document.getElementById('radiofarmacoPediatrico')?.value || '',
                metodo: document.getElementById('metodoPediatrico')?.value || '',
                peso: document.getElementById('pesoPediatrico')?.value || '',
                idade: document.getElementById('idadePediatrica')?.value || '',
                fator: document.getElementById('fatorCorrecaoPediatrica')?.value || ''
            },
            historico: typeof historicoPlanejamento !== 'undefined' ? historicoPlanejamento : [],
            abaAtiva: document.querySelector('.tab-content.active')?.id || 'aba-planejamento',
            dataSalvamento: new Date().toISOString()
        };

        // Coleta os dados dos pacientes
        const tbody = document.getElementById('corpoPacientes');
        if (tbody) {
            const rows = tbody.querySelectorAll('tr');
            rows.forEach((row) => {
                const idx = parseInt(row.dataset.index);
                if (!isNaN(idx)) {
                    dados.pacientes.push({
                        id: document.getElementById(`idPaciente_${idx}`)?.value || '',
                        peso: document.getElementById(`pesoPaciente_${idx}`)?.value || '',
                        doseKg: document.getElementById(`doseKgPaciente_${idx}`)?.value || '',
                        horaInjecao: document.getElementById(`horaInjecao_${idx}`)?.value || '',
                        doseMedida: document.getElementById(`doseMedida_${idx}`)?.value || '',
                        rejeito: document.getElementById(`rejeito_${idx}`)?.value || '',
                        horaRejeito: document.getElementById(`horaRejeito_${idx}`)?.value || '',
                        doseCalculada: document.getElementById(`doseCalculada_${idx}`)?.textContent || '',
                        doseAdministrada: document.getElementById(`doseAdministrada_${idx}`)?.textContent || ''
                    });
                }
            });
        }

        // Coleta os pacientes da agenda
        const agendaTbody = document.getElementById('corpoAgenda');
        if (agendaTbody) {
            const agendaRows = agendaTbody.querySelectorAll('tr');
            agendaRows.forEach((row) => {
                const idx = parseInt(row.dataset.index);
                if (!isNaN(idx)) {
                    const horaInput = document.getElementById(`agendaHora_${idx}`);
                    if (horaInput) {
                        dados.planAgenda.pacientes.push({
                            horario: horaInput.value || ''
                        });
                    }
                }
            });
        }

        localStorage.setItem('radiocalc_dados', JSON.stringify(dados));
        mostrarFeedbackSalvamento('✅ Dados salvos com sucesso!', 'success');
        return true;
    } catch (e) {
        console.error('Erro ao salvar dados:', e);
        mostrarFeedbackSalvamento('⚠️ Erro ao salvar dados.', 'error');
        return false;
    }
}

function carregarTodosOsDados() {
    try {
        const dadosSalvos = localStorage.getItem('radiocalc_dados');
        if (!dadosSalvos) {
            console.log('ℹ️ Nenhum dado salvo encontrado.');
            return false;
        }

        const dados = JSON.parse(dadosSalvos);

        // Carregar planejamento simplificado
        if (dados.planSimplificado) {
            const p = dados.planSimplificado;
            const el = document.getElementById('planIsotopo');
            if (el && p.isotopo) el.value = p.isotopo;
            const el2 = document.getElementById('planNumPacientes');
            if (el2 && p.numPacientes) el2.value = p.numPacientes;
            const el3 = document.getElementById('planDosePorPaciente');
            if (el3 && p.dosePorPaciente) el3.value = p.dosePorPaciente;
            const el4 = document.getElementById('planMargemSeguranca');
            if (el4 && p.margem) el4.value = p.margem;
            const el5 = document.getElementById('planIntervaloInjecoes');
            if (el5 && p.intervalo) el5.value = p.intervalo;
            const el6 = document.getElementById('planHorarioMarcacao');
            if (el6 && p.horarioMarcacao) el6.value = p.horarioMarcacao;
            const el7 = document.getElementById('planHorarioPrimeira');
            if (el7 && p.horarioPrimeira) el7.value = p.horarioPrimeira;
            const el8 = document.getElementById('planHorarioUltimo');
            if (el8 && p.horarioUltimo) el8.value = p.horarioUltimo;
        }

        // Carregar planejamento agenda
        if (dados.planAgenda) {
            const p = dados.planAgenda;
            const el = document.getElementById('planIsotopoAgenda');
            if (el && p.isotopo) el.value = p.isotopo;
            const el2 = document.getElementById('planDosePorPacienteAgenda');
            if (el2 && p.dosePorPaciente) el2.value = p.dosePorPaciente;
            const el3 = document.getElementById('planMargemSegurancaAgenda');
            if (el3 && p.margem) el3.value = p.margem;
            const el4 = document.getElementById('planHorarioMarcacaoAgenda');
            if (el4 && p.horarioMarcacao) el4.value = p.horarioMarcacao;
            
            if (p.pacientes && p.pacientes.length > 0) {
                const agendaTbody = document.getElementById('corpoAgenda');
                if (agendaTbody) {
                    agendaTbody.innerHTML = '';
                    p.pacientes.forEach((paciente, index) => {
                        const tr = document.createElement('tr');
                        tr.dataset.index = index;
                        tr.innerHTML = `
                            <td class="num-paciente">${index + 1}</td>
                            <td><input type="datetime-local" id="agendaHora_${index}" value="${paciente.horario || ''}"></td>
                            <td id="agendaDoseAlvo_${index}">--</td>
                            <td id="agendaDoseDisponivel_${index}">--</td>
                            <td id="agendaDoseRetirada_${index}">--</td>
                            <td id="agendaAtivRestante_${index}">--</td>
                            <td id="agendaDtMin_${index}">--</td>
                            <td id="agendaStatus_${index}">--</td>
                            <td><button class="btn-danger btn-sm" onclick="removerLinhaAgenda(${index})">✕</button></td>
                        `;
                        agendaTbody.appendChild(tr);
                    });
                    if (typeof reordenarAgenda === 'function') reordenarAgenda();
                    if (typeof atualizarContadorAgenda === 'function') atualizarContadorAgenda();
                }
            }
        }

        // Carregar marcação
        if (dados.marcacao) {
            const m = dados.marcacao;
            const el = document.getElementById('radiofarmacoMestre');
            if (el && m.radiofarmaco) el.value = m.radiofarmaco;
            const el2 = document.getElementById('horarioMarcacaoMestre');
            if (el2 && m.horario) el2.value = m.horario;
            const el3 = document.getElementById('atividadeMarcacaoMestre');
            if (el3 && m.atividadeTotal) el3.value = m.atividadeTotal;
            const el4 = document.getElementById('atividadeDisponivelMestre');
            if (el4 && m.atividadeDisponivel) el4.value = m.atividadeDisponivel;
            if (typeof atualizarInfoIsotopo === 'function') atualizarInfoIsotopo();
        }

        // Carregar dose pediátrica
        if (dados.pediatrica) {
            const p = dados.pediatrica;
            const el = document.getElementById('radiofarmacoPediatrico');
            if (el && p.radiofarmaco) el.value = p.radiofarmaco;
            const el2 = document.getElementById('metodoPediatrico');
            if (el2 && p.metodo) el2.value = p.metodo;
            const el3 = document.getElementById('pesoPediatrico');
            if (el3 && p.peso) el3.value = p.peso;
            const el4 = document.getElementById('idadePediatrica');
            if (el4 && p.idade) el4.value = p.idade;
            const el5 = document.getElementById('fatorCorrecaoPediatrica');
            if (el5 && p.fator) el5.value = p.fator;
        }

        // Carregar histórico
        if (dados.historico && typeof historicoPlanejamento !== 'undefined') {
            historicoPlanejamento = dados.historico;
            if (typeof atualizarHistorico === 'function') atualizarHistorico();
        }

        // Carregar pacientes
        if (dados.pacientes && dados.pacientes.length > 0) {
            const tbody = document.getElementById('corpoPacientes');
            if (tbody) {
                tbody.innerHTML = '';
                dados.pacientes.forEach((paciente, index) => {
                    const tr = document.createElement('tr');
                    tr.dataset.index = index;
                    tr.innerHTML = `
                        <td class="num-paciente">${index + 1}</td>
                        <td><input type="text" id="idPaciente_${index}" placeholder="ID" value="${paciente.id || `P-${String(10000 + index).padStart(5, '0')}`}"></td>
                        <td><input type="number" id="pesoPaciente_${index}" value="${paciente.peso || ''}" placeholder="kg" step="0.1" min="1"></td>
                        <td><input type="number" id="doseKgPaciente_${index}" value="${paciente.doseKg || ''}" placeholder="mCi/kg" step="0.01" min="0.01"></td>
                        <td class="dose-calculada" id="doseCalculada_${index}">${paciente.doseCalculada || '--'}</td>
                        <td><input type="datetime-local" id="horaInjecao_${index}" value="${paciente.horaInjecao || ''}"></td>
                        <td><input type="number" id="doseMedida_${index}" value="${paciente.doseMedida || ''}" placeholder="mCi" step="0.1" min="0" class="dose-medida-input"></td>
                        <td class="dose-administrada" id="doseAdministrada_${index}">${paciente.doseAdministrada || '--'}</td>
                        <td><input type="number" id="rejeito_${index}" value="${paciente.rejeito || ''}" placeholder="mCi" step="0.1" min="0" class="rejeito-input" onchange="calcularDoseComRejeitoCorrigido(${index})"></td>
                        <td><input type="datetime-local" id="horaRejeito_${index}" value="${paciente.horaRejeito || ''}" onchange="calcularDoseComRejeitoCorrigido(${index})"></td>
                        <td class="resultado-calc" id="intervaloInjecao_${index}">--</td>
                        <td class="resultado-calc" id="atividadeRestante_${index}">--</td>
                        <td id="statusPaciente_${index}">--</td>
                        <td><button class="btn-danger" onclick="removerPaciente(${index})">✕</button></td>
                    `;
                    tbody.appendChild(tr);

                    const inputs = tr.querySelectorAll('input');
                    inputs.forEach(input => {
                        input.addEventListener('change', () => { 
                            if (typeof recalcularDosePaciente === 'function') recalcularDosePaciente(index); 
                            if (typeof calcularPacientes === 'function') calcularPacientes(); 
                        });
                        input.addEventListener('input', () => { 
                            if (typeof recalcularDosePaciente === 'function') recalcularDosePaciente(index); 
                            if (typeof calcularPacientes === 'function') calcularPacientes(); 
                        });
                    });
                });
                if (typeof contadorPacientes !== 'undefined') {
                    contadorPacientes = dados.pacientes.length;
                }
                if (typeof atualizarContadorPacientes === 'function') atualizarContadorPacientes();
            }
        }

        // Restaurar aba ativa
        if (dados.abaAtiva) {
            const abaId = dados.abaAtiva.replace('aba-', '');
            if (typeof trocarAba === 'function') trocarAba(abaId);
        }

        setTimeout(() => {
            if (typeof calcularMarcacao === 'function') calcularMarcacao();
            if (typeof calcularPacientes === 'function') calcularPacientes();
            if (typeof calcularPlanejamento === 'function') calcularPlanejamento();
            if (typeof calcularDosePediatrica === 'function') calcularDosePediatrica();
        }, 300);

        mostrarFeedbackSalvamento('✅ Dados carregados com sucesso!', 'success');
        return true;

    } catch (e) {
        console.error('Erro ao carregar dados:', e);
        mostrarFeedbackSalvamento('⚠️ Erro ao carregar dados salvos.', 'error');
        return false;
    }
}

function limparDadosSalvos() {
    if (!confirm('⚠️ ATENÇÃO: Isso irá apagar TODOS os dados salvos. Deseja continuar?')) {
        return;
    }

    try {
        localStorage.removeItem('radiocalc_dados');
        
        const tbody = document.getElementById('corpoPacientes');
        if (tbody) {
            tbody.innerHTML = '';
            contadorPacientes = 0;
            if (typeof adicionarPaciente === 'function') {
                for (let i = 0; i < 5; i++) adicionarPaciente();
            }
        }
        
        if (typeof historicoPlanejamento !== 'undefined') {
            historicoPlanejamento = [];
            if (typeof atualizarHistorico === 'function') atualizarHistorico();
        }
        
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
        
        const resultPlanejamento = document.getElementById('resultadoPlanejamento');
        if (resultPlanejamento) resultPlanejamento.style.display = 'none';
        
        const resultMarcacao = document.getElementById('resultadoMarcacaoContainer');
        if (resultMarcacao) resultMarcacao.classList.remove('ativo');
        
        const resultPediatrico = document.getElementById('resultadoPediatrico');
        if (resultPediatrico) resultPediatrico.style.display = 'none';
        
        setTimeout(() => {
            if (typeof calcularPlanejamento === 'function') calcularPlanejamento();
            if (typeof calcularMarcacao === 'function') calcularMarcacao();
            if (typeof calcularPacientes === 'function') calcularPacientes();
            if (typeof calcularDosePediatrica === 'function') calcularDosePediatrica();
        }, 100);
        
        mostrarFeedbackSalvamento('✅ Dados resetados com sucesso!', 'success');
    } catch (e) {
        console.error('Erro ao limpar dados:', e);
        mostrarFeedbackSalvamento('⚠️ Erro ao limpar dados.', 'error');
    }
}

function autoSalvar() {
    salvarTodosOsDados();
}

const autoSalvarDebounced = debounce(autoSalvar, 600);

function iniciarAutoSave() {
    setInterval(autoSalvar, 7200000);
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', autoSalvarDebounced);
    });
    
    window.addEventListener('beforeunload', autoSalvar);
    console.log('🔄 Auto-save ativado (a cada 2 horas)!');
}
