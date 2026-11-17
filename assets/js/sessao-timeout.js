// ============================================================
// MÓDULO DE TIMEOUT DE INATIVIDADE
// Logout automático após 1 hora sem atividade
// Lê configurações de CONFIG_SESSAO (definido em config.js)
// ============================================================

(function() {
    'use strict';

    // 🛡️ Guarda contra execução múltipla
    if (window._sessaoTimeoutInit) return;
    window._sessaoTimeoutInit = true;

    // ===== CONFIGURAÇÕES (vêm do config.js) =====
    const CONFIG = (typeof CONFIG_SESSAO !== 'undefined')
        ? CONFIG_SESSAO
        : {
            TIMEOUT_MS: 60 * 60 * 1000,
            AVISO_ANTECEDENTE_MS: 5 * 60 * 1000,
            CHECK_INTERVAL_MS: 30 * 1000,
            STORAGE_KEY: 'radiocalc_ultima_atividade',
            EVENTOS: ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click', 'wheel'],
            THROTTLE_MS: 2000,
            ATIVO: true
        };

    if (!CONFIG.ATIVO) {
        console.log('⏸️ Módulo de timeout de sessão desabilitado via config.');
        return;
    }

    let ultimoAvisoMostrado = false;
    let intervaloVerificacao = null;
    let throttleTimer = null;

    // ===== UTILITÁRIOS =====
    function getUltimaAtividade() {
        const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
        return stored ? parseInt(stored, 10) : Date.now();
    }
    function setUltimaAtividade() {
        localStorage.setItem(CONFIG.STORAGE_KEY, Date.now().toString());
    }
    function limparAtividade() {
        localStorage.removeItem(CONFIG.STORAGE_KEY);
    }

    function usuarioEstaLogado() {
        if (typeof getCurrentUser === 'function') {
            return !!getCurrentUser();
        }
        const principal = document.getElementById('conteudoPrincipal');
        return principal && principal.style.display !== 'none';
    }

    // ===== LOGOUT AUTOMÁTICO =====
    async function executarLogoutInatividade() {
        console.warn('⏰ Sessão expirada por inatividade. Fazendo logout...');

        limparAtividade();
        pararMonitoramento();

     try {
    if (typeof fazerLogout === 'function') {
        await fazerLogout(true);   // ⬅️ true = modo silencioso
    } else if (typeof firebase !== 'undefined' && firebase.auth) {
        await firebase.auth().signOut();
    }
} catch (e) {
    console.error('Erro ao fazer logout:', e);
}

        // Mensagem na tela de login (usa sua função mostrarToast se disponível)
        const erroLogin = document.getElementById('erroLogin');
        if (erroLogin) {
            erroLogin.textContent = '⏰ Sessão expirada por inatividade. Faça login novamente.';
            erroLogin.style.display = 'block';
            erroLogin.style.color = '#ffd700';
        }
        if (typeof mostrarToast === 'function') {
            mostrarToast('⏰ Sessão expirada por inatividade. Faça login novamente.', 'aviso');
        }
    }

    // ===== AVISO PRÉVIO =====
    function mostrarAvisoExpiracao() {
        const antigo = document.getElementById('avisoExpiracaoSessao');
        if (antigo) antigo.remove();

        const aviso = document.createElement('div');
        aviso.id = 'avisoExpiracaoSessao';
        aviso.innerHTML = `
            <div style="
                position: fixed; top: 20px; right: 20px; z-index: 999999;
                background: linear-gradient(135deg, #1a1a2e, #2d2d4e);
                border: 2px solid #ffd700; border-radius: 12px;
                padding: 18px 22px; box-shadow: 0 10px 40px rgba(0,0,0,0.6);
                color: #fff; font-family: inherit; max-width: 340px;
                animation: slideInAviso 0.4s ease-out;
            ">
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
                    <span style="font-size:1.6rem;">⏰</span>
                    <strong style="color:#ffd700; font-size:1rem;">Sessão expirando</strong>
                </div>
                <p style="margin:0 0 12px 0; font-size:0.85rem; color:#ccc; line-height:1.4;">
                    Sua sessão expirará em
                    <strong id="contadorAviso" style="color:#ffd700;">5:00</strong>
                    por inatividade.
                </p>
                <div style="display:flex; gap:8px;">
                    <button id="btnRenovarSessao" style="
                        flex:1; padding:10px;
                        background: linear-gradient(135deg, #2ecc71, #27ae60);
                        color:#fff; border:none; border-radius:8px;
                        cursor:pointer; font-weight:bold; font-size:0.85rem;
                    ">✅ Continuar conectado</button>
                    <button id="btnSairAgora" style="
                        padding:10px 14px; background: rgba(255,255,255,0.05);
                        color:#ff6b6b; border:1px solid rgba(255,107,107,0.3);
                        border-radius:8px; cursor:pointer; font-size:0.85rem;
                    ">Sair</button>
                </div>
            </div>
            <style>
                @keyframes slideInAviso {
                    from { transform: translateX(120%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            </style>
        `;
        document.body.appendChild(aviso);

        let segundosRestantes = Math.floor(CONFIG.AVISO_ANTECEDENTE_MS / 1000);
        const contador = document.getElementById('contadorAviso');

        const intervalContador = setInterval(() => {
            segundosRestantes--;
            if (segundosRestantes <= 0) {
                clearInterval(intervalContador);
                return;
            }
            const min = Math.floor(segundosRestantes / 60);
            const seg = segundosRestantes % 60;
            if (contador) {
                contador.textContent = `${min}:${String(seg).padStart(2, '0')}`;
            }
        }, 1000);

        document.getElementById('btnRenovarSessao').addEventListener('click', () => {
            clearInterval(intervalContador);
            renovarSessao();
        });
        document.getElementById('btnSairAgora').addEventListener('click', () => {
            clearInterval(intervalContador);
            executarLogoutInatividade();
        });
    }

    function renovarSessao() {
        setUltimaAtividade();
        ultimoAvisoMostrado = false;
        const aviso = document.getElementById('avisoExpiracaoSessao');
        if (aviso) aviso.remove();
        console.log('✅ Sessão renovada pelo usuário.');
    }

    // ===== VERIFICAÇÃO =====
    function verificarInatividade() {
        if (!usuarioEstaLogado()) return;

        const inativo = Date.now() - getUltimaAtividade();

        if (inativo >= CONFIG.TIMEOUT_MS) {
            executarLogoutInatividade();
            return;
        }

        const tempoRestante = CONFIG.TIMEOUT_MS - inativo;
        if (tempoRestante <= CONFIG.AVISO_ANTECEDENTE_MS && !ultimoAvisoMostrado) {
            ultimoAvisoMostrado = true;
            mostrarAvisoExpiracao();
        }
    }

    function registrarAtividade() {
        if (!usuarioEstaLogado()) return;
        if (throttleTimer) return;
        throttleTimer = setTimeout(() => {
            throttleTimer = null;
            setUltimaAtividade();
        }, CONFIG.THROTTLE_MS);
    }

    // ===== CONTROLE =====
    function iniciarMonitoramento() {
        if (intervaloVerificacao) return;
        console.log(`🔐 Monitor de inatividade iniciado (timeout: ${CONFIG.TIMEOUT_MS / 60000} min)`);

        setUltimaAtividade();

        CONFIG.EVENTOS.forEach(evt => {
            document.addEventListener(evt, registrarAtividade, { passive: true });
        });

        intervaloVerificacao = setInterval(verificarInatividade, CONFIG.CHECK_INTERVAL_MS);
        setTimeout(verificarInatividade, 1000);
    }

    function pararMonitoramento() {
        if (intervaloVerificacao) {
            clearInterval(intervaloVerificacao);
            intervaloVerificacao = null;
        }
        CONFIG.EVENTOS.forEach(evt => {
            document.removeEventListener(evt, registrarAtividade);
        });
    }

    // ===== INTEGRAÇÃO =====
    document.addEventListener('userLoggedIn', () => {
        console.log('👤 Login detectado — iniciando monitor de inatividade.');
        iniciarMonitoramento();
    });

    const autoStart = () => {
        setTimeout(() => {
            if (usuarioEstaLogado()) iniciarMonitoramento();
        }, 2000);
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoStart);
    } else {
        autoStart();
    }

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) verificarInatividade();
    });

    window.addEventListener('storage', (e) => {
        if (e.key === CONFIG.STORAGE_KEY && e.newValue === null) {
            console.log('🔄 Logout detectado em outra aba.');
            executarLogoutInatividade();
        }
    });

    // ===== API PÚBLICA =====
    window.SessaoTimeout = {
        renovar: renovarSessao,
        logout: executarLogoutInatividade,
        iniciar: iniciarMonitoramento,
        parar: pararMonitoramento,
        tempoRestante: () => Math.max(0, CONFIG.TIMEOUT_MS - (Date.now() - getUltimaAtividade())),
        config: CONFIG
    };

    console.log('✅ Módulo de timeout de sessão carregado.');
})();