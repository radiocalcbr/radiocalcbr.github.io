// ============================================================
// ARQUIVO: assets/js/estoque.js
// MÓDULO: Gerência de Estoque de Kits
// ============================================================

// ===== VARIÁVEIS GLOBAIS =====
let estoqueItens = [];
let estoqueIdCounter = 0;

// ============================================================
// ===== CARREGAR DADOS SALVOS =====
// ============================================================
function carregarEstoqueSalvo() {
    const salvo = localStorage.getItem('estoqueKits');
    if (salvo) {
        try {
            let dados = JSON.parse(salvo);
            
            // 🔥 PADRONIZAR DATAS (converter DD/MM/AAAA para AAAA-MM-DD)
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
}

// ============================================================
// ===== SALVAR DADOS =====
// ============================================================
function salvarEstoque() {
    try {
        localStorage.setItem('estoqueKits', JSON.stringify(estoqueItens));
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

    let itemExistente = estoqueItens.find(item => 
        item.tipoKit === tipoKit && 
        item.lote === lote &&
        item.validade === validade
    );

    const dataHora = new Date().toLocaleString('pt-BR');

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

    salvarEstoque();
    atualizarTabelaEstoque();
    limparCamposEstoque();

    const tipoTexto = tipoMovimento === 'entrada' ? 'entrada' : 'saída';
    alert(`✅ Movimentação de ${tipoTexto} cadastrada com sucesso!\n\nKit: ${tipoKit}\nLote: ${lote}\nQuantidade: ${quantidade} frascos`);
}

// ============================================================
// ===== ATUALIZAR TABELA (COM COLUNA DATA/HORA) =====
// ============================================================
function atualizarTabelaEstoque() {
    const tbody = document.getElementById('corpoEstoque');
    if (!tbody) return;

    // Aplicar filtros
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
    
    if (paginaAtualEstoque > totalPaginas) {
        paginaAtualEstoque = totalPaginas;
    }
    if (paginaAtualEstoque < 1) {
        paginaAtualEstoque = 1;
    }

    const inicio = (paginaAtualEstoque - 1) * ITENS_POR_PAGINA;
    const fim = Math.min(inicio + ITENS_POR_PAGINA, estoqueFiltrado.length);
    const itensPagina = estoqueFiltrado.slice(inicio, fim);

    const itensOrdenados = [...itensPagina].sort((a, b) => {
        return new Date(a.validade) - new Date(b.validade);
    });

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

        // 🔥 FORMATAR A DATA/HORA DA ÚLTIMA MOVIMENTAÇÃO
        let dataHoraMov = '-';
        if (item.ultimaMovimentacao) {
            dataHoraMov = item.ultimaMovimentacao;
        } else if (item.dataCadastro) {
            dataHoraMov = item.dataCadastro;
        }

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
                <!-- 🆕 COLUNA DATA/HORA DA MOVIMENTAÇÃO -->
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
                        transition: 0.3s;
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
// ===== BUSCAR POR LOTE (COM COLUNA DATA/HORA) =====
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

    const itensOrdenados = [...itensFiltrados].sort((a, b) => {
        return new Date(a.validade) - new Date(b.validade);
    });

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

        // 🔥 FORMATAR A DATA/HORA DA ÚLTIMA MOVIMENTAÇÃO
        let dataHoraMov = '-';
        if (item.ultimaMovimentacao) {
            dataHoraMov = item.ultimaMovimentacao;
        } else if (item.dataCadastro) {
            dataHoraMov = item.dataCadastro;
        }

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
                <!-- 🆕 COLUNA DATA/HORA DA MOVIMENTAÇÃO -->
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
        'NaI': 'NaI (I-123)'
    };
    return nomes[codigo] || codigo;
}

function formatarData(data) {
    if (!data) return '-';
    const partes = data.split('-');
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
    if (!confirm('⚠️ Tem certeza que deseja limpar TODO o histórico de estoque? Esta ação não pode ser desfeita!')) return;
    estoqueItens = [];
    estoqueIdCounter = 0;
    salvarEstoque();
    atualizarTabelaEstoque();
}

// ============================================================
// ===== EXPORTAR PARA EXCEL (COM COLUNA DATA/HORA) =====
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
            alert('❌ A biblioteca XLSX não está carregada. Verifique a conexão com a internet.');
            return;
        }

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(dados);
        
        const colWidths = [
            { wch: 20 }, // Kit
            { wch: 15 }, // Lote
            { wch: 12 }, // Validade
            { wch: 18 }, // Entrada
            { wch: 18 }, // Saída
            { wch: 18 }, // Saldo
            { wch: 30 }, // Observação
            { wch: 22 }, // Data/Hora Movimentação 🆕
            { wch: 20 }, // Data Cadastro
            { wch: 20 }  // Última Movimentação
        ];
        ws['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(wb, ws, 'Estoque Kits');
        XLSX.writeFile(wb, `Estoque_Kits_${new Date().toISOString().split('T')[0]}.xlsx`);
        
        alert('✅ Arquivo Excel exportado com sucesso!');
    } catch (e) {
        console.error('Erro ao exportar Excel:', e);
        alert('❌ Erro ao gerar arquivo Excel. Verifique o console para mais detalhes.');
    }
}

// ============================================================
// ===== INICIALIZAR =====
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    carregarEstoqueSalvo();
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
// ===== FUNÇÃO PARA BUSCAR POR LOTE (COM COLUNA DATA/HORA) =====
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

    const itensOrdenados = [...itensFiltrados].sort((a, b) => {
        return new Date(a.validade) - new Date(b.validade);
    });

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

        // 🔥 FORMATAR A DATA/HORA DA ÚLTIMA MOVIMENTAÇÃO
        let dataHoraMov = '-';
        if (item.ultimaMovimentacao) {
            dataHoraMov = item.ultimaMovimentacao;
        } else if (item.dataCadastro) {
            dataHoraMov = item.dataCadastro;
        }

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
                <!-- 🆕 COLUNA DATA/HORA DA MOVIMENTAÇÃO -->
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

console.log('✅ Módulo de Estoque carregado com sucesso!');
console.log('📦 Funções disponíveis:');
console.log('  - abrirModuloEstoque()');
console.log('  - fecharModuloEstoque()');
console.log('  - cadastrarMovimentacaoEstoque()');
console.log('  - exportarEstoqueExcel()');
console.log('  - limparHistoricoEstoque()');
console.log('  - buscarPorLote(lote)');
console.log('  - getResumoEstoque()');

// ============================================================
// ===== PAGINAÇÃO E FILTRO DO ESTOQUE =====
// ============================================================

let paginaAtualEstoque = 1;
const ITENS_POR_PAGINA = 15;
let filtroDataInicioEstoque = '';
let filtroDataFimEstoque = '';
let estoqueFiltrado = [];

// ============================================================
// ===== APLICAR FILTROS =====
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

// ============================================================
// ===== ATUALIZAR CONTROLES DE PÁGINA =====
// ============================================================
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
                transition: 0.3s;
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
                transition: 0.3s;
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
                transition: 0.3s;
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
                transition: 0.3s;
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
                transition: 0.3s;
            " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
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
                transition: 0.3s;
            " onmouseover="this.style.color='#fff'" onmouseout="this.style.color='#888'">
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

console.log('📊 Paginação e Filtro do Estoque carregados!');
console.log(`📌 ${ITENS_POR_PAGINA} itens por página`);
console.log('🔍 Filtros disponíveis: data de validade');