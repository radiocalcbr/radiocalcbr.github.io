// ============================================================
// ARQUIVO: assets/js/rejeitos.js
// MÓDULO: Registro de Rejeitos Radioativos (MODAL)
// ============================================================

// ============================================================
// ===== FUNÇÕES PARA ABRIR/FECHAR MODAL =====
// ============================================================

function abrirModalRejeitos() {
    console.log('🖱️ Abrindo modal de rejeitos...');
    const modal = document.getElementById('modalRejeitos');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('ativo');
        // Inicializar a tabela
        if (typeof inicializarRejeitosModal === 'function') {
            inicializarRejeitosModal();
        }
        console.log('✅ Modal de rejeitos aberto!');
    } else {
        console.error('❌ Modal de rejeitos não encontrado!');
    }
}

function fecharModalRejeitos() {
    console.log('🔒 Fechando modal de rejeitos...');
    const modal = document.getElementById('modalRejeitos');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('ativo');
        console.log('✅ Modal de rejeitos fechado!');
    }
}

// ============================================================
// ===== FECHAR MODAL AO CLICAR FORA =====
// ============================================================

// ============================================================
// ===== FECHAR MODAL COM ESC =====
// ============================================================

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const modal = document.getElementById('modalRejeitos');
        if (modal && modal.style.display === 'flex') {
            fecharModalRejeitos();
        }
    }
});

// ============================================================
// ===== VARIÁVEIS DA TABELA =====
// ============================================================

let paginaAtualRejeitos = 0;
let totalPaginasRejeitos = 1;
const LINHAS_POR_PAGINA_REJEITOS = 18;
let dadosPaginasRejeitos = { 0: [] };
let filtroAtivoRejeitos = false;
let filtroDataInicioRejeitos = null;
let filtroDataFimRejeitos = null;

// ============================================================
// ===== INICIALIZAR MODAL =====
// ============================================================

function inicializarRejeitosModal() {
    console.log('📋 Inicializando tabela de rejeitos...');
    if (!dadosPaginasRejeitos[0] || dadosPaginasRejeitos[0].length === 0) {
        for (let i = 0; i < LINHAS_POR_PAGINA_REJEITOS; i++) {
            if (!dadosPaginasRejeitos[0]) dadosPaginasRejeitos[0] = [];
            dadosPaginasRejeitos[0][i] = {
                dataSegregacao: '',
                radionuclideo: '',
                identificacao: '',
                conteiner: '',
                tipoEmbalagem: '',
                pesoVolume: '',
                taxaExposicao: '',
                atividadeEstimada: '',
                dataDescarteEstimado: '',
                responsavelSegregacao: '',
                dataDescarteReal: '',
                taxaExposicaoDescarte: '',
                atividadeDescarte: '',
                responsavelDescarte: ''
            };
        }
    }
    renderizarPaginaRejeitos(0);
    atualizarPaginacaoRejeitos();
    atualizarHistoricoRejeitosModal();
    console.log('✅ Tabela de rejeitos inicializada!');
}

// ============================================================
// ===== RENDERIZAR PÁGINA =====
// ============================================================

function renderizarPaginaRejeitos(pagina) {
    const tbody = document.getElementById('corpoTabelaRejeitosModal');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    const dados = dadosPaginasRejeitos[pagina] || [];
    
    for (let i = 0; i < LINHAS_POR_PAGINA_REJEITOS; i++) {
        const numLinha = (pagina * LINHAS_POR_PAGINA_REJEITOS) + i + 1;
        const dado = dados[i] || {};
        
        const tr = document.createElement('tr');
        tr.dataset.index = i;
        tr.dataset.pagina = pagina;
        tr.dataset.numLinha = numLinha;
        
        tr.innerHTML = `
            <td class="num-linha">${numLinha}</td>
            <td><input type="date" id="rej_dataSeg_${pagina}_${i}" class="input-rejeito" value="${dado.dataSegregacao || ''}" onchange="salvarDadosLinhaRejeitos(${pagina}, ${i})"></td>
            <td>
                <select id="rej_radionuclideo_${pagina}_${i}" class="input-rejeito" onchange="salvarDadosLinhaRejeitos(${pagina}, ${i})">
                    <option value="">Selecione</option>
                    <option value="Tc-99m" ${dado.radionuclideo === 'Tc-99m' ? 'selected' : ''}>Tc-99m</option>
                    <option value="F-18" ${dado.radionuclideo === 'F-18' ? 'selected' : ''}>F-18</option>
                    <option value="I-123" ${dado.radionuclideo === 'I-123' ? 'selected' : ''}>I-123</option>
                    <option value="I-131" ${dado.radionuclideo === 'I-131' ? 'selected' : ''}>I-131</option>
                    <option value="Ga-67" ${dado.radionuclideo === 'Ga-67' ? 'selected' : ''}>Ga-67</option>
                    <option value="In-111" ${dado.radionuclideo === 'In-111' ? 'selected' : ''}>In-111</option>
                    <option value="Tl-201" ${dado.radionuclideo === 'Tl-201' ? 'selected' : ''}>Tl-201</option>
                    <option value="Mo-99" ${dado.radionuclideo === 'Mo-99' ? 'selected' : ''}>Mo-99</option>
                    <option value="Outro" ${dado.radionuclideo === 'Outro' ? 'selected' : ''}>Outro</option>
                </select>
            </td>
            <td><input type="text" id="rej_identificacao_${pagina}_${i}" placeholder="Ex: Nº da etiqueta X" class="input-rejeito" value="${dado.identificacao || ''}" onchange="salvarDadosLinhaRejeitos(${pagina}, ${i})"></td>
            <td>
                <select id="rej_conteiner_${pagina}_${i}" class="input-rejeito" onchange="salvarDadosLinhaRejeitos(${pagina}, ${i})">
                    <option value="">Selecione</option>
                    <option value="1" ${dado.conteiner === '1' ? 'selected' : ''}>1</option>
                    <option value="2" ${dado.conteiner === '2' ? 'selected' : ''}>2</option>
                    <option value="3" ${dado.conteiner === '3' ? 'selected' : ''}>3</option>
                    <option value="4" ${dado.conteiner === '4' ? 'selected' : ''}>4</option>
                    <option value="5" ${dado.conteiner === '5' ? 'selected' : ''}>5</option>
                    <option value="6" ${dado.conteiner === '6' ? 'selected' : ''}>6</option>
                </select>
            </td>
            <td>
                <select id="rej_tipoEmb_${pagina}_${i}" class="input-rejeito" onchange="salvarDadosLinhaRejeitos(${pagina}, ${i})">
                    <option value="">Selecione</option>
                    <option value="Perfuro cortante" ${dado.tipoEmbalagem === 'Perfuro cortante' ? 'selected' : ''}>Perfuro cortante</option>
                    <option value="Luvas e algodão" ${dado.tipoEmbalagem === 'Luvas e algodão' ? 'selected' : ''}>Luvas e algodão</option>
                </select>
            </td>
            <td><input type="text" id="rej_pesoVol_${pagina}_${i}" placeholder="kg ou mL" class="input-rejeito" value="${dado.pesoVolume || ''}" onchange="salvarDadosLinhaRejeitos(${pagina}, ${i})"></td>
            <td><input type="number" id="rej_taxaExp_${pagina}_${i}" placeholder="μSv/h" step="0.01" class="input-rejeito" value="${dado.taxaExposicao || ''}" onchange="salvarDadosLinhaRejeitos(${pagina}, ${i})"></td>
            <td><input type="number" id="rej_atividade_${pagina}_${i}" placeholder="mCi" step="0.001" class="input-rejeito" value="${dado.atividadeEstimada || ''}" onchange="salvarDadosLinhaRejeitos(${pagina}, ${i})"></td>
            <td><input type="date" id="rej_dataDescEst_${pagina}_${i}" class="input-rejeito" value="${dado.dataDescarteEstimado || ''}" onchange="salvarDadosLinhaRejeitos(${pagina}, ${i})"></td>
            <td><input type="text" id="rej_respSeg_${pagina}_${i}" placeholder="Responsável" class="input-rejeito" value="${dado.responsavelSegregacao || ''}" onchange="salvarDadosLinhaRejeitos(${pagina}, ${i})"></td>
            <td><input type="date" id="rej_dataDescReal_${pagina}_${i}" class="input-rejeito" value="${dado.dataDescarteReal || ''}" onchange="salvarDadosLinhaRejeitos(${pagina}, ${i})"></td>
            <td><input type="number" id="rej_taxaExpDesc_${pagina}_${i}" placeholder="μSv/h" step="0.01" class="input-rejeito" value="${dado.taxaExposicaoDescarte || ''}" onchange="salvarDadosLinhaRejeitos(${pagina}, ${i})"></td>
            <td><input type="number" id="rej_atividadeDesc_${pagina}_${i}" placeholder="mCi" step="0.001" class="input-rejeito" value="${dado.atividadeDescarte || ''}" onchange="salvarDadosLinhaRejeitos(${pagina}, ${i})"></td>
            <td><input type="text" id="rej_respDesc_${pagina}_${i}" placeholder="Responsável" class="input-rejeito" value="${dado.responsavelDescarte || ''}" onchange="salvarDadosLinhaRejeitos(${pagina}, ${i})"></td>
            <td>
                <button class="btn-acao-linha" onclick="limparLinhaRejeitosModal(${pagina}, ${i})" title="Limpar linha">✕</button>
            </td>
        `;
        tbody.appendChild(tr);
    }
    atualizarInfoPaginaRejeitos(pagina);
}

// ============================================================
// ===== SALVAR DADOS DA LINHA =====
// ============================================================

function salvarDadosLinhaRejeitos(pagina, index) {
    if (!dadosPaginasRejeitos[pagina]) dadosPaginasRejeitos[pagina] = [];
    if (!dadosPaginasRejeitos[pagina][index]) dadosPaginasRejeitos[pagina][index] = {};
    
    dadosPaginasRejeitos[pagina][index] = {
        dataSegregacao: document.getElementById(`rej_dataSeg_${pagina}_${index}`)?.value || '',
        radionuclideo: document.getElementById(`rej_radionuclideo_${pagina}_${index}`)?.value || '',
        identificacao: document.getElementById(`rej_identificacao_${pagina}_${index}`)?.value || '',
        conteiner: document.getElementById(`rej_conteiner_${pagina}_${index}`)?.value || '',
        tipoEmbalagem: document.getElementById(`rej_tipoEmb_${pagina}_${index}`)?.value || '',
        pesoVolume: document.getElementById(`rej_pesoVol_${pagina}_${index}`)?.value || '',
        taxaExposicao: document.getElementById(`rej_taxaExp_${pagina}_${index}`)?.value || '',
        atividadeEstimada: document.getElementById(`rej_atividade_${pagina}_${index}`)?.value || '',
        dataDescarteEstimado: document.getElementById(`rej_dataDescEst_${pagina}_${index}`)?.value || '',
        responsavelSegregacao: document.getElementById(`rej_respSeg_${pagina}_${index}`)?.value || '',
        dataDescarteReal: document.getElementById(`rej_dataDescReal_${pagina}_${index}`)?.value || '',
        taxaExposicaoDescarte: document.getElementById(`rej_taxaExpDesc_${pagina}_${index}`)?.value || '',
        atividadeDescarte: document.getElementById(`rej_atividadeDesc_${pagina}_${index}`)?.value || '',
        responsavelDescarte: document.getElementById(`rej_respDesc_${pagina}_${index}`)?.value || ''
    };
    verificarPaginaCompletaRejeitos(pagina);
}

// ============================================================
// ===== VERIFICAR PÁGINA COMPLETA =====
// ============================================================

function verificarPaginaCompletaRejeitos(pagina) {
    const dados = dadosPaginasRejeitos[pagina] || [];
    let completas = 0;
    for (let i = 0; i < LINHAS_POR_PAGINA_REJEITOS; i++) {
        const linha = dados[i] || {};
        const preenchida = linha.dataSegregacao || linha.radionuclideo || linha.identificacao || 
                           linha.conteiner || linha.tipoEmbalagem || linha.pesoVolume || 
                           linha.taxaExposicao || linha.atividadeEstimada || linha.dataDescarteEstimado || 
                           linha.responsavelSegregacao || linha.dataDescarteReal || 
                           linha.taxaExposicaoDescarte || linha.atividadeDescarte || linha.responsavelDescarte;
        if (preenchida) completas++;
    }
    const alerta = document.getElementById('alertaPaginaCompletaModal');
    if (alerta) {
        if (completas >= LINHAS_POR_PAGINA_REJEITOS) {
            alerta.style.display = 'block';
            adicionarBotaoNovaPaginaRejeitos();
        } else {
            alerta.style.display = 'none';
        }
    }
}

// ============================================================
// ===== NOVA PÁGINA =====
// ============================================================

function adicionarBotaoNovaPaginaRejeitos() {
    const container = document.getElementById('paginacaoContainerModal');
    if (!container) return;
    if (document.getElementById('btnNovaPaginaRejeitos')) return;
    const btn = document.createElement('button');
    btn.id = 'btnNovaPaginaRejeitos';
    btn.className = 'btn-pagina nova-pagina';
    btn.innerHTML = '📄 + Nova Página';
    btn.onclick = function() { criarNovaPaginaRejeitos(); };
    container.appendChild(btn);
}

function criarNovaPaginaRejeitos() {
    const novaPagina = totalPaginasRejeitos;
    dadosPaginasRejeitos[novaPagina] = [];
    for (let i = 0; i < LINHAS_POR_PAGINA_REJEITOS; i++) {
        dadosPaginasRejeitos[novaPagina][i] = {
            dataSegregacao: '',
            radionuclideo: '',
            identificacao: '',
            conteiner: '',
            tipoEmbalagem: '',
            pesoVolume: '',
            taxaExposicao: '',
            atividadeEstimada: '',
            dataDescarteEstimado: '',
            responsavelSegregacao: '',
            dataDescarteReal: '',
            taxaExposicaoDescarte: '',
            atividadeDescarte: '',
            responsavelDescarte: ''
        };
    }
    totalPaginasRejeitos++;
    paginaAtualRejeitos = novaPagina;
    const btnNova = document.getElementById('btnNovaPaginaRejeitos');
    if (btnNova) btnNova.remove();
    const alerta = document.getElementById('alertaPaginaCompletaModal');
    if (alerta) alerta.style.display = 'none';
    renderizarPaginaRejeitos(paginaAtualRejeitos);
    atualizarPaginacaoRejeitos();
    atualizarInfoPaginaRejeitos(paginaAtualRejeitos);
}

// ============================================================
// ===== ATUALIZAR PAGINAÇÃO =====
// ============================================================

function atualizarPaginacaoRejeitos() {
    const container = document.getElementById('paginacaoContainerModal');
    if (!container) return;
    container.innerHTML = '';
    
    const btnAnterior = document.createElement('button');
    btnAnterior.className = 'btn-pagina';
    btnAnterior.innerHTML = '◀ Anterior';
    btnAnterior.onclick = function() {
        if (paginaAtualRejeitos > 0) {
            paginaAtualRejeitos--;
            renderizarPaginaRejeitos(paginaAtualRejeitos);
            atualizarPaginacaoRejeitos();
            atualizarInfoPaginaRejeitos(paginaAtualRejeitos);
        }
    };
    if (paginaAtualRejeitos === 0) {
        btnAnterior.style.opacity = '0.3';
        btnAnterior.style.cursor = 'default';
    }
    container.appendChild(btnAnterior);
    
    for (let i = 0; i < totalPaginasRejeitos; i++) {
        const btn = document.createElement('button');
        btn.className = `btn-pagina ${i === paginaAtualRejeitos ? 'ativo' : ''}`;
        btn.textContent = `📄 ${i + 1}`;
        btn.onclick = function() {
            paginaAtualRejeitos = i;
            renderizarPaginaRejeitos(paginaAtualRejeitos);
            atualizarPaginacaoRejeitos();
            atualizarInfoPaginaRejeitos(paginaAtualRejeitos);
            const alerta = document.getElementById('alertaPaginaCompletaModal');
            if (alerta) alerta.style.display = 'none';
            verificarPaginaCompletaRejeitos(paginaAtualRejeitos);
        };
        container.appendChild(btn);
    }
    
    const btnProxima = document.createElement('button');
    btnProxima.className = 'btn-pagina';
    btnProxima.innerHTML = 'Próxima ▶';
    btnProxima.onclick = function() {
        if (paginaAtualRejeitos < totalPaginasRejeitos - 1) {
            paginaAtualRejeitos++;
            renderizarPaginaRejeitos(paginaAtualRejeitos);
            atualizarPaginacaoRejeitos();
            atualizarInfoPaginaRejeitos(paginaAtualRejeitos);
        }
    };
    if (paginaAtualRejeitos === totalPaginasRejeitos - 1) {
        btnProxima.style.opacity = '0.3';
        btnProxima.style.cursor = 'default';
    }
    container.appendChild(btnProxima);
    
    const info = document.createElement('span');
    info.className = 'info-pagina';
    info.textContent = `📊 ${totalPaginasRejeitos} páginas · ${totalPaginasRejeitos * LINHAS_POR_PAGINA_REJEITOS} linhas`;
    container.appendChild(info);
    
    const alerta = document.getElementById('alertaPaginaCompletaModal');
    if (alerta && alerta.style.display === 'block') {
        adicionarBotaoNovaPaginaRejeitos();
    }
}

function atualizarInfoPaginaRejeitos(pagina) {
    const info = document.getElementById('infoPaginaAtualModal');
    const infoTotal = document.getElementById('infoTotalLinhasModal');
    if (info) info.textContent = `(Página ${pagina + 1})`;
    if (infoTotal) infoTotal.textContent = `📋 Página ${pagina + 1} · ${LINHAS_POR_PAGINA_REJEITOS} linhas`;
}

// ============================================================
// ===== LIMPAR LINHA =====
// ============================================================

function limparLinhaRejeitosModal(pagina, index) {
    if (!confirm(`Deseja limpar a linha ${index + 1} da página ${pagina + 1}?`)) return;
    if (dadosPaginasRejeitos[pagina] && dadosPaginasRejeitos[pagina][index]) {
        dadosPaginasRejeitos[pagina][index] = {
            dataSegregacao: '',
            radionuclideo: '',
            identificacao: '',
            conteiner: '',
            tipoEmbalagem: '',
            pesoVolume: '',
            taxaExposicao: '',
            atividadeEstimada: '',
            dataDescarteEstimado: '',
            responsavelSegregacao: '',
            dataDescarteReal: '',
            taxaExposicaoDescarte: '',
            atividadeDescarte: '',
            responsavelDescarte: ''
        };
    }
    renderizarPaginaRejeitos(pagina);
    mostrarFeedbackRejeitos('🗑️ Linha ' + (index + 1) + ' limpa!', 'info');
}

// ============================================================
// ===== SALVAR TABELA =====
// ============================================================

function salvarTabelaRejeitosModal() {
    let totalRejeitos = 0;
    const todosRejeitos = [];
    for (let p = 0; p < totalPaginasRejeitos; p++) {
        const dados = dadosPaginasRejeitos[p] || [];
        for (let i = 0; i < LINHAS_POR_PAGINA_REJEITOS; i++) {
            const linha = dados[i] || {};
            const preenchida = linha.dataSegregacao || linha.radionuclideo || linha.identificacao || 
                               linha.conteiner || linha.tipoEmbalagem || linha.pesoVolume || 
                               linha.taxaExposicao || linha.atividadeEstimada || linha.dataDescarteEstimado || 
                               linha.responsavelSegregacao || linha.dataDescarteReal || 
                               linha.taxaExposicaoDescarte || linha.atividadeDescarte || linha.responsavelDescarte;
            if (preenchida) {
                totalRejeitos++;
                todosRejeitos.push({
                    pagina: p + 1,
                    numero: (p * LINHAS_POR_PAGINA_REJEITOS) + i + 1,
                    ...linha
                });
            }
        }
    }
    if (totalRejeitos === 0) {
        alert('⚠️ Nenhum dado para salvar! Preencha pelo menos uma linha.');
        return;
    }
    const supervisor = document.getElementById('supervisorRejeitosModal')?.value || '';
    const dataValidacao = document.getElementById('dataValidacaoRejeitosModal')?.value || '';
    const registro = {
        id: Date.now(),
        dataSalvamento: new Date().toISOString(),
        supervisor: supervisor,
        dataValidacao: dataValidacao,
        totalPaginas: totalPaginasRejeitos,
        totalRejeitos: totalRejeitos,
        rejeitos: todosRejeitos
    };
    let registros = JSON.parse(localStorage.getItem('radiocalc_rejeitos_radioativos') || '[]');
    registros.unshift(registro);
    localStorage.setItem('radiocalc_rejeitos_radioativos', JSON.stringify(registros));
    mostrarFeedbackRejeitos('✅ ' + totalRejeitos + ' rejeitos salvos em ' + totalPaginasRejeitos + ' páginas!', 'success');
    atualizarHistoricoRejeitosModal();
}

// ============================================================
// ===== VALIDAR =====
// ============================================================

function validarRejeitosModal() {
    const supervisor = document.getElementById('supervisorRejeitosModal')?.value || '';
    const dataValidacao = document.getElementById('dataValidacaoRejeitosModal')?.value || '';
    if (!supervisor) {
        alert('⚠️ Digite o nome do supervisor de radioproteção!');
        document.getElementById('supervisorRejeitosModal').focus();
        return;
    }
    if (!dataValidacao) {
        alert('⚠️ Selecione a data de validação!');
        return;
    }
    mostrarFeedbackRejeitos('✅ Registro validado por ' + supervisor + ' em ' + dataValidacao, 'success');
}

// ============================================================
// ===== EXPORTAR EXCEL =====
// ============================================================

function exportarExcelRejeitosModal() {
    alert('📊 Função de exportar Excel em desenvolvimento!');
    // A função completa pode ser adicionada aqui depois
}

// ============================================================
// ===== HISTÓRICO =====
// ============================================================

function atualizarHistoricoRejeitosModal() {
    const container = document.getElementById('historicoRejeitosContainerModal');
    if (!container) return;
    const registros = JSON.parse(localStorage.getItem('radiocalc_rejeitos_radioativos') || '[]');
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
                    ${reg.totalRejeitos} rejeitos · ${reg.totalPaginas || 1} páginas
                    ${reg.supervisor ? '· Supervisor: ' + reg.supervisor : ''}
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

function mostrarFeedbackRejeitos(mensagem, tipo) {
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

function aplicarFiltroRejeitosModal() {
    const dataInicio = document.getElementById('filtroDataInicioModal').value;
    const dataFim = document.getElementById('filtroDataFimModal').value;
    if (!dataInicio && !dataFim) {
        mostrarToastRejeitos('⚠️ Selecione pelo menos uma data para filtrar.', 'aviso');
        return;
    }
    if (dataInicio && dataFim && dataInicio > dataFim) {
        mostrarToastRejeitos('⚠️ A data inicial não pode ser maior que a data final!', 'erro');
        return;
    }
    filtroDataInicioRejeitos = dataInicio ? new Date(dataInicio) : null;
    filtroDataFimRejeitos = dataFim ? new Date(dataFim) : null;
    filtroAtivoRejeitos = true;
    renderizarPaginaRejeitos(paginaAtualRejeitos);
    atualizarInfoFiltroRejeitos();
    mostrarToastRejeitos('✅ Filtro aplicado com sucesso!', 'success');
}

function limparFiltroRejeitosModal() {
    document.getElementById('filtroDataInicioModal').value = '';
    document.getElementById('filtroDataFimModal').value = '';
    filtroAtivoRejeitos = false;
    filtroDataInicioRejeitos = null;
    filtroDataFimRejeitos = null;
    renderizarPaginaRejeitos(paginaAtualRejeitos);
    atualizarInfoFiltroRejeitos();
    mostrarToastRejeitos('✅ Filtro removido. Mostrando todos os registros.', 'info');
}

function atualizarInfoFiltroRejeitos() {
    const infoEl = document.getElementById('infoFiltroRejeitosModal');
    if (!infoEl) return;
    if (!filtroAtivoRejeitos) {
        infoEl.textContent = '📋 Mostrando todos os registros';
        infoEl.style.color = '#666';
        return;
    }
    let texto = '🔍 Filtro: ';
    const inicio = document.getElementById('filtroDataInicioModal').value;
    const fim = document.getElementById('filtroDataFimModal').value;
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

function mostrarToastRejeitos(mensagem, tipo) {
    tipo = tipo || 'success';
    const existing = document.querySelector('.toast-rejeitos');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'toast-rejeitos ' + tipo;
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
// ===== INICIALIZAR =====
// ============================================================

console.log('✅ Módulo de Rejeitos (Modal) carregado com sucesso!');
console.log('📦 Funções disponíveis:');
console.log('  - abrirModalRejeitos()');
console.log('  - fecharModalRejeitos()');
console.log('  - salvarTabelaRejeitosModal()');
console.log('  - validarRejeitosModal()');
console.log('  - exportarExcelRejeitosModal()');
console.log('  - aplicarFiltroRejeitosModal()');
console.log('  - limparFiltroRejeitosModal()');