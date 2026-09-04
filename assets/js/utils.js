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
