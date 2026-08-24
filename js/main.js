// === BARBADO'S BARBEARIA - SISTEMA COMPLETO ===

const CONFIG = {
    whatsapp: '553125160233',
    email: 'contato@barbadosbarbearia.com',
    nomeEstabelecimento: "Barbado's Barbearia",
    horario: { abre: 9, fecha: 20, sabadoAte: 18 },
    intervaloMinutos: 30,
    pontosPorCorte: 10,
    cortesParaBrinde: 10,
    bonusIndicacao: 50,
    avaliarAposDias: 1
};

// === INICIALIZAÇÃO ===
document.addEventListener('DOMContentLoaded', () => {
    setMinDate();
    initOrcamento();
    initAgendamento();
    initMenu();
    initDarkMode();
    initChatWidget();
    initPWA();
    initCalendario();
    carregarCupons();
    initAvaliacao();
});

// === MODO ESCURO ===
function initDarkMode() {
    const saved = localStorage.getItem('darkMode');
    if (saved === 'true') {
        document.body.classList.add('dark-mode');
        atualizarIconeTema(true);
    }

    const btn = document.getElementById('darkModeToggle');
    if (btn) {
        btn.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('darkMode', isDark);
            atualizarIconeTema(isDark);
        });
    }
}

function atualizarIconeTema(isDark) {
    const btn = document.getElementById('darkModeToggle');
    if (btn) btn.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

// === MENU MOBILE ===
function initMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    if (hamburger) {
        hamburger.addEventListener('click', () => navMenu.classList.toggle('active'));
    }
}

// === DATA MÍNIMA ===
function setMinDate() {
    const dataInput = document.getElementById('dataAgendamento');
    if (dataInput) {
        dataInput.min = new Date().toISOString().split('T')[0];
    }
}

// === CALENDÁRIO VISUAL ===
function initCalendario() {
    const dataInput = document.getElementById('dataAgendamento');
    if (!dataInput) return;

    // Criar visualização de dias da semana
    dataInput.addEventListener('change', () => {
        atualizarHorariosDisponiveis(dataInput.value);
    });
}

function atualizarHorariosDisponiveis(data) {
    if (!data) return;
    const select = document.getElementById('horarioAgendamento');
    if (!select) return;

    const agendamentos = JSON.parse(localStorage.getItem('agendamentos') || '[]');
    const ocupados = agendamentos
        .filter(a => a.data === data && a.status !== 'cancelado')
        .map(a => a.horario);

    select.innerHTML = '<option value="">Selecione um horário</option>';

    // Gera horários de 9h às 20h (ou 18h sábado)
    const dataObj = new Date(data + 'T00:00:00');
    const diaSemana = dataObj.getDay();
    const isSabado = diaSemana === 6;
    const horaFechamento = isSabado ? CONFIG.horario.sabadoAte : CONFIG.horario.fecha;

    for (let h = CONFIG.horario.abre; h < horaFechamento; h++) {
        for (let m = 0; m < 60; m += CONFIG.intervaloMinutos) {
            const hora = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            const ocupado = ocupados.includes(hora);
            const option = document.createElement('option');
            option.value = hora;
            option.textContent = `${hora}${ocupado ? ' (Indisponível)' : ''}`;
            if (ocupado) option.disabled = true;
            select.appendChild(option);
        }
    }
}

// === ORÇAMENTO ===
function initOrcamento() {
    document.querySelectorAll('.checkbox-item input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', atualizarOrcamento);
    });

    const cupomInput = document.getElementById('cupomInput');
    if (cupomInput) cupomInput.addEventListener('input', atualizarOrcamento);
}

function atualizarOrcamento() {
    const checkboxes = document.querySelectorAll('.checkbox-item input[type="checkbox"]:checked');
    const lista = document.getElementById('lista-selecionados');
    const subtotalEl = document.getElementById('subtotal');
    const descontoEl = document.getElementById('desconto');
    const totalEl = document.getElementById('total-final');
    const linhaDesconto = document.getElementById('linha-desconto');

    let subtotal = 0;
    const servicos = [];
    let html = '';

    checkboxes.forEach(cb => {
        const nome = cb.dataset.nome;
        const valor = parseFloat(cb.value);
        subtotal += valor;
        servicos.push(nome);
        html += `<p>✓ ${nome} <span style="float:right">R$ ${valor.toFixed(2).replace('.', ',')}</span></p>`;
    });

    if (checkboxes.length === 0) html = '<p class="vazio">Nenhum serviço selecionado</p>';

    // Desconto por combo
    let desconto = 0;
    let percentual = 0;
    let textoDesconto = '';
    if (checkboxes.length >= 3) { percentual = 15; textoDesconto = 'Combo 3+ serviços'; }
    else if (checkboxes.length === 2) { percentual = 10; textoDesconto = 'Combo 2 serviços'; }
    desconto = subtotal * (percentual / 100);

    // Cupom
    const cupomCodigo = document.getElementById('cupomInput')?.value.toUpperCase();
    const cupons = JSON.parse(localStorage.getItem('cupons') || '{}');
    let descontoCupom = 0;
    let textoCupom = '';
    if (cupomCodigo && cupons[cupomCodigo]) {
        const cupom = cupons[cupomCodigo];
        if (cupom.ativo && (!cupom.validade || new Date(cupom.validade) > new Date())) {
            if (cupom.tipo === 'percentual') {
                descontoCupom = subtotal * (cupom.valor / 100);
                textoCupom = `Cupom ${cupomCodigo} (-${cupom.valor}%)`;
            } else {
                descontoCupom = cupom.valor;
                textoCupom = `Cupom ${cupomCodigo} (-R$ ${cupom.valor})`;
            }
        }
    }

    const descontoTotal = desconto + descontoCupom;
    const total = subtotal - descontoTotal;

    lista.innerHTML = html;
    subtotalEl.textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;

    if (descontoTotal > 0) {
        linhaDesconto.style.display = 'flex';
        let descHtml = '';
        if (desconto > 0) descHtml += `<small>${textoDesconto}: -R$ ${desconto.toFixed(2).replace('.', ',')} (${percentual}%)<br></small>`;
        if (descontoCupom > 0) descHtml += `<small>${textoCupom}: -R$ ${descontoCupom.toFixed(2).replace('.', ',')}<br></small>`;
        descontoEl.innerHTML = descHtml + `<strong>-R$ ${descontoTotal.toFixed(2).replace('.', ',')}</strong>`;
    } else {
        linhaDesconto.style.display = 'none';
    }

    totalEl.innerHTML = `<strong>R$ ${total.toFixed(2).replace('.', ',')}</strong>`;

    localStorage.setItem('orcamentoAtual', JSON.stringify({
        servicos, subtotal, desconto, percentual,
        descontoCupom, cupomCodigo, total
    }));
}

function agendarComCombo() {
    const checkboxes = document.querySelectorAll('.checkbox-item input[type="checkbox"]:checked');
    if (checkboxes.length === 0) {
        mostrarNotificacao('Selecione pelo menos um serviço!', '#dc3545');
        return;
    }
    const orcamento = JSON.parse(localStorage.getItem('orcamentoAtual'));
    document.getElementById('servicosAgendamento').value = orcamento.servicos.join(' + ');
    document.getElementById('agendamento').scrollIntoView({ behavior: 'smooth' });
    mostrarNotificacao('Combo selecionado! Complete o agendamento abaixo.');
}

// === CUPONS ===
function carregarCupons() {
    const cuponsPadrao = {
        'BEMVINDO10': { valor: 10, tipo: 'percentual', ativo: true, descricao: '10% de desconto para novos clientes' },
        'BARBADOS20': { valor: 20, tipo: 'percentual', ativo: true, validade: '2026-12-31', descricao: '20% off em qualquer serviço' },
        'NATAL50': { valor: 50, tipo: 'fixo', ativo: true, validade: '2026-12-25', descricao: 'R$ 50 off especial de Natal' },
        'ANIVERSARIO': { valor: 15, tipo: 'percentual', ativo: true, descricao: '15% off no mês do seu aniversário' }
    };
    if (!localStorage.getItem('cupons')) {
        localStorage.setItem('cupons', JSON.stringify(cuponsPadrao));
    }
}

// === AGENDAMENTO ===
function initAgendamento() {
    const form = document.getElementById('formAgendamento');
    if (form) form.addEventListener('submit', salvarAgendamento);

    // Pré-preencher dados do cliente logado
    const clienteLogado = JSON.parse(sessionStorage.getItem('clienteLogado') || 'null');
    if (clienteLogado) {
        const nomeInput = document.getElementById('nomeCliente');
        const telInput = document.getElementById('telefone');
        if (nomeInput && !nomeInput.value) nomeInput.value = clienteLogado.nome;
        if (telInput && !telInput.value) telInput.value = clienteLogado.telefone;
    }
}

function salvarAgendamento(e) {
    e.preventDefault();

    const clienteLogado = JSON.parse(sessionStorage.getItem('clienteLogado') || 'null');
    const orcamento = JSON.parse(localStorage.getItem('orcamentoAtual') || 'null');

    const agendamento = {
        id: Date.now(),
        nome: document.getElementById('nomeCliente').value,
        telefone: document.getElementById('telefone').value,
        data: document.getElementById('dataAgendamento').value,
        horario: document.getElementById('horarioAgendamento').value,
        barbeiro: document.getElementById('barbeiro').value,
        servicos: document.getElementById('servicosAgendamento').value || 'A definir',
        observacoes: document.getElementById('observacoes').value,
        status: 'confirmado',
        clienteId: clienteLogado?.id || null,
        valorTotal: orcamento?.total || 0,
        criadoEm: new Date().toISOString()
    };

    if (!agendamento.horario) {
        mostrarNotificacao('Selecione um horário!', '#dc3545');
        return;
    }

    // Verifica conflito
    const agendamentos = JSON.parse(localStorage.getItem('agendamentos') || '[]');
    const conflito = agendamentos.find(a =>
        a.data === agendamento.data &&
        a.horario === agendamento.horario &&
        a.barbeiro === agendamento.barbeiro &&
        a.status !== 'cancelado'
    );

    if (conflito) {
        mostrarNotificacao('Horário já ocupado! Escolha outro.', '#dc3545');
        return;
    }

    agendamentos.push(agendamento);
    localStorage.setItem('agendamentos', JSON.stringify(agendamentos));

    // Adiciona pontos de primeiro agendamento
    if (clienteLogado && !clienteLogado.primeiroAgendamento) {
        adicionarPontos(clienteLogado.telefone, 20, 'Bônus primeiro agendamento');
        clienteLogado.primeiroAgendamento = true;
        sessionStorage.setItem('clienteLogado', JSON.stringify(clienteLogado));
    }

    // Envia notificações
    enviarNotificacaoWhatsApp(agendamento);
    enviarConfirmacaoEmail(agendamento);
    agendarLembrete(agendamento);

    mostrarConfirmacaoCompleta(agendamento);
    e.target.reset();
    localStorage.removeItem('orcamentoAtual');
}

// === NOTIFICAÇÃO WHATSAPP ===
function enviarNotificacaoWhatsApp(ag) {
    const data = new Date(ag.data + 'T00:00:00').toLocaleDateString('pt-BR');
    const msg = `✅ *Agendamento Confirmado!*\n\n` +
        `Olá, *${ag.nome}*! Seu horário na Barbado's foi agendado.\n\n` +
        `📅 *Data:* ${data}\n` +
        `🕐 *Horário:* ${ag.horario}\n` +
        `💈 *Serviços:* ${ag.servicos}\n` +
        `👨‍💼 *Barbeiro:* ${ag.barbeiro}\n\n` +
        `Nos vemos em breve! 💈`;

    const url = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
}

// === CONFIRMAÇÃO POR E-MAIL (simulada) ===
function enviarConfirmacaoEmail(ag) {
    const data = new Date(ag.data + 'T00:00:00').toLocaleDateString('pt-BR');
    const emailLog = JSON.parse(localStorage.getItem('emailsEnviados') || '[]');
    emailLog.push({
        para: ag.nome,
        telefone: ag.telefone,
        assunto: 'Agendamento Confirmado - Barbado\'s Barbearia',
        corpo: `Confirmação de agendamento para ${data} às ${ag.horario}`,
        enviadoEm: new Date().toISOString()
    });
    localStorage.setItem('emailsEnviados', JSON.stringify(emailLog));
}

// === LEMBRETE AGENDADO ===
function agendarLembrete(ag) {
    // Lembretes são verificados no login do cliente
    const lembretes = JSON.parse(localStorage.getItem('lembretes') || '[]');
    const dataLembrete = new Date(ag.data + 'T00:00:00');
    dataLembrete.setDate(dataLembrete.getDate() - 1);

    lembretes.push({
        agendamentoId: ag.id,
        clienteNome: ag.nome,
        clienteTelefone: ag.telefone,
        dataLembrete: dataLembrete.toISOString(),
        executado: false
    });
    localStorage.setItem('lembretes', JSON.stringify(lembretes));
}

// === MODAL DE CONFIRMAÇÃO ===
function mostrarConfirmacaoCompleta(ag) {
    const data = new Date(ag.data + 'T00:00:00').toLocaleDateString('pt-BR');
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-icon">✓</div>
            <h2>Agendamento Confirmado!</h2>
            <div class="modal-info">
                <p><strong>${data} às ${ag.horario}</strong></p>
                <p>${ag.servicos}</p>
                <p>Barbeiro: ${ag.barbeiro}</p>
            </div>
            <div class="modal-bonus">
                <i class="fas fa-gift"></i>
                <span>+20 pontos de bônus no seu primeiro agendamento!</span>
            </div>
            <div class="modal-info-extra">
                <p>📱 Você receberá um lembrete via WhatsApp 24h antes</p>
                <p>📧 Confirmação enviada por e-mail</p>
            </div>
            <button class="btn btn-primary btn-block" onclick="this.closest('.modal-overlay').remove()">Entendi!</button>
        </div>
    `;
    document.body.appendChild(modal);

    // Toca som de sucesso
    tocarSomSucesso();
}

function tocarSomSucesso() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        oscillator.connect(gain);
        gain.connect(audioCtx.destination);
        oscillator.frequency.value = 800;
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {}
}

// === PONTOS ===
function adicionarPontos(telefone, pontos, motivo) {
    const clientes = JSON.parse(localStorage.getItem('clientesConta') || '[]');
    const idx = clientes.findIndex(c => c.telefone === telefone);
    if (idx >= 0) {
        clientes[idx].pontos = (clientes[idx].pontos || 0) + pontos;
        const historico = JSON.parse(localStorage.getItem('historicoPontos') || '[]');
        historico.push({
            clienteId: clientes[idx].id,
            pontos,
            motivo,
            data: new Date().toISOString()
        });
        localStorage.setItem('historicoPontos', JSON.stringify(historico));
        localStorage.setItem('clientesConta', JSON.stringify(clientes));
    }
}

// === SISTEMA DE AVALIAÇÃO ===
function initAvaliacao() {
    const avaliacoes = JSON.parse(localStorage.getItem('avaliacoes') || '[]');
    const container = document.getElementById('depoimentosDinamicos');
    if (container && avaliacoes.length > 0) {
        container.innerHTML = avaliacoes.slice(-3).reverse().map(av => `
            <div class="depoimento">
                <div class="estrelas">${'★'.repeat(av.nota)}${'☆'.repeat(5 - av.nota)}</div>
                <p>"${av.comentario}"</p>
                <strong>- ${av.nome}</strong>
            </div>
        `).join('');
    }
}

window.abrirAvaliacao = function(agendamentoId) {
    const nota = prompt('Avalie nosso serviço de 1 a 5 estrelas:');
    if (!nota) return;
    const comentario = prompt('Deixe um comentário (opcional):') || '';

    const avaliacoes = JSON.parse(localStorage.getItem('avaliacoes') || '[]');
    avaliacoes.push({
        agendamentoId,
        nota: parseInt(nota),
        comentario,
        nome: 'Cliente',
        data: new Date().toISOString()
    });
    localStorage.setItem('avaliacoes', JSON.stringify(avaliacoes));
    mostrarNotificacao('Obrigado pela avaliação! ⭐');
};

// === CHAT WIDGET ===
function initChatWidget() {
    if (document.getElementById('chatWidget')) return;

    const widget = document.createElement('div');
    widget.id = 'chatWidget';
    widget.innerHTML = `
        <button id="chatToggle" class="chat-toggle" title="Fale conosco">
            <i class="fab fa-whatsapp"></i>
        </button>
        <div id="chatBox" class="chat-box hidden">
            <div class="chat-header">
                <strong>💬 Fale com a Barbado's</strong>
                <button onclick="toggleChat()" class="chat-close">×</button>
            </div>
            <div class="chat-body">
                <p>Olá! 👋 Como podemos te atender?</p>
                <button onclick="abrirWhatsApp('Olá! Gostaria de agendar um horário')" class="chat-option">
                    <i class="far fa-calendar"></i> Agendar horário
                </button>
                <button onclick="abrirWhatsApp('Olá! Gostaria de saber os preços')" class="chat-option">
                    <i class="fas fa-dollar-sign"></i> Ver preços
                </button>
                <button onclick="abrirWhatsApp('Olá! Gostaria de falar com um atendente')" class="chat-option">
                    <i class="fas fa-headset"></i> Falar com atendente
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(widget);

    document.getElementById('chatToggle').addEventListener('click', toggleChat);
}

window.toggleChat = function() {
    document.getElementById('chatBox').classList.toggle('hidden');
};

window.abrirWhatsApp = function(msg) {
    window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank');
    toggleChat();
};

// === PWA - INSTALÁVEL ===
function initPWA() {
    // Registrar Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
            .then(reg => {
                console.log('[PWA] Service Worker registrado:', reg.scope);
                // Verifica updates
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            mostrarNotificacao('Nova versão disponível! Atualize a página.', '#ffc107');
                        }
                    });
                });
            })
            .catch(err => console.log('[PWA] Erro ao registrar SW:', err));
    }

    // Botão de instalar
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;

        if (!localStorage.getItem('installDismissed')) {
            setTimeout(() => {
                const banner = document.createElement('div');
                banner.className = 'install-banner';
                banner.innerHTML = `
                    <div class="install-text">
                        <strong>📱 Instale nosso app!</strong>
                        <p>Acesso rápido na tela inicial</p>
                    </div>
                    <div class="install-actions">
                        <button class="btn-install" onclick="installPWA()">Instalar</button>
                        <button class="btn-dismiss" onclick="this.closest('.install-banner').remove(); localStorage.setItem('installDismissed', 'true')">Agora não</button>
                    </div>
                `;
                document.body.appendChild(banner);
                window._deferredPrompt = deferredPrompt;
            }, 5000);
        }
    });

    // Detecta se já está instalado
    if (window.matchMedia('(display-mode: standalone)').matches) {
        document.body.classList.add('pwa-installed');
    }
}

window.installPWA = function() {
    if (window._deferredPrompt) {
        window._deferredPrompt.prompt();
        window._deferredPrompt.userChoice.then(() => {
            document.querySelector('.install-banner')?.remove();
            window._deferredPrompt = null;
        });
    }
};

// Atualiza SW quando disponível
if ('serviceWorker' in navigator) {
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
    });
}

// === NOTIFICAÇÕES ===
function mostrarNotificacao(mensagem, cor = '#28a745') {
    const div = document.createElement('div');
    div.className = 'notificacao';
    div.innerHTML = `<i class="fas fa-check-circle"></i> ${mensagem}`;
    div.style.background = cor;
    document.body.appendChild(div);
    setTimeout(() => { div.style.opacity = '0'; setTimeout(() => div.remove(), 300); }, 4000);
}

// === SMOOTH SCROLL ===
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href !== '#' && document.querySelector(href)) {
            e.preventDefault();
            document.querySelector(href).scrollIntoView({ behavior: 'smooth' });
            document.querySelector('.nav-menu')?.classList.remove('active');
        }
    });
});