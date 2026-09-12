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
// ===== VARIÁVEIS DE PAGINAÇÃO DO HISTÓRICO (RENOMEADAS) =====
// ============================================================

let paginaAtualHistoricoGerador = 1;
const ITENS_POR_PAGINA_HISTORICO_GERADOR = 10;   // 🔥 RENOMEADO
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
            atualizarHistoricoGeradorComPaginacao();
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
        verificarAdminGerador();
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
// ===== VERIFICAR ADMIN E MOSTRAR BADGE =====
// ============================================================

async function verificarAdminGerador() {
    try {
        const userData = await obterDadosUsuario();
        const isAdmin = userData && userData.role === 'admin';
        const badge = document.getElementById('adminBadgeGerador');
        
        if (badge) {
            if (isAdmin) {
                badge.style.display = 'block';
                console.log('👑 Modo Admin ativado para geradores');
            } else {
                badge.style.display = 'none';
                console.log('👤 Modo Usuário - exclusão apenas local');
            }
        }
    } catch (error) {
        console.error('Erro ao verificar admin:', error);
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
    const dataLiberacao = document.getElementById('gerDataLiberacao');
    const dataDevolucaoReal = document.getElementById('gerDataDevolucaoReal');
    
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
    
    const dataRecebimento = document.getElementById('gerDataRecebimento')?.value || '';
    const dataCalibracao = document.getElementById('gerDataCalibracao')?.value || '';
    const atividade = document.getElementById('gerAtividade')?.value || '';
    const lote = document.getElementById('gerLote')?.value.trim() || '';
    const validade = document.getElementById('gerDataValidade')?.value || '';
    const dataDevolucao = document.getElementById('gerDataDevolucao')?.value || '';
    const dataLiberacao = document.getElementById('gerDataLiberacao')?.value || '';
    const dataDevolucaoReal = document.getElementById('gerDataDevolucaoReal')?.value || '';
    const responsavelRecebimento = document.getElementById('gerResponsavelRecebimento')?.value.trim() || '';
    const status = document.getElementById('gerStatus')?.value || 'aguardando';
    const responsavelLiberacao = document.getElementById('gerResponsavelLiberacao')?.value.trim() || '';
    const responsavelDevolucao = document.getElementById('gerResponsavelDevolucao')?.value.trim() || '';
    const taxaExposicaoBalde = document.getElementById('gerTaxaExposicaoBalde')?.value || '';
    
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
    
    const existe = registrosGerador.some(item => 
        item.lote === lote && 
        item.dataRecebimento === dataRecebimento
    );
    
    if (existe) {
        mostrarFeedbackGerador('⚠️ Já existe um registro com este lote e data de recebimento!', 'erro');
        return;
    }
    
    const precoAplicado = typeof precosGeradores !== 'undefined'
        ? Number(precosGeradores[Number.parseFloat(atividade)]) || 0
        : 0;
    const novoRegistro = {
        id: geradorIdCounter++,
        dataRecebimento: dataRecebimento,
        dataCalibracao: dataCalibracao,
        atividade: atividade,
        precoAplicado: precoAplicado,
        lote: lote,
        validade: validade,
        dataDevolucao: dataDevolucao,
        dataLiberacao: dataLiberacao,
        dataDevolucaoReal: dataDevolucaoReal,
        responsavelRecebimento: responsavelRecebimento,
        status: status,
        responsavelLiberacao: responsavelLiberacao,
        responsavelDevolucao: responsavelDevolucao,
        taxaExposicaoBalde: taxaExposicaoBalde,
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
        'gerAtividade',
        'gerLote',
        'gerDataValidade',
        'gerDataDevolucao',
        'gerDataLiberacao',
        'gerDataDevolucaoReal',
        'gerResponsavelRecebimento',
        'gerResponsavelLiberacao',
        'gerResponsavelDevolucao',
        'gerTaxaExposicaoBalde'
    ];
    
    campos.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    
    const status = document.getElementById('gerStatus');
    if (status) status.value = 'aguardando';
    
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
                <td colspan="15" style="text-align: center; padding: 40px; color: #888;">
                    Nenhum gerador registrado. Preencha o formulário acima e clique em "📝 Registrar Gerador".
                </td>
            </tr>
        `;
        return;
    }
    
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
                <td style="padding: 10px; font-weight: 600; color: #00d2ff;">${item.atividade || '-'}</td>
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
                <td style="padding: 10px;">${item.dataLiberacao ? formatarDataBR(item.dataLiberacao) : '-'}</td>
                <td style="padding: 10px; font-size: 0.8rem;">${item.responsavelDevolucao || '-'}</td>
                <td style="padding: 10px;">${item.dataDevolucaoReal ? formatarDataBR(item.dataDevolucaoReal) : '-'}</td>
                <td style="padding: 10px; font-size: 0.8rem; color: #ff6b6b;">${item.taxaExposicaoBalde ? item.taxaExposicaoBalde + ' cpm' : '-'}</td>
                <td style="padding: 10px; text-align: center; white-space: nowrap;">
                    <button onclick="editarGerador(${item.id})" style="
                        background: rgba(0, 210, 255, 0.15);
                        border: 1px solid rgba(0, 210, 255, 0.2);
                        color: #00d2ff;
                        padding: 4px 10px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 0.7rem;
                        transition: 0.3s;
                        margin-right: 4px;
                    " onmouseover="this.style.background='rgba(0,210,255,0.25)'" onmouseout="this.style.background='rgba(0,210,255,0.15)'" title="Editar registro">
                        ✏️
                    </button>
                    <button onclick="removerGerador(${item.id})" style="
                        background: rgba(255,107,107,0.15);
                        border: 1px solid rgba(255,107,107,0.2);
                        color: #ff6b6b;
                        padding: 4px 10px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 0.7rem;
                        transition: 0.3s;
                    " onmouseover="this.style.background='rgba(255,107,107,0.25)'" onmouseout="this.style.background='rgba(255,107,107,0.15)'" title="Remover registro (local + nuvem se for admin)">
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
// ===== RESETAR BOTÃO =====
// ============================================================

function resetarBotaoGerador() {
    console.log('🔄 Resetando botão do gerador...');
    
    const btn = document.getElementById('btnRegistrarGerador');
    
    if (btn) {
        btn.textContent = '📝 Registrar Gerador';
        btn.dataset.editando = '';
        btn.style.background = 'linear-gradient(135deg, #ffd700, #f7971e)';
        btn.style.color = '#000';
        btn.onclick = function() {
            registrarGerador();
        };
        console.log('✅ Botão resetado para "📝 Registrar Gerador"');
    } else {
        console.warn('⚠️ Botão não encontrado!');
        const allButtons = document.querySelectorAll('#modalGerador button');
        allButtons.forEach(b => {
            if (b.textContent.includes('Registrar Gerador') || b.textContent.includes('Atualizar Gerador')) {
                b.textContent = '📝 Registrar Gerador';
                b.dataset.editando = '';
                b.style.background = 'linear-gradient(135deg, #ffd700, #f7971e)';
                b.style.color = '#000';
                b.onclick = function() {
                    registrarGerador();
                };
                console.log('✅ Botão resetado (fallback)');
            }
        });
    }
}

// ============================================================
// ===== REMOVER GERADOR =====
// ============================================================

async function removerGerador(id) {
    if (!confirm('⚠️ Tem certeza que deseja remover este registro do gerador?')) return;
    
    const item = registrosGerador.find(r => r.id === id);
    if (!item) return;
    
    registrosGerador = registrosGerador.filter(r => r.id !== id);
    salvarGeradores();
    atualizarHistoricoGeradorComPaginacao();
    atualizarTabelaGeradorHistorico();
    atualizarContadoresGerador();
    
    const userData = await obterDadosUsuario();
    const isAdmin = userData && userData.role === 'admin';
    
    if (isAdmin) {
        try {
            if (typeof removerGeradorDaNuvem === 'function') {
                await removerGeradorDaNuvem(item);
                mostrarFeedbackGerador(`🗑️ Gerador ${item.lote || ''} removido da nuvem!`, 'success');
            }
        } catch (error) {
            console.error('❌ Erro ao remover da nuvem:', error);
            mostrarFeedbackGerador('⚠️ Removido localmente, mas erro ao remover da nuvem.', 'aviso');
        }
    } else {
        mostrarFeedbackGerador(`🗑️ Gerador ${item.lote || ''} removido localmente.`, 'info');
        setTimeout(() => {
            mostrarFeedbackGerador('ℹ️ Apenas administradores podem remover da nuvem.', 'info');
        }, 2000);
    }
}

// ============================================================
// ===== REMOVER GERADOR DA NUVEM =====
// ============================================================

async function removerGeradorDaNuvem(item) {
    console.log('☁️ Removendo gerador da nuvem...', item);
    
    try {
        const userData = await obterDadosUsuario();
        if (!userData || !userData.organizacao) {
            console.warn('⚠️ Usuário não logado ou sem organização. Apenas removido localmente.');
            return;
        }
        
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            throw new Error('Firestore não está disponível');
        }
        
        const db = firebase.firestore();
        const orgGeradoresRef = db.collection('organizacoes')
            .doc(userData.organizacao)
            .collection('geradores');
        
        const snapshot = await orgGeradoresRef
            .where('lote', '==', item.lote)
            .get();
        
        if (!snapshot.empty) {
            for (const doc of snapshot.docs) {
                const data = doc.data();
                const registros = data.registros || [];
                const novosRegistros = registros.filter(r => r.id !== item.id);
                
                if (novosRegistros.length < registros.length) {
                    await doc.ref.update({
                        registros: novosRegistros,
                        total: novosRegistros.length,
                        ultimaAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    console.log(`✅ Gerador removido do documento ${doc.id}`);
                } else {
                    if (novosRegistros.length === 0) {
                        await doc.ref.delete();
                        console.log(`🗑️ Documento vazio removido: ${doc.id}`);
                    }
                }
            }
        } else {
            console.warn('⚠️ Nenhum documento encontrado na nuvem para este lote.');
        }
        
    } catch (error) {
        console.error('❌ Erro ao remover gerador da nuvem:', error);
        throw error;
    }
}

// ============================================================
// ===== EDITAR GERADOR =====
// ============================================================

function editarGerador(id) {
    const item = registrosGerador.find(r => r.id === id);
    if (!item) {
        mostrarFeedbackGerador('❌ Registro não encontrado!', 'erro');
        return;
    }
    
    console.log('✏️ Editando gerador:', item);
    
    const dataRecebimento = document.getElementById('gerDataRecebimento');
    const dataCalibracao = document.getElementById('gerDataCalibracao');
    const atividade = document.getElementById('gerAtividade');
    const lote = document.getElementById('gerLote');
    const validade = document.getElementById('gerDataValidade');
    const dataDevolucao = document.getElementById('gerDataDevolucao');
    const dataLiberacao = document.getElementById('gerDataLiberacao');
    const dataDevolucaoReal = document.getElementById('gerDataDevolucaoReal');
    const responsavelRecebimento = document.getElementById('gerResponsavelRecebimento');
    const status = document.getElementById('gerStatus');
    const responsavelLiberacao = document.getElementById('gerResponsavelLiberacao');
    const responsavelDevolucao = document.getElementById('gerResponsavelDevolucao');
    const taxaExposicaoBalde = document.getElementById('gerTaxaExposicaoBalde');
    
    if (dataRecebimento) dataRecebimento.value = item.dataRecebimento || '';
    if (dataCalibracao) dataCalibracao.value = item.dataCalibracao || '';
    if (atividade) atividade.value = item.atividade || '';
    if (lote) lote.value = item.lote || '';
    if (validade) validade.value = item.validade || '';
    if (dataDevolucao) dataDevolucao.value = item.dataDevolucao || '';
    if (dataLiberacao) dataLiberacao.value = item.dataLiberacao || '';
    if (dataDevolucaoReal) dataDevolucaoReal.value = item.dataDevolucaoReal || '';
    if (responsavelRecebimento) responsavelRecebimento.value = item.responsavelRecebimento || '';
    if (status) status.value = item.status || 'aguardando';
    if (responsavelLiberacao) responsavelLiberacao.value = item.responsavelLiberacao || '';
    if (responsavelDevolucao) responsavelDevolucao.value = item.responsavelDevolucao || '';
    if (taxaExposicaoBalde) taxaExposicaoBalde.value = item.taxaExposicaoBalde || '';
    
    const btn = document.getElementById('btnRegistrarGerador');
    
    if (btn) {
        btn.textContent = '🔄 Atualizar Gerador';
        btn.dataset.editando = id;
        btn.style.background = 'linear-gradient(135deg, #00d2ff, #3a7bd5)';
        btn.style.color = '#fff';
        btn.onclick = function() {
            atualizarGerador(id);
        };
        console.log('✅ Botão alterado para "🔄 Atualizar Gerador"');
    } else {
        console.warn('⚠️ Botão não encontrado!');
        const allButtons = document.querySelectorAll('#modalGerador button');
        allButtons.forEach(b => {
            if (b.textContent.includes('Registrar Gerador')) {
                b.textContent = '🔄 Atualizar Gerador';
                b.dataset.editando = id;
                b.style.background = 'linear-gradient(135deg, #00d2ff, #3a7bd5)';
                b.style.color = '#fff';
                b.onclick = function() {
                    atualizarGerador(id);
                };
                console.log('✅ Botão alterado (fallback)');
            }
        });
    }
    
    const formGerador = document.getElementById('formGerador');
    if (formGerador) {
        formGerador.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    }
    
    if (lote) {
        lote.style.borderColor = '#00d2ff';
        lote.style.boxShadow = '0 0 20px rgba(0, 210, 255, 0.2)';
        setTimeout(() => {
            lote.style.borderColor = '';
            lote.style.boxShadow = '';
        }, 3000);
    }
    
    mostrarFeedbackGerador(`✏️ Editando gerador ${item.lote || ''}...`, 'info');
}

// ============================================================
// ===== ATUALIZAR GERADOR =====
// ============================================================

async function atualizarGerador(id) {
    console.log('🔄 Atualizando gerador...', id);
    
    const dataRecebimento = document.getElementById('gerDataRecebimento')?.value || '';
    const dataCalibracao = document.getElementById('gerDataCalibracao')?.value || '';
    const atividade = document.getElementById('gerAtividade')?.value || '';
    const lote = document.getElementById('gerLote')?.value.trim() || '';
    const validade = document.getElementById('gerDataValidade')?.value || '';
    const dataDevolucao = document.getElementById('gerDataDevolucao')?.value || '';
    const dataLiberacao = document.getElementById('gerDataLiberacao')?.value || '';
    const dataDevolucaoReal = document.getElementById('gerDataDevolucaoReal')?.value || '';
    const responsavelRecebimento = document.getElementById('gerResponsavelRecebimento')?.value.trim() || '';
    const status = document.getElementById('gerStatus')?.value || 'aguardando';
    const responsavelLiberacao = document.getElementById('gerResponsavelLiberacao')?.value.trim() || '';
    const responsavelDevolucao = document.getElementById('gerResponsavelDevolucao')?.value.trim() || '';
    const taxaExposicaoBalde = document.getElementById('gerTaxaExposicaoBalde')?.value || '';
    
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
    
    const index = registrosGerador.findIndex(r => r.id === id);
    if (index === -1) {
        mostrarFeedbackGerador('❌ Registro não encontrado!', 'erro');
        resetarBotaoGerador();
        return;
    }
    
    registrosGerador[index] = {
        ...registrosGerador[index],
        dataRecebimento,
        dataCalibracao,
        atividade,
        lote,
        validade,
        dataDevolucao,
        dataLiberacao,
        dataDevolucaoReal,
        responsavelRecebimento,
        status,
        responsavelLiberacao,
        responsavelDevolucao,
        taxaExposicaoBalde,
        dataAtualizacao: new Date().toISOString()
    };
    
    salvarGeradores();
    atualizarHistoricoGeradorComPaginacao();
    atualizarTabelaGeradorHistorico();
    atualizarContadoresGerador();
    
    try {
        if (typeof atualizarGeradorNaNuvem === 'function') {
            await atualizarGeradorNaNuvem(registrosGerador[index]);
            console.log('✅ Gerador atualizado na nuvem com sucesso!');
        } else {
            console.warn('⚠️ Função atualizarGeradorNaNuvem não disponível');
        }
    } catch (error) {
        console.error('❌ Erro ao atualizar na nuvem:', error);
        mostrarFeedbackGerador('⚠️ Atualizado localmente, mas erro na nuvem', 'aviso');
    }
    
    resetarBotaoGerador();
    limparCamposGerador();
    
    if (typeof invalidarCacheGeradores === 'function') {
        invalidarCacheGeradores();
    }
    
    mostrarFeedbackGerador(`✅ Gerador ${lote} atualizado com sucesso!`, 'success');
}

// ============================================================
// ===== CANCELAR EDIÇÃO =====
// ============================================================

function cancelarEdicaoGerador() {
    console.log('✏️ Cancelando edição...');
    resetarBotaoGerador();
    limparCamposGerador();
    mostrarFeedbackGerador('✏️ Edição cancelada', 'info');
}

// ============================================================
// ===== ATUALIZAR GERADOR NA NUVEM =====
// ============================================================

async function atualizarGeradorNaNuvem(item) {
    console.log('☁️ Iniciando atualização na nuvem...', item);
    
    try {
        const userData = await obterDadosUsuario();
        console.log('👤 Dados do usuário:', userData);
        
        if (!userData || !userData.organizacao) {
            console.warn('⚠️ Usuário não logado ou sem organização. Apenas atualizado localmente.');
            return;
        }
        
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            throw new Error('Firestore não está disponível');
        }
        
        const db = firebase.firestore();
        const orgGeradoresRef = db.collection('organizacoes')
            .doc(userData.organizacao)
            .collection('geradores');
        
        console.log(`🔍 Buscando documento com lote: ${item.lote}`);
        
        const snapshot = await orgGeradoresRef
            .where('lote', '==', item.lote)
            .limit(1)
            .get();
        
        console.log(`📄 Documentos encontrados: ${snapshot.size}`);
        
        if (!snapshot.empty) {
            const docRef = snapshot.docs[0].ref;
            const data = snapshot.docs[0].data();
            const registros = data.registros || [];
            
            const idx = registros.findIndex(r => r.id === item.id);
            console.log(`🔍 Registro encontrado no índice: ${idx}`);
            
            if (idx !== -1) {
                registros[idx] = item;
                await docRef.update({
                    registros: registros,
                    ultimaAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log(`✅ Gerador ${item.id} atualizado na nuvem com sucesso!`);
            } else {
                console.warn(`⚠️ Registro ${item.id} não encontrado no documento da nuvem`);
            }
        } else {
            console.warn(`⚠️ Nenhum documento encontrado na nuvem para o lote: ${item.lote}`);
            console.log('📌 Criando novo documento na nuvem...');
            
            await orgGeradoresRef.add({
                registros: [item],
                organizacao: userData.organizacao,
                lote: item.lote,
                criadoPor: userData.uid,
                criadoPorEmail: userData.email,
                criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
                ultimaAtualizacao: firebase.firestore.FieldValue.serverTimestamp(),
                total: 1
            });
            console.log(`✅ Novo documento criado na nuvem para o lote: ${item.lote}`);
        }
        
    } catch (error) {
        console.error('❌ Erro ao atualizar na nuvem:', error);
        throw error;
    }
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
                <td colspan="15" style="text-align: center; padding: 40px; color: #888;">
                    🔍 Nenhum registro encontrado no período selecionado.
                </td>
            </tr>
        `;
        atualizarInfoFiltroGerador(dataInicio, dataFim);
        return;
    }
    
    let html = '';
    filtrados.sort((a, b) => new Date(b.dataRecebimento) - new Date(a.dataRecebimento));
    
    filtrados.forEach((item, index) => {
        const statusInfo = getStatusInfo(item.status);
        html += `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td style="padding: 10px; text-align: center;">${index + 1}</td>
                <td style="padding: 10px;">${formatarDataBR(item.dataRecebimento)}</td>
                <td style="padding: 10px;">${formatarDataHoraBR(item.dataCalibracao)}</td>
                <td style="padding: 10px; font-weight: 600; color: #00d2ff;">${item.atividade || '-'}</td>
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
                <td style="padding: 10px;">${item.dataLiberacao ? formatarDataBR(item.dataLiberacao) : '-'}</td>
                <td style="padding: 10px; font-size: 0.8rem;">${item.responsavelDevolucao || '-'}</td>
                <td style="padding: 10px;">${item.dataDevolucaoReal ? formatarDataBR(item.dataDevolucaoReal) : '-'}</td>
                <td style="padding: 10px; font-size: 0.8rem; color: #ff6b6b;">${item.taxaExposicaoBalde ? item.taxaExposicaoBalde + ' cpm' : '-'}</td>
                <td style="padding: 10px; text-align: center; white-space: nowrap;">
                    <button onclick="editarGerador(${item.id})" style="
                        background: rgba(0, 210, 255, 0.15);
                        border: 1px solid rgba(0, 210, 255, 0.2);
                        color: #00d2ff;
                        padding: 4px 10px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 0.7rem;
                        transition: 0.3s;
                        margin-right: 4px;
                    " onmouseover="this.style.background='rgba(0,210,255,0.25)'" onmouseout="this.style.background='rgba(0,210,255,0.15)'" title="Editar registro">
                        ✏️
                    </button>
                    <button onclick="removerGerador(${item.id})" style="
                        background: rgba(255,107,107,0.15);
                        border: 1px solid rgba(255,107,107,0.2);
                        color: #ff6b6b;
                        padding: 4px 10px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 0.7rem;
                        transition: 0.3s;
                    " onmouseover="this.style.background='rgba(255,107,107,0.25)'" onmouseout="this.style.background='rgba(255,107,107,0.15)'" title="Remover registro (local + nuvem se for admin)">
                        🗑️
                    </button>
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
            'Atividade (mCi)': item.atividade || '-',
            'Lote': item.lote,
            'Validade': formatarDataBR(item.validade),
            'Data Devolução Prevista': item.dataDevolucao ? formatarDataBR(item.dataDevolucao) : '-',
            'Data Liberação': item.dataLiberacao ? formatarDataBR(item.dataLiberacao) : '-',
            'Data Devolução Real': item.dataDevolucaoReal ? formatarDataBR(item.dataDevolucaoReal) : '-',
            'Responsável Recebimento': item.responsavelRecebimento || '-',
            'Status': getStatusInfo(item.status).label,
            'Responsável Liberação': item.responsavelLiberacao || '-',
            'Responsável Devolução': item.responsavelDevolucao || '-',
            'Contaminação Balde (cpm)': item.taxaExposicaoBalde || '-'
        }));
        
        if (typeof XLSX === 'undefined') {
            mostrarFeedbackGerador('❌ Biblioteca XLSX não carregada.', 'erro');
            return;
        }
        
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(dados);
        const colWidths = [
            { wch: 18 }, { wch: 20 }, { wch: 15 }, { wch: 15 },
            { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
            { wch: 25 }, { wch: 20 }, { wch: 25 }, { wch: 25 },
            { wch: 20 }
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

async function limparHistoricoGerador() {
    if (!confirm('⚠️ Tem certeza que deseja limpar TODO o histórico de geradores localmente? Esta ação NÃO afeta a nuvem.')) return;
    
    registrosGerador = [];
    geradorIdCounter = 0;
    salvarGeradores();
    atualizarHistoricoGeradorComPaginacao();
    atualizarTabelaGeradorHistorico();
    atualizarContadoresGerador();
    mostrarFeedbackGerador('🗑️ Histórico de geradores limpo localmente!', 'info');
    
    const userData = await obterDadosUsuario();
    if (userData && userData.role === 'admin') {
        const confirmarNuvem = confirm('☁️ Você é ADMIN. Deseja também limpar os dados da nuvem?');
        if (confirmarNuvem) {
            await limparGeradoresDaNuvem([]);
            mostrarFeedbackGerador('✅ Histórico limpo localmente e na nuvem!', 'success');
        } else {
            mostrarFeedbackGerador('✅ Histórico limpo localmente. Dados da nuvem mantidos.', 'info');
        }
    } else {
        mostrarFeedbackGerador('✅ Histórico limpo localmente. Apenas administradores podem limpar a nuvem.', 'info');
    }
}

// ============================================================
// ===== LIMPAR GERADORES DA NUVEM =====
// ============================================================

async function limparGeradoresDaNuvem(registros) {
    console.log('☁️ Limpando todos os geradores da nuvem...');
    
    const userData = await obterDadosUsuario();
    if (!userData || !userData.organizacao) {
        console.warn('⚠️ Usuário não logado ou sem organização. Apenas removido localmente.');
        return;
    }
    
    try {
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            throw new Error('Firestore não está disponível');
        }
        
        const db = firebase.firestore();
        const orgGeradoresRef = db.collection('organizacoes')
            .doc(userData.organizacao)
            .collection('geradores');
        
        const snapshot = await orgGeradoresRef.get();
        
        if (snapshot.empty) {
            console.log('ℹ️ Nenhum documento encontrado na nuvem.');
            return;
        }
        
        for (const doc of snapshot.docs) {
            await doc.ref.delete();
            console.log(`🗑️ Documento removido: ${doc.id}`);
        }
        
        localStorage.removeItem('radiocalc_geradores_nuvem_backup');
        
        console.log('✅ Todos os geradores removidos da nuvem!');
        mostrarFeedbackGerador('✅ Histórico também limpo na nuvem!', 'success');
        
    } catch (error) {
        console.error('❌ Erro ao limpar geradores da nuvem:', error);
        throw error;
    }
}

// ============================================================
// ===== FECHAR COM ESC =====
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
// ===== PAGINAÇÃO DO HISTÓRICO =====
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
    
    // 🔥 USA CONSTANTE RENOMEADA
    const totalPaginas = Math.ceil(registros.length / ITENS_POR_PAGINA_HISTORICO_GERADOR);
    
    if (paginaAtualHistoricoGerador > totalPaginas) {
        paginaAtualHistoricoGerador = totalPaginas;
    }
    if (paginaAtualHistoricoGerador < 1) {
        paginaAtualHistoricoGerador = 1;
    }
    
    // 🔥 USA CONSTANTE RENOMEADA
    const inicio = (paginaAtualHistoricoGerador - 1) * ITENS_POR_PAGINA_HISTORICO_GERADOR;
    const fim = Math.min(inicio + ITENS_POR_PAGINA_HISTORICO_GERADOR, registros.length);
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
    // 🔥 USA CONSTANTE RENOMEADA
    const totalPaginas = Math.ceil(registros.length / ITENS_POR_PAGINA_HISTORICO_GERADOR);
    
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
// ===== CACHE PARA REDUZIR LEITURAS =====
// ============================================================

let cacheGeradores = {
    dados: null,
    timestamp: null,
    organizacao: null,
    TTL: 60000
};

async function carregarGeradoresDaNuvemComCache(forceRefresh = false) {
    console.log('☁️ Carregando geradores da nuvem (com cache)...');
    
    const userData = await obterDadosUsuario();
    if (!userData || !userData.organizacao) {
        mostrarFeedbackGerador('⚠️ Faça login para carregar da nuvem!', 'aviso');
        return;
    }
    
    const agora = Date.now();
    if (!forceRefresh && 
        cacheGeradores.dados !== null && 
        cacheGeradores.organizacao === userData.organizacao &&
        (agora - cacheGeradores.timestamp) < cacheGeradores.TTL) {
        
        console.log('📦 Usando cache - evitando leitura desnecessária');
        registrosGerador = cacheGeradores.dados;
        geradorIdCounter = registrosGerador.length > 0 
            ? Math.max(...registrosGerador.map(item => item.id || 0)) + 1 
            : 0;
        salvarGeradores();
        atualizarTabelaGeradorHistorico();
        atualizarContadoresGerador();
        mostrarFeedbackGerador(`✅ ${registrosGerador.length} geradores carregados (cache)`, 'success');
        return;
    }
    
    try {
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            throw new Error('Firestore não está disponível');
        }
        
        const db = firebase.firestore();
        const orgGeradoresRef = db.collection('organizacoes')
            .doc(userData.organizacao)
            .collection('geradores');
        
        const snapshot = await orgGeradoresRef.get();
        let todosRegistros = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.registros && data.registros.length > 0) {
                todosRegistros = todosRegistros.concat(data.registros);
            }
        });
        
        if (todosRegistros.length > 0) {
            registrosGerador = todosRegistros;
            
            cacheGeradores.dados = todosRegistros;
            cacheGeradores.timestamp = agora;
            cacheGeradores.organizacao = userData.organizacao;
            
            geradorIdCounter = registrosGerador.length > 0 
                ? Math.max(...registrosGerador.map(item => item.id || 0)) + 1 
                : 0;
            
            salvarGeradores();
            atualizarTabelaGeradorHistorico();
            atualizarContadoresGerador();
            mostrarFeedbackGerador(`✅ ${registrosGerador.length} geradores carregados da nuvem!`, 'success');
        } else {
            mostrarFeedbackGerador('ℹ️ Nenhum gerador encontrado na nuvem.', 'info');
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar geradores da nuvem:', error);
        mostrarFeedbackGerador('❌ Erro ao carregar da nuvem.', 'erro');
    }
}

function invalidarCacheGeradores() {
    cacheGeradores.dados = null;
    cacheGeradores.timestamp = null;
    cacheGeradores.organizacao = null;
    console.log('🔄 Cache de geradores invalidado');
}

// ============================================================
// ===== EXPORTAR FUNÇÕES =====
// ============================================================

window.abrirModalGerador = abrirModalGerador;
window.fecharModalGerador = fecharModalGerador;
window.registrarGerador = registrarGerador;
window.editarGerador = editarGerador;
window.atualizarGerador = atualizarGerador;
window.atualizarGeradorNaNuvem = atualizarGeradorNaNuvem;
window.removerGerador = removerGerador;
window.removerGeradorDaNuvem = removerGeradorDaNuvem;
window.limparGeradoresDaNuvem = limparGeradoresDaNuvem;
window.carregarGeradoresDaNuvem = carregarGeradoresDaNuvemComCache;
window.invalidarCacheGeradores = invalidarCacheGeradores;
window.resetarBotaoGerador = resetarBotaoGerador;
window.cancelarEdicaoGerador = cancelarEdicaoGerador;
window.verificarAdminGerador = verificarAdminGerador;
window.aplicarFiltroGeradorModal = aplicarFiltroGeradorModal;
window.limparFiltroGeradorModal = limparFiltroGeradorModal;
window.exportarExcelGeradoresModal = exportarExcelGeradoresModal;
window.limparHistoricoGerador = limparHistoricoGerador;
window.verDetalhesGerador = verDetalhesGerador;

console.log('✅ Módulo de Gerador (v6) carregado com sucesso!');
console.log('📦 Funções disponíveis:');
console.log('  - abrirModalGerador()');
console.log('  - fecharModalGerador()');
console.log('  - registrarGerador()');
console.log('  - editarGerador(id)');
console.log('  - atualizarGerador(id)');
console.log('  - removerGerador(id)');
console.log('  - resetarBotaoGerador()');
console.log('  - cancelarEdicaoGerador()');
console.log('  - verificarAdminGerador()');
console.log('  - exportarExcelGeradoresModal()');
console.log('  - limparHistoricoGerador()');
console.log('  - aplicarFiltroGeradorModal()');
console.log('  - limparFiltroGeradorModal()');
console.log('  - carregarGeradoresDaNuvem() (com cache)');
console.log('  - invalidarCacheGeradores()');
console.log('📌 Campos: atividade, dataLiberacao e dataDevolucaoReal');