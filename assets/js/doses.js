// ============================================
// 💉 MÓDULO: DOSES ADMINISTRADAS
// ============================================

let dosesAdministradas = [];
let dosesFiltradas = [];
let dosesIdCounter = 0;
const ITENS_POR_PAGINA_DOSES = 30;
let paginaAtualDoses = 1;
const STORAGE_DOSES_ADMINISTRADAS = 'radiocalc_doses_administradas';
const STORAGE_DOSES_NUVEM_BACKUP = 'radiocalc_doses_nuvem_backup';
const DOC_DOSES_NUVEM = 'todas_doses';

window._cloudDosesCarregado = false;

function normalizarDoseAdministrada(dose) {
    if (!dose || typeof dose !== 'object') return null;

    const numeroFicha = String(dose.numeroFicha || '').trim();
    const radiofarmaco = String(dose.radiofarmaco || dose.exame || '').trim();
    const peso = Number(dose.peso) || 0;
    const atividade = Number(dose.atividade) || 0;
    const mCiKg = peso > 0 ? atividade / peso : 0;

    return {
        id: Number(dose.id) || 0,
        data: dose.data || '',
        numeroFicha,
        radiofarmaco,
        peso,
        atividade,
        mCiKg: Number.isFinite(mCiKg) ? Number(mCiKg.toFixed(4)) : 0,
        criadoEm: dose.criadoEm || new Date().toISOString()
    };
}

function carregarDosesSalvas() {
    try {
        const dadosSalvos = localStorage.getItem(STORAGE_DOSES_ADMINISTRADAS);
        const registros = dadosSalvos ? JSON.parse(dadosSalvos) : [];

        dosesAdministradas = Array.isArray(registros)
            ? registros
                .map(normalizarDoseAdministrada)
                .filter(Boolean)
                .sort((a, b) => new Date(b.data) - new Date(a.data) || Number(b.id) - Number(a.id))
            : [];

        dosesIdCounter = dosesAdministradas.reduce((maior, dose) => Math.max(maior, Number(dose.id) || 0), 0) + 1;
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

        await ref.set({
            registros: dosesAdministradas,
            organizacao: usuario.organizacao,
            total: dosesAdministradas.length,
            ultimaAtualizacao: firebase.firestore.FieldValue.serverTimestamp(),
            atualizadoPor: usuario.uid || usuario.email || 'usuario',
            atualizadoPorEmail: usuario.email || '',
            dataBackup: new Date().toISOString()
        }, { merge: true });

        localStorage.setItem(STORAGE_DOSES_NUVEM_BACKUP, JSON.stringify({
            registros: dosesAdministradas,
            dataBackup: new Date().toISOString(),
            organizacao: usuario.organizacao
        }));

        window._cloudDosesCarregado = true;
        atualizarIndicadorDosesNuvem('sincronizado');
        mostrarToast(`✅ ${dosesAdministradas.length} doses salvas na nuvem!`, 'sucesso');
    } catch (erro) {
        console.error('❌ Erro ao salvar doses na nuvem:', erro);
        atualizarIndicadorDosesNuvem('erro');
        mostrarToast('❌ Não foi possível salvar as doses na nuvem.', 'erro');
    }
}

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

        const inicioFiltro = document.getElementById('dosesFiltroDataInicio')?.value || obterPeriodoPadraoUltimos7Dias().inicio;
        const fimFiltro = document.getElementById('dosesFiltroDataFim')?.value || obterPeriodoPadraoUltimos7Dias().fim;

        if (inicioFiltro) document.getElementById('dosesFiltroDataInicio').value = inicioFiltro;
        if (fimFiltro) document.getElementById('dosesFiltroDataFim').value = fimFiltro;

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

        const registrosFiltrados = registros
            .map(normalizarDoseAdministrada)
            .filter(Boolean)
            .filter(dose => {
                const data = dose.data || '';
                const dentroInicio = !inicioFiltro || data >= inicioFiltro;
                const dentroFim = !fimFiltro || data <= fimFiltro;
                return dentroInicio && dentroFim;
            })
            .sort((a, b) => new Date(b.data) - new Date(a.data) || Number(b.id) - Number(a.id));

        dosesAdministradas = registrosFiltrados;
        dosesFiltradas = [...dosesAdministradas];
        dosesIdCounter = dosesAdministradas.reduce((maior, dose) => Math.max(maior, Number(dose.id) || 0), 0) + 1;
        persistirDosesLocal();
        aplicarFiltroDoses();
        window._cloudDosesCarregado = true;
        atualizarIndicadorDosesNuvem('sincronizado');
        mostrarToast(`✅ ${dosesAdministradas.length} doses carregadas da nuvem para o período selecionado!`, 'sucesso');
    } catch (erro) {
        console.error('❌ Erro ao carregar doses da nuvem:', erro);
        atualizarIndicadorDosesNuvem('erro');
        if (erro?.code === 'permission-denied') {
            mostrarToast('❌ Sem permissão para ler organizacoes/' + usuario?.organizacao + '/doses. Verifique as regras do Firestore.', 'erro');
        } else {
            mostrarToast('❌ Não foi possível carregar as doses da nuvem.', 'erro');
        }
    }
}

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

function abrirModalDoses() {
    const modal = document.getElementById('modalDoses');
    if (!modal) {
        console.error('❌ Modal #modalDoses não encontrado no DOM.');
        return;
    }

    carregarDosesSalvas();
    aplicarFiltroPadraoUltimos7Dias();
    verificarStatusDosesNuvem();
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

function limparCamposDoses() {
    const campos = [
        'dosesData',
        'dosesNumeroFicha',
        'dosesRadiofarmaco',
        'dosesPeso',
        'dosesAtividade'
    ];

    campos.forEach(campoId => {
        const campo = document.getElementById(campoId);
        if (campo) campo.value = '';
    });

    const ficha = document.getElementById('dosesNumeroFicha');
    if (ficha) ficha.focus();
}

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
    const registrosRestantes = registros.filter(dose => Number(dose.id) !== Number(id));

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

function registrarDose() {
    const data = document.getElementById('dosesData')?.value;
    const numeroFicha = document.getElementById('dosesNumeroFicha')?.value.trim();
    const radiofarmaco = document.getElementById('dosesRadiofarmaco')?.value.trim();
    const peso = Number(document.getElementById('dosesPeso')?.value || 0);
    const atividade = Number(document.getElementById('dosesAtividade')?.value || 0);

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

    const novaDose = {
        id: dosesIdCounter++,
        data,
        numeroFicha,
        radiofarmaco,
        peso,
        atividade,
        mCiKg: Number((atividade / peso).toFixed(4)),
        criadoEm: new Date().toISOString()
    };

    dosesAdministradas.unshift(novaDose);
    dosesFiltradas = [...dosesAdministradas];
    persistirDosesLocal();
    atualizarResumoDoses();
    atualizarTabelaDoses();
    limparCamposDoses();

    mostrarToast('✅ Dose registrada com sucesso!', 'sucesso');
}

async function excluirDose(id) {
    if (!confirm('Deseja excluir esta dose?')) return;

    try {
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            throw new Error('Firebase não está disponível.');
        }

        atualizarIndicadorDosesNuvem('salvando');
        await removerDoseDaNuvem(id);

        dosesAdministradas = dosesAdministradas.filter(dose => Number(dose.id) !== Number(id));
        dosesFiltradas = dosesFiltradas.filter(dose => Number(dose.id) !== Number(id));
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

function aplicarFiltroDoses() {
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

    paginaAtualDoses = 1;
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
                <td colspan="8" style="padding: 30px; text-align: center; color: #718579;">📭 Nenhuma dose registrada no período.</td>
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
                <td style="padding: 10px; text-align: right; color: #dfece3;">${Number(dose.peso).toFixed(1)}</td>
                <td style="padding: 10px; text-align: right; color: #dfece3;">${Number(dose.atividade).toFixed(2)}</td>
                <td style="padding: 10px; text-align: right; color: #dfece3;">${Number(dose.mCiKg).toFixed(2)}</td>
                <td style="padding: 10px; text-align: center;">
                    <button type="button" onclick="excluirDose(${dose.id})" style="background: rgba(255,107,107,0.12); border: 1px solid rgba(255,107,107,0.4); color: #ff7a7a; border-radius: 8px; padding: 7px 10px; cursor: pointer;">🗑️</button>
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

function exportarExcelDoses() {
    try {
        if (typeof XLSX === 'undefined') {
            alert('❌ Biblioteca XLSX não carregada.');
            return;
        }

        const linhas = [
            ['#', 'Data', 'Nº Ficha', 'Radiofármaco', 'Peso (kg)', 'Atividade (mCi)', 'mCi/kg']
        ];

        dosesFiltradas.forEach((dose, index) => {
            linhas.push([
                index + 1,
                dose.data,
                dose.numeroFicha,
                dose.radiofarmaco || '',
                Number(dose.peso).toFixed(1),
                Number(dose.atividade).toFixed(2),
                Number(dose.mCiKg).toFixed(2)
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

window.abrirModalDoses = abrirModalDoses;
window.fecharModalDoses = fecharModalDoses;
window.carregarDosesSalvas = carregarDosesSalvas;
window.persistirDosesLocal = persistirDosesLocal;
window.registrarDose = registrarDose;
window.excluirDose = excluirDose;
window.limparCamposDoses = limparCamposDoses;
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

window.addEventListener('DOMContentLoaded', () => {
    carregarDosesSalvas();
    verificarStatusDosesNuvem();
});

console.log('✅ Módulo de doses administradas carregado com sucesso.');
