// ============================================================
// ARQUIVO: assets/js/estoque.js
// MÓDULO: Gerência de Estoque de Kits
// ============================================================

// ===== VARIÁVEIS GLOBAIS =====
let estoqueItens = [];
let estoqueIdCounter = 0;

// ===== HISTÓRICO DE MOVIMENTAÇÕES =====
let historicoMovimentacoes = [];
let historicoIdCounter = 0;

// ===== PAGINAÇÃO DO HISTÓRICO =====
let paginaAtualHistorico = 1;
const ITENS_POR_PAGINA_HISTORICO = 20;
let historicoFiltrado = [];

// ===== PERÍODO PADRÃO (180 DIAS) =====
const DIAS_PADRAO_HISTORICO = 180;
let periodoAtivoHistorico = 'padrao180';

// ===== PAGINAÇÃO DO ESTOQUE =====
let paginaAtualEstoque = 1;
const ITENS_POR_PAGINA = 15;
let filtroDataInicioEstoque = '';
let filtroDataFimEstoque = '';
let estoqueFiltrado = [];

// ============================================================
// ===== CARREGAR DADOS SALVOS =====
// ============================================================
function carregarEstoqueSalvo() {
    const salvo = localStorage.getItem('estoqueKits');
    if (salvo) {
        try {
            let dados = JSON.parse(salvo);
            dados = dados.map(item => {
                if (item.validade && typeof item.validade === 'string') {
                    if (item.validade.includes('/')) {
                        const partes = item.validade.split('/');
                        if (partes.length === 3 && partes[0].length === 2) {
                            item.validade = `${partes[2]}-${partes[1]}-${partes[0]}`;
                        }
                    }
                }
                return item;
            });
            estoqueItens = dados;
            estoqueIdCounter = estoqueItens.length > 0 
                ? Math.max(...estoqueItens.map(item => item.id || 0)) + 1 
                : 0;
            atualizarTabelaEstoque();
        } catch (e) {
            console.error('Erro ao carregar estoque:', e);
            estoqueItens = [];
            estoqueIdCounter = 0;
        }
    }
    
    // 🆕 Carregar histórico
    const historicoSalvo = localStorage.getItem('estoqueHistorico');
    if (historicoSalvo) {
        try {
            historicoMovimentacoes = JSON.parse(historicoSalvo);
            historicoIdCounter = historicoMovimentacoes.length > 0
                ? Math.max(...historicoMovimentacoes.map(h => h.id || 0)) + 1
                : 0;
            atualizarTabelaHistorico();
        } catch (e) {
            console.error('Erro ao carregar histórico:', e);
            historicoMovimentacoes = [];
            historicoIdCounter = 0;
        }
    }
}

// ============================================================
// ===== SALVAR DADOS =====
// ============================================================
function salvarEstoque() {
    try {
        localStorage.setItem('estoqueKits', JSON.stringify(estoqueItens));
        localStorage.setItem('estoqueHistorico', JSON.stringify(historicoMovimentacoes));
    } catch (e) {
        console.error('Erro ao salvar estoque:', e);
    }
}

// ============================================================
// ===== ABRIR MÓDULO =====
// ============================================================
function abrirModuloEstoque() {
    console.log('🔍 Tentando abrir módulo de estoque...');
    
    const modal = document.getElementById('modalEstoque');
    if (!modal) {
        console.error('❌ Modal #modalEstoque não encontrado no DOM!');
        alert('Erro: Modal de estoque não encontrado. Verifique o HTML.');
        return;
    }
    
    console.log('✅ Modal encontrado');
    
    modal.style.display = 'flex';
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
    modal.style.pointerEvents = 'auto';
    modal.classList.add('ativo');
    document.body.style.overflow = 'hidden';
    
    if (typeof carregarEstoqueSalvo === 'function') {
        carregarEstoqueSalvo();
    }
    
    console.log('✅ Modal aberto com sucesso!');
    
    setTimeout(function() {
        const modalCheck = document.getElementById('modalEstoque');
        if (modalCheck) {
            if (modalCheck.style.display === 'none' || modalCheck.style.display === '') {
                console.warn('⚠️ Modal foi ocultado! Forçando novamente...');
                modalCheck.style.display = 'flex';
                modalCheck.classList.add('ativo');
            }
        }
    }, 100);
}

// ============================================================
// ===== FECHAR MÓDULO =====
// ============================================================
function fecharModuloEstoque() {
    const modal = document.getElementById('modalEstoque');
    if (modal) {
        modal.style.display = 'none';
    }
}

// ============================================================
// ===== CADASTRAR MOVIMENTAÇÃO =====
// ============================================================
function cadastrarMovimentacaoEstoque() {
    const tipoKit = document.getElementById('estoqueTipoKit').value;
    let lote = document.getElementById('estoqueLote').value.trim().toUpperCase();
    const validade = document.getElementById('estoqueValidade').value;
    const quantidade = parseInt(document.getElementById('estoqueQuantidade').value) || 0;
    const tipoMovimento = document.getElementById('estoqueTipoMovimento').value;
    const observacao = document.getElementById('estoqueObservacao').value.trim();
    const responsavel = document.getElementById('estoqueResponsavel')?.value.trim() || '';

    if (!lote) {
        alert('⚠️ Por favor, informe o número do Lote.');
        return;
    }
    if (!validade) {
        alert('⚠️ Por favor, informe a Data de Validade.');
        return;
    }
    if (quantidade <= 0) {
        alert('⚠️ A quantidade deve ser maior que zero.');
        return;
    }
    if (!responsavel) {
        alert('⚠️ Por favor, informe o Responsável pela movimentação.');
        document.getElementById('estoqueResponsavel')?.focus();
        return;
    }

    let itemExistente = estoqueItens.find(item => 
        item.tipoKit === tipoKit && 
        item.lote === lote &&
        item.validade === validade
    );

    const dataHora = new Date().toLocaleString('pt-BR');
    const agora = new Date().toISOString();

    if (itemExistente) {
        if (tipoMovimento === 'entrada') {
            itemExistente.entrada += quantidade;
        } else {
            if (itemExistente.entrada - itemExistente.saida < quantidade) {
                alert(`⚠️ Saldo insuficiente! Saldo atual: ${itemExistente.entrada - itemExistente.saida} frascos.`);
                return;
            }
            itemExistente.saida += quantidade;
        }
        itemExistente.saldo = itemExistente.entrada - itemExistente.saida;
        itemExistente.observacao = observacao || itemExistente.observacao;
        itemExistente.ultimaMovimentacao = dataHora;
    } else {
        const novoItem = {
            id: estoqueIdCounter++,
            tipoKit: tipoKit,
            lote: lote,
            validade: validade,
            entrada: tipoMovimento === 'entrada' ? quantidade : 0,
            saida: tipoMovimento === 'saida' ? quantidade : 0,
            saldo: tipoMovimento === 'entrada' ? quantidade : 0,
            observacao: observacao || '',
            dataCadastro: dataHora,
            ultimaMovimentacao: dataHora
        };
        estoqueItens.push(novoItem);
    }

    // 🆕 REGISTRAR NO HISTÓRICO
    const precoUnitarioAplicado = tipoMovimento === 'saida'
        && typeof precosKits !== 'undefined'
        ? Number(precosKits[tipoKit]) || 0
        : null;
    const eventoHistorico = {
        id: historicoIdCounter++,
        timestamp: agora,
        dataHora: dataHora,
        tipoMovimento: tipoMovimento,
        tipoKit: tipoKit,
        lote: lote,
        validade: validade,
        quantidade: quantidade,
        precoUnitarioAplicado: precoUnitarioAplicado,
        responsavel: responsavel,
        observacao: observacao || (tipoMovimento === 'entrada' 
            ? 'Entrada no estoque' 
            : 'Saída para uso em marcação'),
        dataEntrada: tipoMovimento === 'entrada' ? dataHora : null,
        dataSaida: tipoMovimento === 'saida' ? dataHora : null,
        motivo: tipoMovimento === 'saida' ? 'Uso em marcação' : 'Recebimento'
    };

    historicoMovimentacoes.push(eventoHistorico);

    salvarEstoque();
    atualizarTabelaEstoque();
    atualizarTabelaHistorico();
    limparCamposEstoque();

    const tipoTexto = tipoMovimento === 'entrada' ? 'entrada' : 'saída';
    alert(`✅ Movimentação de ${tipoTexto} cadastrada com sucesso!\n\nKit: ${tipoKit}\nLote: ${lote}\nQuantidade: ${quantidade} frascos\nResponsável: ${responsavel}`);
}

// ============================================================
// ===== ATUALIZAR TABELA DE ESTOQUE =====
// ============================================================
function atualizarTabelaEstoque() {
    const tbody = document.getElementById('corpoEstoque');
    if (!tbody) return;

    aplicarFiltrosEstoque();

    if (estoqueFiltrado.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" style="text-align: center; padding: 40px; color: #888;">
                    ${estoqueItens.length === 0 ? 'Nenhum item cadastrado. Adicione a primeira movimentação!' : 'Nenhum item encontrado com os filtros aplicados.'}
                </td>
            </tr>
        `;
        atualizarResumoEstoque();
        atualizarControlesPagina();
        return;
    }

    const totalPaginas = Math.ceil(estoqueFiltrado.length / ITENS_POR_PAGINA);
    
    if (paginaAtualEstoque > totalPaginas) paginaAtualEstoque = totalPaginas;
    if (paginaAtualEstoque < 1) paginaAtualEstoque = 1;

    const inicio = (paginaAtualEstoque - 1) * ITENS_POR_PAGINA;
    const fim = Math.min(inicio + ITENS_POR_PAGINA, estoqueFiltrado.length);
    const itensPagina = estoqueFiltrado.slice(inicio, fim);

    const itensOrdenados = [...itensPagina].sort((a, b) => new Date(a.validade) - new Date(b.validade));

    let html = '';
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    itensOrdenados.forEach((item, index) => {
        const validadeDate = new Date(item.validade + 'T00:00:00');
        const diffDias = Math.ceil((validadeDate - hoje) / (1000 * 60 * 60 * 24));
        
        let status = '✅ Válido';
        let statusColor = '#2ecc71';
        let bgColor = '';

        if (diffDias < 0) {
            status = '❌ Vencido';
            statusColor = '#e74c3c';
            bgColor = 'rgba(231, 76, 60, 0.1)';
        } else if (diffDias <= 7) {
            status = `⚠️ Vence em ${diffDias} dias`;
            statusColor = '#f1c40f';
            bgColor = 'rgba(241, 196, 15, 0.1)';
        }

        if (item.saldo <= 2 && item.saldo > 0) {
            status += ' 🔴 Estoque baixo';
        } else if (item.saldo === 0) {
            status = '⚪ Esgotado';
            statusColor = '#888';
        }

        const nomeKit = getNomeKit(item.tipoKit);
        const dataHoraMov = item.ultimaMovimentacao || item.dataCadastro || '⚠️ Sem registro';

        html += `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); background: ${bgColor};">
                <td style="padding: 10px;">${inicio + index + 1}</td>
                <td style="padding: 10px; font-weight: 600; color: #fff;">${nomeKit}</td>
                <td style="padding: 10px; color: #aaa;">${item.lote}</td>
                <td style="padding: 10px; color: ${diffDias < 0 ? '#e74c3c' : '#aaa'};">
                    ${formatarData(item.validade)}
                </td>
                <td style="padding: 10px; text-align: center; color: #2ecc71;">${item.entrada}</td>
                <td style="padding: 10px; text-align: center; color: #e74c3c;">${item.saida}</td>
                <td style="padding: 10px; text-align: center; font-weight: bold; color: ${item.saldo === 0 ? '#888' : '#ffd700'};">
                    ${item.saldo}
                </td>
                <td style="padding: 10px; text-align: center; color: ${statusColor};">
                    ${status}
                </td>
                <td style="padding: 10px; color: #888; font-size: 0.75rem; max-width: 120px; word-break: break-word;">
                    ${item.observacao || '-'}
                </td>
                <td style="padding: 10px; text-align: center; color: #00d2ff; font-size: 0.7rem;">
                    ${dataHoraMov}
                </td>
                <td style="padding: 10px; text-align: center;">
                    <button onclick="removerItemEstoque(${item.id})" style="
                        background: rgba(255,107,107,0.15);
                        border: 1px solid rgba(255,107,107,0.2);
                        color: #ff6b6b;
                        padding: 4px 10px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 0.7rem;
                    " onmouseover="this.style.background='rgba(255,107,107,0.25)'" onmouseout="this.style.background='rgba(255,107,107,0.15)'">
                        🗑️
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    atualizarResumoEstoque();
    atualizarControlesPagina();
    atualizarInfoPaginacao();
}

// ============================================================
// ===== ATUALIZAR TABELA DE HISTÓRICO (COM PERÍODO) =====
// ============================================================
function atualizarTabelaHistorico() {
    const tbody = document.getElementById('corpoHistoricoEstoque');
    if (!tbody) return;

    // Popular filtro de kits (uma única vez)
    const selectKit = document.getElementById('filtroKitMovimento');
    if (selectKit && selectKit.options.length <= 1) {
        const kitsUnicos = [...new Set(historicoMovimentacoes.map(h => h.tipoKit))];
        kitsUnicos.forEach(kit => {
            const opt = document.createElement('option');
            opt.value = kit;
            opt.textContent = getNomeKit(kit);
            selectKit.appendChild(opt);
        });
    }

    const filtroTipo = document.getElementById('filtroTipoMovimento')?.value || '';
    const filtroKit = document.getElementById('filtroKitMovimento')?.value || '';
    const filtroLote = document.getElementById('filtroLoteMovimento')?.value.trim().toUpperCase() || '';

    historicoFiltrado = [...historicoMovimentacoes];

    const filtroDataInicio = document.getElementById('filtroDataInicioHistorico')?.value || '';
    const filtroDataFim = document.getElementById('filtroDataFimHistorico')?.value || '';

    let dataInicioEfetiva = filtroDataInicio;
    let dataFimEfetiva = filtroDataFim;

    if (periodoAtivoHistorico === 'padrao180' && !filtroDataInicio) {
        const hoje = new Date();
        const inicio180 = new Date();
        inicio180.setDate(hoje.getDate() - DIAS_PADRAO_HISTORICO);
        dataInicioEfetiva = inicio180.toISOString().split('T')[0];
        dataFimEfetiva = hoje.toISOString().split('T')[0];

        const inputIni = document.getElementById('filtroDataInicioHistorico');
        const inputFim = document.getElementById('filtroDataFimHistorico');
        if (inputIni && !inputIni.value) inputIni.value = dataInicioEfetiva;
        if (inputFim && !inputFim.value) inputFim.value = dataFimEfetiva;
    }

    if (dataInicioEfetiva) {
        const dtInicio = new Date(dataInicioEfetiva + 'T00:00:00');
        historicoFiltrado = historicoFiltrado.filter(h => new Date(h.timestamp) >= dtInicio);
    }
    if (dataFimEfetiva) {
        const dtFim = new Date(dataFimEfetiva + 'T23:59:59');
        historicoFiltrado = historicoFiltrado.filter(h => new Date(h.timestamp) <= dtFim);
    }

    if (filtroTipo) historicoFiltrado = historicoFiltrado.filter(h => h.tipoMovimento === filtroTipo);
    if (filtroKit) historicoFiltrado = historicoFiltrado.filter(h => h.tipoKit === filtroKit);
    if (filtroLote) historicoFiltrado = historicoFiltrado.filter(h => h.lote.includes(filtroLote));

    historicoFiltrado.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const totalEntradas = historicoFiltrado.filter(h => h.tipoMovimento === 'entrada')
        .reduce((s, h) => s + h.quantidade, 0);
    const totalSaidas = historicoFiltrado.filter(h => h.tipoMovimento === 'saida')
        .reduce((s, h) => s + h.quantidade, 0);

    const elEntradas = document.getElementById('totalEntradasHistorico');
    const elSaidas = document.getElementById('totalSaidasHistorico');
    const elEventos = document.getElementById('totalEventosHistorico');
    const elInfo = document.getElementById('infoFiltroHistorico');

    if (elEntradas) elEntradas.textContent = totalEntradas;
    if (elSaidas) elSaidas.textContent = totalSaidas;
    if (elEventos) elEventos.textContent = historicoFiltrado.length;

    if (elInfo) {
        const temFiltro = filtroTipo || filtroKit || filtroLote || filtroDataInicio || filtroDataFim;
        if (temFiltro) {
            elInfo.textContent = `🔍 ${historicoFiltrado.length} de ${historicoMovimentacoes.length} evento(s)`;
            elInfo.style.color = '#ffd700';
        } else {
            elInfo.textContent = `Mostrando ${historicoFiltrado.length} de ${historicoMovimentacoes.length} eventos`;
            elInfo.style.color = '#666';
        }
    }

    atualizarIndicadorPeriodo(dataInicioEfetiva, dataFimEfetiva);

    const totalPaginas = Math.ceil(historicoFiltrado.length / ITENS_POR_PAGINA_HISTORICO) || 1;
    if (paginaAtualHistorico > totalPaginas) paginaAtualHistorico = totalPaginas;
    if (paginaAtualHistorico < 1) paginaAtualHistorico = 1;

    const inicio = (paginaAtualHistorico - 1) * ITENS_POR_PAGINA_HISTORICO;
    const fim = Math.min(inicio + ITENS_POR_PAGINA_HISTORICO, historicoFiltrado.length);
    const itensPagina = historicoFiltrado.slice(inicio, fim);

    if (itensPagina.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; padding: 30px; color: #888;">
                    ${historicoMovimentacoes.length === 0 
                        ? 'Nenhuma movimentação registrada ainda.' 
                        : '📭 Nenhum evento no período selecionado. Clique em "📆 Período Personalizado" para ampliar ou em "📥 Carregar da Nuvem".'}
                </td>
            </tr>
        `;
        renderizarPaginacaoHistorico(totalPaginas);
        return;
    }

    let html = '';
    itensPagina.forEach((h, index) => {
        const isEntrada = h.tipoMovimento === 'entrada';
        const icone = isEntrada ? '📥' : '📤';
        const cor = isEntrada ? '#2ecc71' : '#e74c3c';
        const bgCor = isEntrada ? 'rgba(46,204,113,0.05)' : 'rgba(231,76,60,0.05)';
        const nomeKit = getNomeKit(h.tipoKit);
        const numSequencial = inicio + index + 1;

        html += `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); background: ${bgCor};">
                <td style="padding: 8px; color: #888;">${numSequencial}</td>
                <td style="padding: 8px; color: #00d2ff; font-size: 0.72rem; white-space: nowrap;">${h.dataHora}</td>
                <td style="padding: 8px; text-align: center;">
                    <span style="color: ${cor}; font-weight: 600;">${icone} ${isEntrada ? 'Entrada' : 'Saída'}</span>
                </td>
                <td style="padding: 8px; color: #fff; font-weight: 600;">${nomeKit}</td>
                <td style="padding: 8px; color: #aaa;">${h.lote}</td>
                <td style="padding: 8px; color: #aaa;">${formatarData(h.validade)}</td>
                <td style="padding: 8px; text-align: center; color: ${cor}; font-weight: bold;">
                    ${isEntrada ? '+' : '-'}${h.quantidade}
                </td>
                <td style="padding: 8px; color: #ffd700;">${h.responsavel || '-'}</td>
                <td style="padding: 8px; color: #888; font-size: 0.72rem; max-width: 180px; word-break: break-word;">
                    ${h.observacao || '-'}
                </td>
                <td style="padding: 8px; text-align: center;">
                    <button onclick="removerEventoHistoricoNaNuvem(${h.id})" style="
                        background: rgba(255,107,107,0.1);
                        border: 1px solid rgba(255,107,107,0.2);
                        color: #ff6b6b;
                        padding: 3px 8px;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 0.65rem;
                    " onmouseover="this.style.background='rgba(255,107,107,0.25)'" 
                       onmouseout="this.style.background='rgba(255,107,107,0.1)'"
                       title="Remover evento (não altera o saldo)">
                        🗑️
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    renderizarPaginacaoHistorico(totalPaginas);
}

// ============================================================
// ===== PAGINAÇÃO DO HISTÓRICO =====
// ============================================================
function renderizarPaginacaoHistorico(totalPaginas) {
    const container = document.getElementById('paginacaoHistorico');
    if (!container) return;

    const total = historicoFiltrado.length;
    const inicio = total === 0 ? 0 : (paginaAtualHistorico - 1) * ITENS_POR_PAGINA_HISTORICO + 1;
    const fim = Math.min(paginaAtualHistorico * ITENS_POR_PAGINA_HISTORICO, total);

    container.innerHTML = `
        <span style="color: #888; font-size: 0.8rem;">
            📊 Mostrando <strong style="color: #ffd700;">${inicio}-${fim}</strong> de 
            <strong style="color: #ffd700;">${total}</strong> eventos
        </span>
        <div style="display: flex; align-items: center; gap: 6px;">
            <button onclick="irPaginaHistorico(1)" ${paginaAtualHistorico === 1 ? 'disabled' : ''} style="
                padding: 4px 10px; border: 1px solid ${paginaAtualHistorico === 1 ? '#333' : '#555'};
                border-radius: 4px; background: ${paginaAtualHistorico === 1 ? 'transparent' : 'rgba(0,210,255,0.1)'};
                color: ${paginaAtualHistorico === 1 ? '#555' : '#00d2ff'}; 
                cursor: ${paginaAtualHistorico === 1 ? 'default' : 'pointer'}; font-size: 0.75rem;">
                ⏮
            </button>
            <button onclick="irPaginaHistorico(${paginaAtualHistorico - 1})" ${paginaAtualHistorico === 1 ? 'disabled' : ''} style="
                padding: 4px 10px; border: 1px solid ${paginaAtualHistorico === 1 ? '#333' : '#555'};
                border-radius: 4px; background: ${paginaAtualHistorico === 1 ? 'transparent' : 'rgba(0,210,255,0.1)'};
                color: ${paginaAtualHistorico === 1 ? '#555' : '#00d2ff'};
                cursor: ${paginaAtualHistorico === 1 ? 'default' : 'pointer'}; font-size: 0.75rem;">
                ◀
            </button>
            <span style="color: #aaa; font-size: 0.8rem; padding: 0 8px;">
                Página <strong style="color: #ffd700;">${paginaAtualHistorico}</strong> 
                de <strong style="color: #ffd700;">${totalPaginas}</strong>
            </span>
            <button onclick="irPaginaHistorico(${paginaAtualHistorico + 1})" ${paginaAtualHistorico === totalPaginas ? 'disabled' : ''} style="
                padding: 4px 10px; border: 1px solid ${paginaAtualHistorico === totalPaginas ? '#333' : '#555'};
                border-radius: 4px; background: ${paginaAtualHistorico === totalPaginas ? 'transparent' : 'rgba(0,210,255,0.1)'};
                color: ${paginaAtualHistorico === totalPaginas ? '#555' : '#00d2ff'};
                cursor: ${paginaAtualHistorico === totalPaginas ? 'default' : 'pointer'}; font-size: 0.75rem;">
                ▶
            </button>
            <button onclick="irPaginaHistorico(${totalPaginas})" ${paginaAtualHistorico === totalPaginas ? 'disabled' : ''} style="
                padding: 4px 10px; border: 1px solid ${paginaAtualHistorico === totalPaginas ? '#333' : '#555'};
                border-radius: 4px; background: ${paginaAtualHistorico === totalPaginas ? 'transparent' : 'rgba(0,210,255,0.1)'};
                color: ${paginaAtualHistorico === totalPaginas ? '#555' : '#00d2ff'};
                cursor: ${paginaAtualHistorico === totalPaginas ? 'default' : 'pointer'}; font-size: 0.75rem;">
                ⏭
            </button>
        </div>
    `;
}

function irPaginaHistorico(pagina) {
    const totalPaginas = Math.ceil(historicoFiltrado.length / ITENS_POR_PAGINA_HISTORICO) || 1;
    if (pagina < 1 || pagina > totalPaginas || pagina === paginaAtualHistorico) return;
    paginaAtualHistorico = pagina;
    atualizarTabelaHistorico();
}

function limparFiltrosHistorico() {
    const ids = ['filtroTipoMovimento', 'filtroKitMovimento', 'filtroLoteMovimento', 
                 'filtroDataInicioHistorico', 'filtroDataFimHistorico'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    
    periodoAtivoHistorico = 'padrao180';
    atualizarBotoesPeriodo('padrao180');
    
    const campos = document.getElementById('periodoCustomizadoCampos');
    if (campos) campos.style.display = 'none';
    
    paginaAtualHistorico = 1;
    atualizarTabelaHistorico();
}

// ============================================================
// ===== PRESET 180 DIAS =====
// ============================================================
function aplicarPreset180Dias() {
    periodoAtivoHistorico = 'padrao180';
    
    const hoje = new Date();
    const inicio180 = new Date();
    inicio180.setDate(hoje.getDate() - DIAS_PADRAO_HISTORICO);
    
    const inputIni = document.getElementById('filtroDataInicioHistorico');
    const inputFim = document.getElementById('filtroDataFimHistorico');
    if (inputIni) inputIni.value = inicio180.toISOString().split('T')[0];
    if (inputFim) inputFim.value = hoje.toISOString().split('T')[0];
    
    atualizarBotoesPeriodo('padrao180');
    
    const campos = document.getElementById('periodoCustomizadoCampos');
    if (campos) campos.style.display = 'none';
    
    paginaAtualHistorico = 1;
    atualizarTabelaHistorico();
}

function togglePeriodoCustomizado() {
    const campos = document.getElementById('periodoCustomizadoCampos');
    if (!campos) return;
    
    const visivel = campos.style.display === 'flex';
    campos.style.display = visivel ? 'none' : 'flex';
    
    if (!visivel) {
        periodoAtivoHistorico = 'custom';
        atualizarBotoesPeriodo('custom');
    }
}

function atualizarBotoesPeriodo(ativo) {
    const btn180 = document.getElementById('btnPreset180');
    const btnCustom = document.getElementById('btnPeriodoCustom');
    
    if (!btn180 || !btnCustom) return;
    
    if (ativo === 'padrao180') {
        btn180.style.background = 'rgba(0,210,255,0.15)';
        btn180.style.borderColor = 'rgba(0,210,255,0.4)';
        btn180.style.color = '#00d2ff';
        
        btnCustom.style.background = 'rgba(255,255,255,0.05)';
        btnCustom.style.borderColor = 'rgba(255,255,255,0.15)';
        btnCustom.style.color = '#aaa';
    } else {
        btn180.style.background = 'rgba(255,255,255,0.05)';
        btn180.style.borderColor = 'rgba(255,255,255,0.15)';
        btn180.style.color = '#aaa';
        
        btnCustom.style.background = 'rgba(0,210,255,0.15)';
        btnCustom.style.borderColor = 'rgba(0,210,255,0.4)';
        btnCustom.style.color = '#00d2ff';
    }
}

function aplicarPeriodoRapido(dias) {
    const inputIni = document.getElementById('filtroDataInicioHistorico');
    const inputFim = document.getElementById('filtroDataFimHistorico');
    
    if (dias === 0) {
        if (inputIni) inputIni.value = '';
        if (inputFim) inputFim.value = '';
        periodoAtivoHistorico = 'tudo';
    } else {
        const hoje = new Date();
        const inicio = new Date();
        inicio.setDate(hoje.getDate() - dias);
        
        if (inputIni) inputIni.value = inicio.toISOString().split('T')[0];
        if (inputFim) inputFim.value = hoje.toISOString().split('T')[0];
        
        periodoAtivoHistorico = dias === 180 ? 'padrao180' : 'custom';
    }
    
    atualizarBotoesPeriodo(periodoAtivoHistorico);
    paginaAtualHistorico = 1;
    atualizarTabelaHistorico();
}

function aplicarFiltroHistoricoPersonalizado() {
    periodoAtivoHistorico = 'custom';
    atualizarBotoesPeriodo('custom');
    paginaAtualHistorico = 1;
    atualizarTabelaHistorico();
}

function atualizarIndicadorPeriodo(dataInicio, dataFim) {
    const el = document.getElementById('indicadorPeriodoHistorico');
    if (!el) return;
    
    if (periodoAtivoHistorico === 'tudo' || (!dataInicio && !dataFim)) {
        el.textContent = '📅 Mostrando todos os eventos';
        el.style.borderLeftColor = '#ffd700';
        el.style.color = '#ffd700';
        el.style.background = 'rgba(255,215,0,0.08)';
    } else if (periodoAtivoHistorico === 'padrao180') {
        el.textContent = `📅 Últimos 180 dias (${formatarData(dataInicio)} → ${formatarData(dataFim)})`;
        el.style.borderLeftColor = '#00d2ff';
        el.style.color = '#00d2ff';
        el.style.background = 'rgba(0,210,255,0.08)';
    } else {
        el.textContent = `📆 Período: ${formatarData(dataInicio)} → ${formatarData(dataFim)}`;
        el.style.borderLeftColor = '#9b59b6';
        el.style.color = '#9b59b6';
        el.style.background = 'rgba(155,89,182,0.08)';
    }
}

// ============================================================
// ===== REMOVER EVENTO DO HISTÓRICO =====
// ============================================================
function removerEventoHistorico(id) {
    if (!confirm('⚠️ Remover este evento do histórico?\n\nObservação: o saldo atual NÃO será alterado. Esta ação é apenas para corrigir registros duplicados ou incorretos.')) return;
    
    historicoMovimentacoes = historicoMovimentacoes.filter(h => h.id !== id);
    salvarEstoque();
    atualizarTabelaHistorico();
}

// ============================================================
// ===== BUSCAR POR LOTE =====
// ============================================================
function buscarPorLote(lote) {
    if (!lote || lote.trim() === '') {
        atualizarTabelaEstoque();
        return;
    }
    
    const loteBusca = lote.trim().toUpperCase();
    const itensFiltrados = estoqueItens.filter(item => 
        item.lote.toUpperCase().includes(loteBusca)
    );
    
    const tbody = document.getElementById('corpoEstoque');
    if (!tbody) return;

    if (itensFiltrados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" style="text-align: center; padding: 40px; color: #888;">
                    🔍 Nenhum item encontrado para o lote: ${lote}
                </td>
            </tr>
        `;
        return;
    }

    const itensOrdenados = [...itensFiltrados].sort((a, b) => new Date(a.validade) - new Date(b.validade));

    let html = '';
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    itensOrdenados.forEach((item, index) => {
        const validadeDate = new Date(item.validade + 'T00:00:00');
        const diffDias = Math.ceil((validadeDate - hoje) / (1000 * 60 * 60 * 24));
        
        let status = '✅ Válido';
        let statusColor = '#2ecc71';
        let bgColor = '';

        if (diffDias < 0) {
            status = '❌ Vencido';
            statusColor = '#e74c3c';
            bgColor = 'rgba(231, 76, 60, 0.1)';
        } else if (diffDias <= 7) {
            status = `⚠️ Vence em ${diffDias} dias`;
            statusColor = '#f1c40f';
            bgColor = 'rgba(241, 196, 15, 0.1)';
        }

        if (item.saldo <= 2 && item.saldo > 0) {
            status += ' 🔴 Estoque baixo';
        } else if (item.saldo === 0) {
            status = '⚪ Esgotado';
            statusColor = '#888';
        }

        const nomeKit = getNomeKit(item.tipoKit);
        const dataHoraMov = item.ultimaMovimentacao || item.dataCadastro || '-';

        html += `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); background: ${bgColor};">
                <td style="padding: 10px;">${index + 1}</td>
                <td style="padding: 10px; font-weight: 600; color: #fff;">${nomeKit}</td>
                <td style="padding: 10px; color: #aaa;">${item.lote}</td>
                <td style="padding: 10px; color: ${diffDias < 0 ? '#e74c3c' : '#aaa'};">
                    ${formatarData(item.validade)}
                </td>
                <td style="padding: 10px; text-align: center; color: #2ecc71;">${item.entrada}</td>
                <td style="padding: 10px; text-align: center; color: #e74c3c;">${item.saida}</td>
                <td style="padding: 10px; text-align: center; font-weight: bold; color: ${item.saldo === 0 ? '#888' : '#ffd700'};">
                    ${item.saldo}
                </td>
                <td style="padding: 10px; text-align: center; color: ${statusColor};">
                    ${status}
                </td>
                <td style="padding: 10px; color: #888; font-size: 0.75rem; max-width: 120px; word-break: break-word;">
                    ${item.observacao || '-'}
                </td>
                <td style="padding: 10px; text-align: center; color: #00d2ff; font-size: 0.7rem;">
                    ${dataHoraMov}
                </td>
                <td style="padding: 10px; text-align: center;">
                    <button onclick="removerItemEstoque(${item.id})" style="
                        background: rgba(255,107,107,0.15);
                        border: 1px solid rgba(255,107,107,0.2);
                        color: #ff6b6b;
                        padding: 4px 10px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 0.7rem;
                    ">
                        🗑️
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// ============================================================
// ===== ATUALIZAR RESUMO =====
// ============================================================
function atualizarResumoEstoque() {
    const totalFrascos = estoqueItens.reduce((sum, item) => sum + item.saldo, 0);
    const totalTipos = new Set(estoqueItens.map(item => item.tipoKit)).size;
    const totalLotes = new Set(estoqueItens.map(item => item.lote)).size;
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const alertas = estoqueItens.filter(item => {
        const validadeDate = new Date(item.validade + 'T00:00:00');
        const diffDias = Math.ceil((validadeDate - hoje) / (1000 * 60 * 60 * 24));
        return diffDias < 0 || diffDias <= 7;
    }).length;

    const totalFrascosEl = document.getElementById('totalFrascosEstoque');
    const totalTiposEl = document.getElementById('totalTiposEstoque');
    const totalLotesEl = document.getElementById('totalLotesEstoque');
    const totalAlertasEl = document.getElementById('totalAlertasEstoque');

    if (totalFrascosEl) totalFrascosEl.textContent = totalFrascos;
    if (totalTiposEl) totalTiposEl.textContent = totalTipos;
    if (totalLotesEl) totalLotesEl.textContent = totalLotes;
    if (totalAlertasEl) totalAlertasEl.textContent = alertas;
}

// ============================================================
// ===== UTILITÁRIOS =====
// ============================================================
function getNomeKit(codigo) {
    const nomes = {
        'MIBI': 'MIBI (Miocárdio)',
        'MDP': 'MDP (Ósseo)',
        'DMSA': 'DMSA (Renal)',
        'DTPA': 'DTPA (Renal)',
        'FITATO': 'FITATO (Fígado)',
        'PIRO': 'PIRO (Pirofosfato)',
        'HIDA': 'HIDA (Hepatobiliar)',
        'SESTAMIBI': 'Sestamibi (Miocárdio)',
        'FDG': 'FDG (F-18)',
        'FES': 'FES (F-18)',
        'F-PSMA': 'F-PSMA (F-18)',
        'NaF': 'NaF (F-18)',
        'MIBG': 'MIBG (I-123)',
        'NaI': 'NaI (I-123)',
        'TRODAT': 'TRODAT (Transp. Dopaminérgico)'
    };
    return nomes[codigo] || codigo;
}

function formatarData(data) {
    if (!data) return '-';
    const partes = data.split('-');
    if (partes.length !== 3) return data;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function limparCamposEstoque() {
    const loteInput = document.getElementById('estoqueLote');
    const quantidadeInput = document.getElementById('estoqueQuantidade');
    const observacaoInput = document.getElementById('estoqueObservacao');
    const tipoMovimentoSelect = document.getElementById('estoqueTipoMovimento');

    if (loteInput) loteInput.value = '';
    if (quantidadeInput) quantidadeInput.value = '1';
    if (observacaoInput) observacaoInput.value = '';
    if (tipoMovimentoSelect) tipoMovimentoSelect.value = 'entrada';
    // NÃO limpa o responsável (geralmente é o mesmo usuário)
}

// ============================================================
// ===== REMOVER ITEM =====
// ============================================================
function removerItemEstoque(id) {
    if (!confirm('⚠️ Tem certeza que deseja remover este item do estoque?')) return;
    estoqueItens = estoqueItens.filter(item => item.id !== id);
    salvarEstoque();
    atualizarTabelaEstoque();
}

// ============================================================
// ===== LIMPAR HISTÓRICO =====
// ============================================================
function limparHistoricoEstoque() {
    if (!confirm('⚠️ Tem certeza que deseja limpar TODO o histórico de estoque e movimentações? Esta ação não pode ser desfeita!')) return;
    estoqueItens = [];
    historicoMovimentacoes = [];
    estoqueIdCounter = 0;
    historicoIdCounter = 0;
    salvarEstoque();
    atualizarTabelaEstoque();
    atualizarTabelaHistorico();
}

// ============================================================
// ===== EXPORTAR ESTOQUE PARA EXCEL =====
// ============================================================
function exportarEstoqueExcel() {
    if (estoqueItens.length === 0) {
        alert('⚠️ Não há dados para exportar.');
        return;
    }

    const dados = estoqueItens.map(item => ({
        'Kit': getNomeKit(item.tipoKit),
        'Lote': item.lote,
        'Validade': formatarData(item.validade),
        'Entrada (frascos)': item.entrada,
        'Saída (frascos)': item.saida,
        'Saldo (frascos)': item.saldo,
        'Observação': item.observacao || '',
        'Data/Hora Movimentação': item.ultimaMovimentacao || item.dataCadastro || '',
        'Data Cadastro': item.dataCadastro || '',
        'Última Movimentação': item.ultimaMovimentacao || ''
    }));

    try {
        if (typeof XLSX === 'undefined') {
            alert('❌ A biblioteca XLSX não está carregada.');
            return;
        }

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(dados);
        
        ws['!cols'] = [
            { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 18 }, { wch: 18 },
            { wch: 18 }, { wch: 30 }, { wch: 22 }, { wch: 20 }, { wch: 20 }
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Estoque Kits');
        XLSX.writeFile(wb, `Estoque_Kits_${new Date().toISOString().split('T')[0]}.xlsx`);
        
        alert('✅ Arquivo Excel exportado com sucesso!');
    } catch (e) {
        console.error('Erro ao exportar Excel:', e);
        alert('❌ Erro ao gerar arquivo Excel.');
    }
}

// ============================================================
// ===== EXPORTAR HISTÓRICO PARA EXCEL =====
// ============================================================
function exportarHistoricoExcel() {
    if (historicoMovimentacoes.length === 0) {
        alert('⚠️ Nenhuma movimentação no histórico para exportar.');
        return;
    }

    const dados = historicoMovimentacoes
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        .map(h => ({
            'Data/Hora': h.dataHora,
            'Tipo': h.tipoMovimento === 'entrada' ? 'Entrada' : 'Saída',
            'Kit': getNomeKit(h.tipoKit),
            'Lote': h.lote,
            'Validade': formatarData(h.validade),
            'Quantidade': h.quantidade,
            'Responsável': h.responsavel || '',
            'Motivo/Obs': h.observacao || '',
            'Data Entrada': h.dataEntrada || '',
            'Data Saída (uso)': h.dataSaida || '',
            'Motivo': h.motivo || ''
        }));

    try {
        if (typeof XLSX === 'undefined') {
            alert('❌ Biblioteca XLSX não carregada.');
            return;
        }
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(dados);
        ws['!cols'] = [
            { wch: 18 }, { wch: 10 }, { wch: 20 }, { wch: 15 },
            { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 30 },
            { wch: 18 }, { wch: 18 }, { wch: 18 }
        ];
        XLSX.utils.book_append_sheet(wb, ws, 'Histórico');
        XLSX.writeFile(wb, `Historico_Estoque_${new Date().toISOString().split('T')[0]}.xlsx`);
        alert('✅ Histórico exportado com sucesso!');
    } catch (e) {
        console.error('Erro ao exportar histórico:', e);
        alert('❌ Erro ao gerar Excel.');
    }
}

// ============================================================
// ===== PAGINAÇÃO E FILTRO DO ESTOQUE =====
// ============================================================
function aplicarFiltrosEstoque() {
    if (!filtroDataInicioEstoque && !filtroDataFimEstoque) {
        estoqueFiltrado = [...estoqueItens];
        return;
    }

    estoqueFiltrado = estoqueItens.filter(item => {
        if (!item.validade) return false;
        const dataValidade = new Date(item.validade + 'T00:00:00');
        let atendeFiltro = true;

        if (filtroDataInicioEstoque) {
            const dataInicio = new Date(filtroDataInicioEstoque + 'T00:00:00');
            if (dataValidade < dataInicio) atendeFiltro = false;
        }

        if (filtroDataFimEstoque && atendeFiltro) {
            const dataFim = new Date(filtroDataFimEstoque + 'T00:00:00');
            if (dataValidade > dataFim) atendeFiltro = false;
        }

        return atendeFiltro;
    });
}

function atualizarControlesPagina() {
    let container = document.getElementById('paginacaoEstoque');
    if (!container) {
        container = document.createElement('div');
        container.id = 'paginacaoEstoque';
        container.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-top: 15px;
            padding: 10px 15px;
            background: rgba(255,255,255,0.03);
            border-radius: 8px;
            border: 1px solid rgba(255,255,255,0.05);
            flex-wrap: wrap;
            gap: 10px;
        `;
        const tabela = document.querySelector('#modalEstoque .table-wrapper');
        if (tabela && tabela.parentNode) {
            tabela.parentNode.insertBefore(container, tabela.nextSibling);
        }
    }

    const totalPaginas = Math.ceil(estoqueFiltrado.length / ITENS_POR_PAGINA);
    const inicio = (paginaAtualEstoque - 1) * ITENS_POR_PAGINA + 1;
    const fim = Math.min(paginaAtualEstoque * ITENS_POR_PAGINA, estoqueFiltrado.length);

    container.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <span style="color: #888; font-size: 0.8rem;">
                📊 Mostrando <strong style="color: #ffd700;">${estoqueFiltrado.length}</strong> itens 
                (${inicio} - ${fim} de ${estoqueFiltrado.length})
            </span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <button onclick="irPaginaEstoque(1)" ${paginaAtualEstoque === 1 ? 'disabled' : ''} style="
                padding: 4px 10px;
                border: 1px solid ${paginaAtualEstoque === 1 ? '#333' : '#555'};
                border-radius: 4px;
                background: ${paginaAtualEstoque === 1 ? 'transparent' : 'rgba(155,89,182,0.1)'};
                color: ${paginaAtualEstoque === 1 ? '#555' : '#9b59b6'};
                cursor: ${paginaAtualEstoque === 1 ? 'default' : 'pointer'};
                font-size: 0.75rem;
            ">
                ⏮
            </button>
            <button onclick="irPaginaEstoque(${paginaAtualEstoque - 1})" ${paginaAtualEstoque === 1 ? 'disabled' : ''} style="
                padding: 4px 10px;
                border: 1px solid ${paginaAtualEstoque === 1 ? '#333' : '#555'};
                border-radius: 4px;
                background: ${paginaAtualEstoque === 1 ? 'transparent' : 'rgba(155,89,182,0.1)'};
                color: ${paginaAtualEstoque === 1 ? '#555' : '#9b59b6'};
                cursor: ${paginaAtualEstoque === 1 ? 'default' : 'pointer'};
                font-size: 0.75rem;
            ">
                ◀
            </button>
            <span style="color: #aaa; font-size: 0.8rem; padding: 0 8px;">
                Página <strong style="color: #ffd700;">${paginaAtualEstoque}</strong> de <strong style="color: #ffd700;">${totalPaginas || 1}</strong>
            </span>
            <button onclick="irPaginaEstoque(${paginaAtualEstoque + 1})" ${paginaAtualEstoque === totalPaginas || totalPaginas === 0 ? 'disabled' : ''} style="
                padding: 4px 10px;
                border: 1px solid ${paginaAtualEstoque === totalPaginas || totalPaginas === 0 ? '#333' : '#555'};
                border-radius: 4px;
                background: ${paginaAtualEstoque === totalPaginas || totalPaginas === 0 ? 'transparent' : 'rgba(155,89,182,0.1)'};
                color: ${paginaAtualEstoque === totalPaginas || totalPaginas === 0 ? '#555' : '#9b59b6'};
                cursor: ${paginaAtualEstoque === totalPaginas || totalPaginas === 0 ? 'default' : 'pointer'};
                font-size: 0.75rem;
            ">
                ▶
            </button>
            <button onclick="irPaginaEstoque(${totalPaginas})" ${paginaAtualEstoque === totalPaginas || totalPaginas === 0 ? 'disabled' : ''} style="
                padding: 4px 10px;
                border: 1px solid ${paginaAtualEstoque === totalPaginas || totalPaginas === 0 ? '#333' : '#555'};
                border-radius: 4px;
                background: ${paginaAtualEstoque === totalPaginas || totalPaginas === 0 ? 'transparent' : 'rgba(155,89,182,0.1)'};
                color: ${paginaAtualEstoque === totalPaginas || totalPaginas === 0 ? '#555' : '#9b59b6'};
                cursor: ${paginaAtualEstoque === totalPaginas || totalPaginas === 0 ? 'default' : 'pointer'};
                font-size: 0.75rem;
            ">
                ⏭
            </button>
        </div>
    `;
}

function atualizarInfoPaginacao() {
    const totalPaginas = Math.ceil(estoqueFiltrado.length / ITENS_POR_PAGINA);
    const infoEl = document.getElementById('infoPaginacaoEstoque');
    if (infoEl) {
        infoEl.textContent = `📋 Página ${paginaAtualEstoque} de ${totalPaginas || 1} · ${estoqueFiltrado.length} itens`;
    }
}

function irPaginaEstoque(pagina) {
    const totalPaginas = Math.ceil(estoqueFiltrado.length / ITENS_POR_PAGINA);
    if (pagina < 1 || pagina > totalPaginas || pagina === paginaAtualEstoque) return;
    paginaAtualEstoque = pagina;
    atualizarTabelaEstoque();
}

function aplicarFiltroDataEstoque() {
    const dataInicio = document.getElementById('filtroDataInicioEstoque');
    const dataFim = document.getElementById('filtroDataFimEstoque');
    
    filtroDataInicioEstoque = dataInicio ? dataInicio.value : '';
    filtroDataFimEstoque = dataFim ? dataFim.value : '';
    
    paginaAtualEstoque = 1;
    atualizarTabelaEstoque();
    
    const infoEl = document.getElementById('infoFiltroEstoque');
    if (infoEl) {
        if (filtroDataInicioEstoque && filtroDataFimEstoque) {
            infoEl.textContent = `📅 Filtrado: ${formatarData(filtroDataInicioEstoque)} até ${formatarData(filtroDataFimEstoque)}`;
            infoEl.style.color = '#ffd700';
        } else if (filtroDataInicioEstoque) {
            infoEl.textContent = `📅 A partir de: ${formatarData(filtroDataInicioEstoque)}`;
            infoEl.style.color = '#ffd700';
        } else if (filtroDataFimEstoque) {
            infoEl.textContent = `📅 Até: ${formatarData(filtroDataFimEstoque)}`;
            infoEl.style.color = '#ffd700';
        } else {
            infoEl.textContent = '📋 Mostrando todos os registros';
            infoEl.style.color = '#888';
        }
    }
}

function limparFiltrosEstoque() {
    const dataInicio = document.getElementById('filtroDataInicioEstoque');
    const dataFim = document.getElementById('filtroDataFimEstoque');
    
    if (dataInicio) dataInicio.value = '';
    if (dataFim) dataFim.value = '';
    
    filtroDataInicioEstoque = '';
    filtroDataFimEstoque = '';
    paginaAtualEstoque = 1;
    atualizarTabelaEstoque();
    
    const infoEl = document.getElementById('infoFiltroEstoque');
    if (infoEl) {
        infoEl.textContent = '📋 Mostrando todos os registros';
        infoEl.style.color = '#888';
    }
}

function adicionarFiltrosEstoque() {
    const header = document.querySelector('#modalEstoque > div > div:first-child');
    if (!header) return;

    if (document.getElementById('filtrosEstoqueContainer')) return;

    const filtrosContainer = document.createElement('div');
    filtrosContainer.id = 'filtrosEstoqueContainer';
    filtrosContainer.style.cssText = `
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(155,89,182,0.15);
        border-radius: 10px;
        padding: 12px 18px;
        margin: 15px 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 10px;
    `;

    filtrosContainer.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <span style="color: #9b59b6; font-weight: 600; font-size: 0.85rem;">🔍 Filtrar por Validade:</span>
            <div style="display: flex; align-items: center; gap: 6px;">
                <label style="color: #888; font-size: 0.75rem;">De:</label>
                <input type="date" id="filtroDataInicioEstoque" style="
                    padding: 4px 10px;
                    border-radius: 6px;
                    border: 1px solid #444;
                    background: rgba(255,255,255,0.05);
                    color: #fff;
                    font-size: 0.85rem;
                ">
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
                <label style="color: #888; font-size: 0.75rem;">Até:</label>
                <input type="date" id="filtroDataFimEstoque" style="
                    padding: 4px 10px;
                    border-radius: 6px;
                    border: 1px solid #444;
                    background: rgba(255,255,255,0.05);
                    color: #fff;
                    font-size: 0.85rem;
                ">
            </div>
            <button onclick="aplicarFiltroDataEstoque()" style="
                padding: 4px 16px;
                background: linear-gradient(90deg, #8e44ad, #9b59b6);
                border: none;
                border-radius: 6px;
                color: #fff;
                cursor: pointer;
                font-size: 0.8rem;
                font-weight: bold;
            ">
                🔍 Filtrar
            </button>
            <button onclick="limparFiltrosEstoque()" style="
                padding: 4px 14px;
                background: rgba(255,255,255,0.05);
                border: 1px solid #444;
                border-radius: 6px;
                color: #888;
                cursor: pointer;
                font-size: 0.8rem;
            ">
                ✕ Limpar
            </button>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
            <span id="infoFiltroEstoque" style="color: #888; font-size: 0.75rem;">📋 Mostrando todos os registros</span>
            <span id="infoPaginacaoEstoque" style="color: #666; font-size: 0.7rem;">📋 Página 1 de 1</span>
        </div>
    `;

    header.parentNode.insertBefore(filtrosContainer, header.nextSibling);
}

// ============================================================
// ===== SOBRESCREVER FUNÇÃO DE ABERTURA =====
// ============================================================
const abrirEstoqueOriginal = window.abrirModuloEstoque || function() {};

window.abrirModuloEstoque = function() {
    if (typeof abrirEstoqueOriginal === 'function') {
        abrirEstoqueOriginal();
    }
    
    setTimeout(() => {
        adicionarFiltrosEstoque();
        paginaAtualEstoque = 1;
        atualizarTabelaEstoque();
    }, 100);
};

// ============================================================
// ===== INICIALIZAR =====
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    carregarEstoqueSalvo();
    
    // 🆕 Preencher responsável com usuário logado
    setTimeout(() => {
        const respInput = document.getElementById('estoqueResponsavel');
        if (respInput && !respInput.value) {
            if (typeof firebase !== 'undefined' && firebase.auth) {
                const user = firebase.auth().currentUser;
                if (user) {
                    respInput.value = user.displayName || user.email?.split('@')[0] || '';
                }
            }
        }
    }, 1500);
});

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const modal = document.getElementById('modalEstoque');
        if (modal && modal.style.display === 'flex') {
            fecharModuloEstoque();
        }
    }
});

function temDadosEstoque() {
    return estoqueItens.length > 0;
}

function getResumoEstoque() {
    const totalFrascos = estoqueItens.reduce((sum, item) => sum + item.saldo, 0);
    const totalKits = new Set(estoqueItens.map(item => item.tipoKit)).size;
    const baixoEstoque = estoqueItens.filter(item => item.saldo > 0 && item.saldo <= 2).length;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const vencidos = estoqueItens.filter(item => {
        const validadeDate = new Date(item.validade + 'T00:00:00');
        return validadeDate < hoje;
    }).length;
    
    return {
        totalFrascos,
        totalKits,
        baixoEstoque,
        vencidos,
        totalItens: estoqueItens.length
    };
}

function exportarEstoquePDF() {
    alert('📄 Funcionalidade em desenvolvimento. Em breve será possível gerar PDF do estoque!');
}

// ============================================================
// ===== EXPORTS GLOBAIS =====
// ============================================================
window.atualizarTabelaHistorico = atualizarTabelaHistorico;
window.exportarHistoricoExcel = exportarHistoricoExcel;
window.irPaginaHistorico = irPaginaHistorico;
window.limparFiltrosHistorico = limparFiltrosHistorico;
window.aplicarPreset180Dias = aplicarPreset180Dias;
window.togglePeriodoCustomizado = togglePeriodoCustomizado;
window.aplicarPeriodoRapido = aplicarPeriodoRapido;
window.aplicarFiltroHistoricoPersonalizado = aplicarFiltroHistoricoPersonalizado;
window.atualizarBotoesPeriodo = atualizarBotoesPeriodo;
window.renderizarPaginacaoHistorico = renderizarPaginacaoHistorico;
window.irPaginaEstoque = irPaginaEstoque;
window.aplicarFiltroDataEstoque = aplicarFiltroDataEstoque;
window.limparFiltrosEstoque = limparFiltrosEstoque;

console.log('📊 Módulo Estoque carregado com sucesso!');
console.log(`📌 ${ITENS_POR_PAGINA} itens por página (estoque) | ${ITENS_POR_PAGINA_HISTORICO} eventos por página (histórico)`);
console.log('🔍 Histórico com filtro padrão de 180 dias');