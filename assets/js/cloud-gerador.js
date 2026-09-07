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
// ===== SALVAR GERADORES NA NUVEM =====
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
        
        // 🔥 USAR A ESTRUTURA: organizacoes/{orgId}/geradores/
        const orgGeradoresRef = db.collection('organizacoes')
            .doc(userData.organizacao)
            .collection('geradores');
        
        // Buscar documento existente com os mesmos dados (lote + dataRecebimento)
        const querySnapshot = await orgGeradoresRef
            .where('lote', '==', registrosGerador[0]?.lote || '')
            .limit(1)
            .get();
        
        if (!querySnapshot.empty) {
            // Atualizar documento existente
            const docRef = querySnapshot.docs[0].ref;
            await docRef.update({
                registros: registrosGerador,
                ultimaAtualizacao: firebase.firestore.FieldValue.serverTimestamp(),
                total: registrosGerador.length,
                atualizadoPor: userData.uid,
                atualizadoPorEmail: userData.email
            });
            console.log('✅ Geradores atualizados na nuvem');
        } else {
            // Criar novo documento
            await orgGeradoresRef.add({
                registros: registrosGerador,
                organizacao: userData.organizacao,
                criadoPor: userData.uid,
                criadoPorEmail: userData.email,
                criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
                ultimaAtualizacao: firebase.firestore.FieldValue.serverTimestamp(),
                total: registrosGerador.length
            });
            console.log('✅ Geradores salvos na nuvem');
        }
        
        // Salvar também no localStorage como backup
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
// ===== CARREGAR GERADORES DA NUVEM =====
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
        
        // 🔥 USAR A ESTRUTURA: organizacoes/{orgId}/geradores/
        const orgGeradoresRef = db.collection('organizacoes')
            .doc(userData.organizacao)
            .collection('geradores');
        
        // Buscar todos os documentos
        const snapshot = await orgGeradoresRef.get();
        let todosRegistros = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.registros && data.registros.length > 0) {
                todosRegistros = todosRegistros.concat(data.registros);
                console.log(`📦 Documento encontrado: ${doc.id} (${data.registros.length} registros)`);
            }
        });
        
        if (todosRegistros.length > 0) {
            registrosGerador = todosRegistros;
            
            geradorIdCounter = registrosGerador.length > 0 
                ? Math.max(...registrosGerador.map(item => item.id || 0)) + 1 
                : 0;
            
            salvarGeradores();
            atualizarTabelaGeradorHistorico();
            atualizarContadoresGerador();
            
            mostrarFeedbackGerador(`✅ ${registrosGerador.length} geradores carregados da nuvem!`, 'success');
            atualizarIndicadorGeradorNuvem('sincronizado');
        } else {
            // Tentar carregar do backup local
            const backup = localStorage.getItem('radiocalc_geradores_nuvem_backup');
            if (backup) {
                try {
                    const dadosBackup = JSON.parse(backup);
                    if (dadosBackup.registros && dadosBackup.registros.length > 0) {
                        if (confirm('⚠️ Nenhum dado encontrado na nuvem, mas há um backup local. Deseja carregar o backup?')) {
                            registrosGerador = dadosBackup.registros;
                            geradorIdCounter = registrosGerador.length > 0 
                                ? Math.max(...registrosGerador.map(item => item.id || 0)) + 1 
                                : 0;
                            salvarGeradores();
                            atualizarTabelaGeradorHistorico();
                            atualizarContadoresGerador();
                            mostrarFeedbackGerador(`✅ Backup local carregado! (${dadosBackup.registros.length} geradores)`, 'success');
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
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar geradores da nuvem:', error);
        mostrarFeedbackGerador('❌ Erro ao carregar da nuvem. Verifique sua conexão.', 'erro');
        atualizarIndicadorGeradorNuvem('offline');
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
// ===== VERIFICAR STATUS DA NUVEM =====
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
        
        // 🔥 USAR A ESTRUTURA: organizacoes/{orgId}/geradores/
        const snapshot = await db.collection('organizacoes')
            .doc(userData.organizacao)
            .collection('geradores')
            .limit(1)
            .get();
        
        const cloudCount = snapshot.empty ? 0 : 1;
        const localCount = registrosGerador ? registrosGerador.length : 0;
        
        console.log(`📊 Local: ${localCount} registros | Nuvem: ${cloudCount > 0 ? 'tem dados' : 'vazio'}`);
        
        if (cloudCount > 0 && localCount > 0) {
            atualizarIndicadorGeradorNuvem('sincronizado');
        } else if (cloudCount > 0 && localCount === 0) {
            const indicador = document.getElementById('indicadorGeradorNuvem');
            if (indicador) {
                indicador.textContent = '☁️ Dados na nuvem';
                indicador.className = '';
                indicador.style.color = '#f1c40f';
                indicador.style.background = 'rgba(241,196,15,0.15)';
                indicador.style.borderColor = 'rgba(241,196,15,0.3)';
            }
        } else {
            atualizarIndicadorGeradorNuvem('offline');
        }
    } catch (error) {
        console.warn('⚠️ Erro ao verificar status da nuvem:', error.message);
        atualizarIndicadorGeradorNuvem('offline');
    }
}

// ============================================================
// ===== EXPORTAR FUNÇÕES =====
// ============================================================

window.salvarGeradoresNaNuvem = salvarGeradoresNaNuvem;
window.carregarGeradoresDaNuvem = carregarGeradoresDaNuvem;
window.verificarStatusNuvemGerador = verificarStatusNuvemGerador;
window.atualizarIndicadorGeradorNuvem = atualizarIndicadorGeradorNuvem;
window.obterDadosUsuario = obterDadosUsuario;

console.log('☁️ Módulo de nuvem para geradores carregado!');
console.log('📦 Funções disponíveis:');
console.log('  - salvarGeradoresNaNuvem()');
console.log('  - carregarGeradoresDaNuvem()');
console.log('  - verificarStatusNuvemGerador()');
console.log('  - atualizarIndicadorGeradorNuvem(status)');
console.log('  - obterDadosUsuario()');