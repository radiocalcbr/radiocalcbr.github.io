// ====== CONFIGURAÇÕES ======
const MEIA_VIDA_MIN = {
    'tc': 362,
    'f18': 109.77,
    'i123': 792
};

const NOME_ISOTOPO = {
    'tc': 'Tc-99m',
    'f18': 'F-18',
    'i123': 'I-123'
};

const COR_ISOTOPO = {
    'tc': '#00d2ff',
    'f18': '#00ff88',
    'i123': '#ffd700'
};

const MAX_PACIENTES = 30;

// 🔥 CONFIGURAÇÃO DO FIREBASE
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyCW0JSVhwXezcWSvRsyxUowr_m9MyiG2gw",  // 
    authDomain: "radiocalcbr.firebaseapp.com",
    projectId: "radiocalcbr",
    storageBucket: "radiocalcbr.firebasestorage.app",
    messagingSenderId: "344287399849",
    appId: "1:344287399849:web:2fb6b6761162c4be4c7eb8",
    measurementId: "G-ZMDMQGN6E0"
};
// ============================================
// ===== VALIDAÇÃO DE DATAS (ADICIONADO) =====
// ============================================

/**
 * VALIDAÇÃO PRINCIPAL - Verifica se as datas são válidas
 * Limite máximo: 3 dias entre marcação e injeção
 */
function validarDatasPlanejamento() {
    const marcacao = document.getElementById('planHorarioMarcacao')?.value;
    const primeira = document.getElementById('planHorarioPrimeira')?.value;
    const alerta = document.getElementById('alertaIntervalo');
    
    // Se não tem alerta, cria um
    if (!alerta) {
        console.warn('⚠️ Elemento de alerta não encontrado');
        return true;
    }
    
    // Verifica se os campos estão preenchidos
    if (!marcacao || !primeira) {
        alerta.innerHTML = '⚠️ Preencha a data/hora da marcação e da primeira injeção!';
        alerta.style.borderColor = '#ffd700';
        alerta.style.color = '#ffd700';
        alerta.style.background = 'rgba(255, 215, 0, 0.05)';
        return false;
    }
    
    const dtMarcacao = new Date(marcacao);
    const dtPrimeira = new Date(primeira);
    
    // Verifica se as datas são válidas
    if (isNaN(dtMarcacao.getTime()) || isNaN(dtPrimeira.getTime())) {
        alerta.innerHTML = '❌ Data inválida! Verifique o formato.';
        alerta.style.borderColor = '#ff6b6b';
        alerta.style.color = '#ff6b6b';
        alerta.style.background = 'rgba(255, 107, 107, 0.1)';
        return false;
    }
    
   // 1. VERIFICA SE MARCAÇÃO É ANTES DA INJEÇÃO
if (dtMarcacao >= dtPrimeira) {
    // MOSTRA TOAST
    mostrarToast(
        `❌ A MARCAÇÃO deve ser ANTES da primeira injeção!`,
        'erro'
    );
    
    alerta.innerHTML = `❌ A MARCAÇÃO deve ser ANTES da primeira injeção!`;
    alerta.style.borderColor = '#ff6b6b';
    alerta.style.color = '#ff6b6b';
    alerta.style.background = 'rgba(255, 107, 107, 0.1)';
    
    alerta.classList.add('shake');
    setTimeout(() => alerta.classList.remove('shake'), 500);
    return false;
}
    
    // 2. CALCULA A DIFERENÇA EM DIAS
    const diffMs = dtPrimeira - dtMarcacao;
    const diffDias = diffMs / (1000 * 60 * 60 * 24);
    const diffHoras = Math.round(diffDias * 24);
    const diffMinutos = Math.round(diffDias * 24 * 60);
    
   // 3. LIMITE DE 3 DIAS (72 HORAS)
if (diffDias > 3) {
    const diffHoras = Math.round(diffDias * 24);
    
    // MOSTRA TOAST
    mostrarToast(
        `❌ INTERVALO EXCEDE 3 DIAS!<br>` +
        `<small style="font-weight: normal; opacity: 0.8;">` +
        `📅 ${Math.round(diffDias)} dias (${diffHoras} horas) entre marcação e injeção<br>` +
        `⚠️ Para Tc-99m, após 72h a atividade é praticamente ZERO!` +
        `</small>`,
        'erro'
    );
    
    alerta.innerHTML = `❌ Intervalo excede 3 dias!`;
    alerta.style.borderColor = '#ff6b6b';
    alerta.style.color = '#ff6b6b';
    alerta.style.background = 'rgba(255, 107, 107, 0.1)';
    
    alerta.classList.add('shake');
    setTimeout(() => alerta.classList.remove('shake'), 500);
    return false;
}
    
// 4. AVISO PARA INTERVALO > 1 DIA (mas < 3 dias)
if (diffDias > 1) {
    const diffHoras = Math.round(diffDias * 24);
    
    // MOSTRA TOAST DE AVISO
    mostrarToast(
        `⚠️ ATENÇÃO: Intervalo superior a 24 horas!<br>` +
        `<small style="font-weight: normal; opacity: 0.8;">` +
        `📅 ${Math.round(diffDias)} dias (${diffHoras} horas)<br>` +
        `Haverá decaimento significativo do radiofármaco.` +
        `</small>`,
        'aviso'
    );
    
    alerta.innerHTML = `⚠️ Intervalo superior a 24 horas!`;
    alerta.style.borderColor = '#ffd700';
    alerta.style.color = '#ffd700';
    alerta.style.background = 'rgba(255, 215, 0, 0.05)';
    return true;
}
    
   // 5. TUDO OK! (menos de 24h)
alerta.innerHTML = `✅ Intervalo adequado para o planejamento`;
alerta.style.borderColor = 'rgba(0, 255, 100, 0.3)';
alerta.style.color = '#00ff64';
alerta.style.background = 'rgba(0, 255, 100, 0.05)';
return true;
}

/**
 * FUNÇÃO DE CÁLCULO COM VALIDAÇÃO
 */
function calcularPlanejamentoComValidacao() {
    console.log('🔍 Validando datas...');
    
    if (!validarDatasPlanejamento()) {
        console.log('⛔ Cálculo cancelado - datas inválidas');
        return;
    }
    
    console.log('✅ Datas válidas! Executando cálculo...');
    
    if (typeof calcularPlanejamento === 'function') {
        try {
            calcularPlanejamento();
        } catch (e) {
            console.error('❌ Erro no cálculo:', e);
            alert('Erro ao calcular! Verifique os valores inseridos.');
        }
    } else {
        console.warn('⚠️ Função calcularPlanejamento não encontrada!');
        alert('Erro: Função de cálculo não encontrada.');
    }
}

/**
 * VALIDAÇÃO EM TEMPO REAL
 */
function verificarIntervaloDatas() {
    const marcacao = document.getElementById('planHorarioMarcacao');
    const primeira = document.getElementById('planHorarioPrimeira');
    
    if (!marcacao?.value || !primeira?.value) return;
    
    const dtMarc = new Date(marcacao.value);
    const dtPrim = new Date(primeira.value);
    
    marcacao.classList.remove('data-alerta', 'data-ok', 'data-aviso');
    primeira.classList.remove('data-alerta', 'data-ok', 'data-aviso');
    
    if (isNaN(dtMarc.getTime()) || isNaN(dtPrim.getTime())) {
        marcacao.classList.add('data-alerta');
        primeira.classList.add('data-alerta');
        return;
    }
    
    const diffDias = (dtPrim - dtMarc) / (1000 * 60 * 60 * 24);
    
    if (dtMarc >= dtPrim) {
        marcacao.classList.add('data-alerta');
        primeira.classList.add('data-alerta');
    } else if (diffDias > 3) {
        marcacao.classList.add('data-alerta');
        primeira.classList.add('data-alerta');
    } else if (diffDias > 1) {
        marcacao.classList.add('data-aviso');
        primeira.classList.add('data-aviso');
    } else {
        marcacao.classList.add('data-ok');
        primeira.classList.add('data-ok');
    }
    
    validarDatasPlanejamento();
}

/**
 * UTILITÁRIO - Formata data
 */
function formatarData(data) {
    if (!data || isNaN(data.getTime())) return 'Data inválida';
    return data.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ============================================
// INICIALIZAÇÃO DOS LISTENERS
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('📡 Inicializando validação de datas...');
    
    const camposData = [
        'planHorarioMarcacao',
        'planHorarioPrimeira',
        'planHorarioUltimo',
        'planHorarioMarcacaoAgenda'
    ];
    
    camposData.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', verificarIntervaloDatas);
            el.addEventListener('input', verificarIntervaloDatas);
            console.log(`✅ Listener adicionado para: ${id}`);
        }
    });
    
    setTimeout(validarDatasPlanejamento, 500);
    console.log('✅ Validação de datas inicializada!');
});
// ===== TOAST DE NOTIFICAÇÃO =====
function mostrarToast(mensagem, tipo = 'erro') {
    const toast = document.getElementById('toastNotificacao');
    const msg = document.getElementById('toastMensagem');
    
    if (!toast) {
        console.warn('⚠️ Toast não encontrado!');
        return;
    }
    
    msg.innerHTML = mensagem;
    toast.style.display = 'block';
    
    if (tipo === 'erro') {
        toast.style.background = 'rgba(255, 107, 107, 0.95)';
        toast.style.color = '#fff';
        toast.style.borderLeftColor = '#ff6b6b';
    } else if (tipo === 'aviso') {
        toast.style.background = 'rgba(255, 215, 0, 0.95)';
        toast.style.color = '#000';
        toast.style.borderLeftColor = '#ffd700';
    } else {
        toast.style.background = 'rgba(0, 255, 100, 0.95)';
        toast.style.color = '#000';
        toast.style.borderLeftColor = '#00ff64';
    }
    
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.style.display = 'none';
    }, 5000);
}

// EXPORTA PARA USO GLOBAL
window.validarDatasPlanejamento = validarDatasPlanejamento;
window.calcularPlanejamentoComValidacao = calcularPlanejamentoComValidacao;
window.verificarIntervaloDatas = verificarIntervaloDatas;
window.formatarData = formatarData;
window.mostrarToast = mostrarToast;
// ============================================
// 🔧 FUNÇÕES DAS FERRAMENTAS
// ============================================

/**
 * Abre a página da ferramenta selecionada
 * @param {string} ferramenta - Nome da ferramenta 
 *        Opções: 'registro-marcacao', 'registro-rejeitos', 'registro-gerador'
 */
function abrirPaginaFerramenta(ferramenta) {
    // Mapeia as ferramentas para seus arquivos HTML
    const paginas = {
        'registro-marcacao': 'paginas/registro-marcacao.html',
        'registro-rejeitos': 'paginas/registro-rejeitos.html',
        'registro-gerador': 'paginas/registro-gerador.html'
    };
    
    const url = paginas[ferramenta];
    if (!url) {
        alert('⚠️ Página não encontrada!');
        console.error('❌ Ferramenta não encontrada:', ferramenta);
        return;
    }
    
    // Abre em uma nova aba
    window.open(url, '_blank');
}

/**
 * Função para voltar para a página principal
 * (use nas páginas das ferramentas)
 */
function voltarParaPrincipal() {
    window.location.href = '../index.html';
}

// ============================================
// EXPORTA AS NOVAS FUNÇÕES PARA USO GLOBAL
// ============================================
window.abrirPaginaFerramenta = abrirPaginaFerramenta;
window.voltarParaPrincipal = voltarParaPrincipal;