// ============================================================
// ARQUIVO: assets/js/gerador.js
// MÓDULO: Registro de Gerador Mo-99/Tc-99m (MODAL)
// ============================================================

// ============================================================
// ===== FUNÇÕES PARA ABRIR/FECHAR MODAL =====
// ============================================================

function abrirModalGerador() {
    console.log('⚛️⬇️ Abrindo modal de gerador...');
    const modal = document.getElementById('modalGerador');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('ativo');
        if (typeof inicializarGeradorModal === 'function') {
            inicializarGeradorModal();
        }
        console.log('✅ Modal de gerador aberto!');
    } else {
        console.error('❌ Modal de gerador não encontrado!');
    }
}

function fecharModalGerador() {
    console.log('🔒 Fechando modal de gerador...');
    const modal = document.getElementById('modalGerador');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('ativo');
        console.log('✅ Modal de gerador fechado!');
    }
}

// ============================================================
// ===== FECHAR MODAL COM ESC =====
// ============================================================

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const modal = document.getElementById('modalGerador');
        if (modal && modal.style.display === 'flex') {
            fecharModalGerador();
        }
    }
});

// ============================================================
// ===== VARIÁVEIS DA TABELA =====
// ============================================================

let paginaAtualGerador = 0;
let totalPaginasGerador = 1;
const LINHAS_POR_PAGINA_GERADOR = 18;
let dadosPaginasGerador = { 0: [] };
let filtroAtivoGerador = false;
let filtroDataInicioGerador = null;
let filtroDataFimGerador = null;

const STATUS_OPTIONS_GERADOR = [
    { value: 'aguardando', label: '🔵 Aguardando decaimento', class: 'status-aguardando' },
    { value: 'pronto', label: '🟡 Pronto para liberação', class: 'status-pronto' },
    { value: 'transito', label: '🟠 Em trânsito', class: 'status-transito' },
    { value: 'devolvido', label: '✅ Devolvido', class: 'status-devolvido' }
];

// ============================================================
// ===== INICIALIZAR MODAL =====
// ============================================================

function inicializarGeradorModal() {
    console.log('📋 Inicializando tabela de geradores...');
    if (!dadosPaginasGerador[0] || dadosPaginasGerador[0].length === 0) {
        for (let i = 0; i < LINHAS_POR_PAGINA_GERADOR; i++) {
            if (!dadosPaginasGerador[0]) dadosPaginasGerador[0] = [];
            dadosPaginasGerador[0][i] = {
                dataRecebimento: '',
                dataCalibracao: '',
                lote: '',
                validade: '',
                dataDevolucao: '',
                responsavelRecebimento: '',
                status: 'aguardando',
                responsavelLiberacao: '',
                responsavelDevolucao: ''
            };
        }
    }
    renderizarPaginaGerador(0);
    atualizarPaginacaoGerador();
    atualizarHistoricoGeradorModal();
    atualizarContadoresGerador();
    console.log('✅ Tabela de geradores inicializada!');
}

// ============================================================
// ===== RENDERIZAR PÁGINA =====
// ============================================================

function renderizarPaginaGerador(pagina) {
    const tbody = document.getElementById('corpoTabelaGeradoresModal');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    const dados = dadosPaginasGerador[pagina] || [];
    
    for (let i = 0; i < LINHAS_POR_PAGINA_GERADOR; i++) {
        const numLinha = (pagina * LINHAS_POR_PAGINA_GERADOR) + i + 1;
        const dado = dados[i] || {};
        
        const tr = document.createElement('tr');
        tr.dataset.index = i;
        tr.dataset.pagina = pagina;
        tr.dataset.numLinha = numLinha;
        
        let statusOptions = '';
        STATUS_OPTIONS_GERADOR.forEach(opt => {
            const selected = dado.status === opt.value ? 'selected' : '';
            statusOptions += `<option value="${opt.value}" ${selected}>${opt.label}</option>`;
        });
        
        tr.innerHTML = `
            <td class="num-linha">${numLinha}</td>
            <td><input type="date" id="ger_dataRec_${pagina}_${i}" class="input-gerador" value="${dado.dataRecebimento || ''}" onchange="salvarDadosLinhaGerador(${pagina}, ${i})"></td>
            <td><input type="datetime-local" id="ger_dataCal_${pagina}_${i}" class="input-gerador" value="${dado.dataCalibracao || ''}" onchange="salvarDadosLinhaGerador(${pagina}, ${i})"></td>
            <td><input type="text" id="ger_lote_${pagina}_${i}" placeholder="Ex: G12345678" class="input-gerador" value="${dado.lote || ''}" onchange="salvarDadosLinhaGerador(${pagina}, ${i})"></td>
            <td><input type="date" id="ger_validade_${pagina}_${i}" class="input-gerador" value="${dado.validade || ''}" onchange="salvarDadosLinhaGerador(${pagina}, ${i})"></td>
            <td><input type="date" id="ger_dataDev_${pagina}_${i}" class="input-gerador" value="${dado.dataDevolucao || ''}" onchange="salvarDadosLinhaGerador(${pagina}, ${i})"></td>
            <td><input type="text" id="ger_respRec_${pagina}_${i}" placeholder="Responsável" class="input-gerador" value="${dado.responsavelRecebimento || ''}" onchange="salvarDadosLinhaGerador(${pagina}, ${i})"></td>
            <td>
                <select id="ger_status_${pagina}_${i}" class="input-gerador" onchange="salvarDadosLinhaGerador(${pagina}, ${i}); atualizarContadoresGerador();">
                    ${statusOptions}
                </select>
            </td>
            <td><input type="text" id="ger_respLib_${pagina}_${i}" placeholder="Responsável" class="input-gerador" value="${dado.responsavelLiberacao || ''}" onchange="salvarDadosLinhaGerador(${pagina}, ${i})"></td>
            <td><input type="text" id="ger_respDev_${pagina}_${i}" placeholder="Responsável" class="input-gerador" value="${dado.responsavelDevolucao || ''}" onchange="salvarDadosLinhaGerador(${pagina}, ${i})"></td>
            <td>
                <button class="btn-acao-linha" onclick="limparLinhaGeradorModal(${pagina}, ${i})" title="Limpar linha">✕</button>
            </td>
        `;
        tbody.appendChild(tr);
    }
    atualizarInfoPaginaGerador(pagina);
    atualizarContadoresGerador();
}

// ============================================================
// ===== SALVAR DADOS DA LINHA =====
// ============================================================

function salvarDadosLinhaGerador(pagina, index) {
    if (!dadosPaginasGerador[pagina]) dadosPaginasGerador[pagina] = [];
    if (!dadosPaginasGerador[pagina][index]) dadosPaginasGerador[pagina][index] = {};
    
    dadosPaginasGerador[pagina][index] = {
        dataRecebimento: document.getElementById(`ger_dataRec_${pagina}_${index}`)?.value || '',
        dataCalibracao: document.getElementById(`ger_dataCal_${pagina}_${index}`)?.value || '',
        lote: document.getElementById(`ger_lote_${pagina}_${index}`)?.value || '',
        validade: document.getElementById(`ger_validade_${pagina}_${index}`)?.value || '',
        dataDevolucao: document.getElementById(`ger_dataDev_${pagina}_${index}`)?.value || '',
        responsavelRecebimento: document.getElementById(`ger_respRec_${pagina}_${index}`)?.value || '',
        status: document.getElementById(`ger_status_${pagina}_${index}`)?.value || 'aguardando',
        responsavelLiberacao: document.getElementById(`ger_respLib_${pagina}_${index}`)?.value || '',
        responsavelDevolucao: document.getElementById(`ger_respDev_${pagina}_${index}`)?.value || ''
    };
    verificarPaginaCompletaGerador(pagina);
    atualizarContadoresGerador();
}

// ============================================================
// ===== VERIFICAR PÁGINA COMPLETA =====
// ============================================================

function verificarPaginaCompletaGerador(pagina) {
    const dados = dadosPaginasGerador[pagina] || [];
    let completas = 0;
    for (let i = 0; i < LINHAS_POR_PAGINA_GERADOR; i++) {
        const linha = dados[i] || {};
        const preenchida = linha.dataRecebimento || linha.lote || 
                           linha.dataCalibracao || linha.validade;
        if (preenchida) completas++;
    }
    const alerta = document.getElementById('alertaPaginaCompletaGerador');
    if (alerta) {
        if (completas >= LINHAS_POR_PAGINA_GERADOR) {
            alerta.style.display = 'block';
            adicionarBotaoNovaPaginaGerador();
        } else {
            alerta.style.display = 'none';
        }
    }
}

// ============================================================
// ===== NOVA PÁGINA =====
// ============================================================

function adicionarBotaoNovaPaginaGerador() {
    const container = document.getElementById('paginacaoContainerGerador');
    if (!container) return;
    if (document.getElementById('btnNovaPaginaGerador')) return;
    const btn = document.createElement('button');
    btn.id = 'btnNovaPaginaGerador';
    btn.className = 'btn-pagina nova-pagina';
    btn.innerHTML = '📄 + Nova Página';
    btn.onclick = function() { criarNovaPaginaGerador(); };
    container.appendChild(btn);
}

function criarNovaPaginaGerador() {
    const novaPagina = totalPaginasGerador;
    dadosPaginasGerador[novaPagina] = [];
    for (let i = 0; i < LINHAS_POR_PAGINA_GERADOR; i++) {
        dadosPaginasGerador[novaPagina][i] = {
            dataRecebimento: '',
            dataCalibracao: '',
            lote: '',
            validade: '',
            dataDevolucao: '',
            responsavelRecebimento: '',
            status: 'aguardando',
            responsavelLiberacao: '',
            responsavelDevolucao: ''
        };
    }
    totalPaginasGerador++;
    paginaAtualGerador = novaPagina;
    const btnNova = document.getElementById('btnNovaPaginaGerador');
    if (btnNova) btnNova.remove();
    const alerta = document.getElementById('alertaPaginaCompletaGerador');
    if (alerta) alerta.style.display = 'none';
    renderizarPaginaGerador(paginaAtualGerador);
    atualizarPaginacaoGerador();
    atualizarInfoPaginaGerador(paginaAtualGerador);
    atualizarContadoresGerador();
}

// ============================================================
// ===== ATUALIZAR PAGINAÇÃO =====
// ============================================================

function atualizarPaginacaoGerador() {
    const container = document.getElementById('paginacaoContainerGerador');
    if (!container) return;
    container.innerHTML = '';
    
    const btnAnterior = document.createElement('button');
    btnAnterior.className = 'btn-pagina';
    btnAnterior.innerHTML = '◀ Anterior';
    btnAnterior.onclick = function() {
        if (paginaAtualGerador > 0) {
            paginaAtualGerador--;
            renderizarPaginaGerador(paginaAtualGerador);
            atualizarPaginacaoGerador();
            atualizarInfoPaginaGerador(paginaAtualGerador);
            atualizarContadoresGerador();
        }
    };
    if (paginaAtualGerador === 0) {
        btnAnterior.style.opacity = '0.3';
        btnAnterior.style.cursor = 'default';
    }
    container.appendChild(btnAnterior);
    
    for (let i = 0; i < totalPaginasGerador; i++) {
        const btn = document.createElement('button');
        btn.className = `btn-pagina ${i === paginaAtualGerador ? 'ativo' : ''}`;
        btn.textContent = `📄 ${i + 1}`;
        btn.onclick = function() {
            paginaAtualGerador = i;
            renderizarPaginaGerador(paginaAtualGerador);
            atualizarPaginacaoGerador();
            atualizarInfoPaginaGerador(paginaAtualGerador);
            atualizarContadoresGerador();
            const alerta = document.getElementById('alertaPaginaCompletaGerador');
            if (alerta) alerta.style.display = 'none';
            verificarPaginaCompletaGerador(paginaAtualGerador);
        };
        container.appendChild(btn);
    }
    
    const btnProxima = document.createElement('button');
    btnProxima.className = 'btn-pagina';
    btnProxima.innerHTML = 'Próxima ▶';
    btnProxima.onclick = function() {
        if (paginaAtualGerador < totalPaginasGerador - 1) {
            paginaAtualGerador++;
            renderizarPaginaGerador(paginaAtualGerador);
            atualizarPaginacaoGerador();
            atualizarInfoPaginaGerador(paginaAtualGerador);
            atualizarContadoresGerador();
        }
    };
    if (paginaAtualGerador === totalPaginasGerador - 1) {
        btnProxima.style.opacity = '0.3';
        btnProxima.style.cursor = 'default';
    }
    container.appendChild(btnProxima);
    
    const info = document.createElement('span');
    info.className = 'info-pagina';
    info.textContent = `📊 ${totalPaginasGerador} páginas · ${totalPaginasGerador * LINHAS_POR_PAGINA_GERADOR} linhas`;
    container.appendChild(info);
    
    const alerta = document.getElementById('alertaPaginaCompletaGerador');
    if (alerta && alerta.style.display === 'block') {
        adicionarBotaoNovaPaginaGerador();
    }
}

function atualizarInfoPaginaGerador(pagina) {
    const info = document.getElementById('infoPaginaAtualGerador');
    const infoTotal = document.getElementById('infoTotalLinhasGerador');
    if (info) info.textContent = `(Página ${pagina + 1})`;
    if (infoTotal) infoTotal.textContent = `📋 Página ${pagina + 1} · ${LINHAS_POR_PAGINA_GERADOR} linhas`;
}

function atualizarContadoresGerador() {
    let total = 0;
    let ativos = 0;
    let devolvidos = 0;
    
    for (let p = 0; p < totalPaginasGerador; p++) {
        const dados = dadosPaginasGerador[p] || [];
        for (let i = 0; i < LINHAS_POR_PAGINA_GERADOR; i++) {
            const linha = dados[i] || {};
            const preenchida = linha.dataRecebimento || linha.lote;
            if (preenchida) {
                total++;
                if (linha.status === 'devolvido') {
                    devolvidos++;
                } else {
                    ativos++;
                }
            }
        }
    }
    
    const totalEl = document.getElementById('totalGeradoresModal');
    const ativosEl = document.getElementById('ativosGeradoresModal');
    const devolvidosEl = document.getElementById('devolvidosGeradoresModal');
    
    if (totalEl) totalEl.textContent = total;
    if (ativosEl) ativosEl.textContent = ativos;
    if (devolvidosEl) devolvidosEl.textContent = devolvidos;
}

// ============================================================
// ===== LIMPAR LINHA =====
// ============================================================

function limparLinhaGeradorModal(pagina, index) {
    if (!confirm(`Deseja limpar a linha ${index + 1} da página ${pagina + 1}?`)) return;
    if (dadosPaginasGerador[pagina] && dadosPaginasGerador[pagina][index]) {
        dadosPaginasGerador[pagina][index] = {
            dataRecebimento: '',
            dataCalibracao: '',
            lote: '',
            validade: '',
            dataDevolucao: '',
            responsavelRecebimento: '',
            status: 'aguardando',
            responsavelLiberacao: '',
            responsavelDevolucao: ''
        };
    }
    renderizarPaginaGerador(pagina);
    atualizarContadoresGerador();
    mostrarFeedbackGerador('🗑️ Linha ' + (index + 1) + ' limpa!', 'info');
}

// ============================================================
// ===== SALVAR TABELA =====
// ============================================================

function salvarTabelaGeradoresModal() {
    let totalGeradores = 0;
    const todosGeradores = [];
    for (let p = 0; p < totalPaginasGerador; p++) {
        const dados = dadosPaginasGerador[p] || [];
        for (let i = 0; i < LINHAS_POR_PAGINA_GERADOR; i++) {
            const linha = dados[i] || {};
            const preenchida = linha.dataRecebimento || linha.lote;
            if (preenchida) {
                totalGeradores++;
                todosGeradores.push({
                    pagina: p + 1,
                    numero: (p * LINHAS_POR_PAGINA_GERADOR) + i + 1,
                    ...linha
                });
            }
        }
    }
    if (totalGeradores === 0) {
        alert('⚠️ Nenhum dado para salvar! Preencha pelo menos uma linha.');
        return;
    }
    const registro = {
        id: Date.now(),
        dataSalvamento: new Date().toISOString(),
        totalPaginas: totalPaginasGerador,
        totalGeradores: totalGeradores,
        geradores: todosGeradores
    };
    let registros = JSON.parse(localStorage.getItem('radiocalc_geradores') || '[]');
    registros.unshift(registro);
    localStorage.setItem('radiocalc_geradores', JSON.stringify(registros));
    mostrarFeedbackGerador('✅ ' + totalGeradores + ' geradores salvos em ' + totalPaginasGerador + ' páginas!', 'success');
    atualizarHistoricoGeradorModal();
}

// ============================================================
// ===== EXPORTAR EXCEL =====
// ============================================================

function exportarExcelGeradoresModal() {
    alert('📊 Função de exportar Excel em desenvolvimento!');
}

// ============================================================
// ===== HISTÓRICO =====
// ============================================================

function atualizarHistoricoGeradorModal() {
    const container = document.getElementById('historicoGeradoresContainerModal');
    if (!container) return;
    const registros = JSON.parse(localStorage.getItem('radiocalc_geradores') || '[]');
    if (registros.length === 0) {
        container.innerHTML = '<div class="historico-vazio">Nenhum registro salvo ainda.</div>';
        return;
    }
    let html = '';
    registros.slice(0, 5).forEach((reg, index) => {
        const data = new Date(reg.dataSalvamento).toLocaleString('pt-BR');
        html += `
            <div class="historico-item">
                <span>
                    <strong style="color: #ffd700;">#${index + 1}</strong>
                    ${reg.totalGeradores} geradores · ${reg.totalPaginas || 1} páginas
                </span>
                <span class="data">${data}</span>
            </div>
        `;
    });
    container.innerHTML = html;
}

// ============================================================
// ===== FEEDBACK =====
// ============================================================

function mostrarFeedbackGerador(mensagem, tipo) {
    tipo = tipo || 'success';
    const existing = document.querySelector('.feedback-flash');
    if (existing) existing.remove();
    const div = document.createElement('div');
    div.className = 'feedback-flash ' + tipo;
    div.textContent = mensagem;
    document.body.appendChild(div);
    setTimeout(function() {
        div.style.opacity = '0';
        div.style.transition = 'opacity 0.5s';
        setTimeout(function() { div.remove(); }, 500);
    }, 3000);
}

// ============================================================
// ===== FILTROS =====
// ============================================================

function aplicarFiltroGeradorModal() {
    const dataInicio = document.getElementById('filtroDataInicioGerador').value;
    const dataFim = document.getElementById('filtroDataFimGerador').value;
    if (!dataInicio && !dataFim) {
        mostrarToastGerador('⚠️ Selecione pelo menos uma data para filtrar.', 'aviso');
        return;
    }
    if (dataInicio && dataFim && dataInicio > dataFim) {
        mostrarToastGerador('⚠️ A data inicial não pode ser maior que a data final!', 'erro');
        return;
    }
    filtroDataInicioGerador = dataInicio ? new Date(dataInicio) : null;
    filtroDataFimGerador = dataFim ? new Date(dataFim) : null;
    filtroAtivoGerador = true;
    renderizarPaginaGerador(paginaAtualGerador);
    atualizarInfoFiltroGerador();
    mostrarToastGerador('✅ Filtro aplicado com sucesso!', 'success');
}

function limparFiltroGeradorModal() {
    document.getElementById('filtroDataInicioGerador').value = '';
    document.getElementById('filtroDataFimGerador').value = '';
    filtroAtivoGerador = false;
    filtroDataInicioGerador = null;
    filtroDataFimGerador = null;
    renderizarPaginaGerador(paginaAtualGerador);
    atualizarInfoFiltroGerador();
    mostrarToastGerador('✅ Filtro removido. Mostrando todos os registros.', 'info');
}

function atualizarInfoFiltroGerador() {
    const infoEl = document.getElementById('infoFiltroGerador');
    if (!infoEl) return;
    if (!filtroAtivoGerador) {
        infoEl.textContent = '📋 Mostrando todos os registros';
        infoEl.style.color = '#666';
        return;
    }
    let texto = '🔍 Filtro: ';
    const inicio = document.getElementById('filtroDataInicioGerador').value;
    const fim = document.getElementById('filtroDataFimGerador').value;
    if (inicio && fim) {
        texto += 'de ' + formatarDataBR(inicio) + ' até ' + formatarDataBR(fim);
    } else if (inicio) {
        texto += 'a partir de ' + formatarDataBR(inicio);
    } else if (fim) {
        texto += 'até ' + formatarDataBR(fim);
    }
    infoEl.textContent = texto;
    infoEl.style.color = '#00d2ff';
}

function mostrarToastGerador(mensagem, tipo) {
    tipo = tipo || 'success';
    const existing = document.querySelector('.toast-gerador');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'toast-gerador ' + tipo;
    toast.textContent = mensagem;
    document.body.appendChild(toast);
    setTimeout(function() {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s';
        setTimeout(function() { toast.remove(); }, 500);
    }, 3000);
}

function formatarDataBR(dataStr) {
    if (!dataStr) return '';
    const partes = dataStr.split('-');
    return partes[2] + '/' + partes[1] + '/' + partes[0];
}

// ============================================================
// ===== EXPORTAR FUNÇÕES =====
// ============================================================

window.abrirModalGerador = abrirModalGerador;
window.fecharModalGerador = fecharModalGerador;
window.inicializarGeradorModal = inicializarGeradorModal;
window.salvarTabelaGeradoresModal = salvarTabelaGeradoresModal;
window.exportarExcelGeradoresModal = exportarExcelGeradoresModal;
window.aplicarFiltroGeradorModal = aplicarFiltroGeradorModal;
window.limparFiltroGeradorModal = limparFiltroGeradorModal;

console.log('✅ Módulo de Gerador (Modal) carregado com sucesso!');
console.log('📦 Funções disponíveis:');
console.log('  - abrirModalGerador()');
console.log('  - fecharModalGerador()');
console.log('  - salvarTabelaGeradoresModal()');
console.log('  - exportarExcelGeradoresModal()');
console.log('  - aplicarFiltroGeradorModal()');
console.log('  - limparFiltroGeradorModal()');