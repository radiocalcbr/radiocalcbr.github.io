// ====== DOSE PEDIÁTRICA ======

const EANM_MULTIPLICADORES = [
    { pesoMin: 3, pesoMax: 3, mult: 1.00 },
    { pesoMin: 4, pesoMax: 4, mult: 1.12 },
    { pesoMin: 5, pesoMax: 5, mult: 1.14 },
    { pesoMin: 6, pesoMax: 6, mult: 1.47 },
    { pesoMin: 7, pesoMax: 7, mult: 1.71 },
    { pesoMin: 8, pesoMax: 8, mult: 1.71 },
    { pesoMin: 9, pesoMax: 9, mult: 2.14 },
    { pesoMin: 10, pesoMax: 10, mult: 2.71 },
    { pesoMin: 11, pesoMax: 11, mult: 2.71 },
    { pesoMin: 12, pesoMax: 12, mult: 3.14 },
    { pesoMin: 13, pesoMax: 13, mult: 3.57 },
    { pesoMin: 14, pesoMax: 14, mult: 3.57 },
    { pesoMin: 15, pesoMax: 15, mult: 3.77 },
    { pesoMin: 16, pesoMax: 16, mult: 4.00 },
    { pesoMin: 17, pesoMax: 17, mult: 4.43 },
    { pesoMin: 18, pesoMax: 18, mult: 4.86 },
    { pesoMin: 19, pesoMax: 19, mult: 5.29 },
    { pesoMin: 20, pesoMax: 20, mult: 5.71 },
    { pesoMin: 21, pesoMax: 21, mult: 6.14 },
    { pesoMin: 22, pesoMax: 22, mult: 6.43 },
    { pesoMin: 23, pesoMax: 23, mult: 6.86 },
    { pesoMin: 24, pesoMax: 24, mult: 7.29 },
    { pesoMin: 25, pesoMax: 25, mult: 7.72 },
    { pesoMin: 26, pesoMax: 26, mult: 8.00 },
    { pesoMin: 27, pesoMax: 27, mult: 8.43 },
    { pesoMin: 28, pesoMax: 28, mult: 8.86 },
    { pesoMin: 29, pesoMax: 29, mult: 9.14 },
    { pesoMin: 30, pesoMax: 30, mult: 9.57 },
    { pesoMin: 31, pesoMax: 31, mult: 10.00 },
    { pesoMin: 32, pesoMax: 32, mult: 10.29 },
    { pesoMin: 33, pesoMax: 33, mult: 10.71 },
    { pesoMin: 34, pesoMax: 34, mult: 11.29 },
    { pesoMin: 35, pesoMax: 35, mult: 12.00 },
    { pesoMin: 36, pesoMax: 36, mult: 12.71 },
    { pesoMin: 37, pesoMax: 37, mult: 13.43 },
    { pesoMin: 38, pesoMax: 38, mult: 14.00 },
    { pesoMin: 39, pesoMax: 39, mult: 14.00 },
    { pesoMin: 40, pesoMax: 42, mult: 15.00 },
    { pesoMin: 43, pesoMax: 45, mult: 16.00 },
    { pesoMin: 46, pesoMax: 47, mult: 17.00 },
    { pesoMin: 48, pesoMax: 50, mult: 18.00 },
    { pesoMin: 51, pesoMax: 54, mult: 19.00 },
    { pesoMin: 55, pesoMax: 58, mult: 20.00 },
    { pesoMin: 59, pesoMax: 62, mult: 21.00 },
    { pesoMin: 63, pesoMax: 66, mult: 22.00 },
    { pesoMin: 67, pesoMax: 70, mult: 23.00 }
];

const EANM_RADIOFARMACOS = {
    'MDP': { basal: 35.0, minima: 40.0, nome: 'MDP' },
    'DMSA': { basal: 6.8, minima: 18.5, nome: 'DMSA' },
    'DTPA': { basal: 34.0, minima: 20.0, nome: 'DTPA' },
    'IDA': { basal: 10.5, minima: 20.0, nome: 'IDA' },
    'pertec_tireoide': { basal: 5.6, minima: 10.0, nome: 'Pertecnetato' },
    'sestamibi': { basal: 63.0, minima: 80.0, nome: 'Sestamibi' },
    'FDG_corpo': { basal: 25.9, minima: 26.0, nome: 'FDG' },
    'NaF': { basal: 10.5, minima: 14.0, nome: 'NaF' },
    'MIBG': { basal: 28.0, minima: 37.0, nome: 'MIBG' }
};

function calcularDosePediatrica() {
    const selectRadio = document.getElementById('radiofarmacoPediatrico');
    const selectedOption = selectRadio.options[selectRadio.selectedIndex];
    const metodo = document.getElementById('metodoPediatrico').value;
    const peso = parseFloat(document.getElementById('pesoPediatrico').value) || 1;
    const idade = parseFloat(document.getElementById('idadePediatrica').value) || 0;
    const fatorCorrecao = parseFloat(document.getElementById('fatorCorrecaoPediatrica').value) || 1;
    
    // Método EANM
    if (metodo === 'eanm') {
        const radiofarmacoKey = selectedOption.value;
        const dadosEANM = EANM_RADIOFARMACOS[radiofarmacoKey];
        if (!dadosEANM) {
            alert('⚠️ Este radiofármaco não está disponível no método EANM.');
            return;
        }
        
        let multiplicador = 1.0;
        if (peso <= 70) {
            const multiplicadorObj = EANM_MULTIPLICADORES.find(m => 
                peso >= m.pesoMin && peso <= m.pesoMax
            );
            multiplicador = multiplicadorObj ? multiplicadorObj.mult : 1.0;
        } else {
            const ultimo = EANM_MULTIPLICADORES[EANM_MULTIPLICADORES.length - 1];
            const anterior = EANM_MULTIPLICADORES[EANM_MULTIPLICADORES.length - 2];
            if (ultimo) {
                const faixaPeso = anterior && anterior.pesoMax ? Math.max(1, ultimo.pesoMax - anterior.pesoMax) : 1;
                const faixaMult = anterior ? ultimo.mult - anterior.mult : 0;
                const inclinacao = faixaPeso > 0 ? faixaMult / faixaPeso : 0;
                multiplicador = Math.max(ultimo.mult + inclinacao * (peso - ultimo.pesoMax), ultimo.mult);
            }
        }
        
        let doseMBq = dadosEANM.basal * multiplicador;
        doseMBq = Math.max(doseMBq, dadosEANM.minima);
        doseMBq = doseMBq * fatorCorrecao;
        const doseMCi = doseMBq / 37;
        
        document.getElementById('resultadoPediatrico').style.display = 'block';
        document.getElementById('doseRecomendadaPediatrica').textContent = `${doseMCi.toFixed(3)} mCi (${doseMBq.toFixed(1)} MBq)`;
        document.getElementById('dosePorPesoPediatrica').textContent = `${(doseMBq / peso / 37).toFixed(4)} mCi/kg`;
        document.getElementById('doseMinPediatrica').textContent = `${(dadosEANM.minima / 37).toFixed(2)} mCi (${dadosEANM.minima} MBq)`;
        document.getElementById('doseMaxPediatrica').textContent = 'N/A';
        document.getElementById('faixaEtariaPediatrica').textContent = `Multiplicador: ${multiplicador.toFixed(2)} (${peso} kg)`;
        document.getElementById('statusDosePediatrica').textContent = '✅ Cálculo EANM 2005';
        document.getElementById('statusDosePediatrica').style.color = '#00d2ff';
        document.getElementById('percentualAdultoPediatrico').textContent = `${((peso/70)*100).toFixed(1)}%`;
        const volume = doseMCi / 0.1;
        document.getElementById('volumePediatrico').textContent = `${volume.toFixed(1)} μL (${(volume/1000).toFixed(2)} mL)`;
        
        document.getElementById('infoTextoPediatrica').innerHTML = `
            <strong>Método:</strong> EANM 2005 &bull;
            <strong>Radiofármaco:</strong> ${dadosEANM.nome}<br>
            <strong>Atividade basal:</strong> ${dadosEANM.basal} MBq &bull;
            <strong>Multiplicador (${peso} kg):</strong> ${multiplicador.toFixed(2)} &bull;
            <strong>Mínimo:</strong> ${dadosEANM.minima} MBq<br>
            <strong>Dose calculada:</strong> ${doseMBq.toFixed(1)} MBq ≈ ${doseMCi.toFixed(3)} mCi
        `;
        return;
    }
    
    // Método SNMMI
    const doseKg = parseFloat(selectedOption.getAttribute('data-dose')) || 0.1;
    const doseMin = parseFloat(selectedOption.getAttribute('data-min')) || 0;
    const doseMax = parseFloat(selectedOption.getAttribute('data-max')) || 0;
    const nomeRadio = selectedOption.text.split(' - ')[0];
    
    let doseCalculada = peso * doseKg;
    let doseFinal = doseCalculada * fatorCorrecao;
    let doseComLimites = doseFinal;
    let status = '✅ Dentro dos limites';
    let statusCor = '#00ff64';
    
    if (metodo === 'snmmi') {
        if (doseMin > 0 && doseFinal < doseMin) {
            doseComLimites = doseMin;
            status = '⬆️ Ajustado para mínimo';
            statusCor = '#ffd700';
        } else if (doseMax > 0 && doseFinal > doseMax) {
            doseComLimites = doseMax;
            status = '⬇️ Ajustado para máximo';
            statusCor = '#ff6b6b';
        }
    } else {
        status = '📊 Peso simples (sem limites)';
        statusCor = '#00d2ff';
    }
    
    if (peso > 70) {
        const doseMaxPeso = peso * doseKg;
        if (doseComLimites > doseMaxPeso) {
            doseComLimites = doseMaxPeso;
            status = '⬇️ Ajustado para peso > 70kg';
            statusCor = '#ffd700';
        }
    }
    
    let faixaEtaria = '';
    if (idade < 0.1) faixaEtaria = 'Recém-nascido';
    else if (idade < 1) faixaEtaria = 'Lactente (1-12 meses)';
    else if (idade < 4) faixaEtaria = 'Pré-escolar (1-3 anos)';
    else if (idade < 7) faixaEtaria = 'Infantil (4-6 anos)';
    else if (idade < 11) faixaEtaria = 'Escolar (7-10 anos)';
    else if (idade < 15) faixaEtaria = 'Adolescente (11-14 anos)';
    else faixaEtaria = 'Adolescente (15-18 anos)';
    
    const percentualAdulto = Math.min(100, (peso / 70) * 100);
    const volume = doseComLimites / 0.1;
    
    document.getElementById('resultadoPediatrico').style.display = 'block';
    document.getElementById('doseRecomendadaPediatrica').textContent = `${doseComLimites.toFixed(2)} mCi`;
    document.getElementById('dosePorPesoPediatrica').textContent = `${doseKg.toFixed(3)} mCi/kg`;
    document.getElementById('doseMinPediatrica').textContent = doseMin > 0 ? `${doseMin.toFixed(2)} mCi` : 'N/A';
    document.getElementById('doseMaxPediatrica').textContent = doseMax > 0 ? `${doseMax.toFixed(2)} mCi` : 'N/A';
    document.getElementById('faixaEtariaPediatrica').textContent = faixaEtaria || 'Não informada';
    document.getElementById('statusDosePediatrica').textContent = status;
    document.getElementById('statusDosePediatrica').style.color = statusCor;
    document.getElementById('percentualAdultoPediatrico').textContent = `${percentualAdulto.toFixed(1)}%`;
    document.getElementById('volumePediatrico').textContent = `${volume.toFixed(1)} μL (${(volume/1000).toFixed(2)} mL)`;
    
    document.getElementById('infoTextoPediatrica').innerHTML = `
        <strong>Radiofármaco:</strong> ${nomeRadio} &bull;
        <strong>Método:</strong> ${metodo === 'snmmi' ? 'SNMMI 2024 (com limites)' : 'Peso Simples'} &bull;
        <strong>Fator de Correção:</strong> ${fatorCorrecao.toFixed(2)}<br>
        <strong>Peso:</strong> ${peso.toFixed(1)} kg &bull;
        <strong>Idade:</strong> ${idade.toFixed(1)} anos &bull;
        <strong>Dose/kg:</strong> ${doseKg.toFixed(3)} mCi/kg
        ${metodo === 'snmmi' ? `<br><strong>Limites SNMMI:</strong> Min ${doseMin > 0 ? doseMin.toFixed(2) : 'N/A'} mCi | Máx ${doseMax > 0 ? doseMax.toFixed(2) : 'N/A'} mCi` : ''}
    `;
}
