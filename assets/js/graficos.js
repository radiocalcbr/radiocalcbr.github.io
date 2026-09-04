// ====== GRÁFICOS E RELATÓRIOS ======

let graficoDecaimento = null;

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
                        { 
                            label: `Decaimento do Kit (${nomeIsot})`, 
                            data: dadosDecaimento, 
                            borderColor: cor, 
                            backgroundColor: `rgba(0, 210, 255, 0.05)`, 
                            borderWidth: 2.5, 
                            pointRadius: 0, 
                            tension: 0.4, 
                            fill: true 
                        },
                        { 
                            label: 'Dose Disponível na Injeção', 
                            data: dadosInjecoes, 
                            borderColor: '#ff6b6b', 
                            backgroundColor: '#ff6b6b', 
                            borderWidth: 0, 
                            pointRadius: 7, 
                            pointBackgroundColor: '#ff6b6b', 
                            pointBorderColor: '#ffffff', 
                            pointBorderWidth: 2, 
                            showLine: false, 
                            type: 'scatter' 
                        },
                        { 
                            label: 'Dose Alvo por Paciente', 
                            data: Array(labels.length).fill(dosePorPaciente), 
                            borderColor: '#ffd700', 
                            backgroundColor: 'transparent', 
                            borderWidth: 1.5, 
                            borderDash: [5, 5], 
                            pointRadius: 0, 
                            fill: false 
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                        legend: { 
                            labels: { 
                                color: '#ccc', 
                                font: { size: 10 }, 
                                boxWidth: 15, 
                                padding: 12 
                            } 
                        } 
                    },
                    scales: { 
                        x: { 
                            ticks: { color: '#888', font: { size: 9 } }, 
                            grid: { color: 'rgba(255, 255, 255, 0.05)' } 
                        }, 
                        y: { 
                            ticks: { color: '#888', font: { size: 10 } }, 
                            grid: { color: 'rgba(255, 255, 255, 0.05)' }, 
                            beginAtZero: true 
                        } 
                    }
                }
            });
        } catch(e) { console.error('Erro ao criar gráfico:', e); }
    }
}

function gerarExcelPlanejamento() {
    const tabela = document.getElementById('tabelaDistribuicao');
    const rows = tabela.querySelectorAll('tr');
    
    const dados = [];
    dados.push(['==================================================']);
    dados.push(['         ☢️ RADIOCALCBR - PLANEJAMENTO']);
    dados.push(['==================================================']);
    dados.push(['']);
    dados.push(['📋 RELATÓRIO DE PLANEJAMENTO DE RADIOFÁRMACOS']);
    dados.push(['']);
    dados.push(['📅 Data/Hora:', new Date().toLocaleString('pt-BR')]);
    dados.push(['🔬 Isótopo:', document.getElementById('isotopoLegenda')?.textContent || 'Tc-99m']);
    dados.push(['📊 Atividade de Marcação:', document.getElementById('planAtividadeFinal')?.textContent || '--']);
    dados.push(['✅ Sobra no Frasco:', document.getElementById('planSobraFinal')?.textContent || '--']);
    dados.push(['📉 Aproveitamento:', document.getElementById('planAproveitamento')?.textContent || '--']);
    dados.push(['📌 Status:', document.getElementById('planStatus')?.textContent || '--']);
    dados.push(['']);
    dados.push(['==================================================']);
    dados.push(['📋 DISTRIBUIÇÃO POR PACIENTE']);
    dados.push(['==================================================']);
    dados.push([]);
    
    dados.push(['#', 'Horário', 'Dose Alvo (mCi)', 'Dose Disponível (mCi)', 'Dose Retirada (mCi)', 'Atividade Restante (mCi)', 'Status']);
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 7) {
            dados.push([
                cells[0].textContent,
                cells[1].textContent,
                parseFloat(cells[2].textContent) || 0,
                parseFloat(cells[3].textContent) || 0,
                parseFloat(cells[4].textContent) || 0,
                parseFloat(cells[5].textContent) || 0,
                cells[6].textContent
            ]);
        }
    });
    
    dados.push([]);
    dados.push(['==================================================']);
    dados.push(['📌 GERADO POR RADIOCALCBR']);
    dados.push(['📧 fisixassessoria@gmail.com']);
    dados.push(['==================================================']);
    dados.push(['⚠️ AVISO: Resultados devem ser validados clinicamente.']);
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(dados);
    ws['!cols'] = [{ wch: 8 }, { wch: 22 }, { wch: 20 }, { wch: 22 }, { wch: 20 }, { wch: 24 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Planejamento');
    
    const nomeArquivo = `Planejamento_RadioCalcBR_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(wb, nomeArquivo);
}

function gerarExcelPacientes() {
    const tbody = document.getElementById('corpoPacientes');
    const rows = tbody.querySelectorAll('tr');
    
    if (rows.length === 0) {
        alert('⚠️ Não há pacientes para gerar o relatório!');
        return;
    }
    
    const dados = [];
    dados.push(['==================================================']);
    dados.push(['         ☢️ RADIOCALCBR - PACIENTES']);
    dados.push(['==================================================']);
    dados.push(['']);
    dados.push(['📋 RELATÓRIO DE ADMINISTRAÇÃO DE PACIENTES']);
    dados.push(['']);
    dados.push(['📅 Data/Hora:', new Date().toLocaleString('pt-BR')]);
    dados.push(['🔬 Isótopo:', NOME_ISOTOPO[isotopoAtual] || 'Tc-99m']);
    dados.push(['⏱️ Meia-vida:', `${MEIA_VIDA_MIN[isotopoAtual] || 362} min`]);
    dados.push(['📊 Total de Pacientes:', rows.length]);
    dados.push(['']);
    dados.push(['==================================================']);
    dados.push(['📋 LISTA DE PACIENTES']);
    dados.push(['==================================================']);
    dados.push([]);
    
    dados.push(['#', 'ID', 'Peso (kg)', 'Dose/kg (mCi/kg)', 'Dose Calc. (mCi)', 'Hora Injeção', 'Dose Medida (mCi)', 'Dose Admin. (mCi)', 'Rejeito (mCi)', 'Δt (min)', 'Ativ. Restante (mCi)', 'Status']);
    
    rows.forEach((row, idx) => {
        const id = document.getElementById(`idPaciente_${idx}`)?.value || '-';
        const peso = parseFloat(document.getElementById(`pesoPaciente_${idx}`)?.value) || 0;
        const doseKg = parseFloat(document.getElementById(`doseKgPaciente_${idx}`)?.value) || 0;
        const doseCalc = parseFloat(document.getElementById(`doseCalculada_${idx}`)?.textContent) || 0;
        const horaInj = document.getElementById(`horaInjecao_${idx}`)?.value || '';
        const doseMedida = parseFloat(document.getElementById(`doseMedida_${idx}`)?.value) || 0;
        const doseAdmin = parseFloat(document.getElementById(`doseAdministrada_${idx}`)?.textContent) || 0;
        const rejeito = parseFloat(document.getElementById(`rejeito_${idx}`)?.value) || 0;
        const intervalo = document.getElementById(`intervaloInjecao_${idx}`)?.textContent || '--';
        const restante = parseFloat(document.getElementById(`atividadeRestante_${idx}`)?.textContent) || 0;
        const status = document.getElementById(`statusPaciente_${idx}`)?.textContent || '--';
        
        dados.push([idx + 1, id, peso, doseKg, doseCalc, horaInj, doseMedida, doseAdmin, rejeito, intervalo, restante, status]);
    });
    
    dados.push([]);
    dados.push(['==================================================']);
    dados.push(['📌 GERADO POR RADIOCALCBR']);
    dados.push(['📧 fisixassessoria@gmail.com']);
    dados.push(['==================================================']);
    dados.push(['⚠️ AVISO: Resultados devem ser validados clinicamente.']);
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(dados);
    ws['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 22 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 20 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Pacientes');
    
    const nomeArquivo = `Pacientes_RadioCalcBR_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(wb, nomeArquivo);
}
