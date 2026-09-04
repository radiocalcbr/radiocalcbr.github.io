// ====== FUNÇÕES DE INTERFACE ======

function trocarAba(aba) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(`aba-${aba}`).classList.add('active');
    
    document.querySelectorAll('.tab-btn').forEach(el => {
        const text = el.textContent;
        if ((text.includes('Planejamento') || text.includes('Planning')) && aba === 'planejamento' ||
            (text.includes('Marcação') || text.includes('Labeling')) && aba === 'marcacao' ||
            (text.includes('Pacientes') || text.includes('Patients')) && aba === 'pacientes' ||
            (text.includes('Dose Pediátrica') || text.includes('Pediatric')) && aba === 'pediatrica') {
            el.classList.add('active');
        }
    });
    
    if (aba === 'pacientes') { 
        if (typeof atualizarContadorPacientes === 'function') atualizarContadorPacientes(); 
        if (typeof calcularPacientes === 'function') calcularPacientes(); 
    }
    if (aba === 'planejamento') { 
        if (typeof calcularPlanejamento === 'function') calcularPlanejamento(); 
    }
    if (aba === 'pediatrica') { 
        if (typeof calcularDosePediatrica === 'function') calcularDosePediatrica(); 
    }
}

function abrirSobre() {
    document.getElementById('modalSobre').classList.add('ativo');
    document.addEventListener('keydown', function handler(e) {
        if (e.key === 'Escape') {
            fecharSobre();
            document.removeEventListener('keydown', handler);
        }
    });
}

function fecharSobre() {
    document.getElementById('modalSobre').classList.remove('ativo');
}

function fecharSobreExterno(event) {
    if (event.target === event.currentTarget) {
        fecharSobre();
    }
}

function abrirFeedback() {
    const abaAtiva = document.querySelector('.tab-content.active');
    let abaNome = 'Desconhecida';
    if (abaAtiva) {
        const id = abaAtiva.id;
        if (id === 'aba-planejamento') abaNome = 'Planejamento';
        else if (id === 'aba-marcacao') abaNome = 'Marcação';
        else if (id === 'aba-pacientes') abaNome = 'Pacientes';
        else if (id === 'aba-pediatrica') abaNome = 'Dose Pediátrica';
    }
    
    document.getElementById('ctxAba').textContent = abaNome;
    document.getElementById('ctxIsotopo').textContent = NOME_ISOTOPO[isotopoAtual] || 'Tc-99m';
    document.getElementById('ctxPacientes').textContent = document.getElementById('totalPacientes')?.textContent || '0';
    
    document.getElementById('descricaoFeedback').value = '';
    document.getElementById('emailFeedback').value = '';
    document.getElementById('feedbackSuccess').style.display = 'none';
    document.getElementById('tipoFeedback').value = 'sugestao';
    
    document.getElementById('modalFeedback').style.display = 'flex';
    
    document.addEventListener('keydown', function handler(e) {
        if (e.key === 'Escape') {
            fecharFeedback();
            document.removeEventListener('keydown', handler);
        }
    });
}

function fecharFeedback() {
    document.getElementById('modalFeedback').style.display = 'none';
}

function enviarFeedback() {
    const tipo = document.getElementById('tipoFeedback').value;
    const descricao = document.getElementById('descricaoFeedback').value.trim();
    const email = document.getElementById('emailFeedback').value.trim();
    const aba = document.getElementById('ctxAba').textContent;
    const isotopo = document.getElementById('ctxIsotopo').textContent;
    const pacientes = document.getElementById('ctxPacientes').textContent;
    
    if (!descricao) {
        alert('⚠️ Por favor, descreva seu feedback antes de enviar.');
        return;
    }
    
    const tipos = {
        'sugestao': '💡 Sugestão de Melhoria',
        'bug': '🐛 Reportar Bug/Erro',
        'radiofarmaco': '🧪 Sugerir Radiofármaco',
        'diretriz': '📋 Atualizar Diretriz',
        'outro': '📝 Outro'
    };
    
    const mensagem = `
📋 NOVO FEEDBACK - RadioCalc

📌 Tipo: ${tipos[tipo] || tipo}
📍 Contexto:
   • Aba: ${aba}
   • Isótopo: ${isotopo}
   • Pacientes: ${pacientes}
   • Data/Hora: ${new Date().toLocaleString('pt-BR')}

📝 Descrição:
${descricao}

📧 Email do remetente: ${email || 'Não informado'}

---
Enviado via RadioCalc v1.5 beta
    `.trim();
    
    const subject = encodeURIComponent(`[RadioCalc] Feedback: ${tipos[tipo] || tipo}`);
    const body = encodeURIComponent(mensagem);
    const mailtoLink = `mailto:fisixassessoria@gmail.com?subject=${subject}&body=${body}`;
    
    document.getElementById('feedbackSuccess').style.display = 'block';
    window.location.href = mailtoLink;
    
    setTimeout(() => {
        fecharFeedback();
        document.getElementById('feedbackSuccess').style.display = 'none';
    }, 3000);
}

function toggleLanguage() {
    currentLang = (currentLang === 'pt') ? 'en' : 'pt';
    document.getElementById('langLabel').innerText = currentLang.toUpperCase();
    
    document.querySelectorAll('[data-translate]').forEach(el => {
        const key = el.dataset.translate;
        if (translations[currentLang][key] !== undefined) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = translations[currentLang][key];
            } else {
                el.innerHTML = translations[currentLang][key];
            }
        }
    });

    const tabs = document.querySelectorAll('.tab-btn');
    const tabKeys = ['aba_planejamento', 'aba_marcacao', 'aba_pacientes', 'aba_pediatrica'];
    tabs.forEach((tab, index) => {
        if (tabKeys[index] && translations[currentLang][tabKeys[index]]) {
            tab.innerHTML = translations[currentLang][tabKeys[index]];
        }
    });

    const disclaimerTitle = document.querySelector('.disclaimer-title');
    if (disclaimerTitle) disclaimerTitle.innerHTML = translations[currentLang].disclaimer_title;
    
    const disclaimerBox = document.querySelector('.disclaimer-box .disclaimer-flex div');
    if (disclaimerBox) {
        disclaimerBox.innerHTML = translations[currentLang].disclaimer_text + 
            `<ul><li>${translations[currentLang].disclaimer_item1}</li><li>${translations[currentLang].disclaimer_item2}</li><li>${translations[currentLang].disclaimer_item3}</li><li>${translations[currentLang].disclaimer_item4}</li></ul><span class="disclaimer-note">${translations[currentLang].disclaimer_note}</span>`;
    }

    const footerDisclaimer = document.querySelector('.footer .disclaimer-footer');
    if (footerDisclaimer) footerDisclaimer.innerHTML = translations[currentLang].footer_disclaimer;
    
    const footerText = document.querySelector('.footer p');
    if (footerText) footerText.innerHTML = translations[currentLang].footer_text;
    
    document.title = translations[currentLang].titulo + ' - Radiopharmaceutical Planning';
    
    const subtitle = document.querySelector('.subtitle');
    if (subtitle) subtitle.innerHTML = translations[currentLang].subtitulo;

    if (document.getElementById('resultadoPlanejamento')?.style.display !== 'none') {
        if (typeof calcularPlanejamento === 'function') calcularPlanejamento();
    }
    if (document.getElementById('resultadoMarcacaoContainer')?.classList.contains('ativo')) {
        if (typeof calcularMarcacao === 'function') calcularMarcacao();
    }
    if (typeof calcularPacientes === 'function') calcularPacientes();
    if (typeof calcularDosePediatrica === 'function') calcularDosePediatrica();
}

function mostrarFeedbackSalvamento(mensagem, tipo = 'success') {
    const existing = document.getElementById('feedbackSalvamento');
    if (existing) existing.remove();

    const div = document.createElement('div');
    div.id = 'feedbackSalvamento';
    
    let bgColor, borderColor, textColor;
    if (tipo === 'success') {
        bgColor = 'rgba(0,255,100,0.15)';
        borderColor = 'rgba(0,255,100,0.3)';
        textColor = '#00ff64';
    } else if (tipo === 'error') {
        bgColor = 'rgba(255,107,107,0.15)';
        borderColor = 'rgba(255,107,107,0.3)';
        textColor = '#ff6b6b';
    } else {
        bgColor = 'rgba(255,215,0,0.15)';
        borderColor = 'rgba(255,215,0,0.3)';
        textColor = '#ffd700';
    }
    
    div.style.cssText = `
        position: fixed;
        bottom: 80px;
        right: 30px;
        padding: 12px 24px;
        border-radius: 12px;
        font-weight: 600;
        font-size: 0.9rem;
        z-index: 10002;
        animation: slideUp 0.3s ease;
        box-shadow: 0 8px 30px rgba(0,0,0,0.5);
        max-width: 350px;
        background: ${bgColor};
        border: 1px solid ${borderColor};
        color: ${textColor};
    `;
    div.textContent = mensagem;
    document.body.appendChild(div);

    setTimeout(() => {
        div.style.opacity = '0';
        div.style.transition = 'opacity 0.5s ease';
        setTimeout(() => div.remove(), 500);
    }, 3000);
}

function trackEvent(eventName, eventCategory, eventLabel, value) {
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, {
            'event_category': eventCategory || 'interacao',
            'event_label': eventLabel || '',
            'value': value || 0
        });
    }
}
