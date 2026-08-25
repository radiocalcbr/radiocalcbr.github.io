// ====== FUNÇÕES DE MARCAÇÃO ======

function atualizarInfoIsotopo() {
    const select = document.getElementById('radiofarmacoMestre');
    const selectedOption = select.options[select.selectedIndex];
    const isotopo = selectedOption.getAttribute('data-isotopo') || 'tc';
    isotopoAtual = isotopo;
    
    const infoDiv = document.getElementById('infoIsotopoSelecionado');
    const meiaVida = MEIA_VIDA_MIN[isotopo];
    const nome = NOME_ISOTOPO[isotopo];
    const cor = COR_ISOTOPO[isotopo];
    infoDiv.textContent = `🔬 Isótopo: ${nome} | Meia-vida: ${meiaVida} minutos`;
    infoDiv.className = `info-isotopo ${isotopo}`;
    
    document.getElementById('meiaVidaDisplay').textContent = `${meiaVida} min`;
    document.getElementById('meiaVidaDisplay').style.color = cor;
    const lambda = 0.693 / meiaVida;
    document.getElementById('lambdaDisplay').textContent = lambda.toFixed(6);
    
    const planIsotopo = document.getElementById('planIsotopo');
    const planIsotopoAgenda = document.getElementById('planIsotopoAgenda');
    if (planIsotopo) planIsotopo.value = isotopo;
    if (planIsotopoAgenda) planIsotopoAgenda.value = isotopo;
    
    const agora = new Date();
    const horarioMarcacao = document.getElementById('planHorarioMarcacao');
    const horarioUltimo = document.getElementById('planHorarioUltimo');
    const horarioPrimeira = document.getElementById('planHorarioPrimeira');
    const horarioMarcacaoAgenda = document.getElementById('planHorarioMarcacaoAgenda');
    
    if (horarioMarcacao && !horarioMarcacao.value) {
        const marc = new Date(agora);
        marc.setHours(8, 0, 0, 0);
        horarioMarcacao.value = marc.toISOString().slice(0, 16);
    }
    if (horarioMarcacaoAgenda && !horarioMarcacaoAgenda.value) {
        const marc = new Date(agora);
        marc.setHours(8, 0, 0, 0);
        horarioMarcacaoAgenda.value = marc.toISOString().slice(0, 16);
    }
    if (horarioPrimeira && !horarioPrimeira.value) {
        const primeira = new Date(agora);
        primeira.setHours(8, 30, 0, 0);
        horarioPrimeira.value = primeira.toISOString().slice(0, 16);
    }
    if (horarioUltimo && !horarioUltimo.value) {
        const ultimo = new Date(agora);
        ultimo.setHours(14, 30, 0, 0);
        horarioUltimo.value = ultimo.toISOString().slice(0, 16);
    }
    
    atualizarHorariosAgendaPadrao();
    setTimeout(() => { calcularPlanejamento(); calcularPacientes(); }, 100);
}

function calcularMarcacao() {
    const ativMarcacao = parseFloat(document.getElementById('atividadeMarcacaoMestre').value) || 0;
    const ativDisponivel = parseFloat(document.getElementById('atividadeDisponivelMestre').value) || 0;
    
    // Verifica se os elementos existem antes de tentar modificá-los
    const totalMarcado = document.getElementById('totalMarcado');
    const disponivelGerador = document.getElementById('disponivelGerador');
    const diferencaMarcacao = document.getElementById('diferencaMarcacao');
    const resultadoContainer = document.getElementById('resultadoMarcacaoContainer');
    
    // Se os elementos não existirem, apenas mostra um alerta ou log
    if (!totalMarcado || !disponivelGerador || !diferencaMarcacao) {
        console.log('📊 Marcação calculada:', {
            atividadeMarcacao: ativMarcacao.toFixed(2) + ' mCi',
            atividadeDisponivel: ativDisponivel.toFixed(2) + ' mCi',
            diferenca: (ativDisponivel - ativMarcacao).toFixed(2) + ' mCi'
        });
        return;
    }
    
    totalMarcado.textContent = `${ativMarcacao.toFixed(2)} mCi`;
    disponivelGerador.textContent = `${ativDisponivel.toFixed(2)} mCi`;
    const diferenca = ativDisponivel - ativMarcacao;
    diferencaMarcacao.textContent = `${diferenca.toFixed(2)} mCi`;
    diferencaMarcacao.style.color = diferenca >= 0 ? '#00ff64' : '#ff6b6b';
    if (resultadoContainer) {
        resultadoContainer.classList.add('ativo');
    }
}


function aplicarPlanejamento() {
    const ativFinal = document.getElementById('planAtividadeFinal').textContent;
    const valor = parseFloat(ativFinal) || 0;
    if (valor <= 0) { alert('⚠️ Calcule o planejamento primeiro!'); return; }
    document.getElementById('atividadeMarcacaoMestre').value = valor.toFixed(1);
    document.getElementById('atividadeDisponivelMestre').value = (valor * 1.05).toFixed(1);
    
    const modo = document.querySelector('input[name="modoPlanejamento"]:checked').value;
    let horarioMarcacao;
    if (modo === 'simplificado') {
        horarioMarcacao = document.getElementById('planHorarioMarcacao').value;
    } else {
        horarioMarcacao = document.getElementById('planHorarioMarcacaoAgenda').value;
    }
    if (horarioMarcacao) document.getElementById('horarioMarcacaoMestre').value = horarioMarcacao;
    
    trocarAba('marcacao');
    setTimeout(() => { calcularMarcacao(); calcularPacientes(); }, 100);
}

// ==========================================
// EFICIÊNCIA DE MARCAÇÃO - COM DUAS PLACAS
// ==========================================

const KITS_MARCACAO = {
    eluato: {
        nome: 'Eluato',
        formula: 'Placa = (F1/F1+F2)×100',
        purezaMinima: 95,
        descricao: 'Análise de pureza do eluato | Pureza ≥ 95%',
        apenasUmaPlaca: true
    },
    kardia: {
        nome: 'KARDIA (MIBI)',
        formula: 'Placa 1 = (F2/F1+F2)×100 | Placa 2 = (F1/F1+F2)×100',
        purezaMinima: 90,
        descricao: '100 – (impureza placa 1 + impureza placa 2) ≥ 90%'
    },
    osteo: {
        nome: 'OSTEO (MDP)',
        formula: 'Placa 1 = (F1/F1+F2)×100 | Placa 2 = (F2/F1+F2)×100',
        purezaMinima: 90,
        descricao: '100 – (impureza placa 1 + impureza placa 2) ≥ 90%'
    },
    limpha: {
        nome: 'LIMPHA (FITATO)',
        formula: 'Placa = (F1/F1+F2)×100 ≤ 5%',
        purezaMinima: 95,
        descricao: '100 – (impureza placa) ≥ 95%',
        apenasUmaPlaca: true
    },
    reno: {
        nome: 'RENO (DMSA)',
        formula: 'Placa 1 = (F1/F1+F2)×100 | Placa 2 = (F2/F1+F2)×100',
        purezaMinima: 90,
        descricao: '100 – (impureza placa 1 + impureza placa 2) ≥ 90%'
    },
    nefro: {
        nome: 'NEFRO (DTPA)',
        formula: 'Placa 1 = (F1/F1+F2)×100 | Placa 2 = (F2/F1+F2)×100',
        purezaMinima: 90,
        descricao: '100 – (impureza placa 1 + impureza placa 2) ≥ 90%'
    },
    piro: {
        nome: 'PIRO',
        formula: 'Placa 1 = (F1/F1+F2)×100 | Placa 2 = (F2/F1+F2)×100',
        purezaMinima: 90,
        descricao: '100 – (%TcO4 + %TcO2) ≥ 90%'
    }
};

function atualizarCamposEficiencia() {
    const kit = document.getElementById('kitMarcacao').value;
    const info = KITS_MARCACAO[kit];
    
    if (info) {
        document.getElementById('infoKitTexto').innerHTML = `
            <strong style="color: #ffd700;">${info.nome}</strong><br>
            ${info.formula}<br>
            <span style="color: #00d2ff;">Pureza mínima exigida: ≥ ${info.purezaMinima}%</span><br>
            <span style="color: #888; font-size: 0.85rem;">${info.descricao}</span>
        `;
    }
}

function calcularEficienciaMarcacao() {
    const kit = document.getElementById('kitMarcacao').value;
    const info = KITS_MARCACAO[kit];
    
    // ====== DADOS DA PLACA 1 ======
    const p1f1 = parseFloat(document.getElementById('placa1Fracao1').value) || 0;
    const p1f2 = parseFloat(document.getElementById('placa1Fracao2').value) || 0;
    const totalPlaca1 = p1f1 + p1f2;
    
    // ====== DADOS DA PLACA 2 ======
    const p2f1 = parseFloat(document.getElementById('placa2Fracao1').value) || 0;
    const p2f2 = parseFloat(document.getElementById('placa2Fracao2').value) || 0;
    const totalPlaca2 = p2f1 + p2f2;
    
    console.log('📊 Dados lidos:');
    console.log('Placa 1 - F1:', p1f1, 'F2:', p1f2, 'Total:', totalPlaca1);
    console.log('Placa 2 - F1:', p2f1, 'F2:', p2f2, 'Total:', totalPlaca2);
    
    // Validação
    if (totalPlaca1 === 0 && totalPlaca2 === 0) {
        document.getElementById('resultadoEficienciaMarcacao').style.display = 'none';
        console.log('⚠️ Nenhum dado para calcular');
        return;
    }
    
    let placa1 = 0, placa2 = 0, pureza = 0;
    
    // ====== CÁLCULO PARA KARDIA ======
    if (kit === 'kardia') {
        // KARDIA: PLACA 1 = (F2/F1+F2)×100 | PLACA 2 = (F1/F1+F2)×100
        if (totalPlaca1 > 0) placa1 = (p1f2 / totalPlaca1) * 100;
        if (totalPlaca2 > 0) placa2 = (p2f1 / totalPlaca2) * 100;
        pureza = 100 - (placa1 + placa2);
        console.log('📌 KARDIA - Placa1:', placa1, 'Placa2:', placa2, 'Pureza:', pureza);
    }
    // ====== CÁLCULO PARA ELUATO E LIMPHA ======
    else if (kit === 'limpha' || kit === 'eluato') {
        // LIMPHA e ELUATO: PLACA = (F1/F1+F2)×100 | Pureza = 100 - placa
        if (totalPlaca1 > 0) placa1 = (p1f1 / totalPlaca1) * 100;
        placa2 = 0;
        pureza = 100 - placa1;
        console.log('📌 ELUATO/LIMPHA - Placa1:', placa1, 'Pureza:', pureza);
    }
    // ====== CÁLCULO PARA OSTEO, RENO, NEFRO, PIRO ======
    else {
        // PLACA 1 = (F1/F1+F2)×100 | PLACA 2 = (F2/F1+F2)×100
        if (totalPlaca1 > 0) placa1 = (p1f1 / totalPlaca1) * 100;
        if (totalPlaca2 > 0) placa2 = (p2f2 / totalPlaca2) * 100;
        pureza = 100 - (placa1 + placa2);
        console.log('📌 OSTEO/RENO/NEFRO/PIRO - Placa1:', placa1, 'Placa2:', placa2, 'Pureza:', pureza);
    }
    
    // Arredondar para 1 casa decimal
    placa1 = Math.round(placa1 * 10) / 10;
    placa2 = Math.round(placa2 * 10) / 10;
    pureza = Math.round(pureza * 10) / 10;
    
    // Status
    const aprovado = pureza >= info.purezaMinima;
    const statusCor = aprovado ? '#2ecc71' : '#ff6b6b';
    const statusBg = aprovado ? 'rgba(46, 204, 113, 0.05)' : 'rgba(255, 107, 107, 0.05)';
    const statusBorder = aprovado ? '#2ecc71' : '#ff6b6b';
    
    // Exibir resultados
    const resultadoDiv = document.getElementById('resultadoEficienciaMarcacao');
    resultadoDiv.style.display = 'block';
    document.getElementById('resultadoPlaca1').textContent = placa1 + '%';
    document.getElementById('resultadoPlaca2').textContent = (kit === 'limpha' || kit === 'eluato' ? '---' : placa2 + '%');
    document.getElementById('resultadoPureza').textContent = pureza + '%';
    document.getElementById('resultadoPureza').style.color = aprovado ? '#2ecc71' : '#ff6b6b';
    
    // Detalhes das placas
    document.getElementById('placa1Detalhe').textContent = `F1: ${p1f1} | F2: ${p1f2} | Total: ${totalPlaca1}`;
    document.getElementById('placa2Detalhe').textContent = `F1: ${p2f1} | F2: ${p2f2} | Total: ${totalPlaca2}`;
    
    // Detalhes do kit
    document.getElementById('kitNomeResultado').textContent = info.nome;
    document.getElementById('formulaEficiencia').textContent = info.formula;
    
    // Status
    const statusContainer = document.getElementById('statusEficienciaContainer');
    const statusTitulo = document.getElementById('statusEficienciaTitulo');
    const statusTexto = document.getElementById('statusEficienciaTexto');
    
    statusContainer.style.borderLeftColor = statusBorder;
    statusContainer.style.background = statusBg;
    
    if (aprovado) {
        statusTitulo.style.color = '#2ecc71';
        statusTitulo.textContent = '✅ APROVADO';
        statusTexto.textContent = `Pureza: ${pureza}% (≥ ${info.purezaMinima}%) - Aprovado!`;
    } else {
        statusTitulo.style.color = '#ff6b6b';
        statusTitulo.textContent = '❌ REPROVADO';
        statusTexto.textContent = `Pureza: ${pureza}% (< ${info.purezaMinima}%) - Reprovado! Verifique o processo de marcação.`;
    }
    
    console.log('✅ Resultado exibido com sucesso!');
}


function limparCamposEficiencia() {
    document.getElementById('placa1Fracao1').value = '';
    document.getElementById('placa1Fracao2').value = '';
    document.getElementById('placa2Fracao1').value = '';
    document.getElementById('placa2Fracao2').value = '';
    document.getElementById('resultadoEficienciaMarcacao').style.display = 'none';
}

// Inicializar
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        atualizarCamposEficiencia();
    }, 100);
});
// ==========================================
// IMPRESSÃO ZEBRA COM BROWSER PRINT
// ==========================================

/**
 * Detecta automaticamente a impressora Zebra padrão
 * @returns {Promise<Object>} Impressora Zebra encontrada
 */
async function detectarImpressoraZebra() {
    try {
        if (typeof BrowserPrint === 'undefined') {
            throw new Error('BrowserPrint não está instalado ou não foi carregado.');
        }
        console.log('🔍 Iniciando detecção de impressoras Zebra...');
        const devices = await BrowserPrint.getLocalDevices();
        const zebraPrinters = devices.filter(device => 
            device.deviceType === 'printer' && 
            (device.connectionType === 'BLUETOOTH' || device.connectionType === 'USB' || device.connectionType === 'NETWORK')
        );
        console.log(`📋 Encontradas ${zebraPrinters.length} impressoras Zebra:`, zebraPrinters);
        if (zebraPrinters.length === 0) {
            throw new Error('Nenhuma impressora Zebra encontrada.');
        }
        let defaultPrinter = zebraPrinters.find(p => p.isDefault) || zebraPrinters[0];
        console.log('✅ Impressora Zebra selecionada:', defaultPrinter.name);
        return defaultPrinter;
    } catch (error) {
        console.error('❌ Erro ao detectar impressora Zebra:', error);
        throw error;
    }
}

/**
 * Gera o comando ZPL para a etiqueta
 */
function gerarZPLEtiqueta(dados) {
    const ZPL = `^XA
^CF0,22
^FO10,10^FDRADIOFÁRMACO: ${dados.radiofarmaco || '---'}^FS
^CF0,22
^FO10,45^FDATIVIDADE TOTAL: ${dados.atividade || '0'} mCi^FS
^CF0,22
^FO380,45^FDVOLUME: ${dados.volume || '0'} mL^FS
^CF0,22
^FO10,80^FDLOTE: ${dados.lote || '_________'}^FS
^CF0,22
^FO380,80^FDVALIDADE: ${dados.validade || '--/--/----'}^FS
^CF0,22
^FO10,115^FDHORÁRIO KIT: ${dados.horaKit || '--:--'}^FS
^CF0,22
^FO380,115^FDLIMITE USO: ${dados.horaLimite || '--:--'}^FS
^CF0,22
^FO10,150^FDRESPONSÁVEL: ${dados.responsavel || '_____________'}^FS
^XZ`;
    return ZPL;
}

/**
 * Obtém os dados atuais da etiqueta do sistema
 */
function obterDadosEtiqueta() {
    try {
        // 1. Radiofármaco
        const radiofarmacoSelect = document.getElementById('radiofarmacoMestre');
        const radiofarmaco = radiofarmacoSelect ? 
            radiofarmacoSelect.options[radiofarmacoSelect.selectedIndex]?.text || '---' : '---';
        
        // 2. Horário de Marcação
        const horaMarcacao = document.getElementById('horarioMarcacaoMestre')?.value || '';
        let horaMarcacaoFormatada = '--:--';
        if (horaMarcacao) {
            const data = new Date(horaMarcacao);
            horaMarcacaoFormatada = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        }
        
        // 3. Atividade Total
        const atividade = document.getElementById('atividadeMarcacaoMestre')?.value || '0';
        
        // 4. Lote
        const lote = document.getElementById('loteFrasco')?.value || '_________';
        
        // 5. Validade
        const validadeFrasco = document.getElementById('validadeFrasco')?.value || '';
        let validadeFormatada = '--/--/----';
        if (validadeFrasco) {
            const partes = validadeFrasco.split('-');
            validadeFormatada = `${partes[2]}/${partes[1]}/${partes[0]}`;
        }
        
        // 6. Volume
        const volume = document.getElementById('volumeFrasco')?.value || '0';
        
        // 7. Horário do Kit
        const horaKit = document.getElementById('horaMarcacaoKit')?.value || '--:--';
        
        // 8. Horário Limite de Uso
        const horaLimiteUso = document.getElementById('horaLimiteUso')?.value || '--:--';
        
        // 9. Responsável (usuário logado)
        let responsavel = document.getElementById('nomeUsuarioLogado')?.textContent || '';
        if (responsavel === 'Carregando...' || !responsavel) {
            responsavel = '_____________';
        }
        
        return {
            radiofarmaco: radiofarmaco,
            horaMarcacao: horaMarcacaoFormatada,
            atividade: parseFloat(atividade).toFixed(1),
            lote: lote,
            validade: validadeFormatada,
            volume: parseFloat(volume).toFixed(1),
            horaKit: horaKit,
            horaLimite: horaLimiteUso,
            responsavel: responsavel
        };
    } catch (error) {
        console.error('❌ Erro ao obter dados da etiqueta:', error);
        return {
            radiofarmaco: '---',
            horaMarcacao: '--:--',
            atividade: '0',
            lote: '_________',
            validade: '--/--/----',
            volume: '0',
            horaKit: '--:--',
            horaLimite: '--:--',
            responsavel: '_____________'
        };
    }
}

/**
 * Função principal de impressão Zebra - com preview
 */
async function imprimirEtiquetaZebra() {
    try {
        // 1. Obtém os dados
        const dados = obterDadosEtiqueta();
        
        // 2. Verifica se há dados válidos
        if (!dados.radiofarmaco || dados.radiofarmaco === '---') {
            alert('⚠️ Preencha os dados da marcação primeiro!');
            return;
        }
        
        // 3. Mostra o preview da etiqueta
        mostrarPreviewEtiqueta(dados);
        
    } catch (error) {
        console.error('❌ Erro:', error);
        alert('Erro ao gerar prévia: ' + error.message);
    }
}

/**
 * Mostra o preview da etiqueta com opção de imprimir
 */
function mostrarPreviewEtiqueta(dados) {
    // Remove preview anterior se existir
    fecharPreviewEtiqueta();
    
    // Cria o container do preview
    const previewContainer = document.createElement('div');
    previewContainer.id = 'previewEtiqueta';
    previewContainer.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #1a1a2e, #16213e);
        border: 2px solid #00d2ff;
        border-radius: 16px;
        padding: 30px 35px;
        z-index: 100000;
        box-shadow: 0 20px 60px rgba(0,0,0,0.9), 0 0 40px rgba(0,210,255,0.1);
        max-width: 550px;
        width: 92%;
        font-family: 'Courier New', monospace;
        color: #fff;
    `;
    
    previewContainer.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid rgba(0,210,255,0.3); padding-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.5rem;">🏷️</span>
                <h3 style="margin: 0; color: #ffd700; font-size: 1.1rem;">CONFIRMAR IMPRESSÃO</h3>
            </div>
            <button onclick="fecharPreviewEtiqueta()" style="
                background: rgba(255,107,107,0.15);
                border: 1px solid rgba(255,107,107,0.3);
                color: #ff6b6b;
                padding: 6px 14px;
                border-radius: 6px;
                cursor: pointer;
                font-weight: bold;
                font-size: 0.85rem;
                transition: 0.3s;
            " onmouseover="this.style.background='rgba(255,107,107,0.25)'" onmouseout="this.style.background='rgba(255,107,107,0.15)'">
                ✕ Cancelar
            </button>
        </div>
        
        <!-- Simulação da Etiqueta -->
        <div style="
            background: #000;
            padding: 20px 25px;
            border-radius: 8px;
            border: 1px solid #333;
            font-size: 13px;
            line-height: 1.9;
            font-family: 'Courier New', monospace;
            margin-bottom: 20px;
        ">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2px 15px;">
                <span style="color: #ffd700; font-weight: bold;">RADIOFÁRMACO:</span>
                <span style="color: #00d2ff;">${dados.radiofarmaco}</span>
                
                <span style="color: #ffd700; font-weight: bold;">ATIVIDADE TOTAL:</span>
                <span style="color: #00d2ff;">${dados.atividade} mCi</span>
                
                <span style="color: #ffd700; font-weight: bold;">VOLUME:</span>
                <span style="color: #00d2ff;">${dados.volume} mL</span>
                
                <span style="color: #ffd700; font-weight: bold;">LOTE:</span>
                <span style="color: #00d2ff;">${dados.lote}</span>
                
                <span style="color: #ffd700; font-weight: bold;">VALIDADE:</span>
                <span style="color: #00d2ff;">${dados.validade}</span>
                
                <span style="color: #ffd700; font-weight: bold;">HORÁRIO KIT:</span>
                <span style="color: #00d2ff;">${dados.horaKit}</span>
                
                <span style="color: #ffd700; font-weight: bold;">LIMITE USO:</span>
                <span style="color: #00d2ff;">${dados.horaLimite}</span>
                
                <span style="color: #ffd700; font-weight: bold;">RESPONSÁVEL:</span>
                <span style="color: #00d2ff; font-size: 0.9rem;">${dados.responsavel}</span>
            </div>
            <div style="margin-top: 15px; padding-top: 10px; border-top: 1px dashed #333; text-align: center; color: #555; font-size: 10px; letter-spacing: 2px;">
                RADIOCALC BR • ${new Date().toLocaleDateString('pt-BR')}
            </div>
        </div>
        
        <!-- Botões -->
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button onclick="fecharPreviewEtiqueta()" style="
                background: rgba(255,255,255,0.05);
                border: 1px solid #444;
                color: #888;
                padding: 10px 25px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                transition: 0.3s;
            " onmouseover="this.style.borderColor='#666';this.style.color='#fff'" onmouseout="this.style.borderColor='#444';this.style.color='#888'">
                ✕ Cancelar
            </button>
            <button onclick="enviarParaImpressora()" style="
                background: linear-gradient(135deg, #00d2ff, #0098c4);
                border: none;
                color: #fff;
                padding: 10px 30px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: bold;
                transition: 0.3s;
                display: flex;
                align-items: center;
                gap: 8px;
            " onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'">
                🖨️ Imprimir Agora
            </button>
        </div>
    `;
    
    document.body.appendChild(previewContainer);
    
    // Overlay de fundo
    const overlay = document.createElement('div');
    overlay.id = 'overlayPreview';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.75);
        z-index: 99999;
        backdrop-filter: blur(4px);
    `;
    overlay.onclick = fecharPreviewEtiqueta;
    document.body.appendChild(overlay);
}

/**
 * Envia a etiqueta para a impressora
 */
async function enviarParaImpressora() {
    const btn = document.querySelector('#previewEtiqueta button:last-child');
    const textoOriginal = btn ? btn.textContent : '🖨️ Imprimir';
    
    try {
        if (btn) {
            btn.disabled = true;
            btn.textContent = '⏳ Enviando...';
            btn.style.opacity = '0.7';
        }
        
        const dados = obterDadosEtiqueta();
        console.log('🖨️ Iniciando impressão Zebra...');
        
        const impressora = await detectarImpressoraZebra();
        console.log('✅ Impressora encontrada:', impressora.name);
        
        const zpl = gerarZPLEtiqueta(dados);
        console.log('📄 ZPL gerado:', zpl);
        
        await impressora.send(zpl);
        console.log('✅ Etiqueta enviada para impressão com sucesso!');
        
        fecharPreviewEtiqueta();
        mostrarFeedbackSucesso('Etiqueta enviada para impressora Zebra!');
        
    } catch (error) {
        console.error('❌ Erro na impressão:', error);
        let mensagem = 'Erro ao imprimir: ';
        
        if (error.message.includes('BrowserPrint')) {
            mensagem += 'Plugin Browser Print da Zebra não está instalado. Baixe em: https://www.zebra.com/browser-print';
        } else if (error.message.includes('Nenhuma impressora Zebra encontrada')) {
            mensagem += 'Nenhuma impressora Zebra encontrada. Verifique se está conectada e ligada.';
        } else {
            mensagem += error.message || 'Erro desconhecido.';
        }
        
        alert('⚠️ ' + mensagem);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = textoOriginal;
            btn.style.opacity = '1';
        }
    }
}

/**
 * Fecha o preview da etiqueta
 */
function fecharPreviewEtiqueta() {
    const preview = document.getElementById('previewEtiqueta');
    const overlay = document.getElementById('overlayPreview');
    if (preview) preview.remove();
    if (overlay) overlay.remove();
}

/**
 * Função auxiliar para mostrar feedback de sucesso
 */
function mostrarFeedbackSucesso(mensagem) {
    const feedback = document.createElement('div');
    feedback.style.cssText = `
        position: fixed;
        bottom: 100px;
        right: 30px;
        background: rgba(0, 210, 64, 0.95);
        color: #fff;
        padding: 16px 24px;
        border-radius: 10px;
        font-weight: 600;
        z-index: 99999;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        border-left: 4px solid #00ff64;
        max-width: 350px;
        font-size: 0.95rem;
        animation: slideIn 0.3s ease;
    `;
    feedback.textContent = '✅ ' + mensagem;
    document.body.appendChild(feedback);
    
    setTimeout(() => {
        feedback.style.opacity = '0';
        feedback.style.transition = 'opacity 0.3s';
        setTimeout(() => feedback.remove(), 300);
    }, 5000);
}

/**
 * Mostra um feedback visual de sucesso
 */
function mostrarFeedbackSucesso(mensagem) {
    let feedbackContainer = document.getElementById('feedbackZebra');
    if (!feedbackContainer) {
        feedbackContainer = document.createElement('div');
        feedbackContainer.id = 'feedbackZebra';
        feedbackContainer.style.cssText = `
            position: fixed;
            bottom: 100px;
            right: 30px;
            background: rgba(0, 210, 64, 0.95);
            color: #fff;
            padding: 16px 24px;
            border-radius: 10px;
            font-weight: 600;
            z-index: 99999;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            border-left: 4px solid #00ff64;
            max-width: 350px;
            transition: all 0.3s ease;
            font-size: 0.95rem;
        `;
        document.body.appendChild(feedbackContainer);
    }
    feedbackContainer.textContent = '✅ ' + mensagem;
    feedbackContainer.style.display = 'block';
    feedbackContainer.style.opacity = '1';
    setTimeout(() => {
        feedbackContainer.style.opacity = '0';
        setTimeout(() => {
            feedbackContainer.style.display = 'none';
        }, 300);
    }, 5000);
}


 /**
 * Verifica o status da impressora Zebra e atualiza a interface
 */
async function verificarStatusImpressoraZebra() {
    const btnZebra = document.getElementById('btnZebra');
    const statusSpan = document.getElementById('statusZebra');
    const mensagemInfo = document.getElementById('mensagemZebraInfo');
    
    if (!btnZebra || !statusSpan) return;
    
    try {
        statusSpan.textContent = '⏳ Verificando...';
        statusSpan.style.color = '#ffd700';
        
        // SEMPRE HABILITA O BOTÃO - permitindo o preview mesmo sem impressora
        btnZebra.disabled = false;
        btnZebra.style.opacity = '1';
        
        // Verifica se o BrowserPrint existe
        if (typeof BrowserPrint === 'undefined') {
            statusSpan.textContent = '⚠️ Browser Print não detectado';
            statusSpan.style.color = '#ffd700';
            
            if (mensagemInfo) {
                mensagemInfo.style.display = 'block';
            }
            
            // Botão fica habilitado mesmo assim (para preview)
            return;
        }
        
        // Browser Print instalado - ESCONDE a mensagem
        if (mensagemInfo) {
            mensagemInfo.style.display = 'none';
        }
        
        // Verifica impressoras Zebra
        const devices = await BrowserPrint.getLocalDevices();
        const zebraPrinters = devices.filter(d => 
            d.deviceType === 'printer' && 
            (d.connectionType === 'BLUETOOTH' || d.connectionType === 'USB' || d.connectionType === 'NETWORK')
        );
        
        if (zebraPrinters.length > 0) {
            const printerName = zebraPrinters[0].name;
            const statusIcon = zebraPrinters[0].isDefault ? '⭐' : '🖨️';
            statusSpan.textContent = `${statusIcon} ${printerName}`;
            statusSpan.style.color = '#00ff64';
            btnZebra.disabled = false;
            btnZebra.style.opacity = '1';
            
            if (zebraPrinters.length > 1) {
                const extra = zebraPrinters.length - 1;
                statusSpan.textContent += ` +${extra} outra${extra > 1 ? 's' : ''}`;
            }
        } else {
            statusSpan.textContent = '⚠️ Nenhuma Zebra encontrada';
            statusSpan.style.color = '#ffd700';
            // MANTÉM HABILITADO - preview funciona mesmo sem impressora
            btnZebra.disabled = false;
            btnZebra.style.opacity = '1';
        }
    } catch (error) {
        console.error('❌ Erro ao verificar impressora:', error);
        statusSpan.textContent = '⚠️ Erro na verificação';
        statusSpan.style.color = '#ffd700';
        // MANTÉM HABILITADO
        btnZebra.disabled = false;
        btnZebra.style.opacity = '1';
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        if (typeof BrowserPrint !== 'undefined') {
            console.log('✅ Browser Print da Zebra detectado!');
            setTimeout(verificarStatusImpressoraZebra, 500);
        } else {
            console.log('ℹ️ Browser Print da Zebra não detectado.');
        }
    }, 1500);
});