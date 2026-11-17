// ==========================================
// 🔥 FIRESTORE DATABASE - FUNÇÕES
// ==========================================

// Verifica se o Firebase foi inicializado
if (typeof firebase === 'undefined') {
    console.error('❌ Firebase não está disponível!');
} else if (!firebase.apps.length) {
    if (typeof FIREBASE_CONFIG !== 'undefined') {
        firebase.initializeApp(FIREBASE_CONFIG);
        console.log('✅ Firebase inicializado do config.js');
    }
}

const db = firebase.firestore();
const auth = firebase.auth();

console.log('✅ Firestore conectado!');

// ==========================================
// FUNÇÕES DE SALVAR E CARREGAR
// ==========================================

/**
 * Salva dados no Firestore
 */
async function salvarDadosFirestore(caminho, dados) {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('Usuário não logado');
        
        const docRef = db.collection('usuarios')
            .doc(user.uid)
            .collection(caminho)
            .doc('dados_atuais');
        
        await docRef.set({
            ...dados,
            metadata: {
                usuarioId: user.uid,
                usuarioEmail: user.email,
                dataSalvamento: new Date().toISOString()
            }
        }, { merge: true });
        
        console.log(`✅ Dados salvos em: usuarios/${user.uid}/${caminho}`);
        return true;
    } catch (error) {
        console.error('❌ Erro ao salvar:', error);
        throw error;
    }
}

/**
 * Carrega dados do Firestore
 */
async function carregarDadosFirestore(caminho) {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('Usuário não logado');
        
        const docRef = await db.collection('usuarios')
            .doc(user.uid)
            .collection(caminho)
            .doc('dados_atuais')
            .get();
        
        if (!docRef.exists) {
            console.log(`📭 Nenhum dado encontrado em: ${caminho}`);
            return null;
        }
        
        const dados = docRef.data();
        console.log(`✅ Dados carregados de: ${caminho}`);
        return dados;
    } catch (error) {
        console.error('❌ Erro ao carregar:', error);
        throw error;
    }
}

/**
 * Adiciona um registro ao histórico no Firestore
 */
async function adicionarHistoricoFirestore(caminho, dados) {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('Usuário não logado');
        
        await db.collection('usuarios')
            .doc(user.uid)
            .collection(caminho)
            .add({
                ...dados,
                timestamp: new Date().toISOString()
            });
        
        console.log(`✅ Registro adicionado em: ${caminho}`);
        return true;
    } catch (error) {
        console.error('❌ Erro ao adicionar:', error);
        throw error;
    }
}

// EXPORTA FUNÇÕES
window.salvarDadosFirestore = salvarDadosFirestore;
window.carregarDadosFirestore = carregarDadosFirestore;
window.adicionarHistoricoFirestore = adicionarHistoricoFirestore;
window.db = db;
window.auth = auth;

console.log('✅ Módulo Firestore carregado!');