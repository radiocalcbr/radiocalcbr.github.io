// ============================================================
// ARQUIVO: assets/js/gerador.js
// MÓDULO: Registro de Gerador Mo-99/Tc-99m (MODAL)
// ============================================================

// ============================================================
// ===== VARIÁVEIS GLOBAIS =====
// ============================================================

let registrosGerador = [];
let geradorIdCounter = 0;

// ============================================================
// ===== VARIÁVEIS DE PAGINAÇÃO DO HISTÓRICO =====
// ============================================================

let paginaAtualHistoricoGerador = 1;
const ITENS_POR_PAGINA_HISTORICO = 10; // 10 registros por página
let historicoGeradorFiltrado = [];

// ============================================================
// ===== CARREGAR DADOS SALVOS =====
// ============================================================

function carregarGeradoresSalvos() {
    const salvo = localStorage.getItem('radiocalc_geradores_historico');
    if (salvo) {
        try {
            registrosGerador = JSON.parse(salvo);
            geradorIdCounter = registrosGerador.length > 0 
                ? Math.max(...registrosGerador.map(item => item.id || 0)) + 1 
                : 0;
            atualizarTabelaGeradorHistorico();
            atualizarHistoricoGeradorComPaginacao()
            atualizarContadoresGerador();
        } catch (e) {
            console.error('Erro ao carregar geradores:', e);
            registrosGerador = [];
            geradorIdCounter = 0;
        }
    }
}

// ============================================================
// ===== SALVAR DADOS =====
// ============================================================

function salvarGeradores() {
    try {
        localStorage.setItem('radiocalc_geradores_historico', JSON.stringify(registrosGerador));
    } catch (e) {
        console.error('Erro ao salvar geradores:', e);
    }
}

// ============================================================
// ===== FUNÇÕES PARA ABRIR/FECHAR MODAL =====
// ============================================================

function abrirModalGerador() {
    console.log('⚛️⬇️ Abrindo modal de gerador...');
    const modal = document.getElementById('modalGerador');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('ativo');
        carregarGeradoresSalvos();
        preencherDatasPadrao();
        atualizarHistoricoGeradorComPaginacao();
        
        // VERIFICAR STATUS DA NUVEM
        if (typeof verificarStatusNuvemGerador === 'function') {
            setTimeout(verificarStatusNuvemGerador, 500);
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
// ===== PREENCHER DATAS PADRÃO =====
// ============================================================

function preencherDatasPadrao() {
    const hoje = new Date();
    const hojeStr = hoje.toISOString().split('T')[0];
    
    const dataRecebimento = document.getElementById('gerDataRecebimento');
    const dataCalibracao = document.getElementById('gerDataCalibracao');
    const dataValidade = document.getElementById('gerDataValidade');
    const dataDevolucao = document.getElementById('gerDataDevolucao');
    
    if (dataRecebimento && !dataRecebimento.value) {
        dataRecebimento.value = hojeStr;
    }
    if (dataCalibracao && !dataCalibracao.value) {
        dataCalibracao.value = hojeStr + 'T08:00';
    }
    if (dataValidade && !dataValidade.value) {
        const validade = new Date();
        validade.setDate(validade.getDate() + 14);
        dataValidade.value = validade.toISOString().split('T')[0];
    }
}

// ============================================================
// ===== REGISTRAR GERADOR =====
// ============================================================

function registrarGerador() {
    console.log('📝 Registrando gerador...');
    
    // Capturar valores do formulário
    const dataRecebimento = document.getElementById('gerDataRecebimento')?.value || '';
    const dataCalibracao = document.getElementById('gerDataCalibracao')?.value || '';
    const lote = document.getElementById('gerLote')?.value.trim() || '';
    const validade = document.getElementById('gerDataValidade')?.value || '';
    const dataDevolucao = document.getElementById('gerDataDevolucao')?.value || '';
    const responsavelRecebimento = document.getElementById('gerResponsavelRecebimento')?.value.trim() || '';
    const status = document.getElementById('gerStatus')?.value || 'aguardando';
    const responsavelLiberacao = document.getElementById('gerResponsavelLiberacao')?.value.trim() || '';
    const responsavelDevolucao = document.getElementById('gerResponsavelDevolucao')?.value.trim() || '';
    
    // Validações
    if (!dataRecebimento) {
        mostrarFeedbackGerador('⚠️ Informe a Data de Recebimento!', 'erro');
        return;
    }
    if (!lote) {
        mostrarFeedbackGerador('⚠️ Informe o Lote do gerador!', 'erro');
        return;
    }
    if (!validade) {
        mostrarFeedbackGerador('⚠️ Informe a Data de Validade!', 'erro');
        return;
    }
    
    // Verificar se já existe um registro com o mesmo lote
    const existe = registrosGerador.some(item => 
        item.lote === lote && 
        item.dataRecebimento === dataRecebimento
    );
    
    if (existe) {
        mostrarFeedbackGerador('⚠️ Já existe um registro com este lote e data de recebimento!', 'erro');
        return;
    }
    
    // Criar novo registro
    const novoRegistro = {
        id: geradorIdCounter++,
        dataRecebimento: dataRecebimento,
        dataCalibracao: dataCalibracao,
        lote: lote,
        validade: validade,
        dataDevolucao: dataDevolucao,
        responsavelRecebimento: responsavelRecebimento,
        status: status,
        responsavelLiberacao: responsavelLiberacao,
        responsavelDevolucao: responsavelDevolucao,
        dataRegistro: new Date().toISOString()
    };
    
    registrosGerador.push(novoRegistro);
    salvarGeradores();
    atualizarHistoricoGeradorComPaginacao();
    atualizarTabelaGeradorHistorico();
    limparCamposGerador();
    atualizarContadoresGerador();
    
    mostrarFeedbackGerador(`✅ Gerador ${lote} registrado com sucesso!`, 'success');
}

// ============================================================
// ===== LIMPAR CAMPOS DO FORMULÁRIO =====
// ============================================================

function limparCamposGerador() {
    const campos = [
        'gerDataRecebimento',
        'gerDataCalibracao',
        'gerLote',
        'gerDataValidade',
        'gerDataDevolucao',
        'gerResponsavelRecebimento',
        'gerResponsavelLiberacao',
        'gerResponsavelDevolucao'
    ];
    
    campos.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    
    const status = document.getElementById('gerStatus');
    if (status) status.value = 'aguardando';
    
    // Preencher datas padrão novamente
    preencherDatasPadrao();
}

// ============================================================
// ===== ATUALIZAR TABELA DE HISTÓRICO =====
// ============================================================

function atualizarTabelaGeradorHistorico() {
    const tbody = document.getElementById('corpoTabelaGeradoresModal');
    if (!tbody) return;
    
    if (registrosGerador.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" style="text-align: center; padding: 40px; color: #888;">
                    Nenhum gerador registrado. Preencha o formulário acima e clique em "📝 Registrar Gerador".
                </td>
            </tr>
        `;
        return;
    }
    
    // Ordenar por data de recebimento (mais recente primeiro)
    const registrosOrdenados = [...registrosGerador].sort((a, b) => {
        return new Date(b.dataRecebimento) - new Date(a.dataRecebimento);
    });
    
    let html = '';
    
    registrosOrdenados.forEach((item, index) => {
        const statusInfo = getStatusInfo(item.status);
        
        html += `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td style="padding: 10px; text-align: center;">${index + 1}</td>
                <td style="padding: 10px;">${formatarDataBR(item.dataRecebimento)}</td>
                <td style="padding: 10px;">${formatarDataHoraBR(item.dataCalibracao)}</td>
                <td style="padding: 10px; font-weight: 600; color: #ffd700;">${item.lote}</td>
                <td style="padding: 10px;">${formatarDataBR(item.validade)}</td>
                <td style="padding: 10px;">${item.dataDevolucao ? formatarDataBR(item.dataDevolucao) : '-'}</td>
                <td style="padding: 10px; font-size: 0.8rem;">${item.responsavelRecebimento || '-'}</td>
                <td style="padding: 10px;">
                    <span style="
                        display: inline-block;
                        padding: 3px 12px;
                        border-radius: 12px;
                        font-size: 0.7rem;
                        font-weight: 600;
                        ${statusInfo.style}
                    ">
                        ${statusInfo.label}
                    </span>
                </td>
                <td style="padding: 10px; font-size: 0.8rem;">${item.responsavelLiberacao || '-'}</td>
                <td style="padding: 10px; font-size: 0.8rem;">${item.responsavelDevolucao || '-'}</td>
                <td style="padding: 10px; text-align: center;">
                    <button onclick="removerGerador(${item.id})" style="
                        background: rgba(255,107,107,0.15);
                        border: 1px solid rgba(255,107,107,0.2);
                        color: #ff6b6b;
                        padding: 4px 10px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 0.7rem;
                        transition: 0.3s;
                    " onmouseover="this.style.background='rgba(255,107,107,0.25)'" onmouseout="this.style.background='rgba(255,107,107,0.15)'">
                        🗑️
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// ============================================================
// ===== STATUS HELPER =====
// ============================================================

function getStatusInfo(status) {
    const statusMap = {
        'aguardando': { label: '🔵 Aguardando decaimento', style: 'color: #3498db; background: rgba(52,152,219,0.15);' },
        'pronto': { label: '🟡 Pronto para liberação', style: 'color: #f1c40f; background: rgba(241,196,15,0.15);' },
        'transito': { label: '🟠 Em trânsito', style: 'color: #e67e22; background: rgba(230,126,34,0.15);' },
        'devolvido': { label: '✅ Devolvido', style: 'color: #2ecc71; background: rgba(46,204,113,0.15);' }
    };
    return statusMap[status] || statusMap['aguardando'];
}

// ============================================================
// ===== REMOVER GERADOR =====
// ============================================================

function removerGerador(id) {
    if (!confirm('⚠️ Tem certeza que deseja remover este registro do gerador?')) return;
    
    const item = registrosGerador.find(r => r.id === id);
    registrosGerador = registrosGerador.filter(r => r.id !== id);
    salvarGeradores();
    atualizarHistoricoGeradorComPaginacao();
    atualizarTabelaGeradorHistorico();
    atualizarContadoresGerador();
    
    mostrarFeedbackGerador(`🗑️ Gerador ${item?.lote || ''} removido!`, 'info');
}

// ============================================================
// ===== ATUALIZAR CONTADORES =====
// ============================================================

function atualizarContadoresGerador() {
    const total = registrosGerador.length;
    const ativos = registrosGerador.filter(r => r.status !== 'devolvido').length;
    const devolvidos = registrosGerador.filter(r => r.status === 'devolvido').length;
    
    const totalEl = document.getElementById('totalGeradoresModal');
    const ativosEl = document.getElementById('ativosGeradoresModal');
    const devolvidosEl = document.getElementById('devolvidosGeradoresModal');
    
    if (totalEl) totalEl.textContent = total;
    if (ativosEl) ativosEl.textContent = ativos;
    if (devolvidosEl) devolvidosEl.textContent = devolvidos;
}

// ============================================================
// ===== FILTROS =====
// ============================================================

function aplicarFiltroGeradorModal() {
    const dataInicio = document.getElementById('filtroDataInicioGerador')?.value || '';
    const dataFim = document.getElementById('filtroDataFimGerador')?.value || '';
    
    if (!dataInicio && !dataFim) {
        mostrarFeedbackGerador('⚠️ Selecione pelo menos uma data para filtrar.', 'aviso');
        return;
    }
    
    if (dataInicio && dataFim && dataInicio > dataFim) {
        mostrarFeedbackGerador('⚠️ A data inicial não pode ser maior que a data final!', 'erro');
        return;
    }
    
    const tbody = document.getElementById('corpoTabelaGeradoresModal');
    if (!tbody) return;
    
    // Filtrar registros
    let filtrados = [...registrosGerador];
    
    if (dataInicio) {
        filtrados = filtrados.filter(r => r.dataRecebimento >= dataInicio);
    }
    if (dataFim) {
        filtrados = filtrados.filter(r => r.dataRecebimento <= dataFim);
    }
    
    if (filtrados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" style="text-align: center; padding: 40px; color: #888;">
                    🔍 Nenhum registro encontrado no período selecionado.
                </td>
            </tr>
        `;
        atualizarInfoFiltroGerador(dataInicio, dataFim);
        return;
    }
    
    // Renderizar filtrados
    let html = '';
    filtrados.sort((a, b) => new Date(b.dataRecebimento) - new Date(a.dataRecebimento));
    
    filtrados.forEach((item, index) => {
        const statusInfo = getStatusInfo(item.status);
        html += `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td style="padding: 10px; text-align: center;">${index + 1}</td>
                <td style="padding: 10px;">${formatarDataBR(item.dataRecebimento)}</td>
                <td style="padding: 10px;">${formatarDataHoraBR(item.dataCalibracao)}</td>
                <td style="padding: 10px; font-weight: 600; color: #ffd700;">${item.lote}</td>
                <td style="padding: 10px;">${formatarDataBR(item.validade)}</td>
                <td style="padding: 10px;">${item.dataDevolucao ? formatarDataBR(item.dataDevolucao) : '-'}</td>
                <td style="padding: 10px; font-size: 0.8rem;">${item.responsavelRecebimento || '-'}</td>
                <td style="padding: 10px;">
                    <span style="display: inline-block; padding: 3px 12px; border-radius: 12px; font-size: 0.7rem; font-weight: 600; ${statusInfo.style}">
                        ${statusInfo.label}
                    </span>
                </td>
                <td style="padding: 10px; font-size: 0.8rem;">${item.responsavelLiberacao || '-'}</td>
                <td style="padding: 10px; font-size: 0.8rem;">${item.responsavelDevolucao || '-'}</td>
                <td style="padding: 10px; text-align: center;">
                    <button onclick="removerGerador(${item.id})" style="background: rgba(255,107,107,0.15); border: 1px solid rgba(255,107,107,0.2); color: #ff6b6b; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 0.7rem; transition: 0.3s;" onmouseover="this.style.background='rgba(255,107,107,0.25)'" onmouseout="this.style.background='rgba(255,107,107,0.15)'">🗑️</button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    atualizarInfoFiltroGerador(dataInicio, dataFim);
    mostrarFeedbackGerador('✅ Filtro aplicado com sucesso!', 'success');
}

function limparFiltroGeradorModal() {
    document.getElementById('filtroDataInicioGerador').value = '';
    document.getElementById('filtroDataFimGerador').value = '';
    atualizarTabelaGeradorHistorico();
    atualizarInfoFiltroGerador('', '');
    mostrarFeedbackGerador('✅ Filtro removido. Mostrando todos os registros.', 'info');
}

function atualizarInfoFiltroGerador(dataInicio, dataFim) {
    const infoEl = document.getElementById('infoFiltroGerador');
    if (!infoEl) return;
    
    if (!dataInicio && !dataFim) {
        infoEl.textContent = '📋 Mostrando todos os registros';
        infoEl.style.color = '#666';
        return;
    }
    
    let texto = '🔍 Filtro: ';
    if (dataInicio && dataFim) {
        texto += `de ${formatarDataBR(dataInicio)} até ${formatarDataBR(dataFim)}`;
    } else if (dataInicio) {
        texto += `a partir de ${formatarDataBR(dataInicio)}`;
    } else if (dataFim) {
        texto += `até ${formatarDataBR(dataFim)}`;
    }
    
    infoEl.textContent = texto;
    infoEl.style.color = '#00d2ff';
}

// ============================================================
// ===== EXPORTAR EXCEL =====
// ============================================================

function exportarExcelGeradoresModal() {
    if (registrosGerador.length === 0) {
        mostrarFeedbackGerador('⚠️ Não há dados para exportar.', 'aviso');
        return;
    }
    
    try {
        const dados = registrosGerador.map(item => ({
            'Data Recebimento': formatarDataBR(item.dataRecebimento),
            'Data Calibração': formatarDataHoraBR(item.dataCalibracao),
            'Lote': item.lote,
            'Validade': formatarDataBR(item.validade),
            'Data Devolução': item.dataDevolucao ? formatarDataBR(item.dataDevolucao) : '-',
            'Responsável Recebimento': item.responsavelRecebimento || '-',
            'Status': getStatusInfo(item.status).label,
            'Responsável Liberação': item.responsavelLiberacao || '-',
            'Responsável Devolução': item.responsavelDevolucao || '-'
        }));
        
        if (typeof XLSX === 'undefined') {
            mostrarFeedbackGerador('❌ Biblioteca XLSX não carregada.', 'erro');
            return;
        }
        
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(dados);
        const colWidths = [
            { wch: 18 }, { wch: 20 }, { wch: 15 }, { wch: 15 },
            { wch: 18 }, { wch: 25 }, { wch: 20 }, { wch: 25 }, { wch: 25 }
        ];
        ws['!cols'] = colWidths;
        
        XLSX.utils.book_append_sheet(wb, ws, 'Geradores');
        XLSX.writeFile(wb, `Geradores_${new Date().toISOString().split('T')[0]}.xlsx`);
        
        mostrarFeedbackGerador('✅ Excel exportado com sucesso!', 'success');
    } catch (e) {
        console.error('Erro ao exportar Excel:', e);
        mostrarFeedbackGerador('❌ Erro ao exportar Excel.', 'erro');
    }
}

// ============================================================
// ===== LIMPAR HISTÓRICO =====
// ============================================================

function limparHistoricoGerador() {
    if (!confirm('⚠️ Tem certeza que deseja limpar TODO o histórico de geradores? Esta ação não pode ser desfeita!')) return;
    
    registrosGerador = [];
    geradorIdCounter = 0;
    salvarGeradores();
    atualizarHistoricoGeradorComPaginacao();
    atualizarTabelaGeradorHistorico();
    atualizarContadoresGerador();
    mostrarFeedbackGerador('🗑️ Histórico de geradores limpo!', 'info');
}

// ============================================================
// ===== FUNÇÕES PARA FECHAR COM ESC =====
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
// ===== FEEDBACK =====
// ============================================================

function mostrarFeedbackGerador(mensagem, tipo) {
    tipo = tipo || 'success';
    const existing = document.querySelector('.feedback-flash-gerador');
    if (existing) existing.remove();
    
    const div = document.createElement('div');
    div.className = 'feedback-flash-gerador';
    div.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        padding: 15px 25px;
        border-radius: 12px;
        font-weight: 600;
        z-index: 999999;
        max-width: 400px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        animation: slideInUp 0.3s ease;
        ${tipo === 'success' ? 'background: rgba(46,204,113,0.2); border: 1px solid #2ecc71; color: #2ecc71;' :
          tipo === 'erro' ? 'background: rgba(231,76,60,0.2); border: 1px solid #e74c3c; color: #e74c3c;' :
          tipo === 'aviso' ? 'background: rgba(241,196,15,0.2); border: 1px solid #f1c40f; color: #f1c40f;' :
          'background: rgba(52,152,219,0.2); border: 1px solid #3498db; color: #3498db;'}
    `;
    div.textContent = mensagem;
    document.body.appendChild(div);
    
    setTimeout(function() {
        div.style.opacity = '0';
        div.style.transition = 'opacity 0.5s';
        setTimeout(function() { div.remove(); }, 500);
    }, 3000);
}

// ============================================================
// ===== UTILITÁRIOS =====
// ============================================================

function formatarDataBR(dataStr) {
    if (!dataStr) return '-';
    const partes = dataStr.split('-');
    if (partes.length === 3) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return dataStr;
}

function formatarDataHoraBR(dataStr) {
    if (!dataStr) return '-';
    try {
        const date = new Date(dataStr);
        if (isNaN(date.getTime())) return dataStr;
        return date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return dataStr;
    }
}
// ============================================================
// ===== FUNÇÕES DE PAGINAÇÃO DO HISTÓRICO =====
// ============================================================

function atualizarHistoricoGeradorComPaginacao() {
    const container = document.getElementById('historicoGeradoresContainerModal');
    if (!container) return;
    
    const registros = JSON.parse(localStorage.getItem('radiocalc_geradores_historico') || '[]');
    
    if (registros.length === 0) {
        container.innerHTML = `
            <div style="color: #888; font-size: 0.85rem; text-align: center; padding: 20px;">
                Nenhum gerador registrado ainda.
            </div>
        `;
        return;
    }
    
    // Calcular paginação
    const totalPaginas = Math.ceil(registros.length / ITENS_POR_PAGINA_HISTORICO);
    
    if (paginaAtualHistoricoGerador > totalPaginas) {
        paginaAtualHistoricoGerador = totalPaginas;
    }
    if (paginaAtualHistoricoGerador < 1) {
        paginaAtualHistoricoGerador = 1;
    }
    
    const inicio = (paginaAtualHistoricoGerador - 1) * ITENS_POR_PAGINA_HISTORICO;
    const fim = Math.min(inicio + ITENS_POR_PAGINA_HISTORICO, registros.length);
    const registrosPagina = registros.slice(inicio, fim);
    
    let html = '';
    
    registrosPagina.forEach((reg, index) => {
        const data = new Date(reg.dataSalvamento).toLocaleString('pt-BR');
        const numGlobal = inicio + index + 1;
        
        html += `
            <div class="historico-item" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 12px;
                border-bottom: 1px solid rgba(255,255,255,0.05);
                font-size: 0.8rem;
                color: #aaa;
                cursor: pointer;
                transition: 0.3s;
            " onclick="verDetalhesGerador(${numGlobal - 1})" onmouseover="this.style.background='rgba(255,255,255,0.05)';this.style.color='#fff'" onmouseout="this.style.background='transparent';this.style.color='#aaa'">
                <span>
                    <strong style="color: #ffd700;">#${numGlobal}</strong>
                    ${reg.totalGeradores || reg.registros?.length || 0} geradores · ${reg.totalPaginas || 1} páginas
                </span>
                <span class="data" style="color: #888; font-size: 0.7rem;">${data}</span>
            </div>
        `;
    });
    
    // Controles de paginação
    html += `
        <div style="
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-top: 12px;
            padding: 8px 12px;
            background: rgba(255,255,255,0.03);
            border-radius: 8px;
            border: 1px solid rgba(255,255,255,0.05);
            flex-wrap: wrap;
            gap: 8px;
        ">
            <span style="color: #888; font-size: 0.75rem;">
                📊 Mostrando <strong style="color: #ffd700;">${registros.length}</strong> registros 
                (${inicio + 1} - ${fim} de ${registros.length})
            </span>
            <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                <button onclick="irPaginaHistoricoGerador(1)" ${paginaAtualHistoricoGerador === 1 ? 'disabled' : ''} style="
                    padding: 3px 10px;
                    border: 1px solid ${paginaAtualHistoricoGerador === 1 ? '#333' : '#555'};
                    border-radius: 4px;
                    background: ${paginaAtualHistoricoGerador === 1 ? 'transparent' : 'rgba(155,89,182,0.1)'};
                    color: ${paginaAtualHistoricoGerador === 1 ? '#555' : '#9b59b6'};
                    cursor: ${paginaAtualHistoricoGerador === 1 ? 'default' : 'pointer'};
                    font-size: 0.7rem;
                    transition: 0.3s;
                ">
                    ⏮
                </button>
                <button onclick="irPaginaHistoricoGerador(${paginaAtualHistoricoGerador - 1})" ${paginaAtualHistoricoGerador === 1 ? 'disabled' : ''} style="
                    padding: 3px 10px;
                    border: 1px solid ${paginaAtualHistoricoGerador === 1 ? '#333' : '#555'};
                    border-radius: 4px;
                    background: ${paginaAtualHistoricoGerador === 1 ? 'transparent' : 'rgba(155,89,182,0.1)'};
                    color: ${paginaAtualHistoricoGerador === 1 ? '#555' : '#9b59b6'};
                    cursor: ${paginaAtualHistoricoGerador === 1 ? 'default' : 'pointer'};
                    font-size: 0.7rem;
                    transition: 0.3s;
                ">
                    ◀
                </button>
                
                <span style="color: #aaa; font-size: 0.75rem; padding: 0 6px;">
                    Página <strong style="color: #ffd700;">${paginaAtualHistoricoGerador}</strong> de <strong style="color: #ffd700;">${totalPaginas || 1}</strong>
                </span>
                
                <button onclick="irPaginaHistoricoGerador(${paginaAtualHistoricoGerador + 1})" ${paginaAtualHistoricoGerador === totalPaginas || totalPaginas === 0 ? 'disabled' : ''} style="
                    padding: 3px 10px;
                    border: 1px solid ${paginaAtualHistoricoGerador === totalPaginas || totalPaginas === 0 ? '#333' : '#555'};
                    border-radius: 4px;
                    background: ${paginaAtualHistoricoGerador === totalPaginas || totalPaginas === 0 ? 'transparent' : 'rgba(155,89,182,0.1)'};
                    color: ${paginaAtualHistoricoGerador === totalPaginas || totalPaginas === 0 ? '#555' : '#9b59b6'};
                    cursor: ${paginaAtualHistoricoGerador === totalPaginas || totalPaginas === 0 ? 'default' : 'pointer'};
                    font-size: 0.7rem;
                    transition: 0.3s;
                ">
                    ▶
                </button>
                <button onclick="irPaginaHistoricoGerador(${totalPaginas})" ${paginaAtualHistoricoGerador === totalPaginas || totalPaginas === 0 ? 'disabled' : ''} style="
                    padding: 3px 10px;
                    border: 1px solid ${paginaAtualHistoricoGerador === totalPaginas || totalPaginas === 0 ? '#333' : '#555'};
                    border-radius: 4px;
                    background: ${paginaAtualHistoricoGerador === totalPaginas || totalPaginas === 0 ? 'transparent' : 'rgba(155,89,182,0.1)'};
                    color: ${paginaAtualHistoricoGerador === totalPaginas || totalPaginas === 0 ? '#555' : '#9b59b6'};
                    cursor: ${paginaAtualHistoricoGerador === totalPaginas || totalPaginas === 0 ? 'default' : 'pointer'};
                    font-size: 0.7rem;
                    transition: 0.3s;
                ">
                    ⏭
                </button>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

function irPaginaHistoricoGerador(pagina) {
    const registros = JSON.parse(localStorage.getItem('radiocalc_geradores_historico') || '[]');
    const totalPaginas = Math.ceil(registros.length / ITENS_POR_PAGINA_HISTORICO);
    
    if (pagina < 1 || pagina > totalPaginas || pagina === paginaAtualHistoricoGerador) return;
    
    paginaAtualHistoricoGerador = pagina;
    atualizarHistoricoGeradorComPaginacao();
}

function verDetalhesGerador(index) {
    const registros = JSON.parse(localStorage.getItem('radiocalc_geradores_historico') || '[]');
    const reg = registros[index];
    if (!reg) return;
    
    let detalhes = `📋 Registro #${index + 1}\n`;
    detalhes += `📅 Data: ${new Date(reg.dataSalvamento).toLocaleString('pt-BR')}\n`;
    detalhes += `📊 Total: ${reg.totalGeradores || reg.registros?.length || 0} geradores\n`;
    detalhes += `📄 Páginas: ${reg.totalPaginas || 1}\n\n`;
    detalhes += `📋 Geradores:\n`;
    detalhes += `─'.repeat(40)}\n`;
    
    const geradores = reg.registros || reg.geradores || [];
    geradores.slice(0, 5).forEach((g, i) => {
        detalhes += `${i + 1}. Lote: ${g.lote || '---'} | Status: ${g.status || '---'}\n`;
    });
    
    if (geradores.length > 5) {
        detalhes += `... e mais ${geradores.length - 5} geradores\n`;
    }
    
    alert(detalhes);
}
// ============================================================
// ===== EXPORTAR FUNÇÕES =====
// ============================================================

window.abrirModalGerador = abrirModalGerador;
window.fecharModalGerador = fecharModalGerador;
window.registrarGerador = registrarGerador;
window.removerGerador = removerGerador;
window.aplicarFiltroGeradorModal = aplicarFiltroGeradorModal;
window.limparFiltroGeradorModal = limparFiltroGeradorModal;
window.exportarExcelGeradoresModal = exportarExcelGeradoresModal;
window.limparHistoricoGerador = limparHistoricoGerador;
window.verDetalhesGerador = verDetalhesGerador;

console.log('✅ Módulo de Gerador (v2) carregado com sucesso!');
console.log('📦 Funções disponíveis:');
console.log('  - abrirModalGerador()');
console.log('  - fecharModalGerador()');
console.log('  - registrarGerador()');
console.log('  - removerGerador(id)');
console.log('  - exportarExcelGeradoresModal()');
console.log('  - limparHistoricoGerador()');
console.log('  - aplicarFiltroGeradorModal()');
console.log('  - limparFiltroGeradorModal()');