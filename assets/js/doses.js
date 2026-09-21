// ============================================
// 💉 MÓDULO: DOSES ADMINISTRADAS
// ============================================

let dosesAdministradas = [];
let dosesFiltradas = [];
let dosesIdCounter = 0;  // 🔥 mantido apenas para retrocompatibilidade com IDs legados
const ITENS_POR_PAGINA_DOSES = 30;
let paginaAtualDoses = 1;
const STORAGE_DOSES_ADMINISTRADAS = 'radiocalc_doses_administradas';
const STORAGE_DOSES_NUVEM_BACKUP = 'radiocalc_doses_nuvem_backup';
const DOC_DOSES_NUVEM = 'todas_doses';
const MOTIVOS_DUPLICIDADE_DOSE = [
    'Falha na injeção',
    'Protocolo incorreto',
    'Artefato',
    'Quebra de equipamento',
    'Cliente suspendeu o exame',
    'Complementação Médica',
    'Falha na marcação do kit'
];

window._cloudDosesCarregado = false;

// ============================================
// 🆔 GERADOR DE UUID (com fallback)
// ============================================

function gerarUuid() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return 'u-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
}

// ============================================
// 🔧 NORMALIZAÇÃO
// ============================================

function normalizarDoseAdministrada(dose) {
    if (!dose || typeof dose !== 'object') return null;

    const numeroFicha = String(dose.numeroFicha || '').trim();
    const radiofarmaco = String(dose.radiofarmaco || dose.exame || '').trim();
    const peso = Number(dose.peso) || 0;
    const atividade = Number(dose.atividade) || 0;
    const mCiKg = peso > 0 ? atividade / peso : 0;

    // 🔥 Aceita UUID (string) ou ID numérico legado (retrocompatibilidade)
    let idNormalizado = dose.id;
    if (idNormalizado === undefined || idNormalizado === null || idNormalizado === '') {
        idNormalizado = 0;
    } else if (typeof idNormalizado === 'string' && /^\d+$/.test(idNormalizado)) {
        // Se for string numérica ("42"), converte para número 42
        idNormalizado = Number(idNormalizado);
    }
    // Se for UUID (string não-numérica) OU número, mantém como está

    return {
        id: idNormalizado,
        data: dose.data || '',
        numeroFicha,
        radiofarmaco,
        peso,
        atividade,
        mCiKg: Number.isFinite(mCiKg) ? Number(mCiKg.toFixed(4)) : 0,
        motivo: String(dose.motivo || '').trim(),
        ehRepeticao: Boolean(dose.ehRepeticao),
        criadoEm: dose.criadoEm || new Date().toISOString()
    };
}

// ============================================
// 🔀 MERGE DE DOSES - UNIÃO PURA E ROBUSTA (UUID-ready)
// ============================================
function mesclarDosesPorFicha(registrosNuvem = [], registrosLocais = []) {
    const mapa = new Map();
    let maiorId = 0;

    // 🔥 Extrai o ID numérico (para UUIDs, retorna 0 — não interfere)
    const extrairIdNumerico = (dose) => {
        const candidatos = [dose?.id, dose?._id, dose?.doseId];
        for (const c of candidatos) {
            const n = Number(c);
            if (Number.isFinite(n) && n > 0 && String(c) === String(n)) {
                return n;
            }
        }
        return 0;
    };

    // 🔥 Descobre o maior ID numérico legado
    [...registrosNuvem, ...registrosLocais].forEach(d => {
        const id = extrairIdNumerico(d);
        if (id > maiorId) maiorId = id;
    });

    // 🔑 Chave = ID (funciona para UUID string e ID numérico)
    const chaveDe = (dose) => `id:${dose.id}`;

    // 🔥 Gera novo ID mantendo formato do original
    const gerarNovoId = (modelo) => {
        const idModelo = modelo?.id;
        if (typeof idModelo === 'number' || (typeof idModelo === 'string' && /^\d+$/.test(idModelo))) {
            maiorId++;
            return maiorId;
        }
        return gerarUuid();
    };

    // ── 1) Adiciona tudo da nuvem ──
    for (const dose of registrosNuvem) {
        const normalizada = normalizarDoseAdministrada(dose);
        if (!normalizada) continue;

        // Sem ID válido → gera novo
        if (!normalizada.id || normalizada.id === 0 || normalizada.id === '0') {
            normalizada.id = gerarNovoId(normalizada);
        }

        // 🔥 Colisão → gera novo ID
        if (mapa.has(chaveDe(normalizada))) {
            normalizada.id = gerarNovoId(normalizada);
        }

        mapa.set(chaveDe(normalizada), normalizada);
    }

    // ── 2) Adiciona tudo do local ──
    for (const dose of registrosLocais) {
        const normalizada = normalizarDoseAdministrada(dose);
        if (!normalizada) continue;

        if (normalizada.id && mapa.has(chaveDe(normalizada))) {
            const existente = mapa.get(chaveDe(normalizada));
            const ehMesmoRegistro =
                existente.criadoEm === normalizada.criadoEm &&
                existente.numeroFicha === normalizada.numeroFicha &&
                existente.data === normalizada.data;

            if (!ehMesmoRegistro) {
                normalizada.id = gerarNovoId(normalizada);
            }
        } else if (!normalizada.id || normalizada.id === 0 || normalizada.id === '0') {
            normalizada.id = gerarNovoId(normalizada);
        }

        mapa.set(chaveDe(normalizada), normalizada);
    }

    const resultado = Array.from(mapa.values());

    console.log('🔀 ===== MERGE DE DOSES (união pura) =====');
    console.log('   📥 Nuvem:', registrosNuvem.length, 'doses');
    console.log('   📥 Local:', registrosLocais.length, 'doses');
    console.log('   📤 Resultado (únicas):', resultado.length, 'doses');
    console.log('   🔢 Maior ID numérico legado:', maiorId);
    console.log('   ✅ Nenhuma dose foi perdida');
    console.log('   ==========================================');

    return resultado;
}

// ============================================
// 💾 PERSISTÊNCIA LOCAL
// ============================================

function carregarDosesSalvas() {
    try {
        const dadosSalvos = localStorage.getItem(STORAGE_DOSES_ADMINISTRADAS);
        const registros = dadosSalvos ? JSON.parse(dadosSalvos) : [];

        dosesAdministradas = Array.isArray(registros)
            ? registros
                .map(normalizarDoseAdministrada)
                .filter(Boolean)
                .sort((a, b) => new Date(b.data) - new Date(a.data))
            : [];

        // 🔥 Atualiza contador legado
        const maiorIdNumerico = dosesAdministradas.reduce((max, dose) => {
            const n = Number(dose.id);
            return (Number.isFinite(n) && n > max) ? n : max;
        }, 0);
        dosesIdCounter = Math.max(dosesIdCounter, maiorIdNumerico + 1);

        dosesFiltradas = [...dosesAdministradas];
        atualizarResumoDoses();
        atualizarTabelaDoses();
    } catch (erro) {
        console.error('❌ Erro ao carregar doses salvas:', erro);
        dosesAdministradas = [];
        dosesFiltradas = [];
        dosesIdCounter = 0;
    }
}

function persistirDosesLocal() {
    localStorage.setItem(STORAGE_DOSES_ADMINISTRADAS, JSON.stringify(dosesAdministradas));
}

// ============================================
// ☁️ INDICADOR DE STATUS DA NUVEM
// ============================================

function atualizarIndicadorDosesNuvem(status = 'offline') {
    const indicador = document.getElementById('indicadorDosesNuvem');
    if (!indicador) return;

    const mapa = {
        offline: { texto: '☁️ Offline', background: 'rgba(255,255,255,0.06)', color: '#b7c4bd' },
        salvando: { texto: '☁️ Salvando...', background: 'rgba(46,204,113,0.18)', color: '#2ecc71' },
        carregando: { texto: '☁️ Carregando...', background: 'rgba(52,152,219,0.15)', color: '#5dade2' },
        sincronizado: { texto: '☁️ Sincronizado', background: 'rgba(46,204,113,0.18)', color: '#2ecc71' },
        erro: { texto: '☁️ Erro', background: 'rgba(255,107,107,0.12)', color: '#ff6b6b' }
    };

    const configuracao = mapa[status] || mapa.offline;
    indicador.textContent = configuracao.texto;
    indicador.style.background = configuracao.background;
    indicador.style.color = configuracao.color;
}

function verificarStatusDosesNuvem() {
    try {
        const indicador = document.getElementById('indicadorDosesNuvem');
        if (!indicador) return;

        const usuario = typeof obterDadosUsuario === 'function' ? obterDadosUsuario() : null;
        if (!usuario || !usuario.organizacao) {
            atualizarIndicadorDosesNuvem('offline');
            return;
        }

        if (window._cloudDosesCarregado) {
            atualizarIndicadorDosesNuvem('sincronizado');
        } else {
            atualizarIndicadorDosesNuvem('offline');
        }
    } catch (erro) {
        console.error('❌ Erro ao verificar status da nuvem:', erro);
        atualizarIndicadorDosesNuvem('erro');
    }
}

// ============================================
// ☁️ SALVAR NA NUVEM
// ============================================

async function salvarDosesNaNuvem() {
    try {
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            mostrarToast('⚠️ Firebase não disponível para salvar doses na nuvem.', 'erro');
            atualizarIndicadorDosesNuvem('erro');
            return;
        }

        const usuario = await obterDadosUsuario();
        if (!usuario || !usuario.organizacao) {
            mostrarToast('⚠️ Faça login e vincule sua organização antes de salvar na nuvem.', 'aviso');
            atualizarIndicadorDosesNuvem('offline');
            return;
        }

        if (!dosesAdministradas.length) {
            mostrarToast('⚠️ Nenhuma dose para salvar na nuvem.', 'aviso');
            return;
        }

        atualizarIndicadorDosesNuvem('salvando');

        const db = firebase.firestore();
        const ref = db
            .collection('organizacoes')
            .doc(usuario.organizacao)
            .collection('doses')
            .doc(DOC_DOSES_NUVEM);

        // 🔥 1) LÊ o que já existe na nuvem
        const documentoAtual = await ref.get();
        const dadosAtuais = documentoAtual.exists ? documentoAtual.data() : {};
        const registrosNuvem = Array.isArray(dadosAtuais.registros) ? dadosAtuais.registros : [];

        console.log('☁️ Nuvem tem', registrosNuvem.length, 'doses');
        console.log('💻 Local tem', dosesAdministradas.length, 'doses');

        // 🔥 2) MERGE = UNIÃO
        const registrosMesclados = mesclarDosesPorFicha(registrosNuvem, dosesAdministradas);

        console.log('✅ Após merge:', registrosMesclados.length, 'doses únicas');

        // 🔥 3) GRAVAR
        await ref.set({
            registros: registrosMesclados,
            organizacao: usuario.organizacao,
            total: registrosMesclados.length,
            ultimaAtualizacao: firebase.firestore.FieldValue.serverTimestamp(),
            atualizadoPor: usuario.uid || usuario.email || 'usuario',
            atualizadoPorEmail: usuario.email || '',
            dataBackup: new Date().toISOString()
        }, { merge: true });

        // 🔥 4) ATUALIZAR LOCAL
        dosesAdministradas = registrosMesclados
            .slice()
            .sort((a, b) => new Date(b.data) - new Date(a.data));

        // 🔥 5) RECALCULAR dosesIdCounter
        const maiorIdNumerico = dosesAdministradas.reduce((max, dose) => {
            const n = Number(dose.id);
            return (Number.isFinite(n) && n > max) ? n : max;
        }, 0);
        dosesIdCounter = Math.max(dosesIdCounter, maiorIdNumerico + 1);

        dosesFiltradas = [...dosesAdministradas];
        persistirDosesLocal();
        aplicarFiltroDoses(true);

        localStorage.setItem(STORAGE_DOSES_NUVEM_BACKUP, JSON.stringify({
            registros: dosesAdministradas,
            dataBackup: new Date().toISOString(),
            organizacao: usuario.organizacao
        }));

        window._cloudDosesCarregado = true;
        atualizarIndicadorDosesNuvem('sincronizado');

        const mensagem = `✅ ${registrosMesclados.length} doses salvas na nuvem!`;
        mostrarToast(mensagem, 'sucesso');

    } catch (erro) {
        console.error('❌ Erro ao salvar doses na nuvem:', erro);
        atualizarIndicadorDosesNuvem('erro');
        mostrarToast('❌ Não foi possível salvar as doses na nuvem.', 'erro');
    }
}

// ============================================
// ☁️ CARREGAR DA NUVEM
// ============================================

async function carregarDosesDaNuvem() {
    try {
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            mostrarToast('⚠️ Firebase não disponível para carregar doses da nuvem.', 'erro');
            atualizarIndicadorDosesNuvem('erro');
            return;
        }

        const usuario = await obterDadosUsuario();
        if (!usuario || !usuario.organizacao) {
            mostrarToast('⚠️ Faça login e vincule sua organização antes de carregar da nuvem.', 'aviso');
            atualizarIndicadorDosesNuvem('offline');
            return;
        }

        const periodo = obterPeriodoPadraoUltimos7Dias();
        const inputIni = document.getElementById('dosesFiltroDataInicio');
        const inputFim = document.getElementById('dosesFiltroDataFim');
        if (inputIni && !inputIni.value) inputIni.value = periodo.inicio;
        if (inputFim && !inputFim.value) inputFim.value = periodo.fim;

        atualizarIndicadorDosesNuvem('carregando');
        const db = firebase.firestore();
        const ref = db
            .collection('organizacoes')
            .doc(usuario.organizacao)
            .collection('doses')
            .doc(DOC_DOSES_NUVEM);

        const documento = await ref.get();
        if (!documento.exists) {
            mostrarToast('ℹ️ Nenhuma dose encontrada na nuvem para esta organização.', 'info');
            atualizarIndicadorDosesNuvem('offline');
            return;
        }

        const dados = documento.data();
        const registros = Array.isArray(dados.registros) ? dados.registros : [];

        console.log('☁️ Nuvem tem', registros.length, 'doses');
        console.log('💻 Local tem', dosesAdministradas.length, 'doses');

        const mesclados = mesclarDosesPorFicha(registros, dosesAdministradas);

        console.log('✅ Após merge:', mesclados.length, 'doses únicas');

        dosesAdministradas = mesclados
            .map(normalizarDoseAdministrada)
            .filter(Boolean)
            .sort((a, b) => new Date(b.data) - new Date(a.data));

        const maiorIdNumerico = dosesAdministradas.reduce((max, dose) => {
            const n = Number(dose.id);
            return (Number.isFinite(n) && n > max) ? n : max;
        }, 0);
        dosesIdCounter = Math.max(dosesIdCounter, maiorIdNumerico + 1);

        persistirDosesLocal();
        aplicarFiltroDoses(true);

        window._cloudDosesCarregado = true;
        atualizarIndicadorDosesNuvem('sincronizado');

        mostrarToast(
            `✅ ${dosesAdministradas.length} doses carregadas da nuvem! ` +
            `(exibindo últimos 7 dias — limpe o filtro para ver todas)`,
            'sucesso'
        );

    } catch (erro) {
        console.error('❌ Erro ao carregar doses da nuvem:', erro);
        atualizarIndicadorDosesNuvem('erro');
        if (erro?.code === 'permission-denied') {
            mostrarToast('❌ Sem permissão para ler organizacoes/.../doses.', 'erro');
        } else {
            mostrarToast('❌ Não foi possível carregar as doses da nuvem.', 'erro');
        }
    }
}

// ============================================
// 📅 UTILITÁRIOS DE DATA
// ============================================

function formatarDataLocalISO(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

function obterPeriodoPadraoUltimos7Dias() {
    const hoje = new Date();
    const inicio = new Date(hoje);
    inicio.setDate(hoje.getDate() - 6);

    return {
        inicio: formatarDataLocalISO(inicio),
        fim: formatarDataLocalISO(hoje)
    };
}

function aplicarFiltroPadraoUltimos7Dias() {
    const campos = {
        inicio: document.getElementById('dosesFiltroDataInicio'),
        fim: document.getElementById('dosesFiltroDataFim')
    };

    const periodo = obterPeriodoPadraoUltimos7Dias();
    if (campos.inicio) campos.inicio.value = periodo.inicio;
    if (campos.fim) campos.fim.value = periodo.fim;

    aplicarFiltroDoses();
}

// ============================================
// 🪟 MODAL
// ============================================

function abrirModalDoses() {
    const modal = document.getElementById('modalDoses');
    if (!modal) {
        console.error('❌ Modal #modalDoses não encontrado no DOM.');
        return;
    }

    carregarDosesSalvas();
    aplicarFiltroPadraoUltimos7Dias();
    verificarStatusDosesNuvem();

    const campoData = document.getElementById('dosesData');
    if (campoData && !campoData.value) {
        campoData.value = formatarDataLocalISO(new Date());
    }

    modal.style.display = 'flex';
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
    modal.style.pointerEvents = 'auto';
    modal.classList.add('ativo');
}

function fecharModalDoses() {
    const modal = document.getElementById('modalDoses');
    if (!modal) return;

    modal.style.display = 'none';
    modal.style.visibility = 'hidden';
    modal.style.opacity = '0';
    modal.style.pointerEvents = 'none';
    modal.classList.remove('ativo');
}

// ============================================
// 📝 CAMPOS DO FORMULÁRIO
// ============================================

function limparCamposDoses() {
    const campos = [
        'dosesNumeroFicha',
        'dosesRadiofarmaco',
        'dosesPeso',
        'dosesAtividade'
    ];

    campos.forEach(campoId => {
        const campo = document.getElementById(campoId);
        if (campo) campo.value = '';
    });

    const campoData = document.getElementById('dosesData');
    if (campoData) {
        campoData.value = formatarDataLocalISO(new Date());
    }

    const ficha = document.getElementById('dosesNumeroFicha');
    if (ficha) ficha.focus();

    atualizarMotivoDuplicidadeDose();
}

function atualizarMotivoDuplicidadeDose() {
    const campoFicha = document.getElementById('dosesNumeroFicha');
    const campoData = document.getElementById('dosesData');
    const campoMotivo = document.getElementById('dosesMotivoDuplicidade');
    const grupoMotivo = document.getElementById('grupoMotivoDuplicidadeDose');
    if (!campoFicha || !campoMotivo || !grupoMotivo) return false;

    const numeroFicha = campoFicha.value.trim();
    const dataReferencia = campoData?.value || formatarDataLocalISO(new Date());
    const fichaDuplicada = numeroFicha && fichaDuplicadaNosUltimosSeisMeses(dosesAdministradas, numeroFicha, dataReferencia);

    grupoMotivo.style.display = fichaDuplicada ? 'block' : 'none';
    campoMotivo.required = Boolean(fichaDuplicada);
    if (!fichaDuplicada) campoMotivo.value = '';

    return fichaDuplicada;
}

function fichaDuplicadaNosUltimosSeisMeses(registros = [], numeroFicha, dataReferencia = null) {
    const ficha = String(numeroFicha || '').trim();
    if (!ficha || !Array.isArray(registros)) return false;

    const dataBase = dataReferencia ? new Date(dataReferencia + 'T00:00:00') : new Date();
    if (Number.isNaN(dataBase.getTime())) return false;

    const inicio = new Date(dataBase);
    inicio.setMonth(inicio.getMonth() - 6);
    const inicioISO = formatarDataLocalISO(inicio);
    const fimISO = formatarDataLocalISO(dataBase);

    return registros.some(dose => {
        const fichaIgual = String(dose.numeroFicha || '').trim() === ficha;
        const dataValida = Boolean(dose.data && dose.data >= inicioISO && dose.data <= fimISO);
        return fichaIgual && dataValida;
    });
}

function obterInicioUltimosSeisMeses() {
    const inicio = new Date();
    inicio.setMonth(inicio.getMonth() - 6);
    return formatarDataLocalISO(inicio);
}

async function verificarFichaDuplicadaNaNuvem(numeroFicha) {
    try {
        if (typeof firebase === 'undefined' || !firebase.firestore || typeof obterDadosUsuario !== 'function') {
            return false;
        }

        const usuario = await obterDadosUsuario();
        if (!usuario?.organizacao) return false;

        const referencia = firebase.firestore()
            .collection('organizacoes')
            .doc(usuario.organizacao)
            .collection('doses')
            .doc(DOC_DOSES_NUVEM);
        const documento = await referencia.get();
        if (!documento.exists) return false;

        const registros = documento.data()?.registros;
        if (!Array.isArray(registros)) return false;

        const hoje = new Date();
        const inicio = new Date(hoje);
        inicio.setMonth(inicio.getMonth() - 6);
        const inicioISO = formatarDataLocalISO(inicio);
        const fimISO = formatarDataLocalISO(hoje);

        return registros.some(dose => {
            const fichaIgual = String(dose.numeroFicha || '').trim() === String(numeroFicha || '').trim();
            const dataValida = dose.data && dose.data >= inicioISO && dose.data <= fimISO;
            return fichaIgual && dataValida;
        });
    } catch (erro) {
        console.error('❌ Erro ao verificar ficha duplicada na nuvem:', erro);
        return false;
    }
}

// ============================================
// 🗑️ LIMPEZA / EXCLUSÃO
// ============================================

function limparHistoricoDoses() {
    if (!confirm('Deseja apagar todo o histórico de doses administradas?')) return;

    dosesAdministradas = [];
    dosesFiltradas = [];
    dosesIdCounter = 0;
    persistirDosesLocal();
    atualizarResumoDoses();
    atualizarTabelaDoses();
    mostrarToast('🗑️ Histórico de doses limpo.', 'sucesso');
}

async function removerDoseDaNuvem(id) {
    const usuario = await obterDadosUsuario();
    if (!usuario?.organizacao || usuario.role !== 'admin') {
        throw new Error('Apenas administradores podem excluir doses da nuvem.');
    }

    const db = firebase.firestore();
    const ref = db
        .collection('organizacoes')
        .doc(usuario.organizacao)
        .collection('doses')
        .doc(DOC_DOSES_NUVEM);
    const documento = await ref.get();
    const dados = documento.exists ? documento.data() : {};
    const registros = Array.isArray(dados.registros) ? dados.registros : [];
    // 🔥 Compara como string para funcionar com UUID E ID numérico
    const registrosRestantes = registros.filter(dose => String(dose.id) !== String(id));

    await ref.set({
        registros: registrosRestantes,
        organizacao: usuario.organizacao,
        total: registrosRestantes.length,
        ultimaAtualizacao: firebase.firestore.FieldValue.serverTimestamp(),
        atualizadoPor: usuario.uid || usuario.email || 'usuario',
        atualizadoPorEmail: usuario.email || '',
        dataBackup: new Date().toISOString()
    }, { merge: true });
}

// ============================================
// ➕ REGISTRAR DOSE
// ============================================

function registrarDose() {
    const data = document.getElementById('dosesData')?.value;
    const numeroFicha = document.getElementById('dosesNumeroFicha')?.value.trim();
    const radiofarmaco = (document.getElementById('dosesRadiofarmaco')?.value.trim() || '').toUpperCase();
    const peso = Number(document.getElementById('dosesPeso')?.value || 0);
    const atividade = Number(document.getElementById('dosesAtividade')?.value || 0);
    const motivo = document.getElementById('dosesMotivoDuplicidade')?.value || '';

    if (!data || !numeroFicha || !radiofarmaco || !peso || !atividade) {
        mostrarToast('⚠️ Preencha data, número da ficha, radiofármaco, peso e atividade.', 'aviso');
        return;
    }
    if (peso <= 0) {
        mostrarToast('⚠️ O peso deve ser maior que zero.', 'erro');
        return;
    }
    if (atividade < 0) {
        mostrarToast('⚠️ A atividade administrada não pode ser negativa.', 'erro');
        return;
    }

    const ehRepeticao = fichaDuplicadaNosUltimosSeisMeses(
        dosesAdministradas, numeroFicha, data
    );

    if (ehRepeticao && !motivo) {
        mostrarToast('⚠️ Esta ficha já foi registrada. Selecione o motivo da repetição.', 'aviso');
        document.getElementById('dosesMotivoDuplicidade')?.focus();
        return;
    }

    // 🔥 UUID ÚNICO GLOBAL (impossível colidir entre dispositivos)
    const novoId = gerarUuid();

    const novaDose = {
        id: novoId,
        data,
        numeroFicha,
        radiofarmaco,
        peso,
        atividade,
        mCiKg: Number((atividade / peso).toFixed(4)),
        motivo: motivo || '',
        ehRepeticao,
        criadoEm: new Date().toISOString()
    };

    dosesAdministradas.unshift(novaDose);
    persistirDosesLocal();
    aplicarFiltroDoses(true);
    limparCamposDoses();

    mostrarToast(
        ehRepeticao
            ? `✅ Repetição registrada! Ficha ${numeroFicha} agora tem ${contarDosesDaFicha(numeroFicha)} doses.`
            : `✅ Dose registrada com sucesso!`,
        'sucesso'
    );
    console.log('➕ Nova dose registrada:', novaDose);
}

function contarDosesDaFicha(numeroFicha) {
    const ficha = String(numeroFicha || '').trim();
    return dosesAdministradas.filter(d => String(d.numeroFicha).trim() === ficha).length;
}

// ============================================
// ❌ EXCLUIR DOSE
// ============================================

async function excluirDose(id) {
    if (!confirm('Deseja excluir esta dose?')) return;

    try {
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            throw new Error('Firebase não está disponível.');
        }

        atualizarIndicadorDosesNuvem('salvando');
        await removerDoseDaNuvem(id);

        // 🔥 Compara como string (funciona com UUID e numérico)
        dosesAdministradas = dosesAdministradas.filter(dose => String(dose.id) !== String(id));
        dosesFiltradas = dosesFiltradas.filter(dose => String(dose.id) !== String(id));
        persistirDosesLocal();
        atualizarResumoDoses();
        atualizarTabelaDoses();
        window._cloudDosesCarregado = true;
        atualizarIndicadorDosesNuvem('sincronizado');
        mostrarToast('🗑️ Dose removida da nuvem e do histórico local.', 'sucesso');
    } catch (erro) {
        console.error('❌ Erro ao excluir dose da nuvem:', erro);
        atualizarIndicadorDosesNuvem('erro');
        mostrarToast(`❌ ${erro.message || 'Não foi possível excluir a dose da nuvem.'}`, 'erro');
    }
}

// ============================================
// 🔍 FILTROS
// ============================================

function aplicarFiltroDoses(preservarPagina = false) {
    const paginaAnterior = paginaAtualDoses;

    const dataInicio = document.getElementById('dosesFiltroDataInicio')?.value || '';
    const dataFim = document.getElementById('dosesFiltroDataFim')?.value || '';
    const numeroFicha = document.getElementById('dosesFiltroFicha')?.value.trim() || '';
    const radiofarmaco = document.getElementById('dosesFiltroRadiofarmaco')?.value.trim().toLowerCase() || '';

    dosesFiltradas = dosesAdministradas.filter(dose => {
        const filtroDataInicio = !dataInicio || dose.data >= dataInicio;
        const filtroDataFim = !dataFim || dose.data <= dataFim;
        const filtroFicha = !numeroFicha || String(dose.numeroFicha).toLowerCase().includes(numeroFicha.toLowerCase());
        const filtroRadiofarmaco = !radiofarmaco || String(dose.radiofarmaco).toLowerCase().includes(radiofarmaco);
        return filtroDataInicio && filtroDataFim && filtroFicha && filtroRadiofarmaco;
    });

    paginaAtualDoses = preservarPagina ? paginaAnterior : 1;
    atualizarResumoDoses();
    atualizarTabelaDoses();
}

function limparFiltroDoses() {
    const inicio = document.getElementById('dosesFiltroDataInicio');
    const fim = document.getElementById('dosesFiltroDataFim');
    const ficha = document.getElementById('dosesFiltroFicha');
    const radiofarmaco = document.getElementById('dosesFiltroRadiofarmaco');

    if (inicio) inicio.value = '';
    if (fim) fim.value = '';
    if (ficha) ficha.value = '';
    if (radiofarmaco) radiofarmaco.value = '';

    dosesFiltradas = [...dosesAdministradas];
    paginaAtualDoses = 1;
    atualizarResumoDoses();
    atualizarTabelaDoses();
}

// ============================================
// 📊 RESUMO E TABELA
// ============================================

function atualizarResumoDoses() {
    const registros = dosesFiltradas.length ? dosesFiltradas : dosesAdministradas;
    const totalDoses = registros.length;
    const atividadeTotal = registros.reduce((soma, dose) => soma + (Number(dose.atividade) || 0), 0);
    const pesoTotal = registros.reduce((soma, dose) => soma + (Number(dose.peso) || 0), 0);
    const mCiKgTotal = registros.reduce((soma, dose) => soma + (Number(dose.mCiKg) || 0), 0);

    const pesoMedio = totalDoses > 0 ? pesoTotal / totalDoses : 0;
    const mCiKgMedio = totalDoses > 0 ? mCiKgTotal / totalDoses : 0;

    const elementos = {
        totalDoses: document.getElementById('dosesResumoTotal'),
        atividadeTotal: document.getElementById('dosesResumoAtividade'),
        pesoMedio: document.getElementById('dosesResumoPesoMedio'),
        mCiKgMedio: document.getElementById('dosesResumoMciKg')
    };

    if (elementos.totalDoses) elementos.totalDoses.textContent = totalDoses;
    if (elementos.atividadeTotal) elementos.atividadeTotal.textContent = `${atividadeTotal.toFixed(2)} mCi`;
    if (elementos.pesoMedio) elementos.pesoMedio.textContent = `${pesoMedio.toFixed(1)} kg`;
    if (elementos.mCiKgMedio) elementos.mCiKgMedio.textContent = `${mCiKgMedio.toFixed(2)} mCi/kg`;
}

function atualizarTabelaDoses() {
    const corpo = document.getElementById('corpoDosesAdministradas');
    const paginacao = document.getElementById('paginacaoDoses');
    if (!corpo) return;

    if (!dosesFiltradas.length) {
        corpo.innerHTML = `
            <tr>
            <td colspan="9" style="padding: 30px; text-align: center; color: #718579;">📭 Nenhuma dose registrada no período.</td>
            </tr>
        `;
        if (paginacao) paginacao.innerHTML = '';
        return;
    }

    const registrosOrdenados = dosesFiltradas
        .slice()
        .sort((a, b) => new Date(b.data) - new Date(a.data));
    const totalPaginas = Math.max(1, Math.ceil(registrosOrdenados.length / ITENS_POR_PAGINA_DOSES));
    paginaAtualDoses = Math.min(Math.max(1, paginaAtualDoses), totalPaginas);
    const inicio = (paginaAtualDoses - 1) * ITENS_POR_PAGINA_DOSES;
    const registrosPagina = registrosOrdenados.slice(inicio, inicio + ITENS_POR_PAGINA_DOSES);

    const linhas = registrosPagina
        .map((dose, index) => `
            <tr style="border-top: 1px solid rgba(255,255,255,0.06);">
                <td style="padding: 10px; color: #fff;">${inicio + index + 1}</td>
                <td style="padding: 10px; color: #dfece3;">${dose.data}</td>
                <td style="padding: 10px; color: #dfece3;">${dose.numeroFicha}</td>
                <td style="padding: 10px; color: #dfece3;">${dose.radiofarmaco || '--'}</td>
                <td style="padding: 10px; color: #dfece3;">${dose.motivo || '--'}</td>
                <td style="padding: 10px; text-align: right; color: #dfece3;">${Number(dose.peso).toFixed(1)}</td>
                <td style="padding: 10px; text-align: right; color: #dfece3;">${Number(dose.atividade).toFixed(2)}</td>
                <td style="padding: 10px; text-align: right; color: #dfece3;">${Number(dose.mCiKg).toFixed(2)}</td>
                <td style="padding: 10px; text-align: center;">
                    <button type="button" onclick="excluirDose('${dose.id}')" style="background: rgba(255,107,107,0.12); border: 1px solid rgba(255,107,107,0.4); color: #ff7a7a; border-radius: 8px; padding: 7px 10px; cursor: pointer;">🗑️</button>
                </td>
            </tr>
        `)
        .join('');

    corpo.innerHTML = linhas;
    if (paginacao) {
        const fim = Math.min(inicio + ITENS_POR_PAGINA_DOSES, registrosOrdenados.length);
        const botoes = Array.from({ length: totalPaginas }, (_, index) => {
            const pagina = index + 1;
            const ativo = pagina === paginaAtualDoses;
            return `<button type="button" onclick="irPaginaDoses(${pagina})" style="padding:4px 8px; min-width:28px; border-radius:4px; border:1px solid ${ativo ? '#ffd700' : 'rgba(255,255,255,0.12)'}; background:${ativo ? 'rgba(255,215,0,0.12)' : 'rgba(255,255,255,0.03)'}; color:${ativo ? '#ffd700' : '#dfece3'}; cursor:pointer; font-size:0.75rem;">${pagina}</button>`;
        }).join('');

        paginacao.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; margin-top:10px; color:#bfcfc5; font-size:0.75rem;">
                <div>Mostrando <strong style="color:#ffd700;">${inicio + 1}</strong> a <strong style="color:#ffd700;">${fim}</strong> de <strong style="color:#ffd700;">${registrosOrdenados.length}</strong> doses · Página <strong style="color:#ffd700;">${paginaAtualDoses}</strong> de <strong style="color:#ffd700;">${totalPaginas}</strong></div>
                <div style="display:flex; align-items:center; gap:4px; flex-wrap:wrap;">
                    <button type="button" onclick="irPaginaDoses(${paginaAtualDoses - 1})" ${paginaAtualDoses === 1 ? 'disabled' : ''} style="padding:4px 8px; border-radius:4px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.03); color:${paginaAtualDoses === 1 ? '#666' : '#dfece3'}; cursor:${paginaAtualDoses === 1 ? 'default' : 'pointer'}; font-size:0.85rem;">‹</button>
                    ${botoes}
                    <button type="button" onclick="irPaginaDoses(${paginaAtualDoses + 1})" ${paginaAtualDoses === totalPaginas ? 'disabled' : ''} style="padding:4px 8px; border-radius:4px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.03); color:${paginaAtualDoses === totalPaginas ? '#666' : '#dfece3'}; cursor:${paginaAtualDoses === totalPaginas ? 'default' : 'pointer'}; font-size:0.85rem;">›</button>
                </div>
            </div>
        `;
    }
}

function irPaginaDoses(pagina) {
    paginaAtualDoses = Math.max(1, Number(pagina) || 1);
    atualizarTabelaDoses();
}

// ============================================
// 📤 EXPORTAR EXCEL
// ============================================

function exportarExcelDoses() {
    try {
        if (typeof XLSX === 'undefined') {
            alert('❌ Biblioteca XLSX não carregada.');
            return;
        }

        const linhas = [
            ['#', 'Data', 'Nº Ficha', 'Radiofármaco', 'Motivo', 'Peso (kg)', 'Atividade (mCi)', 'mCi/kg', 'Repetição?']
        ];

        dosesFiltradas.forEach((dose, index) => {
            linhas.push([
                index + 1,
                dose.data,
                dose.numeroFicha,
                dose.radiofarmaco || '',
                dose.motivo || '',
                Number(dose.peso).toFixed(1),
                Number(dose.atividade).toFixed(2),
                Number(dose.mCiKg).toFixed(2),
                dose.ehRepeticao ? 'Sim' : 'Não'
            ]);
        });

        const workbook = XLSX.utils.book_new();
        const folha = XLSX.utils.aoa_to_sheet(linhas);
        XLSX.utils.book_append_sheet(workbook, folha, 'Doses Administradas');
        XLSX.writeFile(workbook, `doses_administradas_${new Date().toISOString().slice(0, 10)}.xlsx`);
        mostrarToast('📊 Planilha exportada com sucesso!', 'sucesso');
    } catch (erro) {
        console.error('❌ Erro ao exportar doses para Excel:', erro);
        mostrarToast('❌ Não foi possível exportar a planilha.', 'erro');
    }
}

// ============================================
// 🌐 EXPORTAÇÃO GLOBAL
// ============================================

window.abrirModalDoses = abrirModalDoses;
window.fecharModalDoses = fecharModalDoses;
window.carregarDosesSalvas = carregarDosesSalvas;
window.persistirDosesLocal = persistirDosesLocal;
window.registrarDose = registrarDose;
window.excluirDose = excluirDose;
window.limparCamposDoses = limparCamposDoses;
window.atualizarMotivoDuplicidadeDose = atualizarMotivoDuplicidadeDose;
window.verificarFichaDuplicadaNaNuvem = verificarFichaDuplicadaNaNuvem;
window.limparHistoricoDoses = limparHistoricoDoses;
window.atualizarTabelaDoses = atualizarTabelaDoses;
window.irPaginaDoses = irPaginaDoses;
window.atualizarResumoDoses = atualizarResumoDoses;
window.aplicarFiltroDoses = aplicarFiltroDoses;
window.aplicarFiltroPadraoUltimos7Dias = aplicarFiltroPadraoUltimos7Dias;
window.limparFiltroDoses = limparFiltroDoses;
window.exportarExcelDoses = exportarExcelDoses;
window.salvarDosesNaNuvem = salvarDosesNaNuvem;
window.carregarDosesDaNuvem = carregarDosesDaNuvem;
window.verificarStatusDosesNuvem = verificarStatusDosesNuvem;
window.atualizarIndicadorDosesNuvem = atualizarIndicadorDosesNuvem;
window.contarDosesDaFicha = contarDosesDaFicha;
window.gerarUuid = gerarUuid;

// ============================================
// 🚀 INICIALIZAÇÃO
// ============================================

window.addEventListener('DOMContentLoaded', () => {
    carregarDosesSalvas();
    verificarStatusDosesNuvem();
});

console.log('✅ Módulo de doses administradas carregado (UUID-ready).');
console.log('📌 IDs: novos registros usam UUID; registros antigos (numéricos) continuam funcionando.');