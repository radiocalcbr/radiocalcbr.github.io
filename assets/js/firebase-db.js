// ==========================================
// 🔥 FIREBASE DATABASE - FUNÇÕES
// ==========================================

// Verifica se o Firebase foi inicializado
if (typeof firebase === 'undefined') {
    console.error('❌ Firebase não está disponível!');
} else if (!firebase.apps.length) {
    // Se não foi inicializado, usa a config do config.js
    if (typeof FIREBASE_CONFIG !== 'undefined') {
        firebase.initializeApp(FIREBASE_CONFIG);
        console.log('✅ Firebase inicializado do config.js');
    } else {
        console.error('❌ FIREBASE_CONFIG não encontrado!');
    }
}

// ===== REFERÊNCIAS =====
const db = firebase.database();
const auth = firebase.auth();

console.log('✅ Firebase Database conectado!');

// ==========================================
// FUNÇÕES DE SALVAR E CARREGAR
// ==========================================

/**
 * Salva dados no Firebase
 * @param {string} caminho - Caminho no banco (ex: 'rejeitos/usuario123')
 * @param {object} dados - Dados a serem salvos
 * @returns {Promise}
 */
function salvarDadosFirebase(caminho, dados) {
    return new Promise((resolve, reject) => {
        const ref = db.ref(caminho);
        ref.set(dados)
            .then(() => {
                console.log(`✅ Dados salvos em: ${caminho}`);
                resolve(true);
            })
            .catch((error) => {
                console.error('❌ Erro ao salvar:', error);
                reject(error);
            });
    });
}

/**
 * Carrega dados do Firebase
 * @param {string} caminho - Caminho no banco
 * @returns {Promise}
 */
function carregarDadosFirebase(caminho) {
    return new Promise((resolve, reject) => {
        const ref = db.ref(caminho);
        ref.once('value')
            .then((snapshot) => {
                const dados = snapshot.val();
                console.log(`✅ Dados carregados de: ${caminho}`);
                resolve(dados);
            })
            .catch((error) => {
                console.error('❌ Erro ao carregar:', error);
                reject(error);
            });
    });
}

/**
 * Adiciona um novo registro (push) ao Firebase
 * @param {string} caminho - Caminho no banco
 * @param {object} dados - Dados a serem adicionados
 * @returns {Promise}
 */
function adicionarRegistroFirebase(caminho, dados) {
    return new Promise((resolve, reject) => {
        const ref = db.ref(caminho);
        const newRef = ref.push();
        newRef.set(dados)
            .then(() => {
                console.log(`✅ Registro adicionado em: ${caminho}`);
                resolve(newRef.key);
            })
            .catch((error) => {
                console.error('❌ Erro ao adicionar:', error);
                reject(error);
            });
    });
}

/**
 * Remove dados do Firebase
 * @param {string} caminho - Caminho no banco
 * @returns {Promise}
 */
function removerDadosFirebase(caminho) {
    return new Promise((resolve, reject) => {
        const ref = db.ref(caminho);
        ref.remove()
            .then(() => {
                console.log(`✅ Dados removidos de: ${caminho}`);
                resolve(true);
            })
            .catch((error) => {
                console.error('❌ Erro ao remover:', error);
                reject(error);
            });
    });
}

/**
 * Atualiza dados existentes no Firebase
 * @param {string} caminho - Caminho no banco
 * @param {object} dados - Dados a serem atualizados
 * @returns {Promise}
 */
function atualizarDadosFirebase(caminho, dados) {
    return new Promise((resolve, reject) => {
        const ref = db.ref(caminho);
        ref.update(dados)
            .then(() => {
                console.log(`✅ Dados atualizados em: ${caminho}`);
                resolve(true);
            })
            .catch((error) => {
                console.error('❌ Erro ao atualizar:', error);
                reject(error);
            });
    });
}

// ==========================================
// FUNÇÕES ESPECÍFICAS PARA O RADIOCALC
// ==========================================

/**
 * Salva os rejeitos no Firebase
 */
async function salvarRejeitosFirebase(usuarioId, dados) {
    if (!usuarioId) {
        console.warn('⚠️ Usuário não logado!');
        return false;
    }
    const caminho = `rejeitos/${usuarioId}`;
    try {
        await adicionarRegistroFirebase(caminho, dados);
        return true;
    } catch (error) {
        console.error('❌ Erro ao salvar rejeitos:', error);
        return false;
    }
}

/**
 * Salva os geradores no Firebase
 */
async function salvarGeradorFirebase(usuarioId, dados) {
    if (!usuarioId) {
        console.warn('⚠️ Usuário não logado!');
        return false;
    }
    const caminho = `geradores/${usuarioId}`;
    try {
        await adicionarRegistroFirebase(caminho, dados);
        return true;
    } catch (error) {
        console.error('❌ Erro ao salvar geradores:', error);
        return false;
    }
}

/**
 * Carrega o histórico de rejeitos do usuário
 */
async function carregarRejeitosFirebase(usuarioId) {
    if (!usuarioId) {
        console.warn('⚠️ Usuário não logado!');
        return null;
    }
    const caminho = `rejeitos/${usuarioId}`;
    try {
        const dados = await carregarDadosFirebase(caminho);
        return dados || {};
    } catch (error) {
        console.error('❌ Erro ao carregar rejeitos:', error);
        return null;
    }
}

/**
 * Carrega o histórico de geradores do usuário
 */
async function carregarGeradoresFirebase(usuarioId) {
    if (!usuarioId) {
        console.warn('⚠️ Usuário não logado!');
        return null;
    }
    const caminho = `geradores/${usuarioId}`;
    try {
        const dados = await carregarDadosFirebase(caminho);
        return dados || {};
    } catch (error) {
        console.error('❌ Erro ao carregar geradores:', error);
        return null;
    }
}

/**
 * Ouvir mudanças em tempo real nos rejeitos
 */
function ouvirRejeitosFirebase(usuarioId, callback) {
    if (!usuarioId) {
        console.warn('⚠️ Usuário não logado!');
        return () => {};
    }
    const caminho = `rejeitos/${usuarioId}`;
    const ref = db.ref(caminho);
    
    ref.on('value', (snapshot) => {
        const dados = snapshot.val();
        callback(dados);
    });
    
    // Retorna função para parar de ouvir
    return () => ref.off();
}

// ==========================================
// FUNÇÃO DE SINCRONIZAÇÃO
// ==========================================

/**
 * Sincroniza dados locais com o Firebase
 */
async function sincronizarComFirebase(usuarioId, dadosLocais, tipo) {
    if (!usuarioId) {
        console.warn('⚠️ Usuário não logado!');
        return false;
    }
    
    const caminho = `${tipo}/${usuarioId}`;
    
    try {
        // 1. Tenta carregar os dados do Firebase
        const dadosFirebase = await carregarDadosFirebase(caminho);
        
        // 2. Se não tiver dados no Firebase, salva os locais
        if (!dadosFirebase) {
            await salvarDadosFirebase(caminho, dadosLocais);
            console.log(`✅ Dados ${tipo} sincronizados (primeira vez)`);
            return true;
        }
        
        // 3. Se tiver dados, verifica qual é mais recente
        const dataLocal = dadosLocais?.dataSalvamento || 0;
        const dataFirebase = dadosFirebase?.dataSalvamento || 0;
        
        if (dataLocal > dataFirebase) {
            // Dados locais são mais novos
            await salvarDadosFirebase(caminho, dadosLocais);
            console.log(`✅ Dados ${tipo} atualizados (local mais novo)`);
        } else {
            // Dados do Firebase são mais novos
            console.log(`✅ Dados ${tipo} estão atualizados (Firebase mais novo)`);
        }
        
        return true;
    } catch (error) {
        console.error(`❌ Erro ao sincronizar ${tipo}:`, error);
        return false;
    }
}

// ==========================================
// EXPORTA FUNÇÕES
// ==========================================

window.salvarDadosFirebase = salvarDadosFirebase;
window.carregarDadosFirebase = carregarDadosFirebase;
window.adicionarRegistroFirebase = adicionarRegistroFirebase;
window.removerDadosFirebase = removerDadosFirebase;
window.atualizarDadosFirebase = atualizarDadosFirebase;
window.salvarRejeitosFirebase = salvarRejeitosFirebase;
window.salvarGeradorFirebase = salvarGeradorFirebase;
window.carregarRejeitosFirebase = carregarRejeitosFirebase;
window.carregarGeradoresFirebase = carregarGeradoresFirebase;
window.ouvirRejeitosFirebase = ouvirRejeitosFirebase;
window.sincronizarComFirebase = sincronizarComFirebase;

console.log('✅ Módulo Firebase Database carregado!');