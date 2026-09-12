// ============================================
// 💰 MÓDULO DE ANÁLISE DE CUSTOS
// ============================================

let precosKits = {};
let precosGeradores = {};
let graficoCustosInstance = null;
let ultimoResultadoCustosKits = { porKit: {}, porMes: {}, total: 0 };
let ultimoResultadoCustosGeradores = { detalhes: [], porMes: {}, total: 0 };
const STORAGE_PRECOS_KITS = 'radiocalc_precos_kits';
const STORAGE_PRECOS_GERADORES = 'radiocalc_precos_geradores';
const STORAGE_HISTORICO_PRECOS = 'radiocalc_historico_alteracoes_precos';
let historicoAlteracoesPrecos = [];

const KITS_CUSTOS = ['MIBI', 'MDP', 'DMSA', 'DTPA', 'FITATO', 'PIRO', 'TRODAT'];
const ATIVIDADES_GERADORES = [2000, 1500, 1250, 1000, 750, 500, 250];
const PRECOS_PADRAO_CUSTOS = {
    MIBI: 250,
    MDP: 180,
    DMSA: 200,
    DTPA: 190,
    FITATO: 170,
    PIRO: 160,
    TRODAT: 850,
    precoPorAtividade: 3500
};

// ============================================
// 💾 PERSISTÊNCIA DOS PREÇOS
// ============================================

function carregarPrecosKits() {
    try {
        const dados = localStorage.getItem(STORAGE_PRECOS_KITS);
        precosKits = dados ? JSON.parse(dados) : {};
        if (!precosKits || typeof precosKits !== 'object' || Array.isArray(precosKits)) {
            precosKits = {};
        }
    } catch (erro) {
        console.error('❌ Erro ao carregar preços dos kits:', erro);
        precosKits = {};
    }

    return precosKits;
}

function carregarPrecosGeradores() {
    try {
        const dados = localStorage.getItem(STORAGE_PRECOS_GERADORES);
        precosGeradores = dados ? JSON.parse(dados) : {};
        if (!precosGeradores || typeof precosGeradores !== 'object' || Array.isArray(precosGeradores)) {
            precosGeradores = {};
        }
        const precoLegado = precosGeradores.precoPorAtividade ?? precosGeradores.precoPadrao;
        if (precoLegado !== undefined) {
            ATIVIDADES_GERADORES.forEach(atividade => {
                if (precosGeradores[atividade] === undefined) {
                    precosGeradores[atividade] = precoLegado;
                }
            });
            delete precosGeradores.precoPorAtividade;
            delete precosGeradores.precoPadrao;
            salvarPrecosGeradoresStorage();
        }
    } catch (erro) {
        console.error('❌ Erro ao carregar preços dos geradores:', erro);
        precosGeradores = {};
    }

    return precosGeradores;
}

function salvarPrecosKitsStorage() {
    try {
        localStorage.setItem(STORAGE_PRECOS_KITS, JSON.stringify(precosKits));
        return true;
    } catch (erro) {
        console.error('❌ Erro ao salvar preços dos kits:', erro);
        return false;
    }
}

function salvarPrecosGeradoresStorage() {
    try {
        localStorage.setItem(STORAGE_PRECOS_GERADORES, JSON.stringify(precosGeradores));
        return true;
    } catch (erro) {
        console.error('❌ Erro ao salvar preços dos geradores:', erro);
        return false;
    }
}

async function obterContextoNuvemCustos() {
    try {
        if (typeof firebase === 'undefined' || !firebase.firestore) return null;
        if (typeof verificarUsuarioLogado !== 'function') return null;

        const usuario = await verificarUsuarioLogado();
        if (!usuario?.organizacao || usuario.role !== 'admin') return null;

        if (typeof inicializarFirestore === 'function' && typeof dbEstoque !== 'undefined' && !dbEstoque) {
            await inicializarFirestore();
        }
        if (typeof dbEstoque === 'undefined' || !dbEstoque) return null;

        return { db: dbEstoque, usuario };
    } catch (erro) {
        console.error('❌ Erro ao obter contexto do Firestore para custos:', erro);
        return null;
    }
}

async function carregarPrecosCustosNuvem() {
    try {
        const contexto = await obterContextoNuvemCustos();
        if (!contexto) return false;

        const configuracaoRef = contexto.db
            .collection('organizacoes')
            .doc(contexto.usuario.organizacao)
            .collection('configuracoes')
            .doc('custos');
        const configuracao = await configuracaoRef.get();

        if (configuracao.exists) {
            const dados = configuracao.data();
            if (dados.precosKits && typeof dados.precosKits === 'object') precosKits = dados.precosKits;
            if (dados.precosGeradores && typeof dados.precosGeradores === 'object') precosGeradores = dados.precosGeradores;
            salvarPrecosKitsStorage();
            salvarPrecosGeradoresStorage();
        }

        const historicoSnapshot = await configuracaoRef.collection('historicoPrecos').get();
        historicoAlteracoesPrecos = historicoSnapshot.docs
            .map(documento => ({ id: documento.id, ...documento.data() }))
            .sort((alteracaoA, alteracaoB) => new Date(alteracaoB.dataHora) - new Date(alteracaoA.dataHora));
        localStorage.setItem(STORAGE_HISTORICO_PRECOS, JSON.stringify(historicoAlteracoesPrecos));
        renderizarListaPrecosKits();
        renderizarListaPrecosGeradores();
        renderizarHistoricoAlteracoes();
        console.log('☁️ Preços de custos carregados da organização.');
        return true;
    } catch (erro) {
        console.error('❌ Erro ao carregar preços de custos da nuvem:', erro);
        return false;
    }
}

async function salvarPrecosCustosNuvem(alteracoes = []) {
    try {
        const contexto = await obterContextoNuvemCustos();
        if (!contexto) return false;

        const configuracaoRef = contexto.db
            .collection('organizacoes')
            .doc(contexto.usuario.organizacao)
            .collection('configuracoes')
            .doc('custos');
        await configuracaoRef.set({
            precosKits,
            precosGeradores,
            atualizadoEm: firebase.firestore.FieldValue.serverTimestamp(),
            atualizadoPor: contexto.usuario.email
        }, { merge: true });

        for (const alteracao of alteracoes) {
            await configuracaoRef.collection('historicoPrecos').add({
                ...alteracao,
                organizacao: contexto.usuario.organizacao,
                sincronizadoEm: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        console.log('☁️ Preços de custos salvos na organização.');
        return true;
    } catch (erro) {
        console.error('❌ Erro ao salvar preços de custos na nuvem:', erro);
        return false;
    }
}

async function importarPrecosCustosNuvem() {
    const carregado = await carregarPrecosCustosNuvem();
    mostrarToastCustos(carregado
        ? '✅ Preços importados da nuvem da organização!'
        : '⚠️ Não foi possível importar os preços da nuvem.');
}

async function salvarPrecosCustosNuvemManual() {
    const salvo = await salvarPrecosCustosNuvem();
    mostrarToastCustos(salvo
        ? '✅ Preços salvos na nuvem da organização!'
        : '⚠️ Não foi possível salvar os preços na nuvem.');
}

// ============================================
// 📊 CÁLCULO E FORMATAÇÃO DE CUSTOS
// ============================================

function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(Number(valor) || 0);
}

function obterDataTimestamp(valor) {
    if (!valor) return null;
    if (typeof valor.toDate === 'function') return valor.toDate();
    if (typeof valor === 'number') return new Date(valor);
    return new Date(valor);
}

function obterMesCusto(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    return `${ano}-${mes}`;
}

function escaparHtmlCusto(valor) {
    return String(valor ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function calcularCustosPeriodo() {
    try {
        const inicio = document.getElementById('custoDataInicio')?.value;
        const fim = document.getElementById('custoDataFim')?.value;

        if (!inicio || !fim) {
            alert('⚠️ Preencha as datas inicial e final.');
            return;
        }

        const dtIni = new Date(`${inicio}T00:00:00`).getTime();
        const dtFim = new Date(`${fim}T23:59:59.999`).getTime();

        if (Number.isNaN(dtIni) || Number.isNaN(dtFim) || dtIni > dtFim) {
            alert('⚠️ Informe um período válido: a data inicial deve ser anterior ou igual à data final.');
            return;
        }

        const resultadoKits = calcularCustosKits(dtIni, dtFim);
        const resultadoGeradores = calcularCustosGeradores(dtIni, dtFim);
        ultimoResultadoCustosKits = resultadoKits;
        ultimoResultadoCustosGeradores = resultadoGeradores;
        const totalKits = resultadoKits.total;
        const totalGeradores = resultadoGeradores.total;
        const totalGeral = totalKits + totalGeradores;

        const totalKitsEl = document.getElementById('custoTotalKits');
        const totalGeradoresEl = document.getElementById('custoTotalGeradores');
        const totalGeralEl = document.getElementById('custoTotalGeral');
        if (totalKitsEl) totalKitsEl.textContent = formatarMoeda(totalKits);
        if (totalGeradoresEl) totalGeradoresEl.textContent = formatarMoeda(totalGeradores);
        if (totalGeralEl) totalGeralEl.textContent = formatarMoeda(totalGeral);

        renderizarCustosKits(resultadoKits);
        renderizarCustosGeradores(resultadoGeradores);

        if (typeof renderizarGraficoCustos === 'function') {
            renderizarGraficoCustos(resultadoKits.porMes, resultadoGeradores.porMes);
        }

        return { kits: resultadoKits, geradores: resultadoGeradores, totalGeral };
    } catch (erro) {
        console.error('❌ Erro ao calcular custos do período:', erro);
        alert('⚠️ Não foi possível calcular os custos do período.');
        return null;
    }
}

function calcularCustosKits(dtIni, dtFim) {
    const porKit = {};
    const porMes = {};
    let total = 0;
    const historico = typeof historicoMovimentacoes !== 'undefined'
        ? historicoMovimentacoes
        : [];

    historico.forEach(evento => {
        // O custo deve refletir o consumo real dos frascos, portanto considera saídas.
        if (evento.tipoMovimento !== 'saida') return;

        const dataEvento = obterDataTimestamp(evento.timestamp || evento.dataHora);
        const timestamp = dataEvento?.getTime();
        if (!dataEvento || Number.isNaN(timestamp) || timestamp < dtIni || timestamp > dtFim) return;

        const kit = evento.tipoKit || 'Não informado';
        const precoUnit = evento.precoUnitarioAplicado !== null
            && evento.precoUnitarioAplicado !== undefined
            ? Number(evento.precoUnitarioAplicado) || 0
            : Number(precosKits[kit]) || 0;
        const quantidade = Number(evento.quantidade) || 0;
        if (precoUnit <= 0 || quantidade <= 0) return;

        const subtotal = precoUnit * quantidade;
        if (!porKit[kit]) {
            porKit[kit] = { quantidade: 0, subtotal: 0, precoUnit };
        }
        porKit[kit].quantidade += quantidade;
        porKit[kit].subtotal += subtotal;
        total += subtotal;

        const mes = obterMesCusto(dataEvento);
        porMes[mes] = (porMes[mes] || 0) + subtotal;
    });

    return { porKit, porMes, total };
}

function calcularCustosGeradores(dtIni, dtFim) {
    const detalhes = [];
    const porMes = {};
    let total = 0;
    const registros = typeof registrosGerador !== 'undefined'
        ? registrosGerador
        : [];

    registros.forEach(registro => {
        if (!registro.dataRecebimento) return;

        const dataRecebimento = obterDataTimestamp(`${registro.dataRecebimento}T00:00:00`);
        const timestamp = dataRecebimento?.getTime();
        if (!dataRecebimento || Number.isNaN(timestamp) || timestamp < dtIni || timestamp > dtFim) return;

        const atividade = Number.parseFloat(registro.atividade) || 0;
        const preco = registro.precoAplicado !== null
            && registro.precoAplicado !== undefined
            ? Number.parseFloat(registro.precoAplicado) || 0
            : Number.parseFloat(precosGeradores[atividade]) || 0;
        if (atividade <= 0 || preco <= 0) return;

        detalhes.push({
            lote: registro.lote || 'Não informado',
            dataRecebimento: registro.dataRecebimento,
            atividade,
            preco
        });
        total += preco;

        const mes = obterMesCusto(dataRecebimento);
        porMes[mes] = (porMes[mes] || 0) + preco;
    });

    return { detalhes, porMes, total };
}

function renderizarCustosKits(resultado) {
    const corpo = document.getElementById('corpoCustosKits');
    if (!corpo) return;

    const itens = Object.entries(resultado.porKit)
        .sort(([, itemA], [, itemB]) => itemB.subtotal - itemA.subtotal);

    if (itens.length === 0) {
        corpo.innerHTML = '<tr><td colspan="5" style="padding: 25px; text-align: center; color: #718579;">📭 Nenhum dado no período</td></tr>';
        return;
    }

    corpo.innerHTML = itens.map(([kit, item]) => {
        const percentual = resultado.total > 0 ? (item.subtotal / resultado.total) * 100 : 0;
        const nomeKit = typeof getNomeKit === 'function' ? getNomeKit(kit) : kit;
        return `<tr style="border-top: 1px solid rgba(255,255,255,0.06);">
            <td style="padding: 10px; color: #fff;">${escaparHtmlCusto(nomeKit)}</td>
            <td style="padding: 10px; text-align: right; color: #b9c9bd;">${formatarMoeda(item.precoUnit)}</td>
            <td style="padding: 10px; text-align: right; color: #b9c9bd;">${item.quantidade}</td>
            <td style="padding: 10px; text-align: right; color: #b9c9bd;">${formatarMoeda(item.subtotal)}</td>
            <td style="padding: 10px; text-align: right; color: #b9c9bd;">${percentual.toFixed(1)}%</td>
        </tr>`;
    }).join('') + `<tr style="border-top: 2px solid #2ecc71;">
        <td colspan="3" style="padding: 12px; color: #2ecc71; font-weight: 700;">TOTAL</td>
        <td style="padding: 12px; text-align: right; color: #2ecc71; font-weight: 700;">${formatarMoeda(resultado.total)}</td>
        <td style="padding: 12px; text-align: right; color: #2ecc71; font-weight: 700;">100,0%</td>
    </tr>`;
}

function renderizarCustosGeradores(resultado) {
    const corpo = document.getElementById('corpoCustosGeradores');
    if (!corpo) return;

    if (resultado.detalhes.length === 0) {
        corpo.innerHTML = '<tr><td colspan="4" style="padding: 25px; text-align: center; color: #718579;">📭 Nenhum dado no período</td></tr>';
        return;
    }

    corpo.innerHTML = resultado.detalhes.map(item => `<tr style="border-top: 1px solid rgba(255,255,255,0.06);">
        <td style="padding: 10px; color: #fff;">${escaparHtmlCusto(item.lote)}</td>
        <td style="padding: 10px; color: #b9c9bd;">${escaparHtmlCusto(item.dataRecebimento)}</td>
        <td style="padding: 10px; text-align: right; color: #b9c9bd;">${escaparHtmlCusto(item.atividade)}</td>
        <td style="padding: 10px; text-align: right; color: #b9c9bd;">${formatarMoeda(item.preco)}</td>
    </tr>`).join('') + `<tr style="border-top: 2px solid #00d2ff;">
        <td colspan="3" style="padding: 12px; color: #00d2ff; font-weight: 700;">TOTAL</td>
        <td style="padding: 12px; text-align: right; color: #00d2ff; font-weight: 700;">${formatarMoeda(resultado.total)}</td>
    </tr>`;
}

// ============================================
// 💵 CADASTRO DE PREÇOS E HISTÓRICO
// ============================================

function obterValorPreco(valor) {
    const numero = parseFloat(valor);
    return Number.isFinite(numero) && numero > 0 ? numero : 0;
}

function renderizarListaPrecosKits() {
    const lista = document.getElementById('listaPrecosKitsEdit');
    if (!lista) return;

    lista.innerHTML = KITS_CUSTOS.map(kit => {
        const valor = precosKits[kit] || '';
        return `<label style="color: #b9c9bd; font-size: 0.85rem;">
            ${escaparHtmlCusto(kit)} - preço unitário por frasco (R$)
            <input type="number" id="precoKit_${escaparHtmlCusto(kit)}" data-kit="${escaparHtmlCusto(kit)}" value="${valor}" placeholder="0.00" min="0" step="0.01" style="display: block; width: 100%; box-sizing: border-box; margin-top: 6px; padding: 10px; border: 1px solid #40554a; border-radius: 7px; background: #202d26; color: #fff;">
        </label>`;
    }).join('');
}

function renderizarListaPrecosGeradores() {
    const lista = document.getElementById('listaPrecosGeradoresEdit');
    if (!lista) return;

    lista.innerHTML = ATIVIDADES_GERADORES.map(atividade => `
        <label style="color: #b9c9bd; font-size: 0.85rem;">
            ${atividade} mCi (R$)
            <input type="number" id="precoGerador_${atividade}" data-atividade="${atividade}" value="${precosGeradores[atividade] || ''}" placeholder="0,00" min="0" step="0.01" style="display: block; width: 100%; box-sizing: border-box; margin-top: 6px; padding: 10px; border: 1px solid #40554a; border-radius: 7px; background: #202d26; color: #fff;">
        </label>`).join('');
}

function obterUsuarioAtual() {
    try {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            const usuario = firebase.auth().currentUser;
            return usuario?.displayName || usuario?.email || 'Sistema';
        }
    } catch (erro) {
        console.error('❌ Erro ao obter usuário atual:', erro);
    }
    return 'Sistema';
}

function registrarAlteracaoPreco(item, valorAntigo, valorNovo) {
    const antigo = obterValorPreco(valorAntigo);
    const novo = obterValorPreco(valorNovo);
    if (antigo === novo) return;

    historicoAlteracoesPrecos.push({
        dataHora: new Date().toISOString(),
        usuario: obterUsuarioAtual(),
        item,
        valorAnterior: antigo,
        valorNovo: novo
    });

    try {
        localStorage.setItem(STORAGE_HISTORICO_PRECOS, JSON.stringify(historicoAlteracoesPrecos));
    } catch (erro) {
        console.error('❌ Erro ao salvar histórico de preços:', erro);
    }
}

function renderizarHistoricoAlteracoes() {
    const corpo = document.getElementById('corpoHistoricoCustos');
    if (!corpo) return;

    const historicoOrdenado = [...historicoAlteracoesPrecos].sort(
        (alteracaoA, alteracaoB) => new Date(alteracaoB.dataHora) - new Date(alteracaoA.dataHora)
    );

    if (historicoOrdenado.length === 0) {
        corpo.innerHTML = '<tr><td colspan="6" style="padding: 30px; text-align: center; color: #718579;">Nenhuma alteração registrada</td></tr>';
        return;
    }

    corpo.innerHTML = historicoOrdenado.map(alteracao => {
        const anterior = obterValorPreco(alteracao.valorAnterior);
        const novo = obterValorPreco(alteracao.valorNovo);
        const variacao = anterior > 0 ? ((novo - anterior) / anterior) * 100 : null;
        const dataHora = new Date(alteracao.dataHora).toLocaleString('pt-BR');
        const variacaoTexto = variacao === null ? 'N/A' : `${variacao >= 0 ? '+' : ''}${variacao.toFixed(1)}%`;
        const corVariacao = variacao !== null && variacao < 0 ? '#2ecc71' : '#ffb347';

        return `<tr style="border-top: 1px solid rgba(255,255,255,0.06);">
            <td style="padding: 10px; color: #b9c9bd;">${escaparHtmlCusto(dataHora)}</td>
            <td style="padding: 10px; color: #b9c9bd;">${escaparHtmlCusto(alteracao.usuario || 'Sistema')}</td>
            <td style="padding: 10px; color: #fff;">${escaparHtmlCusto(alteracao.item)}</td>
            <td style="padding: 10px; text-align: right; color: #b9c9bd;">${formatarMoeda(anterior)}</td>
            <td style="padding: 10px; text-align: right; color: #b9c9bd;">${formatarMoeda(novo)}</td>
            <td style="padding: 10px; text-align: right; color: ${corVariacao};">${variacaoTexto}</td>
        </tr>`;
    }).join('');
}

function mostrarToastCustos(mensagem) {
    if (typeof mostrarToast === 'function') {
        mostrarToast(mensagem, 'sucesso');
    } else {
        alert(mensagem);
    }
}

async function salvarTodosPrecos() {
    try {
        const quantidadeHistoricoAntes = historicoAlteracoesPrecos.length;
        const kitsAnteriores = { ...precosKits };
        const geradoresAnteriores = { ...precosGeradores };
        const novosPrecosKits = {};

        KITS_CUSTOS.forEach(kit => {
            const input = document.getElementById(`precoKit_${kit}`);
            const novoValor = obterValorPreco(input?.value);
            novosPrecosKits[kit] = novoValor;
            registrarAlteracaoPreco(`Kit ${kit}`, kitsAnteriores[kit], novoValor);
        });

        const novosPrecosGeradores = {};
        ATIVIDADES_GERADORES.forEach(atividade => {
            const input = document.getElementById(`precoGerador_${atividade}`);
            const novoValor = obterValorPreco(input?.value);
            novosPrecosGeradores[atividade] = novoValor;
            registrarAlteracaoPreco(
                `Gerador - atividade ${atividade} mCi`,
                geradoresAnteriores[atividade],
                novoValor
            );
        });

        precosKits = novosPrecosKits;
        precosGeradores = novosPrecosGeradores;
        salvarPrecosKitsStorage();
        salvarPrecosGeradoresStorage();
        const novasAlteracoes = historicoAlteracoesPrecos.slice(quantidadeHistoricoAntes);
        const salvoNaNuvem = await salvarPrecosCustosNuvem(novasAlteracoes);
        renderizarHistoricoAlteracoes();
        mostrarToastCustos(salvoNaNuvem
            ? '✅ Preços salvos localmente e na nuvem da organização!'
            : '✅ Preços salvos localmente. Nuvem indisponível no momento.');

        if (typeof calcularCustosPeriodo === 'function') calcularCustosPeriodo();
    } catch (erro) {
        console.error('❌ Erro ao salvar preços:', erro);
        alert('⚠️ Não foi possível salvar os preços.');
    }
}

function restaurarPrecosPadrao() {
    if (!confirm('Deseja restaurar os preços padrão?')) return;

    precosKits = {};
    precosGeradores = {};
    KITS_CUSTOS.forEach(kit => {
        precosKits[kit] = PRECOS_PADRAO_CUSTOS[kit];
    });
    ATIVIDADES_GERADORES.forEach(atividade => {
        precosGeradores[atividade] = PRECOS_PADRAO_CUSTOS.precoPorAtividade;
    });
    renderizarListaPrecosKits();
    renderizarListaPrecosGeradores();
}

// ============================================
// 📈 GRÁFICO, EXPORTAÇÃO E INICIALIZAÇÃO
// ============================================

function formatarMesGraficoCustos(chaveMes) {
    const [ano, mes] = chaveMes.split('-').map(Number);
    const data = new Date(ano, mes - 1, 1);
    const nomeMes = new Intl.DateTimeFormat('pt-BR', { month: 'short' })
        .format(data)
        .replace('.', '');
    return `${nomeMes.charAt(0).toUpperCase()}${nomeMes.slice(1)}/${String(ano).slice(-2)}`;
}

function renderizarGraficoCustos(porMesKits = {}, porMesGeradores = {}) {
    try {
        const canvas = document.getElementById('graficoCustos');
        if (!canvas) return;

        if (graficoCustosInstance) {
            graficoCustosInstance.destroy();
            graficoCustosInstance = null;
        }

        if (typeof Chart === 'undefined') {
            console.error('❌ Chart.js não está carregado.');
            return;
        }

        const meses = [...new Set([
            ...Object.keys(porMesKits || {}),
            ...Object.keys(porMesGeradores || {})
        ])].sort();

        graficoCustosInstance = new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: meses.map(formatarMesGraficoCustos),
                datasets: [
                    {
                        label: '📦 Kits',
                        data: meses.map(mes => Number(porMesKits?.[mes]) || 0),
                        backgroundColor: '#2ecc71',
                        borderColor: '#2ecc71',
                        borderWidth: 1
                    },
                    {
                        label: '⚛️ Geradores',
                        data: meses.map(mes => Number(porMesGeradores?.[mes]) || 0),
                        backgroundColor: '#00d2ff',
                        borderColor: '#00d2ff',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { stacked: true, ticks: { color: '#b9c9bd' }, grid: { color: 'rgba(255,255,255,0.06)' } },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        ticks: {
                            color: '#b9c9bd',
                            callback: valor => formatarMoeda(valor)
                        },
                        grid: { color: 'rgba(255,255,255,0.08)' }
                    }
                },
                plugins: {
                    legend: { labels: { color: '#fff' } },
                    tooltip: {
                        callbacks: {
                            label: contexto => `${contexto.dataset.label}: ${formatarMoeda(contexto.raw)}`
                        }
                    }
                }
            }
        });
    } catch (erro) {
        console.error('❌ Erro ao renderizar gráfico de custos:', erro);
    }
}

function exportarCustosExcel() {
    try {
        if (typeof XLSX === 'undefined') {
            alert('❌ A biblioteca XLSX não está carregada.');
            return;
        }

        const dadosKits = [['Kit', 'Preço Unitário por Frasco', 'Qtd. de Frascos', 'Subtotal', '%']];
        Object.entries(ultimoResultadoCustosKits.porKit)
            .sort(([, itemA], [, itemB]) => itemB.subtotal - itemA.subtotal)
            .forEach(([kit, item]) => {
                const percentual = ultimoResultadoCustosKits.total > 0
                    ? (item.subtotal / ultimoResultadoCustosKits.total) * 100
                    : 0;
                const nomeKit = typeof getNomeKit === 'function' ? getNomeKit(kit) : kit;
                dadosKits.push([nomeKit, item.precoUnit, item.quantidade, item.subtotal, percentual / 100]);
            });
        dadosKits.push(['TOTAL', '', '', ultimoResultadoCustosKits.total, 1]);

        const dadosGeradores = [['Lote', 'Data', 'Atividade', 'Preço']];
        ultimoResultadoCustosGeradores.detalhes.forEach(item => {
            dadosGeradores.push([item.lote, item.dataRecebimento, item.atividade, item.preco]);
        });
        dadosGeradores.push(['TOTAL', '', '', ultimoResultadoCustosGeradores.total]);

        const pasta = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(pasta, XLSX.utils.aoa_to_sheet(dadosKits), 'Kits');
        XLSX.utils.book_append_sheet(pasta, XLSX.utils.aoa_to_sheet(dadosGeradores), 'Geradores');
        XLSX.writeFile(pasta, `Custos_${formatarDataInputCustos(new Date())}.xlsx`);
    } catch (erro) {
        console.error('❌ Erro ao exportar custos:', erro);
        alert('⚠️ Não foi possível exportar os custos.');
    }
}

async function verificarAdminCustos() {
    try {
        if (typeof verificarAdmin === 'function') {
            return await verificarAdmin();
        }

        if (typeof firebase === 'undefined' || !firebase.auth || !firebase.firestore) return false;
        const usuario = firebase.auth().currentUser;
        if (!usuario) return false;

        const documento = await firebase.firestore().collection('users').doc(usuario.uid).get();
        return documento.exists && documento.data()?.role === 'admin';
    } catch (erro) {
        console.error('❌ Erro ao verificar administrador de custos:', erro);
        return false;
    }
}

async function inicializarModuloCustos() {
    try {
        carregarPrecosKits();
        carregarPrecosGeradores();
        await carregarPrecosCustosNuvem();

        const card = document.getElementById('cardCustos');
        if (card) card.style.display = 'none';
        if (card && await verificarAdminCustos()) {
            card.style.display = '';
        }

        document.querySelectorAll('#modalCustos button[onclick^="trocarAbaCustos"]').forEach(botao => {
            if (botao.dataset.custosListener === 'true') return;
            botao.dataset.custosListener = 'true';
            botao.addEventListener('click', () => {
                const correspondencia = botao.getAttribute('onclick')?.match(/'([^']+)'/);
                if (correspondencia) trocarAbaCustos(correspondencia[1]);
            });
        });
    } catch (erro) {
        console.error('❌ Erro ao inicializar módulo de custos:', erro);
    }
}

async function atualizarAcessoModuloCustos() {
    const card = document.getElementById('cardCustos');
    const modal = document.getElementById('modalCustos');
    const isAdmin = await verificarAdminCustos();

    if (card) card.style.display = isAdmin ? '' : 'none';
    if (!isAdmin && modal) modal.style.display = 'none';
}

// ============================================
// 🪟 MODAL E ABAS
// ============================================

function formatarDataInputCustos(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

async function abrirModalCustos() {
    try {
        if (!await verificarAdminCustos()) {
            const modalBloqueado = document.getElementById('modalCustos');
            if (modalBloqueado) modalBloqueado.style.display = 'none';
            console.warn('🔒 Acesso negado ao módulo de custos.');
            return;
        }

        const modal = document.getElementById('modalCustos');
        if (!modal) {
            console.error('❌ Modal de custos não encontrado.');
            return;
        }

        carregarPrecosKits();
        carregarPrecosGeradores();

        const hoje = new Date();
        const dataInicio = new Date(hoje);
        dataInicio.setDate(dataInicio.getDate() - 90);

        const campoInicio = document.getElementById('custoDataInicio');
        const campoFim = document.getElementById('custoDataFim');
        if (campoInicio) campoInicio.value = formatarDataInputCustos(dataInicio);
        if (campoFim) campoFim.value = formatarDataInputCustos(hoje);

        renderizarListaPrecosKits();
        renderizarListaPrecosGeradores();
        renderizarHistoricoAlteracoes();
        modal.style.display = 'flex';
        trocarAbaCustos('analise');

        if (typeof calcularCustosPeriodo === 'function') {
            await calcularCustosPeriodo();
        }
    } catch (erro) {
        console.error('❌ Erro ao abrir modal de custos:', erro);
    }
}

function fecharModalCustos() {
    try {
        const modal = document.getElementById('modalCustos');
        if (modal) modal.style.display = 'none';
    } catch (erro) {
        console.error('❌ Erro ao fechar modal de custos:', erro);
    }
}

function trocarAbaCustos(aba) {
    try {
        const abas = {
            analise: document.getElementById('abaCustosAnalise'),
            precos: document.getElementById('abaCustosPrecos'),
            historico: document.getElementById('abaCustosHistorico')
        };

        Object.entries(abas).forEach(([nomeAba, elemento]) => {
            if (elemento) elemento.style.display = nomeAba === aba ? 'block' : 'none';
        });

        const botoes = {
            analise: document.querySelector("[onclick=\"trocarAbaCustos('analise')\"]"),
            precos: document.querySelector("[onclick=\"trocarAbaCustos('precos')\"]"),
            historico: document.querySelector("[onclick=\"trocarAbaCustos('historico')\"]")
        };

        Object.entries(botoes).forEach(([nomeAba, botao]) => {
            if (!botao) return;
            const ativo = nomeAba === aba;
            botao.style.borderBottom = ativo ? '3px solid #2ecc71' : '1px solid rgba(255,255,255,0.12)';
            botao.style.color = ativo ? '#2ecc71' : '#a8b8ae';
            botao.style.background = ativo ? 'rgba(46,204,113,0.2)' : 'rgba(255,255,255,0.04)';
        });
    } catch (erro) {
        console.error('❌ Erro ao trocar aba de custos:', erro);
    }
}

function aplicarPeriodoRapidoCustos(dias) {
    try {
        const campoInicio = document.getElementById('custoDataInicio');
        const campoFim = document.getElementById('custoDataFim');
        if (!campoInicio || !campoFim) return;

        const hoje = new Date();
        const dataInicio = new Date(hoje);
        dataInicio.setDate(dataInicio.getDate() - Number(dias));

        campoInicio.value = formatarDataInputCustos(dataInicio);
        campoFim.value = formatarDataInputCustos(hoje);

        if (typeof calcularCustosPeriodo === 'function') {
            calcularCustosPeriodo();
        }
    } catch (erro) {
        console.error('❌ Erro ao aplicar período rápido de custos:', erro);
    }
}

// Compatibilidade com os atalhos já presentes no HTML do modal.
function aplicarPeriodoCustos(dias) {
    aplicarPeriodoRapidoCustos(dias);
}

// ============================================
// 🌐 EXPORTAÇÃO GLOBAL
// ============================================

window.carregarPrecosKits = carregarPrecosKits;
window.carregarPrecosGeradores = carregarPrecosGeradores;
window.salvarPrecosKitsStorage = salvarPrecosKitsStorage;
window.salvarPrecosGeradoresStorage = salvarPrecosGeradoresStorage;
window.carregarPrecosCustosNuvem = carregarPrecosCustosNuvem;
window.salvarPrecosCustosNuvem = salvarPrecosCustosNuvem;
window.importarPrecosCustosNuvem = importarPrecosCustosNuvem;
window.salvarPrecosCustosNuvemManual = salvarPrecosCustosNuvemManual;
window.formatarMoeda = formatarMoeda;
window.calcularCustosPeriodo = calcularCustosPeriodo;
window.calcularCustosKits = calcularCustosKits;
window.calcularCustosGeradores = calcularCustosGeradores;
window.renderizarCustosKits = renderizarCustosKits;
window.renderizarCustosGeradores = renderizarCustosGeradores;
window.renderizarGraficoCustos = renderizarGraficoCustos;
window.exportarCustosExcel = exportarCustosExcel;
window.verificarAdminCustos = verificarAdminCustos;
window.inicializarModuloCustos = inicializarModuloCustos;
window.atualizarAcessoModuloCustos = atualizarAcessoModuloCustos;
window.renderizarListaPrecosKits = renderizarListaPrecosKits;
window.renderizarListaPrecosGeradores = renderizarListaPrecosGeradores;
window.salvarTodosPrecos = salvarTodosPrecos;
window.salvarTodosOsPrecos = salvarTodosPrecos;
window.restaurarPrecosPadrao = restaurarPrecosPadrao;
window.registrarAlteracaoPreco = registrarAlteracaoPreco;
window.renderizarHistoricoAlteracoes = renderizarHistoricoAlteracoes;
window.obterUsuarioAtual = obterUsuarioAtual;
window.abrirModalCustos = abrirModalCustos;
window.fecharModalCustos = fecharModalCustos;
window.trocarAbaCustos = trocarAbaCustos;
window.aplicarPeriodoRapidoCustos = aplicarPeriodoRapidoCustos;
window.aplicarPeriodoCustos = aplicarPeriodoCustos;

window.addEventListener('DOMContentLoaded', () => {
    carregarPrecosKits();
    carregarPrecosGeradores();
    try {
        const historicoSalvo = localStorage.getItem(STORAGE_HISTORICO_PRECOS);
        historicoAlteracoesPrecos = historicoSalvo ? JSON.parse(historicoSalvo) : [];
        if (!Array.isArray(historicoAlteracoesPrecos)) historicoAlteracoesPrecos = [];
    } catch (erro) {
        console.error('❌ Erro ao carregar histórico de preços:', erro);
        historicoAlteracoesPrecos = [];
    }
    inicializarModuloCustos();
});

document.addEventListener('userLoggedIn', atualizarAcessoModuloCustos);
document.addEventListener('userLoggedOut', () => {
    const card = document.getElementById('cardCustos');
    const modal = document.getElementById('modalCustos');
    if (card) card.style.display = 'none';
    if (modal) modal.style.display = 'none';
});
