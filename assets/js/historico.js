// ====== HISTÓRICO DE CÁLCULOS ======

let historicoPlanejamento = [];

function atualizarHistorico() {
    const container = document.getElementById('historicoContainer');
    if (historicoPlanejamento.length === 0) {
        container.innerHTML = `<div style="color: #888; font-size: 0.85rem; text-align: center; padding: 20px;">Nenhum cálculo salvo ainda.</div>`;
        return;
    }
    let html = '';
    for (const item of historicoPlanejamento) {
        const statusColor = item.status.includes('✅') ? '#00ff64' : item.status.includes('⚠️') ? '#ffd700' : '#ff6b6b';
        const sobraColor = parseFloat(item.atividadeRestante) < 0.5 ? '#00ff64' : parseFloat(item.atividadeRestante) < 2 ? '#ffd700' : '#ff6b6b';
        html += `<div class="historico-item" onclick="carregarHistorico(this)" data-index="${historicoPlanejamento.indexOf(item)}">
            <span>${item.isotopo} · ${item.pacientes} pacientes · ${item.dosePorPaciente} mCi/pac</span>
            <span class="valor">${item.atividadeFinal} mCi</span>
            <span style="color: ${sobraColor}; font-size: 0.7rem;">⬇️ ${item.atividadeRestante} mCi</span>
            <span style="color: ${statusColor}; font-size: 0.7rem;">${item.status}</span>
            <span class="data">${item.data}</span>
        </div>`;
    }
    container.innerHTML = html;
}

function carregarHistorico(element) {
    const index = parseInt(element.dataset.index);
    const item = historicoPlanejamento[index];
    if (!item) return;
    alert(`📋 Detalhes do Cálculo:\n\nIsótopo: ${item.isotopo}\nPacientes: ${item.pacientes}\nDose por Paciente: ${item.dosePorPaciente} mCi\nDose Total: ${item.doseTotal} mCi\nAtividade Necessária: ${item.atividadeNecessaria} mCi\nAtividade Final: ${item.atividadeFinal} mCi\nSobra no Frasco: ${item.atividadeRestante} mCi (${item.pctSobra}%)\nFator Decaimento: ${item.fatorDecaimento}%\nTempo Total: ${item.tempoTotal}\nStatus: ${item.status}\nData: ${item.data}`);
}

function limparHistorico() {
    if (confirm('Deseja limpar todo o histórico de cálculos?')) {
        historicoPlanejamento = [];
        atualizarHistorico();
    }
}
