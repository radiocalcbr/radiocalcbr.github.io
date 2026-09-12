// ============================================================
// ARQUIVO: assets/js/cloud-gerador.js
// MÓDULO: Sincronização na Nuvem - Gerador Mo-99/Tc-99m
// ============================================================

// ============================================================
// ===== FUNÇÃO PARA OBTER USUÁRIO E ORGANIZAÇÃO =====
// ============================================================

async function obterDadosUsuario() {
    try {
        if (typeof firebase === 'undefined' || !firebase.auth) {
            console.error('❌ Firebase não disponível');
            return null;
        }
        
        const user = firebase.auth().currentUser;
        if (!user) {
            console.warn('⚠️ Usuário não logado');
            return null;
        }
        
        // Buscar dados do usuário no Firestore
        const db = firebase.firestore();
        const doc = await db.collection('usuarios').doc(user.uid).get();
        
        if (!doc.exists) {
            console.warn('⚠️ Usuário não tem dados no Firestore');
            return { uid: user.uid, email: user.email, organizacao: null, role: 'tecnico' };
        }
        
        const data = doc.data();
        return {
            uid: user.uid,
            email: user.email,
            organizacao: data.organizacao || null,
            role: data.role || 'tecnico'
        };
    } catch (error) {
        console.error('❌ Erro ao obter dados do usuário:', error);
        return null;
    }
}

// ============================================================
// ===== VERIFICAR E ATUALIZAR STATUS POR DATA DE DEVOLUÇÃO =====
// ============================================================

function verificarEAtualizarStatusGeradores(registros) {
    console.log('🔄 Verificando geradores para atualização automática de status...');
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    let alterados = 0;
    const alteradosLista = [];
    
    registros.forEach(item => {
        // Só processa se estiver "aguardando" e tiver data de devolução
        if (item.status !== 'aguardando' || !item.dataDevolucao) return;
        
        const dataDevolucao = new Date(item.dataDevolucao + 'T00:00:00');
        
        // Se a data de devolução chegou ou já passou
        if (dataDevolucao <= hoje) {
            console.log(`✅ Gerador ${item.lote} - Data devolução: ${item.dataDevolucao} → Alterando para "pronto"`);
            item.status = 'pronto';
            item.dataAtualizacao = new Date().toISOString();
            item.statusAlteradoAutomaticamente = true;
            alterados++;
            alteradosLista.push(item.lote);
        }
    });
    
    if (alterados > 0) {
        console.log(`📊 ${alterados} gerador(es) atualizado(s) para "Pronto para liberação": ${alteradosLista.join(', ')}`);
    }
    
    return alterados;
}

// ============================================================
// ===== SALVAR GERADORES NA NUVEM (DOCUMENTO ÚNICO) =====
// ============================================================

async function salvarGeradoresNaNuvem() {
    console.log('☁️ Salvando geradores na nuvem...');
    
    const userData = await obterDadosUsuario();
    if (!userData) {
        mostrarFeedbackGerador('⚠️ Faça login para salvar na nuvem!', 'aviso');
        atualizarIndicadorGeradorNuvem('offline');
        return;
    }
    
    if (!userData.organizacao) {
        mostrarFeedbackGerador('⚠️ Usuário não vinculado a uma organização!', 'aviso');
        atualizarIndicadorGeradorNuvem('offline');
        return;
    }
    
    if (!registrosGerador || registrosGerador.length === 0) {
        mostrarFeedbackGerador('⚠️ Não há geradores para salvar na nuvem!', 'aviso');
        return;
    }
    
    try {
        atualizarIndicadorGeradorNuvem('salvando');
        
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            throw new Error('Firestore não está disponível');
        }
        
        const db = firebase.firestore();
        const orgGeradoresRef = db.collection('organizacoes')
            .doc(userData.organizacao)
            .collection('geradores');
        
        // 🔥 ESTRATÉGIA: SALVAR COMO UM ÚNICO DOCUMENTO COM ID FIXO
        // Isso evita múltiplos documentos e problemas de sincronização
        const docRef = orgGeradoresRef.doc('todos_geradores');
        
        await docRef.set({
            registros: registrosGerador,
            organizacao: userData.organizacao,
            ultimaAtualizacao: firebase.firestore.FieldValue.serverTimestamp(),
            total: registrosGerador.length,
            atualizadoPor: userData.uid,
            atualizadoPorEmail: userData.email,
            dataBackup: new Date().toISOString()
        });
        
        console.log(`✅ ${registrosGerador.length} geradores salvos na nuvem!`);
        
        // Salvar backup local
        localStorage.setItem('radiocalc_geradores_nuvem_backup', JSON.stringify({
            registros: registrosGerador,
            dataBackup: new Date().toISOString(),
            organizacao: userData.organizacao
        }));
        
        mostrarFeedbackGerador(`✅ ${registrosGerador.length} geradores salvos na nuvem!`, 'success');
        atualizarIndicadorGeradorNuvem('sincronizado');
        
    } catch (error) {
        console.error('❌ Erro ao salvar geradores na nuvem:', error);
        mostrarFeedbackGerador('❌ Erro ao salvar na nuvem. Verifique sua conexão.', 'erro');
        atualizarIndicadorGeradorNuvem('offline');
    }
}

// ============================================================
// ===== CARREGAR GERADORES DA NUVEM (DOCUMENTO ÚNICO) =====
// ============================================================

async function carregarGeradoresDaNuvem() {
    console.log('☁️ Carregando geradores da nuvem...');
    
    const userData = await obterDadosUsuario();
    if (!userData) {
        mostrarFeedbackGerador('⚠️ Faça login para carregar da nuvem!', 'aviso');
        atualizarIndicadorGeradorNuvem('offline');
        return;
    }
    
    if (!userData.organizacao) {
        mostrarFeedbackGerador('⚠️ Usuário não vinculado a uma organização!', 'aviso');
        atualizarIndicadorGeradorNuvem('offline');
        return;
    }
    
    try {
        atualizarIndicadorGeradorNuvem('carregando');
        
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            throw new Error('Firestore não está disponível');
        }
        
        const db = firebase.firestore();
        const orgGeradoresRef = db.collection('organizacoes')
            .doc(userData.organizacao)
            .collection('geradores');
        
        // 🔥 BUSCAR O DOCUMENTO ÚNICO
        const docRef = orgGeradoresRef.doc('todos_geradores');
        const doc = await docRef.get();
        
        if (doc.exists) {
            const data = doc.data();
            const registros = data.registros || [];
            
            if (registros.length > 0) {
                // 🔥 VERIFICAR E ATUALIZAR STATUS BASEADO NA DATA DE DEVOLUÇÃO
                const alterados = verificarEAtualizarStatusGeradores(registros);
                
                // Se houve alterações, salvar na nuvem automaticamente
                if (alterados > 0) {
                    await docRef.update({
                        registros: registros,
                        total: registros.length,
                        ultimaAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    console.log(`☁️ ${alterados} geradores atualizados na nuvem!`);
                }
                
                registrosGerador = registros;
                
                geradorIdCounter = registrosGerador.length > 0 
                    ? Math.max(...registrosGerador.map(item => item.id || 0)) + 1 
                    : 0;
                
                salvarGeradores();
                atualizarTabelaGeradorHistorico();
                atualizarContadoresGerador();
                
                // Mensagem de feedback personalizada
                let mensagem = `✅ ${registrosGerador.length} geradores carregados da nuvem!`;
                if (alterados > 0) {
                    mensagem = `✅ ${registrosGerador.length} geradores carregados! ${alterados} atualizado(s) para "Pronto para liberação"!`;
                }
                
                mostrarFeedbackGerador(mensagem, 'success');
                atualizarIndicadorGeradorNuvem('sincronizado');
                console.log(`📦 ${registros.length} registros carregados da nuvem`);
                return;
            }
        }
        
        // Se não encontrou, tentar carregar do backup local
        const backup = localStorage.getItem('radiocalc_geradores_nuvem_backup');
        if (backup) {
            try {
                const dadosBackup = JSON.parse(backup);
                if (dadosBackup.registros && dadosBackup.registros.length > 0) {
                    if (confirm('⚠️ Nenhum dado encontrado na nuvem, mas há um backup local. Deseja carregar o backup?')) {
                        // 🔥 VERIFICAR TAMBÉM NO BACKUP
                        const alterados = verificarEAtualizarStatusGeradores(dadosBackup.registros);
                        
                        registrosGerador = dadosBackup.registros;
                        geradorIdCounter = registrosGerador.length > 0 
                            ? Math.max(...registrosGerador.map(item => item.id || 0)) + 1 
                            : 0;
                        salvarGeradores();
                        atualizarTabelaGeradorHistorico();
                        atualizarContadoresGerador();
                        
                        let mensagem = `✅ Backup local carregado! (${dadosBackup.registros.length} geradores)`;
                        if (alterados > 0) {
                            mensagem = `✅ Backup carregado! ${alterados} atualizado(s) para "Pronto para liberação"!`;
                        }
                        
                        mostrarFeedbackGerador(mensagem, 'success');
                        atualizarIndicadorGeradorNuvem('sincronizado');
                    }
                }
            } catch (e) {
                console.warn('Erro ao carregar backup local:', e);
            }
        } else {
            mostrarFeedbackGerador('ℹ️ Nenhum gerador encontrado na nuvem.', 'info');
            atualizarIndicadorGeradorNuvem('offline');
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar geradores da nuvem:', error);
        mostrarFeedbackGerador('❌ Erro ao carregar da nuvem. Verifique sua conexão.', 'erro');
        atualizarIndicadorGeradorNuvem('offline');
    }
}

// ============================================================
// ===== REMOVER GERADOR DA NUVEM (DOCUMENTO ÚNICO) =====
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
        
        // 🔥 BUSCAR O DOCUMENTO ÚNICO
        const docRef = orgGeradoresRef.doc('todos_geradores');
        const doc = await docRef.get();
        
        if (doc.exists) {
            const data = doc.data();
            const registros = data.registros || [];
            
            // Filtrar removendo o registro com o ID específico
            const novosRegistros = registros.filter(r => r.id !== item.id);
            
            if (novosRegistros.length < registros.length) {
                // Atualizar o documento com a nova lista
                await docRef.update({
                    registros: novosRegistros,
                    total: novosRegistros.length,
                    ultimaAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log(`✅ Gerador ${item.id} (${item.lote}) removido da nuvem`);
            } else {
                console.warn(`⚠️ Gerador ${item.id} não encontrado na nuvem`);
            }
        } else {
            console.warn('⚠️ Nenhum documento encontrado na nuvem');
        }
        
    } catch (error) {
        console.error('❌ Erro ao remover gerador da nuvem:', error);
        throw error;
    }
}

// ============================================================
// ===== LIMPAR GERADORES DA NUVEM (DOCUMENTO ÚNICO) =====
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
        
        // 🔥 DELETAR O DOCUMENTO ÚNICO
        const docRef = orgGeradoresRef.doc('todos_geradores');
        await docRef.delete();
        
        // Remover o backup local também
        localStorage.removeItem('radiocalc_geradores_nuvem_backup');
        
        console.log('✅ Todos os geradores removidos da nuvem!');
        mostrarFeedbackGerador('✅ Histórico também limpo na nuvem!', 'success');
        
    } catch (error) {
        console.error('❌ Erro ao limpar geradores da nuvem:', error);
        mostrarFeedbackGerador('⚠️ Removido localmente, mas erro ao limpar na nuvem.', 'aviso');
    }
}

// ============================================================
// ===== ATUALIZAR INDICADOR DE NUVEM =====
// ============================================================

function atualizarIndicadorGeradorNuvem(status) {
    const indicador = document.getElementById('indicadorGeradorNuvem');
    if (!indicador) {
        console.warn('⚠️ Elemento indicadorGeradorNuvem não encontrado');
        return;
    }
    
    indicador.classList.remove('sincronizado', 'salvando', 'carregando', 'offline');
    
    const statusMap = {
        'sincronizado': {
            texto: '☁️ Sincronizado',
            classe: 'sincronizado'
        },
        'salvando': {
            texto: '⏳ Salvando...',
            classe: 'salvando'
        },
        'carregando': {
            texto: '⏳ Carregando...',
            classe: 'carregando'
        },
        'offline': {
            texto: '⚠️ Offline',
            classe: 'offline'
        },
        'verificando': {
            texto: '☁️ Verificando...',
            classe: ''
        }
    };
    
    const estado = statusMap[status] || statusMap['verificando'];
    
    indicador.textContent = estado.texto;
    if (estado.classe) {
        indicador.classList.add(estado.classe);
    }
    
    console.log(`📌 Indicador atualizado: ${estado.texto}`);
}

// ============================================================
// ===== VERIFICAR STATUS DA NUVEM (DOCUMENTO ÚNICO) =====
// ============================================================

async function verificarStatusNuvemGerador() {
    console.log('🔍 Verificando status da nuvem para geradores...');
    
    const userData = await obterDadosUsuario();
    if (!userData || !userData.organizacao) {
        console.warn('⚠️ Usuário não logado ou sem organização');
        atualizarIndicadorGeradorNuvem('offline');
        return;
    }
    
    if (typeof firebase === 'undefined' || !firebase.firestore) {
        console.error('❌ Firestore não está disponível');
        atualizarIndicadorGeradorNuvem('offline');
        return;
    }
    
    try {
        const db = firebase.firestore();
        const orgGeradoresRef = db.collection('organizacoes')
            .doc(userData.organizacao)
            .collection('geradores');
        
        // 🔥 VERIFICAR O DOCUMENTO ÚNICO
        const docRef = orgGeradoresRef.doc('todos_geradores');
        const doc = await docRef.get();
        
        const cloudCount = doc.exists ? (doc.data()?.registros?.length || 0) : 0;
        const localCount = registrosGerador ? registrosGerador.length : 0;
        
        console.log(`📊 Local: ${localCount} registros | Nuvem: ${cloudCount} registros`);
        
        if (cloudCount > 0 && localCount > 0 && cloudCount === localCount) {
            atualizarIndicadorGeradorNuvem('sincronizado');
        } else if (cloudCount > 0 && localCount === 0) {
            const indicador = document.getElementById('indicadorGeradorNuvem');
            if (indicador) {
                indicador.textContent = `☁️ Dados na nuvem (${cloudCount})`;
                indicador.className = '';
                indicador.style.color = '#f1c40f';
                indicador.style.background = 'rgba(241,196,15,0.15)';
                indicador.style.borderColor = 'rgba(241,196,15,0.3)';
            }
        } else if (cloudCount > 0 && localCount > 0 && cloudCount !== localCount) {
            const indicador = document.getElementById('indicadorGeradorNuvem');
            if (indicador) {
                indicador.textContent = `⚠️ Local: ${localCount} | Nuvem: ${cloudCount}`;
                indicador.className = '';
                indicador.style.color = '#ff6b6b';
                indicador.style.background = 'rgba(255,107,107,0.15)';
                indicador.style.borderColor = 'rgba(255,107,107,0.3)';
            }
        } else {
            atualizarIndicadorGeradorNuvem('offline');
        }
    } catch (error) {
        console.warn('⚠️ Erro ao verificar status da nuvem:', error.message);
        atualizarIndicadorGeradorNuvem('offline');
    }
}
// 🛡️ GUARDA CONTRA MÚLTIPLAS EXECUÇÕES E CONTRA LOOP
if (window._cloudGeradorJaCarregado) {
    console.warn('⚠️ cloud-gerador.js já estava carregado. Ignorando redefinições.');
} else {
    window._cloudGeradorJaCarregado = true;
    
    // ============================================================
    // ===== EXPORTAR FUNÇÕES =====
    // ============================================================
    
    window.salvarGeradoresNaNuvem = salvarGeradoresNaNuvem;
    window.carregarGeradoresDaNuvem = carregarGeradoresDaNuvem;
    window.removerGeradorDaNuvem = removerGeradorDaNuvem;
    window.limparGeradoresDaNuvem = limparGeradoresDaNuvem;
    window.verificarStatusNuvemGerador = verificarStatusNuvemGerador;
    window.atualizarIndicadorGeradorNuvem = atualizarIndicadorGeradorNuvem;
    window.obterDadosUsuario = obterDadosUsuario;
    window.verificarEAtualizarStatusGeradores = verificarEAtualizarStatusGeradores;
    
    console.log('☁️ Módulo de nuvem para geradores carregado! (v3 - Com verificação automática de status)');
    console.log('📦 Funções disponíveis:');
    console.log('  - salvarGeradoresNaNuvem()');
    console.log('  - carregarGeradoresDaNuvem()');
    console.log('  - removerGeradorDaNuvem(item)');
    console.log('  - limparGeradoresDaNuvem()');
    console.log('  - verificarStatusNuvemGerador()');
    console.log('  - atualizarIndicadorGeradorNuvem(status)');
    console.log('  - obterDadosUsuario()');
    console.log('  - verificarEAtualizarStatusGeradores(registros)');
}