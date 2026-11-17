// ====== FUNÇÕES AUXILIARES ======

function getLambda(isotopo) {
    return 0.693 / MEIA_VIDA_MIN[isotopo];
}

function calcularFatorDecaimento(isotopo, dtMin) {
    const lambda = getLambda(isotopo);
    return Math.exp(-lambda * Math.max(0, dtMin));
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function selecionarHistoricoParaCache(registros, obterData) {
    const limiteData = Date.now() - 90 * 24 * 60 * 60 * 1000;

    return (Array.isArray(registros) ? registros : [])
        .map((registro, indice) => ({
            registro,
            indice,
            timestamp: new Date(obterData(registro) || '').getTime()
        }))
        .filter(item => !Number.isFinite(item.timestamp) || item.timestamp >= limiteData)
        .sort((a, b) => {
            if (!Number.isFinite(a.timestamp)) return Number.isFinite(b.timestamp) ? 1 : a.indice - b.indice;
            if (!Number.isFinite(b.timestamp)) return -1;
            return b.timestamp - a.timestamp;
        })
        .slice(0, 500)
        .map(item => item.registro);
}

function limitarCacheHistoricoSincronizado(chaveDados, chaveSincronizacao, obterData) {
    if (localStorage.getItem(chaveSincronizacao) !== 'true') return null;

    try {
        const dados = JSON.parse(localStorage.getItem(chaveDados) || '[]');
        const cache = selecionarHistoricoParaCache(dados, obterData);
        localStorage.setItem(chaveDados, JSON.stringify(cache));
        return cache;
    } catch (erro) {
        console.error('Erro ao limitar cache local:', erro);
        return null;
    }
}
