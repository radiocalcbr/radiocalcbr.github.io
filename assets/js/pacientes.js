// ====== FUNÇÕES DE PACIENTES ======

let contadorPacientes = 0;
let isotopoAtual = 'tc';

function processarAtualizacaoPaciente(index, inputEl = null) {
    if (typeof recalcularDosePaciente === 'function') {
        recalcularDosePaciente(index);
    }

    if (inputEl && (inputEl.id?.startsWith('rejeito_') || inputEl.id?.startsWith('horaRejeito_'))) {
        if (typeof calcularDoseComRejeitoCorrigido === 'function') {
            calcularDoseComRejeitoCorrigido(index);
        }
    }

    if (typeof calcularPacientes === 'function') {
        calcularPacientes();
    }
}

function adicionarPaciente() {
    if (contadorPacientes >= MAX_PACIENTES) { 
        alert(`Limite máximo de ${MAX_PACIENTES} pacientes atingido!`); 
        return; 
    }
    const index = contadorPacientes;
    contadorPacientes++;
    const tbody = document.getElementById('corpoPacientes');
    const horaInjecaoStr = '';
    const tr = document.createElement('tr');
    tr.dataset.index = index;
    tr.innerHTML = `
        <td class="num-paciente">${index + 1}</td>
        <td><input type="text" id="idPaciente_${index}" placeholder="ID" value="P-${String(10000 + index).padStart(5, '0')}"></td>
        <td><input type="number" id="pesoPaciente_${index}" value="" placeholder="kg" step="0.1" min="1"></td>
        <td><input type="number" id="doseKgPaciente_${index}" value="" placeholder="mCi/kg" step="0.01" min="0.01"></td>
        <td class="dose-calculada" id="doseCalculada_${index}">--</td>
        <td><input type="datetime-local" id="horaInjecao_${index}" value="${horaInjecaoStr}"></td>
        <td><input type="number" id="doseMedida_${index}" value="" placeholder="mCi" step="0.1" min="0" class="dose-medida-input"></td>
        <td class="dose-administrada" id="doseAdministrada_${index}">--</td>
        <td><input type="number" id="rejeito_${index}" value="" placeholder="mCi" step="0.1" min="0" class="rejeito-input" onchange="calcularDoseComRejeitoCorrigido(${index})"></td>
        <td><input type="datetime-local" id="horaRejeito_${index}" value="" onchange="calcularDoseComRejeitoCorrigido(${index})"></td>
        <td class="resultado-calc" id="intervaloInjecao_${index}">--</td>
        <td class="resultado-calc" id="atividadeRestante_${index}">--</td>
        <td id="statusPaciente_${index}">--</td>
        <td><button class="btn-danger" onclick="removerPaciente(${index})">✕</button></td>
    `;
    tbody.appendChild(tr);
    atualizarContadorPacientes();
    trackEvent('adicionar_paciente', 'pacientes', `total_${contadorPacientes}`);
    
    const inputs = tr.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('change', () => processarAtualizacaoPaciente(index, input));
        input.addEventListener('input', () => processarAtualizacaoPaciente(index, input));
    });
}

function adicionarPacientesLote() {
    let count = 0;
    for (let i = 0; i < 5; i++) { 
        if (contadorPacientes >= MAX_PACIENTES) break; 
        adicionarPaciente(); 
        count++; 
    }
    trackEvent('adicionar_lote', 'pacientes', `${count}_pacientes`);
    setTimeout(() => calcularPacientes(), 100);
}

function removerPaciente(index) {
    const tbody = document.getElementById('corpoPacientes');
    const rows = tbody.querySelectorAll('tr');
    if (rows.length <= 1) { 
        alert('É necessário manter pelo menos 1 paciente.'); 
        return; 
    }
    const row = tbody.querySelector(`tr[data-index="${index}"]`);
    if (row) { 
        row.remove(); 
        reordenarPacientes(); 
        atualizarContadorPacientes(); 
        calcularPacientes(); 
        trackEvent('remover_paciente', 'pacientes', `id_${index}`); 
    }
}

function reordenarPacientes() {
    const tbody = document.getElementById('corpoPacientes');
    const rows = tbody.querySelectorAll('tr');
    
    const dadosPacientes = [];
    rows.forEach((row) => {
        const idx = parseInt(row.dataset.index);
        const id = document.getElementById(`idPaciente_${idx}`)?.value || '';
        const peso = document.getElementById(`pesoPaciente_${idx}`)?.value || '';
        const doseKg = document.getElementById(`doseKgPaciente_${idx}`)?.value || '';
        const hora = document.getElementById(`horaInjecao_${idx}`)?.value || '';
        const doseMedida = document.getElementById(`doseMedida_${idx}`)?.value || '';
        const rejeito = document.getElementById(`rejeito_${idx}`)?.value || '';
        const horaRejeito = document.getElementById(`horaRejeito_${idx}`)?.value || '';
        const doseCalculada = document.getElementById(`doseCalculada_${idx}`)?.textContent || '';
        const doseAdministrada = document.getElementById(`doseAdministrada_${idx}`)?.textContent || '';
        dadosPacientes.push({ idx, id, peso, doseKg, hora, doseMedida, rejeito, horaRejeito, doseCalculada, doseAdministrada });
    });
    
    dadosPacientes.sort((a, b) => {
        if (!a.hora || !b.hora) return 0;
        return new Date(a.hora) - new Date(b.hora);
    });
    
    tbody.innerHTML = '';
    dadosPacientes.forEach((dado, novoIndex) => {
        const tr = document.createElement('tr');
        tr.dataset.index = novoIndex;
        tr.innerHTML = `
            <td class="num-paciente">${novoIndex + 1}</td>
            <td><input type="text" id="idPaciente_${novoIndex}" placeholder="ID" value="${dado.id}"></td>
            <td><input type="number" id="pesoPaciente_${novoIndex}" value="${dado.peso}" step="0.1" min="1"></td>
            <td><input type="number" id="doseKgPaciente_${novoIndex}" value="${dado.doseKg}" step="0.01" min="0.01"></td>
            <td class="dose-calculada" id="doseCalculada_${novoIndex}">${dado.doseCalculada || '--'}</td>
            <td><input type="datetime-local" id="horaInjecao_${novoIndex}" value="${dado.hora}"></td>
            <td><input type="number" id="doseMedida_${novoIndex}" value="${dado.doseMedida}" step="0.1" min="0" class="dose-medida-input"></td>
            <td class="dose-administrada" id="doseAdministrada_${novoIndex}">${dado.doseAdministrada || '--'}</td>
            <td><input type="number" id="rejeito_${novoIndex}" value="${dado.rejeito}" step="0.1" min="0" class="rejeito-input" onchange="calcularDoseComRejeitoCorrigido(${novoIndex})"></td>
            <td><input type="datetime-local" id="horaRejeito_${novoIndex}" value="${dado.horaRejeito || ''}" onchange="calcularDoseComRejeitoCorrigido(${novoIndex})"></td>
            <td class="resultado-calc" id="intervaloInjecao_${novoIndex}">--</td>
            <td class="resultado-calc" id="atividadeRestante_${novoIndex}">--</td>
            <td id="statusPaciente_${novoIndex}">--</td>
            <td><button class="btn-danger" onclick="removerPaciente(${novoIndex})">✕</button></td>
        `;
        tbody.appendChild(tr);
        
        const inputs = tr.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('change', () => processarAtualizacaoPaciente(novoIndex, input));
            input.addEventListener('input', () => processarAtualizacaoPaciente(novoIndex, input));
        });
    });
    
    contadorPacientes = dadosPacientes.length;
}

function atualizarContadorPacientes() {
    const tbody = document.getElementById('corpoPacientes');
    const count = tbody.querySelectorAll('tr').length;
    document.getElementById('totalPacientes').textContent = count;
    contadorPacientes = count;
}

function recalcularDosePaciente(index) {
    const pesoInput = document.getElementById(`pesoPaciente_${index}`);
    const doseKgInput = document.getElementById(`doseKgPaciente_${index}`);
    const doseCalculadaEl = document.getElementById(`doseCalculada_${index}`);
    const doseMedidaInput = document.getElementById(`doseMedida_${index}`);
    const rejeitoInput = document.getElementById(`rejeito_${index}`);
    const doseAdministradaEl = document.getElementById(`doseAdministrada_${index}`);

    if (pesoInput && doseKgInput && doseCalculadaEl) {
        const peso = parseFloat(pesoInput.value) || 0;
        const doseKg = parseFloat(doseKgInput.value) || 0;
        doseCalculadaEl.textContent = (peso * doseKg).toFixed(2);
    }

    if (doseMedidaInput && doseAdministradaEl) {
        const doseMedida = parseFloat(doseMedidaInput.value) || 0;
        const rejeito = parseFloat(rejeitoInput?.value) || 0;
        const doseAdmin = doseMedida - rejeito;
        doseAdministradaEl.textContent = doseAdmin.toFixed(2);
        doseAdministradaEl.style.color = doseAdmin < 0 ? '#ff6b6b' : '#00ff88';
    }

    if (typeof calcularDoseComRejeitoCorrigido === 'function') {
        calcularDoseComRejeitoCorrigido(index);
    }
}

function calcularDoseComRejeitoCorrigido(index) {
    const horaInjecaoInput = document.getElementById(`horaInjecao_${index}`);
    const horaRejeitoInput = document.getElementById(`horaRejeito_${index}`);
    const rejeitoInput = document.getElementById(`rejeito_${index}`);
    const doseMedidaInput = document.getElementById(`doseMedida_${index}`);
    const doseAdministradaEl = document.getElementById(`doseAdministrada_${index}`);
    
    if (!horaInjecaoInput || !horaRejeitoInput || !rejeitoInput || !doseAdministradaEl) return;
    
    const horaInjecao = new Date(horaInjecaoInput.value);
    const horaRejeito = new Date(horaRejeitoInput.value);
    const rejeitoMedido = parseFloat(rejeitoInput.value) || 0;
    const doseMedida = parseFloat(doseMedidaInput?.value) || 0;
    const lambda = getLambda(isotopoAtual);
    
    if (isNaN(horaInjecao.getTime()) || isNaN(horaRejeito.getTime()) || horaRejeito <= horaInjecao) {
        const doseAdmin = doseMedida - rejeitoMedido;
        doseAdministradaEl.textContent = doseAdmin.toFixed(2);
        doseAdministradaEl.style.color = doseAdmin < 0 ? '#ff6b6b' : '#00ff88';
        return;
    }
    
    const dtMedicaoMin = (horaRejeito - horaInjecao) / (1000 * 60);
    const fatorCorrecao = Math.exp(lambda * dtMedicaoMin);
    const rejeitoCorrigido = rejeitoMedido * fatorCorrecao;
    const doseAdmin = doseMedida - rejeitoCorrigido;
    
    doseAdministradaEl.textContent = doseAdmin.toFixed(2);
    doseAdministradaEl.style.color = doseAdmin < 0 ? '#ff6b6b' : '#00ff88';
    
    const rejeitoCell = rejeitoInput.closest('td');
    if (rejeitoCell) {
        const indicadorAntigo = rejeitoCell.querySelector('.indicador-correcao');
        if (indicadorAntigo) indicadorAntigo.remove();
        
        if (dtMedicaoMin > 5) {
            const indicador = document.createElement('span');
            indicador.className = 'indicador-correcao';
            indicador.style.cssText = 'display:block;font-size:0.55rem;color:#00d2ff;margin-top:2px;';
            indicador.textContent = `↻ corrigido (Δt: ${dtMedicaoMin.toFixed(0)} min, fator: ${fatorCorrecao.toFixed(3)})`;
            rejeitoCell.appendChild(indicador);
        }
    }
}

function calcularPacientes() {
    const meiaVida = MEIA_VIDA_MIN[isotopoAtual];
    const lambda = getLambda(isotopoAtual);
    const tbody = document.getElementById('corpoPacientes');
    const rows = tbody.querySelectorAll('tr');
    const horarioMarcacao = new Date(document.getElementById('horarioMarcacaoMestre').value);
    const ativMarcacao = parseFloat(document.getElementById('atividadeMarcacaoMestre').value) || 0;
    let totalAdmin = 0, totalMedido = 0, totalRejeito = 0, totalDoseCalculada = 0, totalPeso = 0;
    let ultimaInjecao = null;
    const horasInjecoes = [];
    
    rows.forEach((row) => {
        const index = parseInt(row.dataset.index);
        const horaInjecaoInput = document.getElementById(`horaInjecao_${index}`);
        const pesoInput = document.getElementById(`pesoPaciente_${index}`);
        const doseKgInput = document.getElementById(`doseKgPaciente_${index}`);
        const doseMedidaInput = document.getElementById(`doseMedida_${index}`);
        const rejeitoInput = document.getElementById(`rejeito_${index}`);
        const doseAdminEl = document.getElementById(`doseAdministrada_${index}`);
        const doseCalcEl = document.getElementById(`doseCalculada_${index}`);
        
        if (horaInjecaoInput && doseAdminEl) {
            const horaInjecao = new Date(horaInjecaoInput.value);
            const peso = parseFloat(pesoInput?.value) || 0;
            const doseKg = parseFloat(doseKgInput?.value) || 0;
            const doseMedida = parseFloat(doseMedidaInput?.value) || 0;
            const rejeito = parseFloat(rejeitoInput?.value) || 0;
            const doseCalculada = peso * doseKg;

            if (typeof calcularDoseComRejeitoCorrigido === 'function') {
                calcularDoseComRejeitoCorrigido(index);
            }

            let doseAdministrada = 0;
            if (doseAdminEl && doseAdminEl.textContent !== '--') {
                doseAdministrada = parseFloat(doseAdminEl.textContent) || 0;
            } else {
                doseAdministrada = doseMedida - rejeito;
            }
            if (doseCalcEl) doseCalcEl.textContent = doseCalculada.toFixed(2);
            if (doseAdminEl) { 
                doseAdminEl.textContent = doseAdministrada.toFixed(2); 
                doseAdminEl.style.color = doseAdministrada < 0 ? '#ff6b6b' : '#00ff88'; 
            }
            if (!isNaN(horaInjecao.getTime()) && horarioMarcacao) {
                const dtMin = (horaInjecao - horarioMarcacao) / (1000 * 60);
                const fatorDec = Math.exp(-lambda * Math.max(0, dtMin));
                const atividadeTeorica = fatorDec > 0 ? doseMedida / fatorDec : 0;
                horasInjecoes.push({ index, hora: horaInjecao, dtMin, peso, doseKg, doseCalculada, doseMedida, doseAdministrada, rejeito, atividadeTeorica, fatorDec });
                if (!ultimaInjecao || horaInjecao > ultimaInjecao) ultimaInjecao = horaInjecao;
                totalAdmin += doseAdministrada || 0;
                totalMedido += doseMedida || 0;
                totalRejeito += rejeito || 0;
                totalDoseCalculada += doseCalculada || 0;
                totalPeso += peso || 0;
            }
        }
    });
    
    horasInjecoes.sort((a, b) => a.hora - b.hora);
    let atividadeRestanteReal = ativMarcacao;
    const resultadosPacientes = {};
    
    horasInjecoes.forEach((item, idx) => {
        if (idx === 0) { 
            const dtMin = item.dtMin; 
            const fatorDec = Math.exp(-lambda * Math.max(0, dtMin)); 
            atividadeRestanteReal = ativMarcacao * fatorDec; 
        } else { 
            const anterior = horasInjecoes[idx - 1]; 
            const dtDiferenca = item.dtMin - anterior.dtMin; 
            if (dtDiferenca > 0) { 
                const fatorDecEntre = Math.exp(-lambda * dtDiferenca); 
                atividadeRestanteReal = atividadeRestanteReal * fatorDecEntre; 
            } 
        }
        atividadeRestanteReal = atividadeRestanteReal - item.doseMedida;
        resultadosPacientes[item.index] = { ...item, atividadeRestanteReal: Math.max(0, atividadeRestanteReal), posicao: idx + 1 };
    });
    
    const somaDosesMedidas = horasInjecoes.reduce((sum, item) => sum + item.doseMedida, 0);
    const restanteFinal = horasInjecoes.length > 0 ? resultadosPacientes[horasInjecoes[horasInjecoes.length - 1].index]?.atividadeRestanteReal || 0 : 0;
    const decaimentoTotal = ativMarcacao - somaDosesMedidas - restanteFinal;
    
    rows.forEach((row) => {
        const index = parseInt(row.dataset.index);
        const dados = resultadosPacientes[index];
        if (!dados) return;
        const intervaloCell = document.getElementById(`intervaloInjecao_${index}`);
        const restanteCell = document.getElementById(`atividadeRestante_${index}`);
        const statusCell = document.getElementById(`statusPaciente_${index}`);
        
        if (intervaloCell) {
            const idxAtual = horasInjecoes.findIndex(item => item.index === index);
            if (idxAtual > 0) { 
                const anterior = horasInjecoes[idxAtual - 1]; 
                const diffMin = (dados.hora - anterior.hora) / (1000 * 60); 
                intervaloCell.textContent = `${diffMin.toFixed(1)} min`; 
                intervaloCell.className = 'resultado-calc'; 
                intervaloCell.style.color = diffMin < 10 ? '#ff6b6b' : diffMin < 30 ? '#ffd700' : '#00ff64'; 
            } else { 
                intervaloCell.textContent = '--'; 
                intervaloCell.className = 'resultado-calc'; 
                intervaloCell.style.color = '#888'; 
            }
        }
        
        if (restanteCell) {
            restanteCell.textContent = `${dados.atividadeRestanteReal.toFixed(2)} mCi`;
            let statusClass = '';
            if (dados.atividadeRestanteReal >= ativMarcacao * 0.2) statusClass = 'ok';
            else if (dados.atividadeRestanteReal >= 0) statusClass = 'alerta';
            else statusClass = 'erro';
            restanteCell.className = `resultado-calc ${statusClass}`;
        }
        
        if (statusCell) {
            let status = '', statusClass = '';
            if (dados.dtMin >= 0 && ativMarcacao > 0) {
                const percentualRestante = (dados.atividadeRestanteReal / ativMarcacao) * 100;
                if (percentualRestante >= 20) { 
                    status = translations[currentLang].status_adequado; 
                    statusClass = 'ok'; 
                } else if (percentualRestante >= 0) { 
                    status = translations[currentLang].status_baixo; 
                    statusClass = 'alerta'; 
                } else { 
                    status = translations[currentLang].status_insuficiente; 
                    statusClass = 'erro'; 
                }
            } else { 
                status = dados.dtMin < 0 ? translations[currentLang].status_aguardando : translations[currentLang].status_sem_dados; 
                statusClass = 'alerta'; 
            }
            statusCell.textContent = status;
            statusCell.className = `resultado-calc ${statusClass}`;
        }
        
        row.classList.remove('linha-ultimo-paciente');
        if (horasInjecoes.length > 0 && index === horasInjecoes[horasInjecoes.length - 1]?.index) {
            row.classList.add('linha-ultimo-paciente');
        }
    });
    
    const resumoDiv = document.getElementById('resumoPacientes');
    resumoDiv.style.display = 'block';
    const nPacientes = horasInjecoes.length;
    const pesoMedio = nPacientes > 0 ? totalPeso / nPacientes : 0;
    const doseMedia = nPacientes > 0 ? totalDoseCalculada / nPacientes : 0;
    const doseAdminMedia = nPacientes > 0 ? totalAdmin / nPacientes : 0;
    const cor = COR_ISOTOPO[isotopoAtual] || '#ffd700';
    const nomeIsot = NOME_ISOTOPO[isotopoAtual] || 'Tc-99m';
    
    document.getElementById('statsPacientes').innerHTML = `
        <div class="stat-card destaque"><div class="rotulo">Total Medido (Retirado)</div><div class="valor">${totalMedido.toFixed(2)} mCi</div></div>
        <div class="stat-card destaque"><div class="rotulo">Total Administrado</div><div class="valor">${totalAdmin.toFixed(2)} mCi</div></div>
        <div class="stat-card destaque"><div class="rotulo">Total de Rejeito</div><div class="valor" style="color: #ffd700;">${totalRejeito.toFixed(2)} mCi</div></div>
        <div class="stat-card destaque"><div class="rotulo">Total Restante no Frasco</div><div class="valor" style="color: ${restanteFinal >= 0 ? '#ffd700' : '#ff6b6b'};">${restanteFinal.toFixed(2)} mCi</div></div>
        <div class="stat-card vermelho"><div class="rotulo">Decaimento Total</div><div class="valor">${decaimentoTotal.toFixed(2)} mCi</div></div>
        <div class="stat-card ${isotopoAtual}"><div class="rotulo">Isótopo</div><div class="valor" style="font-size: 1.2rem; color: ${cor};">${nomeIsot}</div></div>
        <div class="stat-card ${isotopoAtual}"><div class="rotulo">Meia-vida</div><div class="valor" style="font-size: 1.2rem; color: ${cor};">${meiaVida} min</div></div>
        <div class="stat-card ${isotopoAtual}"><div class="rotulo">λ (min⁻¹)</div><div class="valor" style="font-size: 1.2rem; color: ${cor};">${lambda.toFixed(6)}</div></div>
        <div class="stat-card"><div class="rotulo">Tempo até Última Injeção</div><div class="valor" style="font-size: 1.2rem;">${ultimaInjecao ? ((ultimaInjecao - horarioMarcacao) / (1000 * 60)).toFixed(0) : 0} min</div></div>
        <div class="stat-card"><div class="rotulo">Peso Médio</div><div class="valor" style="font-size: 1.2rem;">${pesoMedio.toFixed(1)} kg</div></div>
        <div class="stat-card"><div class="rotulo">Dose Média Calculada</div><div class="valor" style="font-size: 1.2rem;">${doseMedia.toFixed(2)} mCi</div></div>
        <div class="stat-card verde"><div class="rotulo">Dose Média Administrada</div><div class="valor" style="font-size: 1.2rem;">${doseAdminMedia.toFixed(2)} mCi</div></div>
        <div class="stat-card"><div class="rotulo">Pacientes</div><div class="valor" style="font-size: 1.2rem;">${nPacientes}</div></div>
    `;
    
    document.getElementById('meiaVidaDisplay').textContent = `${meiaVida} min`;
    document.getElementById('meiaVidaDisplay').style.color = cor;
    document.getElementById('lambdaDisplay').textContent = lambda.toFixed(6);
}
