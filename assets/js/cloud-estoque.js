// assets/js/cloud-estoque.js
// ============================================
// ☁️ SALVAMENTO EM NUVEM - ESTOQUE
// ============================================

// Inicializar Firestore (se não existir)
let dbEstoque = null;

// Aguarda o Firebase carregar (VERSÃO MELHORADA)
function inicializarFirestore() {
    return new Promise((resolve) => {
        // 🔥 Verifica se o Firebase já está disponível
        if (typeof firebase !== 'undefined' && firebase.firestore) {
            dbEstoque = firebase.firestore();
            console.log('✅ Firestore inicializado para Estoque');
            resolve(true);
            return;
        }

        // 🔥 Se não, aguarda carregar com tentativas
        let tentativas = 0;
        const maxTentativas = 30; // 15 segundos
        
        console.log('⏳ Aguardando Firebase carregar...');
        
        const checkFirebase = setInterval(() => {
            tentativas++;
            
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                dbEstoque = firebase.firestore();
                clearInterval(checkFirebase);
                console.log('✅ Firestore inicializado após ' + tentativas + ' tentativas');
                resolve(true);
            } else if (tentativas >= maxTentativas) {
                clearInterval(checkFirebase);
                console.error('❌ Timeout: Firebase não carregou após ' + maxTentativas + ' tentativas');
                console.error('Verifique se as bibliotecas do Firebase estão carregadas no HTML');
                resolve(false);
            }
        }, 500);
    });
}

// ============================================
// 🔑 VERIFICAÇÕES DE PERMISSÃO
// ============================================

/**
 * Verifica se o usuário atual é administrador
 */
async function verificarAdmin() {
    try {
        const user = firebase.auth().currentUser;
        if (!user) return false;
        
        if (!dbEstoque) {
            await inicializarFirestore();
        }
        
        const doc = await dbEstoque.collection('usuarios')
            .doc(user.uid)
            .get();
        
        return doc.data()?.role === 'admin';
    } catch (error) {
        console.error('❌ Erro ao verificar admin:', error);
        return false;
    }
}

/**
 * Verifica se o usuário está logado e tem organização
 */
async function verificarUsuarioLogado() {
    try {
        const user = firebase.auth().currentUser;
        if (!user) return null;
        
        if (!dbEstoque) {
            await inicializarFirestore();
        }
        
        const doc = await dbEstoque.collection('usuarios')
            .doc(user.uid)
            .get();
        
        return {
            uid: user.uid,
            email: user.email,
            organizacao: doc.data()?.organizacao || null,
            role: doc.data()?.role || 'tecnico'
        };
    } catch (error) {
        console.error('❌ Erro ao verificar usuário:', error);
        return null;
    }
}

// ============================================
// 🔑 CACHE DE ADMIN (evita consultas repetidas)
// ============================================

let _cacheIsAdmin = null;      // null = não verificado, true/false = resultado
let _cacheIsAdminExpira = 0;   // timestamp de expiração

/**
 * Verifica se é admin COM CACHE (válido por 5 minutos)
 */
async function verificarAdminComCache() {
    const agora = Date.now();
    
    // Se o cache ainda é válido, retorna
    if (_cacheIsAdmin !== null && agora < _cacheIsAdminExpira) {
        return _cacheIsAdmin;
    }
    
    // Senão, consulta e atualiza o cache
    _cacheIsAdmin = await verificarAdmin();
    _cacheIsAdminExpira = agora + (5 * 60 * 1000); // 5 minutos
    return _cacheIsAdmin;
}

/**
 * Invalida o cache (chamar ao fazer logout ou trocar de usuário)
 */
function invalidarCacheAdmin() {
    _cacheIsAdmin = null;
    _cacheIsAdminExpira = 0;
    console.log('🔄 Cache de admin invalidado');
}

async function atualizarVisibilidadeCardCustos() {
    const cardCustos = document.querySelector('.tool-card[onclick="abrirModalCustos()"]');
    if (!cardCustos) return;

    const isAdmin = await verificarAdminComCache();
    cardCustos.style.display = isAdmin ? '' : 'none';
    console.log(isAdmin ? '👑 Card de custos liberado para administrador' : '👤 Card de custos oculto para usuário comum');
}

// ============================================
// 💾 SALVAR ESTOQUE (VERSÃO CORRIGIDA)
// ============================================

/**
 * Salva os dados do estoque no Firestore (ORGANIZAÇÃO)
 * 🔥 CORRIGIDO: Salva item por item, não sobrescreve
 */
async function salvarEstoqueNaNuvem() {
    try {
        if (typeof firebase === 'undefined' || !firebase.auth) {
            mostrarToastEstoque('⚠️ Firebase não inicializado', 'erro');
            return;
        }
        
        const userInfo = await verificarUsuarioLogado();
        if (!userInfo) {
            mostrarToastEstoque('⚠️ Faça login para salvar na nuvem', 'erro');
            return;
        }
        if (!userInfo.organizacao) {
            mostrarToastEstoque('⚠️ Usuário não vinculado a uma organização', 'erro');
            return;
        }
        if (!dbEstoque) await inicializarFirestore();
        if (!dbEstoque) {
            mostrarToastEstoque('⚠️ Não foi possível conectar ao Firestore', 'erro');
            return;
        }

        mostrarToastEstoque('💾 Salvando estoque na nuvem...', 'carregando');

        // ===== 1) SALVAR SALDO ATUAL =====
        const dadosEstoque = coletarDadosEstoque();
        const estoqueRef = dbEstoque.collection('organizacoes')
            .doc(userInfo.organizacao)
            .collection('estoque');

        let salvos = 0;
        let erros = 0;

        for (const item of dadosEstoque) {
            try {
                const querySnapshot = await estoqueRef
                    .where('tipoKit', '==', item.kit)
                    .where('lote', '==', item.lote)
                    .where('validade', '==', item.validade)
                    .get();

                const dadosItem = {
                    tipoKit: item.kit,
                    lote: item.lote,
                    validade: item.validade,
                    entrada: parseInt(item.entrada) || 0,
                    saida: parseInt(item.saida) || 0,
                    saldo: parseInt(item.saldo) || 0,
                    observacao: item.observacao || '',
                    ultimaMovimentacao: new Date().toISOString(),
                    atualizadoPor: userInfo.uid,
                    atualizadoPorEmail: userInfo.email,
                    atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
                };

                if (!querySnapshot.empty) {
                    await querySnapshot.docs[0].ref.update(dadosItem);
                } else {
                    dadosItem.criadoPor = userInfo.uid;
                    dadosItem.criadoPorEmail = userInfo.email;
                    dadosItem.criadoEm = firebase.firestore.FieldValue.serverTimestamp();
                    await estoqueRef.add(dadosItem);
                }
                salvos++;
            } catch (error) {
                console.error('❌ Erro ao salvar item:', error);
                erros++;
            }
        }

        // ===== 2) SALVAR HISTÓRICO DE MOVIMENTAÇÕES =====
        let historicoSalvos = 0;
        if (typeof historicoMovimentacoes !== 'undefined' && historicoMovimentacoes.length > 0) {
            const historicoRef = dbEstoque.collection('organizacoes')
                .doc(userInfo.organizacao)
                .collection('estoque_historico');

            for (const evento of historicoMovimentacoes) {
                try {
                    // Usa um ID determinístico para evitar duplicatas
                    const docId = `mov_${evento.id}`;
                    await historicoRef.doc(docId).set({
                        ...evento,
                        organizacao: userInfo.organizacao,
                        registradoPor: userInfo.uid,
                        registradoPorEmail: userInfo.email,
                        sincronizadoEm: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                    historicoSalvos++;
                } catch (error) {
                    console.error('❌ Erro ao salvar evento histórico:', error);
                }
            }
        }

        // ===== 3) SALVAR RESUMO =====
        if (salvos > 0) {
            const resumoRef = estoqueRef.doc('_resumo');
            const totalFrascos = dadosEstoque.reduce((sum, item) => sum + parseInt(item.saldo || 0), 0);
            await resumoRef.set({
                totalItens: salvos,
                totalFrascos: totalFrascos,
                totalEventosHistorico: historicoSalvos,
                ultimaAtualizacao: firebase.firestore.FieldValue.serverTimestamp(),
                atualizadoPor: userInfo.uid,
                atualizadoPorEmail: userInfo.email
            }, { merge: true });
        }

        console.log(`✅ Estoque: ${salvos} itens, ${erros} erros`);
        console.log(`✅ Histórico: ${historicoSalvos} eventos`);
        
        if (erros > 0) {
            mostrarToastEstoque(`⚠️ ${salvos} itens salvos, ${erros} erros!`, 'aviso');
        } else {
            mostrarToastEstoque(`✅ ${salvos} itens + ${historicoSalvos} eventos salvos!`, 'sucesso');
        }
        
        atualizarIndicadorEstoqueNuvem(true);

    } catch (error) {
        console.error('❌ Erro ao salvar estoque:', error);
        mostrarToastEstoque('❌ Erro ao salvar: ' + error.message, 'erro');
    }
}

// ============================================
// 📊 COLETAR DADOS DO ESTOQUE
// ============================================

/**
 * Coleta os dados do estoque do array global `estoqueItens`
 * 🔥 CORRIGIDO: Usa o array em vez da tabela HTML
 */
function coletarDadosEstoque() {
    // 🔥 PRIORIDADE 1: Usar o array global (mais confiável)
    if (typeof estoqueItens !== 'undefined' && estoqueItens.length > 0) {
        console.log('📊 Coletando dados do array estoqueItens:', estoqueItens.length, 'itens');
        return estoqueItens.map(item => ({
            kit: item.tipoKit || item.kit || '',
            lote: item.lote || '',
            validade: item.validade || '',
            entrada: parseInt(item.entrada) || 0,
            saida: parseInt(item.saida) || 0,
            saldo: parseInt(item.saldo) || 0,
            observacao: item.observacao || ''
        }));
    }

    // 🔥 FALLBACK: Coletar da tabela HTML
    console.log('📊 Fallback: coletando dados da tabela HTML');
    const itens = [];
    const linhas = document.querySelectorAll('#corpoEstoque tr');
    
    linhas.forEach(row => {
        const cols = row.querySelectorAll('td');
        if (cols.length > 5 && cols[0]?.textContent !== 'Nenhum item cadastrado.') {
            itens.push({
                kit: cols[1]?.textContent?.trim() || '',
                lote: cols[2]?.textContent?.trim() || '',
                validade: cols[3]?.textContent?.trim() || '',
                entrada: parseInt(cols[4]?.textContent?.trim()) || 0,
                saida: parseInt(cols[5]?.textContent?.trim()) || 0,
                saldo: parseInt(cols[6]?.textContent?.trim()) || 0,
                status: cols[7]?.textContent?.trim() || '',
                observacao: cols[8]?.textContent?.trim() || ''
            });
        }
    });
    
    return itens;
}

// ============================================
// 📥 CARREGAR ESTOQUE (VERSÃO CORRIGIDA - COM KIT)
// ============================================

/**
 * Carrega os dados do estoque do Firestore
 * 🔥 CORRIGIDO: Carrega TODOS os itens da coleção com o nome do kit correto
 */
async function carregarEstoqueDaNuvem() {
    try {
        const userInfo = await verificarUsuarioLogado();
        if (!userInfo) {
            mostrarToastEstoque('⚠️ Faça login para carregar dados', 'erro');
            return;
        }
        if (!userInfo.organizacao) {
            mostrarToastEstoque('⚠️ Usuário não vinculado a uma organização', 'erro');
            return;
        }
        if (!dbEstoque) await inicializarFirestore();
        if (!dbEstoque) {
            mostrarToastEstoque('⚠️ Não foi possível conectar ao Firestore', 'erro');
            return;
        }

        mostrarToastEstoque(`📥 Carregando estoque...`, 'carregando');

        // ===== 1) CARREGAR SALDO ATUAL =====
        const estoqueRef = dbEstoque.collection('organizacoes')
            .doc(userInfo.organizacao)
            .collection('estoque');

        const snapshot = await estoqueRef.get();
        const itens = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            if (doc.id === '_resumo') return;
            const nomeKit = data.tipoKit || data.kit || '';
            itens.push({
                firebaseId: doc.id,
                tipoKit: nomeKit,
                kit: nomeKit,
                lote: data.lote || '',
                validade: data.validade || '',
                entrada: data.entrada || 0,
                saida: data.saida || 0,
                saldo: data.saldo || 0,
                observacao: data.observacao || '',
                status: data.status || '',
                dataCadastro: data.criadoEm || '',
                ultimaMovimentacao: data.ultimaMovimentacao || ''
            });
        });

        // ===== 2) CARREGAR HISTÓRICO =====
        const historicoRef = dbEstoque.collection('organizacoes')
            .doc(userInfo.organizacao)
            .collection('estoque_historico');

        const historicoSnapshot = await historicoRef.get();
        const eventos = [];

        historicoSnapshot.forEach(doc => {
            const data = doc.data();
            eventos.push({
                id: data.id || 0,
                timestamp: data.timestamp || '',
                dataHora: data.dataHora || '',
                tipoMovimento: data.tipoMovimento || '',
                tipoKit: data.tipoKit || '',
                lote: data.lote || '',
                validade: data.validade || '',
                quantidade: data.quantidade || 0,
                responsavel: data.responsavel || '',
                observacao: data.observacao || '',
                dataEntrada: data.dataEntrada || null,
                dataSaida: data.dataSaida || null,
                motivo: data.motivo || ''
            });
        });

        // ===== 3) ATUALIZAR ARRAYS GLOBAIS =====
        if (itens.length > 0) {
            if (typeof estoqueItens !== 'undefined') {
                estoqueItens = itens;
            }
            await preencherEstoqueNaInterface(itens);
            atualizarIndicadorEstoqueNuvem(true);
        }

        if (eventos.length > 0) {
            if (typeof historicoMovimentacoes !== 'undefined') {
                historicoMovimentacoes = eventos;
                historicoMovimentacoes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                if (typeof historicoIdCounter !== 'undefined') {
                    historicoIdCounter = Math.max(...eventos.map(e => e.id || 0)) + 1;
                }
                if (typeof atualizarTabelaHistorico === 'function') {
                    atualizarTabelaHistorico();
                }
            }
        }

        mostrarToastEstoque(
            `✅ ${itens.length} itens + ${eventos.length} eventos carregados!`,
            'sucesso'
        );

    } catch (error) {
        console.error('❌ Erro ao carregar estoque:', error);
        mostrarToastEstoque('❌ Erro ao carregar: ' + error.message, 'erro');
    }
}

// ============================================
// 📥 CARREGAR HISTÓRICO DA NUVEM POR PERÍODO
// ============================================
async function carregarHistoricoDaNuvemPorPeriodo() {
    try {
        const userInfo = await verificarUsuarioLogado();
        if (!userInfo || !userInfo.organizacao) {
            mostrarToastEstoque('⚠️ Faça login para carregar dados', 'erro');
            return;
        }
        if (!dbEstoque) await inicializarFirestore();
        if (!dbEstoque) {
            mostrarToastEstoque('⚠️ Não foi possível conectar ao Firestore', 'erro');
            return;
        }

        // Descobre o período ativo
        const inputIni = document.getElementById('filtroDataInicioHistorico');
        const inputFim = document.getElementById('filtroDataFimHistorico');
        
        let dataInicio, dataFim;
        
        if (inputIni && inputIni.value) {
            dataInicio = new Date(inputIni.value + 'T00:00:00');
        } else {
            dataInicio = new Date();
            dataInicio.setDate(dataInicio.getDate() - 180);
        }
        
        if (inputFim && inputFim.value) {
            dataFim = new Date(inputFim.value + 'T23:59:59');
        } else {
            dataFim = new Date();
        }

        mostrarToastEstoque(
            `📥 Carregando eventos de ${dataInicio.toLocaleDateString('pt-BR')} até ${dataFim.toLocaleDateString('pt-BR')}...`,
            'carregando'
        );

        // Query com filtro de período
        const LIMITE_MAXIMO = 5000;
        const historicoRef = dbEstoque.collection('organizacoes')
            .doc(userInfo.organizacao)
            .collection('estoque_historico')
            .where('timestamp', '>=', dataInicio.toISOString())
            .where('timestamp', '<=', dataFim.toISOString())
            .orderBy('timestamp', 'desc')
            .limit(LIMITE_MAXIMO);

        const snapshot = await historicoRef.get();
        const eventos = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            eventos.push({
                id: data.id || 0,
                timestamp: data.timestamp || '',
                dataHora: data.dataHora || '',
                tipoMovimento: data.tipoMovimento || '',
                tipoKit: data.tipoKit || '',
                lote: data.lote || '',
                validade: data.validade || '',
                quantidade: data.quantidade || 0,
                responsavel: data.responsavel || '',
                observacao: data.observacao || '',
                dataEntrada: data.dataEntrada || null,
                dataSaida: data.dataSaida || null,
                motivo: data.motivo || ''
            });
        });

        // MERGE: junta com eventos locais sem duplicar (pelo id)
        if (typeof historicoMovimentacoes !== 'undefined') {
            const idsExistentes = new Set(historicoMovimentacoes.map(h => h.id));
            const novosEventos = eventos.filter(e => !idsExistentes.has(e.id));
            
            historicoMovimentacoes = [...historicoMovimentacoes, ...novosEventos];
            historicoMovimentacoes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            if (typeof historicoIdCounter !== 'undefined' && eventos.length > 0) {
                historicoIdCounter = Math.max(
                    historicoIdCounter,
                    ...eventos.map(e => (e.id || 0) + 1)
                );
            }
            
            if (typeof salvarEstoque === 'function') salvarEstoque();
            
            console.log(`✅ ${novosEventos.length} novos eventos (${eventos.length - novosEventos.length} já existiam)`);
        }

        if (typeof atualizarTabelaHistorico === 'function') {
            if (typeof paginaAtualHistorico !== 'undefined') paginaAtualHistorico = 1;
            atualizarTabelaHistorico();
        }

        mostrarToastEstoque(
            `✅ ${eventos.length} evento(s) carregado(s)! ${eventos.length === LIMITE_MAXIMO ? '(limite atingido — refine o período)' : ''}`,
            'sucesso'
        );

    } catch (error) {
        console.error('❌ Erro ao carregar histórico:', error);
        
        let msg = '❌ Erro ao carregar: ' + error.message;
        if (error.code === 'permission-denied') {
            msg = '🔒 Permissão negada! Verifique suas regras do Firestore.';
        } else if (error.code === 'failed-precondition') {
            msg = '⚠️ Falta um índice no Firestore. Clique no link do console para criar.';
        }
        mostrarToastEstoque(msg, 'erro');
    }
}

// ============================================
// 🔍 VERIFICAR ESTOQUE NA NUVEM (CORRIGIDO)
// ============================================

/**
 * Verifica se o usuário tem estoque salvo na organização
 * 🔥 CORRIGIDO: Verifica a coleção (NÃO o documento estoque_atual)
 */
async function verificarEstoqueNaNuvem() {
    try {
        const userInfo = await verificarUsuarioLogado();
        if (!userInfo || !userInfo.organizacao) return false;

        if (!dbEstoque) {
            await inicializarFirestore();
        }
        if (!dbEstoque) return false;

        // 🔥 Verificar se existe algum item na coleção
        const estoqueRef = dbEstoque.collection('organizacoes')
            .doc(userInfo.organizacao)
            .collection('estoque');

        const snapshot = await estoqueRef.limit(1).get();
        return !snapshot.empty;

    } catch (error) {
        console.error('❌ Erro ao verificar estoque:', error);
        return false;
    }
}

// ============================================
// 🖥️ PREENCHER TABELA
// ============================================

/**
 * Preenche a tabela de estoque com os dados carregados
 * 🔒 Botões de remover e editar só aparecem para ADMIN
 */
async function preencherEstoqueNaInterface(itens) {
    const tbody = document.getElementById('corpoEstoque');
    if (!tbody) return;

    // Limpa a tabela atual
    tbody.innerHTML = '';

    // Verifica se há itens
    if (!itens || itens.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; padding: 40px; color: #888;">
                    Nenhum item cadastrado.
                </td>
            </tr>
        `;
        atualizarResumoEstoque(itens);
        return;
    }

    // 🔥 Verifica se é admin (APENAS ADMIN VÊ OS BOTÕES!)
    const isAdmin = await verificarAdminComCache();

    // Adiciona cada item
    itens.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
        
        // Determina a cor do status
        let statusColor = '#2ecc71';
        let statusText = '✅ Válido';
        
        if (item.status?.includes('Vencido')) {
            statusColor = '#e74c3c';
            statusText = '❌ Vencido';
        } else if (item.status?.includes('Vence em')) {
            statusColor = '#f1c40f';
            statusText = '⚠️ ' + item.status;
        } else if (item.status?.includes('Estoque baixo')) {
            statusColor = '#e67e22';
            statusText = '⚠️ ' + item.status;
        }

        // 🔒 Botões APENAS para ADMIN
        let botoes = '';
        if (isAdmin) {
            botoes = `
                <button onclick="editarItemEstoque(${index})" style="
                    background: rgba(52,152,219,0.1);
                    border: 1px solid rgba(52,152,219,0.2);
                    color: #3498db;
                    padding: 4px 10px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.7rem;
                    transition: 0.3s;
                    margin-right: 4px;
                " onmouseover="this.style.background='rgba(52,152,219,0.25)'" onmouseout="this.style.background='rgba(52,152,219,0.1)'">
                    ✏️
                </button>
                <button onclick="removerItemEstoque(${index})" style="
                    background: rgba(255,107,107,0.1);
                    border: 1px solid rgba(255,107,107,0.2);
                    color: #ff6b6b;
                    padding: 4px 10px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.7rem;
                    transition: 0.3s;
                " onmouseover="this.style.background='rgba(255,107,107,0.25)'" onmouseout="this.style.background='rgba(255,107,107,0.1)'">
                    🗑️
                </button>
            `;
        } else {
            botoes = `
                <span style="color: #555; font-size: 0.7rem;" title="Apenas administradores podem editar/remover itens">🔒</span>
            `;
        }

        tr.innerHTML = `
            <td style="padding: 10px; color: #888;">${index + 1}</td>
            <td style="padding: 10px; color: #fff;">${item.kit || item.tipoKit || '--'}</td>
            <td style="padding: 10px; color: #aaa;">${item.lote || '--'}</td>
            <td style="padding: 10px; color: #aaa;">${item.validade || '--'}</td>
            <td style="padding: 10px; text-align: center; color: #2ecc71;">${item.entrada || 0}</td>
            <td style="padding: 10px; text-align: center; color: #e74c3c;">${item.saida || 0}</td>
            <td style="padding: 10px; text-align: center; color: #ffd700; font-weight: bold;">${item.saldo || 0}</td>
            <td style="padding: 10px; text-align: center;">
                <span style="color: ${statusColor};">${statusText}</span>
            </td>
            <td style="padding: 10px; color: #888; font-size: 0.8rem;">${item.observacao || ''}</td>
            <td style="padding: 10px; text-align: center;">
                ${botoes}
            </td>
        `;
        
        tbody.appendChild(tr);
    });

    // Atualizar resumo
    atualizarResumoEstoque(itens);
}

// ============================================
// 📊 RESUMO
// ============================================

/**
 * Atualiza os cards de resumo do estoque
 */
function atualizarResumoEstoque(itens) {
    if (!itens) itens = [];
    
    const totalFrascos = itens.reduce((sum, item) => sum + (parseInt(item.saldo) || 0), 0);
    const tipos = new Set(itens.map(item => item.kit)).size;
    const lotes = new Set(itens.map(item => item.lote)).size;
    const alertas = itens.filter(item => 
        item.status?.includes('Vence em') || 
        item.status?.includes('Estoque baixo') ||
        item.status?.includes('Vencido')
    ).length;

    document.getElementById('totalFrascosEstoque').textContent = totalFrascos;
    document.getElementById('totalTiposEstoque').textContent = tipos;
    document.getElementById('totalLotesEstoque').textContent = lotes;
    document.getElementById('totalAlertasEstoque').textContent = alertas;
}

// ============================================
// 🗑️ REMOVER ITEM (APENAS ADMIN) - CORRIGIDO
// ============================================

/**
 * Remove um item do estoque
 * 🔒 APENAS ADMINISTRADORES podem remover
 * 🔥 CORRIGIDO: Remove também do Firestore
 */
async function removerItemEstoque(index) {
    // 🔥 Verifica se é ADMIN (com cache)
    const isAdmin = await verificarAdminComCache();
    
    if (!isAdmin) {
        mostrarToastEstoque('⚠️ Apenas administradores podem remover itens permanentemente do estoque!', 'erro');
        return;
    }
    
    if (!confirm('⚠️ TEM CERTEZA? Esta ação removerá o item permanentemente do estoque da organização.')) return;
    
    try {
        const tbody = document.getElementById('corpoEstoque');
        const rows = tbody.querySelectorAll('tr');
        
        if (!rows[index]) {
            mostrarToastEstoque('❌ Item não encontrado!', 'erro');
            return;
        }

        // 🔥 PEGA O ID DO FIREBASE DO ITEM
        let firebaseId = null;
        
        if (typeof estoqueItens !== 'undefined' && estoqueItens[index]) {
            firebaseId = estoqueItens[index].firebaseId;
        }
        
        if (!firebaseId) {
            firebaseId = rows[index].getAttribute('data-firebase-id');
        }

        // 🔥 REMOVER DO FIRESTORE
        if (firebaseId) {
            const userInfo = await verificarUsuarioLogado();
            if (userInfo && userInfo.organizacao) {
                const estoqueRef = dbEstoque.collection('organizacoes')
                    .doc(userInfo.organizacao)
                    .collection('estoque')
                    .doc(firebaseId);
                
                await estoqueRef.delete();
                console.log('🗑️ Item removido do Firestore:', firebaseId);
            }
        } else {
            const cols = rows[index].querySelectorAll('td');
            const kitNome = cols[1]?.textContent?.trim() || '';
            const lote = cols[2]?.textContent?.trim() || '';
            const validade = cols[3]?.textContent?.trim() || '';
            
            if (kitNome && lote && validade) {
                const userInfo = await verificarUsuarioLogado();
                if (userInfo && userInfo.organizacao) {
                    const estoqueRef = dbEstoque.collection('organizacoes')
                        .doc(userInfo.organizacao)
                        .collection('estoque');
                    
                    const querySnapshot = await estoqueRef
                        .where('tipoKit', '==', kitNome)
                        .where('lote', '==', lote)
                        .where('validade', '==', validade)
                        .get();
                    
                    for (const doc of querySnapshot.docs) {
                        await doc.ref.delete();
                        console.log('🗑️ Item removido do Firestore por query:', doc.id);
                    }
                }
            }
        }

        // 🔥 REMOVER DA TABELA
        rows[index].remove();
        
        // Reorganizar índices
        const remaining = tbody.querySelectorAll('tr');
        remaining.forEach((row, i) => {
            const firstCell = row.querySelector('td');
            if (firstCell) {
                firstCell.textContent = i + 1;
            }
        });

        // 🔥 REMOVER DO ARRAY GLOBAL
        if (typeof estoqueItens !== 'undefined') {
            estoqueItens.splice(index, 1);
            console.log('📊 Item removido do array global. Restam:', estoqueItens.length);
        }
        
        // Atualizar resumo
        const itensAtuais = coletarDadosEstoque();
        atualizarResumoEstoque(itensAtuais);
        
        mostrarToastEstoque('🗑️ Item removido permanentemente do estoque!', 'sucesso');

    } catch (error) {
        console.error('❌ Erro ao remover item:', error);
        mostrarToastEstoque('❌ Erro ao remover: ' + error.message, 'erro');
    }
}

// ============================================
// 🗑️ REMOVER EVENTO DO HISTÓRICO (APENAS ADMIN)
// ============================================

/**
 * Remove um evento do histórico DEFINITIVAMENTE (local + nuvem)
 * 🔒 APENAS ADMINISTRADORES podem excluir
 * 🔥 Remove da coleção estoque_historico no Firestore E do localStorage
 */
async function removerEventoHistoricoNaNuvem(id) {
    try {
        // 1) Verifica se é admin (com cache)
        const isAdmin = await verificarAdminComCache();
        if (!isAdmin) {
            mostrarToastEstoque('⚠️ Apenas administradores podem excluir eventos do histórico!', 'erro');
            return;
        }

        // 2) Confirmação dupla (ação destrutiva e irreversível)
        if (!confirm(
            '⚠️ ATENÇÃO: Este evento será excluído PERMANENTEMENTE da nuvem\n' +
            'para TODOS os usuários da organização.\n\n' +
            'Esta ação NÃO pode ser desfeita.\n\n' +
            'Deseja continuar?'
        )) {
            return;
        }

        // 3) Verifica usuário e organização
        const userInfo = await verificarUsuarioLogado();
        if (!userInfo || !userInfo.organizacao) {
            mostrarToastEstoque('⚠️ Usuário não vinculado a uma organização', 'erro');
            return;
        }

        if (!dbEstoque) await inicializarFirestore();
        if (!dbEstoque) {
            mostrarToastEstoque('⚠️ Não foi possível conectar ao Firestore', 'erro');
            return;
        }

        mostrarToastEstoque('🗑️ Excluindo evento da nuvem...', 'carregando');

        // 4) Remove do Firestore (ID determinístico: mov_<id>)
        const docId = `mov_${id}`;
        const docRef = dbEstoque
            .collection('organizacoes')
            .doc(userInfo.organizacao)
            .collection('estoque_historico')
            .doc(docId);

        // Verifica se o documento existe antes de deletar
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
            console.warn('⚠️ Evento não encontrado na nuvem. Removendo apenas localmente.');
            mostrarToastEstoque('⚠️ Evento não existia na nuvem. Removido apenas localmente.', 'aviso');
        } else {
            await docRef.delete();
            console.log('🗑️ Evento removido do Firestore:', docId);
        }

        // 5) Remove localmente (array + localStorage + interface)
        if (typeof historicoMovimentacoes !== 'undefined') {
            historicoMovimentacoes = historicoMovimentacoes.filter(h => h.id !== id);
        }
        if (typeof salvarEstoque === 'function') salvarEstoque();
        if (typeof atualizarTabelaHistorico === 'function') atualizarTabelaHistorico();

        mostrarToastEstoque('✅ Evento excluído da nuvem com sucesso!', 'sucesso');

    } catch (error) {
        console.error('❌ Erro ao excluir evento do histórico:', error);

        let msg = '❌ Erro ao excluir: ' + error.message;
        if (error.code === 'permission-denied') {
            msg = '🔒 Permissão negada! Verifique se você é admin e as regras do Firestore.';
        }
        mostrarToastEstoque(msg, 'erro');
    }
}

// ============================================
// ✏️ EDIÇÃO DE ITEM (APENAS ADMIN)
// ============================================

/**
 * Abre o modal de edição para um item
 */
async function editarItemEstoque(index) {
    const isAdmin = await verificarAdminComCache();
    
    if (!isAdmin) {
        mostrarToastEstoque('⚠️ Apenas administradores podem editar itens!', 'erro');
        return;
    }
    
    const tbody = document.getElementById('corpoEstoque');
    const rows = tbody.querySelectorAll('tr');
    
    if (!rows[index]) {
        mostrarToastEstoque('❌ Item não encontrado!', 'erro');
        return;
    }
    
    const cols = rows[index].querySelectorAll('td');
    
    document.getElementById('editarIndex').value = index;
    
    const kitNome = cols[1]?.textContent?.trim() || '';
    const selectKit = document.getElementById('editarKit');
    
    let kitEncontrado = false;
    for (let option of selectKit.options) {
        if (option.text === kitNome || option.value === kitNome) {
            selectKit.value = option.value;
            kitEncontrado = true;
            break;
        }
    }
    if (!kitEncontrado) {
        for (let option of selectKit.options) {
            if (kitNome.includes(option.value) || option.text.includes(kitNome)) {
                selectKit.value = option.value;
                kitEncontrado = true;
                break;
            }
        }
    }
    
    document.getElementById('editarLote').value = cols[2]?.textContent?.trim() || '';
    document.getElementById('editarValidade').value = cols[3]?.textContent?.trim() || '';
    document.getElementById('editarEntrada').value = parseInt(cols[4]?.textContent?.trim()) || 0;
    document.getElementById('editarSaida').value = parseInt(cols[5]?.textContent?.trim()) || 0;
    document.getElementById('editarObservacao').value = cols[8]?.textContent?.trim() || '';
    
    document.getElementById('modalEditarEstoque').style.display = 'flex';
}

/**
 * Fecha o modal de edição
 */
function fecharModalEdicao() {
    document.getElementById('modalEditarEstoque').style.display = 'none';
}

/**
 * Salva as alterações do item editado
 */
async function salvarEdicaoItem() {
    try {
        const index = parseInt(document.getElementById('editarIndex').value);
        
        const isAdmin = await verificarAdminComCache();
        if (!isAdmin) {
            mostrarToastEstoque('⚠️ Apenas administradores podem editar itens!', 'erro');
            return;
        }
        
        const dadosEditados = {
            kit: document.getElementById('editarKit').value,
            lote: document.getElementById('editarLote').value.trim(),
            validade: document.getElementById('editarValidade').value,
            entrada: parseInt(document.getElementById('editarEntrada').value) || 0,
            saida: parseInt(document.getElementById('editarSaida').value) || 0,
            observacao: document.getElementById('editarObservacao').value.trim()
        };
        
        if (!dadosEditados.lote) {
            mostrarToastEstoque('⚠️ O campo Lote é obrigatório!', 'erro');
            return;
        }
        if (!dadosEditados.validade) {
            mostrarToastEstoque('⚠️ O campo Validade é obrigatório!', 'erro');
            return;
        }
        
        const tbody = document.getElementById('corpoEstoque');
        const rows = tbody.querySelectorAll('tr');
        
        if (rows[index]) {
            const cols = rows[index].querySelectorAll('td');
            
            const selectKit = document.getElementById('editarKit');
            const kitNome = selectKit.options[selectKit.selectedIndex]?.text || dadosEditados.kit;
            
            cols[1].textContent = kitNome;
            cols[2].textContent = dadosEditados.lote;
            
            const dataParts = dadosEditados.validade.split('-');
            const dataFormatada = `${dataParts[2]}/${dataParts[1]}/${dataParts[0]}`;
            cols[3].textContent = dataFormatada;
            
            cols[4].textContent = dadosEditados.entrada;
            cols[5].textContent = dadosEditados.saida;
            
            const saldo = dadosEditados.entrada - dadosEditados.saida;
            cols[6].textContent = saldo;
            cols[6].style.color = saldo === 0 ? '#888' : '#ffd700';
            
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            const validadeDate = new Date(dadosEditados.validade + 'T00:00:00');
            const diffDias = Math.ceil((validadeDate - hoje) / (1000 * 60 * 60 * 24));
            
            let status = '✅ Válido';
            let statusColor = '#2ecc71';
            
            if (diffDias < 0) {
                status = '❌ Vencido';
                statusColor = '#e74c3c';
            } else if (diffDias <= 7) {
                status = `⚠️ Vence em ${diffDias} dias`;
                statusColor = '#f1c40f';
            }
            
            if (saldo <= 2 && saldo > 0) {
                status += ' 🔴 Estoque baixo';
            } else if (saldo === 0) {
                status = '⚪ Esgotado';
                statusColor = '#888';
            }
            
            cols[7].innerHTML = `<span style="color: ${statusColor};">${status}</span>`;
            cols[8].textContent = dadosEditados.observacao;
        }
        
        const itensAtuais = coletarDadosEstoque();
        atualizarResumoEstoque(itensAtuais);
        
        await salvarEstoqueNaNuvem();
        
        fecharModalEdicao();
        
        mostrarToastEstoque('✅ Item editado com sucesso!', 'sucesso');
        
    } catch (error) {
        console.error('❌ Erro ao editar item:', error);
        mostrarToastEstoque('❌ Erro ao editar: ' + error.message, 'erro');
    }
}

// ============================================
// ☁️ INDICADOR DE SINCRONIZAÇÃO
// ============================================

/**
 * Atualiza o indicador visual de sincronização
 */
function atualizarIndicadorEstoqueNuvem(sincronizado) {
    const indicador = document.getElementById('indicadorEstoqueNuvem');
    if (!indicador) return;
    
    if (sincronizado) {
        indicador.innerHTML = '☁️ Sincronizado';
        indicador.style.color = '#00ff64';
        indicador.style.background = 'rgba(0,255,100,0.1)';
        indicador.style.border = '1px solid rgba(0,255,100,0.2)';
    } else {
        indicador.innerHTML = '☁️ Não sincronizado';
        indicador.style.color = '#ffd700';
        indicador.style.background = 'rgba(255,215,0,0.1)';
        indicador.style.border = '1px solid rgba(255,215,0,0.2)';
    }
}

// ============================================
// 🔔 TOAST
// ============================================

/**
 * Toast específico para estoque
 */
function mostrarToastEstoque(mensagem, tipo = 'info') {
    const container = document.getElementById('modalEstoque');
    if (!container) {
        console.log('📢 Estoque:', mensagem);
        return;
    }

    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: #1a1a2e;
        border: 2px solid ${tipo === 'sucesso' ? '#00ff64' : tipo === 'erro' ? '#ff6b6b' : tipo === 'carregando' ? '#ffd700' : '#3498db'};
        border-radius: 10px;
        color: #fff;
        z-index: 100000;
        max-width: 400px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.8);
        animation: slideIn 0.3s ease;
        font-size: 0.9rem;
    `;
    toast.textContent = mensagem;
    
    if (tipo === 'carregando') {
        toast.innerHTML = `<span style="display: inline-block; animation: spin 1s linear infinite;">⏳</span> ${mensagem}`;
    }
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s';
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

// ============================================
// 📊 EXPORTAR EXCEL
// ============================================

/**
 * Exporta os dados do estoque para Excel
 */
function exportarEstoqueExcel() {
    try {
        const itens = coletarDadosEstoque();
        
        if (itens.length === 0) {
            mostrarToastEstoque('📭 Nenhum item para exportar', 'info');
            return;
        }

        const dadosExcel = itens.map(item => ({
            'Kit': item.kit,
            'Lote': item.lote,
            'Validade': item.validade,
            'Entrada': item.entrada,
            'Saída': item.saida,
            'Saldo': item.saldo,
            'Status': item.status,
            'Observação': item.observacao
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(dadosExcel);
        XLSX.utils.book_append_sheet(wb, ws, 'Estoque');
        
        const dataAtual = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(wb, `estoque_${dataAtual}.xlsx`);
        
        mostrarToastEstoque('📊 Estoque exportado com sucesso!', 'sucesso');

    } catch (error) {
        console.error('❌ Erro ao exportar:', error);
        mostrarToastEstoque('❌ Erro ao exportar: ' + error.message, 'erro');
    }
}

// ============================================
// 📜 HISTÓRICO DE AUDITORIA
// ============================================

/**
 * Salva no histórico do estoque (ORGANIZAÇÃO) - AUDITORIA
 */
async function salvarHistoricoEstoqueNuvem(dados, userInfo) {
    try {
        const resumo = {
            timestamp: new Date().toISOString(),
            usuario: userInfo.email,
            usuarioId: userInfo.uid,
            organizacao: userInfo.organizacao,
            totalItens: dados.metadata.totalItens || 0,
            totalFrascos: dados.metadata.totalFrascos || 0,
            tipo: 'salvamento_estoque'
        };

        await dbEstoque.collection('organizacoes')
            .doc(userInfo.organizacao)
            .collection('historico')
            .add(resumo);

        console.log('✅ Histórico salvo na organização');

    } catch (error) {
        console.error('❌ Erro ao salvar histórico:', error);
    }
}

// ============================================
// 🚀 INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(async () => {
        await inicializarFirestore();
        
        const temDados = await verificarEstoqueNaNuvem();
        if (temDados) {
            atualizarIndicadorEstoqueNuvem(true);
            console.log('☁️ Dados de estoque disponíveis na nuvem');
        }
    }, 2000);
});

document.addEventListener('userLoggedIn', atualizarVisibilidadeCardCustos);
document.addEventListener('userLoggedOut', function() {
    invalidarCacheAdmin();
    const cardCustos = document.querySelector('.tool-card[onclick="abrirModalCustos()"]');
    if (cardCustos) cardCustos.style.display = 'none';
});

// ============================================
// 📦 EXPORTA FUNÇÕES PARA USO GLOBAL
// ============================================
window.salvarEstoqueNaNuvem = salvarEstoqueNaNuvem;
window.carregarEstoqueDaNuvem = carregarEstoqueDaNuvem;
window.carregarHistoricoDaNuvemPorPeriodo = carregarHistoricoDaNuvemPorPeriodo;
window.exportarEstoqueExcel = exportarEstoqueExcel;
window.removerItemEstoque = removerItemEstoque;
window.verificarEstoqueNaNuvem = verificarEstoqueNaNuvem;
window.atualizarIndicadorEstoqueNuvem = atualizarIndicadorEstoqueNuvem;
window.verificarAdmin = verificarAdmin;
window.verificarAdminComCache = verificarAdminComCache;
window.invalidarCacheAdmin = invalidarCacheAdmin;
window.editarItemEstoque = editarItemEstoque;
window.fecharModalEdicao = fecharModalEdicao;
window.salvarEdicaoItem = salvarEdicaoItem;

console.log('☁️ Módulo Cloud Estoque carregado com sucesso!');
console.log('🔒 Proteção: Apenas ADMIN pode remover itens');
console.log('✏️ Edição: Apenas ADMIN pode editar itens');
console.log('📥 Carregamento por período: disponível');
console.log('🗑️☁️ Exclusão de histórico na nuvem: apenas ADMIN');
