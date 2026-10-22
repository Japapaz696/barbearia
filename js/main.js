// === BARBADO'S BARBEARIA - SISTEMA COMPLETO ===
//
// ---------------------------------------------------------------------------
// AVISO DE DEMONSTRACAO (nao remova este bloco)
// ---------------------------------------------------------------------------
// Este site e um PROTOTIPO ESTATICO. Nao existe backend, banco de dados,
// autenticacao real, envio de e-mail nem disparo automatico de WhatsApp.
//
//  - "Agendamento" grava um registro no localStorage DESTE navegador. Nao
//    reserva horario em nenhum sistema central e nao reserva nada em outro
//    aparelho. Limpar os dados do navegador apaga os agendamentos.
//  - Nao existe e-mail de confirmacao nem lembrete automatico. O botao de
//    WhatsApp apenas ABRE uma conversa pre-preenchida: quem envia a mensagem
//    e a propria pessoa.
//  - A area do cliente e um prototipo de UX: a senha e derivada no navegador
//    (PBKDF2) apenas para nao ficar em texto puro no aparelho, mas quem
//    controla o navegador controla a verificacao. Login de verdade exige
//    servidor com sessao em cookie HttpOnly.
// ---------------------------------------------------------------------------

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

// Acesso curto aos modulos compartilhados (carregados antes deste arquivo).
const seguro = window.seguranca;
const agenda = window.agenda;

// Servicos conhecidos: usados para descobrir a duracao real de um combo.
const SERVICOS_CONHECIDOS = {
    'Corte Masculino': 30,
    'Barba': 25,
    'Corte + Barba': 50,
    'Pigmentação': 40,
    'Pigmentação de Barba': 40,
    'Hidratação': 30,
    'Hidratação Capilar': 30,
    'Pezinho': 15,
    'Pézinho': 15,
    'Sobrancelha': 15,
    'Dia do Noivo': 120
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
        atualizarRotuloTema(document.body.classList.contains('dark-mode'));
        btn.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('darkMode', isDark);
            atualizarIconeTema(isDark);
            atualizarRotuloTema(isDark);
        });
    }
}

function atualizarIconeTema(isDark) {
    const btn = document.getElementById('darkModeToggle');
    if (btn) btn.innerHTML = isDark ? '<i class="fas fa-sun" aria-hidden="true"></i>' : '<i class="fas fa-moon" aria-hidden="true"></i>';
}

// O botao so tem icone; sem rotulo, leitores de tela nao sabem o que ele faz.
function atualizarRotuloTema(isDark) {
    const btn = document.getElementById('darkModeToggle');
    if (!btn) return;
    btn.setAttribute('aria-pressed', String(isDark));
    btn.setAttribute('aria-label', isDark ? 'Desativar modo escuro' : 'Ativar modo escuro');
    btn.setAttribute('title', isDark ? 'Desativar modo escuro' : 'Ativar modo escuro');
}

// === MENU MOBILE ===
function initMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    if (!hamburger || !navMenu) return;

    hamburger.addEventListener('click', () => {
        const aberto = navMenu.classList.toggle('active');
        hamburger.setAttribute('aria-expanded', String(aberto));
    });

    // Fecha ao apertar Esc e devolve o foco ao botao.
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navMenu.classList.contains('active')) {
            navMenu.classList.remove('active');
            hamburger.setAttribute('aria-expanded', 'false');
            hamburger.focus();
        }
    });
}

// === DATA MÍNIMA ===
// Usa a data LOCAL. `toISOString()` usa UTC e, depois das 21h no Brasil, marca
// o dia seguinte como minimo — o que impedia agendar "hoje".
function setMinDate() {
    const dataInput = document.getElementById('dataAgendamento');
    if (dataInput) {
        dataInput.min = agenda.hojeLocal();
    }
}

// === CALENDÁRIO VISUAL ===
function initCalendario() {
    const dataInput = document.getElementById('dataAgendamento');
    if (!dataInput) return;

    dataInput.addEventListener('change', () => {
        atualizarHorariosDisponiveis(dataInput.value);
    });

    const barbeiro = document.getElementById('barbeiro');
    if (barbeiro) {
        barbeiro.addEventListener('change', () => {
            atualizarHorariosDisponiveis(dataInput.value);
        });
    }
}

// Duração, em minutos, do conjunto de serviços escolhidos. A agenda precisa
// dela para calcular o fim do atendimento e os conflitos.
function duracaoDosServicos(nomesServicos) {
    if (typeof nomesServicos === 'string' && SERVICOS_CONHECIDOS[nomesServicos.trim()]) {
        return SERVICOS_CONHECIDOS[nomesServicos.trim()];
    }
    const nomes = Array.isArray(nomesServicos) ? nomesServicos : String(nomesServicos || '').split('+');
    let total = 0;
    for (const cru of nomes) {
        const nome = String(cru).trim();
        if (!nome) continue;
        total += SERVICOS_CONHECIDOS[nome] || CONFIG.intervaloMinutos;
    }
    return total > 0 ? total : CONFIG.intervaloMinutos;
}

function duracaoSelecionadaNoSite() {
    const marcados = document.querySelectorAll('.checkbox-item input[type="checkbox"]:checked');
    if (marcados.length > 0) {
        const nomes = [...marcados].map((cb) => cb.dataset.nome);
        return duracaoDosServicos(nomes);
    }
    const texto = document.getElementById('servicosAgendamento')?.value || '';
    return duracaoDosServicos(texto);
}

function atualizarHorariosDisponiveis(data) {
    if (!data) return;
    const select = document.getElementById('horarioAgendamento');
    if (!select) return;

    const agendamentos = JSON.parse(localStorage.getItem('agendamentos') || '[]');
    const barbeiro = document.getElementById('barbeiro')?.value || 'Qualquer um';
    const duracao = duracaoSelecionadaNoSite();

    const lista = agenda.gerarHorariosDoDia(data, duracao, barbeiro, agendamentos, {
        config: {
            abre: CONFIG.horario.abre,
            fecha: CONFIG.horario.fecha,
            sabadoAte: CONFIG.horario.sabadoAte,
            intervaloMinutos: CONFIG.intervaloMinutos,
            duracaoPadraoMinutos: CONFIG.intervaloMinutos
        }
    });

    select.innerHTML = '';

    if (lista.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Fechado neste dia — escolha outra data';
        select.appendChild(option);
        return;
    }

    const primeira = document.createElement('option');
    primeira.value = '';
    primeira.textContent = 'Selecione um horário';
    select.appendChild(primeira);

    for (const slot of lista) {
        const option = document.createElement('option');
        option.value = slot.horario;
        option.textContent = slot.disponivel ? slot.horario : `${slot.horario} (Indisponível)`;
        if (!slot.disponivel) option.disabled = true;
        select.appendChild(option);
    }
}

// === ORÇAMENTO ===
function initOrcamento() {
    document.querySelectorAll('.checkbox-item input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', atualizarOrcamento);
    });

    const cupomInput = document.getElementById('cupomInput');
    if (cupomInput) cupomInput.addEventListener('input', atualizarOrcamento);

    // A duração dos serviços escolhidos muda os horários oferecidos.
    document.querySelectorAll('.checkbox-item input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', () => {
            const data = document.getElementById('dataAgendamento')?.value;
            if (data) atualizarHorariosDisponiveis(data);
        });
    });
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
        if (!Number.isFinite(valor)) return;
        subtotal += valor;
        servicos.push(nome);
        html += `<p>✓ ${seguro.escaparHtml(nome)} <span style="float:right">R$ ${valor.toFixed(2).replace('.', ',')}</span></p>`;
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
    const cupomCodigoCru = document.getElementById('cupomInput')?.value.trim().toUpperCase() || '';
    const cupons = JSON.parse(localStorage.getItem('cupons') || '{}');
    let descontoCupom = 0;
    let textoCupom = '';
    let cupomInvalido = false;

    if (cupomCodigoCru) {
        const cupom = Object.prototype.hasOwnProperty.call(cupons, cupomCodigoCru) ? cupons[cupomCodigoCru] : null;
        const ativo = cupom && cupom.ativo && (!cupom.validade || new Date(cupom.validade) >= new Date(agenda.hojeLocal() + 'T00:00:00'));
        const valor = cupom ? parseFloat(cupom.valor) : NaN;

        if (!cupom) {
            cupomInvalido = true;
            textoCupom = `Cupom ${seguro.escaparHtml(cupomCodigoCru)} não encontrado`;
        } else if (!ativo) {
            cupomInvalido = true;
            textoCupom = `Cupom ${seguro.escaparHtml(cupomCodigoCru)} expirado ou inativo`;
        } else if (!Number.isFinite(valor) || valor <= 0) {
            cupomInvalido = true;
            textoCupom = `Cupom ${seguro.escaparHtml(cupomCodigoCru)} inválido`;
        } else if (cupom.tipo === 'percentual') {
            const pct = Math.min(valor, 100); // nunca mais de 100%
            descontoCupom = subtotal * (pct / 100);
            textoCupom = `Cupom ${seguro.escaparHtml(cupomCodigoCru)} (-${pct}%)`;
        } else {
            descontoCupom = valor;
            textoCupom = `Cupom ${seguro.escaparHtml(cupomCodigoCru)} (-R$ ${valor.toFixed(2).replace('.', ',')})`;
        }
    }

    const descontoBruto = desconto + descontoCupom;
    // Nunca deixa o desconto passar do subtotal: sem isso, um cupom fixo de
    // R$ 50 num servico de R$ 25 gerava total negativo ("-R$ 25,00").
    const descontoTotal = Math.min(descontoBruto, subtotal);
    const total = Math.max(0, subtotal - descontoTotal);

    lista.innerHTML = html;
    subtotalEl.textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;

    if (descontoTotal > 0 || cupomInvalido) {
        linhaDesconto.style.display = 'flex';
        let descHtml = '';
        if (desconto > 0) descHtml += `<small>${textoDesconto}: -R$ ${desconto.toFixed(2).replace('.', ',')} (${percentual}%)<br></small>`;
        if (descontoCupom > 0) descHtml += `<small>${textoCupom}: -R$ ${descontoCupom.toFixed(2).replace('.', ',')}<br></small>`;
        else if (cupomInvalido) descHtml += `<small>${textoCupom}<br></small>`;
        if (descontoBruto > descontoTotal) descHtml += `<small>Desconto limitado ao valor dos serviços.</small>`;
        descHtml += `<strong>-R$ ${descontoTotal.toFixed(2).replace('.', ',')}</strong>`;
        descontoEl.innerHTML = descHtml;
    } else {
        linhaDesconto.style.display = 'none';
    }

    totalEl.innerHTML = `<strong>R$ ${total.toFixed(2).replace('.', ',')}</strong>`;

    localStorage.setItem('orcamentoAtual', JSON.stringify({
        servicos, subtotal, desconto, percentual,
        descontoCupom, cupomCodigo: cupomCodigoCru, total
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

async function salvarAgendamento(e) {
    e.preventDefault();
    const botao = e.target.querySelector('[type="submit"]');
    if (botao.disabled) return;
    botao.disabled = true;
    try {
        // Serializa o check + write entre abas da mesma origem quando Web
        // Locks está disponível. Isso NÃO resolve concorrência entre aparelhos.
        if (navigator.locks) {
            await navigator.locks.request('barbados-agenda-local', () => salvarAgendamentoLocal(e));
        } else {
            salvarAgendamentoLocal(e);
        }
    } catch (erro) {
        mostrarNotificacao('Não foi possível salvar neste navegador. Verifique o armazenamento e tente novamente.', '#dc3545');
        console.error('Falha ao salvar simulação local:', erro);
    } finally {
        botao.disabled = false;
    }
}

function salvarAgendamentoLocal(e) {
    e.preventDefault();
    if (!e.target.reportValidity()) return;

    const clienteLogado = JSON.parse(sessionStorage.getItem('clienteLogado') || 'null');
    const orcamento = JSON.parse(localStorage.getItem('orcamentoAtual') || 'null');

    const data = document.getElementById('dataAgendamento').value;
    const horario = document.getElementById('horarioAgendamento').value;
    const barbeiro = document.getElementById('barbeiro').value;
    const servicosTexto = document.getElementById('servicosAgendamento').value ||
        (orcamento && orcamento.servicos && orcamento.servicos.length ? orcamento.servicos.join(' + ') : 'A definir');

    if (!horario) {
        mostrarNotificacao('Selecione um horário!', '#dc3545');
        return;
    }

    if (!data) {
        mostrarNotificacao('Selecione uma data!', '#dc3545');
        return;
    }

    const diaSemana = agenda.diaDaSemana(data);
    if (diaSemana === 0) {
        mostrarNotificacao('Fechado aos domingos. Escolha outro dia.', '#dc3545');
        atualizarHorariosDisponiveis(data);
        return;
    }

    const duracao = duracaoDosServicos(
        (orcamento && orcamento.servicos && orcamento.servicos.length)
            ? orcamento.servicos
            : servicosTexto
    );

    const agendamento = {
        id: Date.now(),
        nome: document.getElementById('nomeCliente').value.trim(),
        telefone: somenteDigitos(document.getElementById('telefone').value),
        data,
        horario,
        barbeiro,
        servicos: servicosTexto,
        duracao,
        observacoes: document.getElementById('observacoes').value,
        status: 'confirmado',
        clienteId: clienteLogado?.id || null,
        valorTotal: orcamento?.total || 0,
        criadoEm: new Date().toISOString()
    };

    // Verifica conflito considerando duração, barbeiro específico e
    // "Qualquer um". A regra vive em js/agenda.js (coberta por testes).
    const agendamentos = JSON.parse(localStorage.getItem('agendamentos') || '[]');
    const slot = agenda.gerarHorariosDoDia(data, duracao, barbeiro, agendamentos)
        .find(item => item.horario === horario);
    if (!slot?.disponivel) {
        mostrarNotificacao('Horário indisponível ou fora do expediente. Escolha outro.', '#dc3545');
        atualizarHorariosDisponiveis(data);
        return;
    }
    if (agenda.existeConflito(
        { data: agendamento.data, horario: agendamento.horario, duracao: agendamento.duracao, barbeiro: agendamento.barbeiro },
        agendamentos,
        { duracaoPadraoMinutos: CONFIG.intervaloMinutos }
    )) {
        mostrarNotificacao('Horário já ocupado! Escolha outro.', '#dc3545');
        atualizarHorariosDisponiveis(data);
        return;
    }

    agendamentos.push(agendamento);
    localStorage.setItem('agendamentos', JSON.stringify(agendamentos));

    // A simulação não comprova atendimento e não concede bônus de reserva.
    let pontosGanhos = 0;

    mostrarConfirmacaoCompleta(agendamento, pontosGanhos);

    e.target.reset();
    localStorage.removeItem('orcamentoAtual');
    document.getElementById('horarioAgendamento').innerHTML = '<option value="">Selecione primeiro a data</option>';
    atualizarOrcamento();
}

function somenteDigitos(valor) {
    return String(valor || '').replace(/\D/g, '');
}

function registrarHistoricoPontos(clienteId, pontos, motivo) {
    const historico = JSON.parse(localStorage.getItem('historicoPontos') || '[]');
    historico.push({ clienteId, pontos, motivo, data: new Date().toISOString() });
    localStorage.setItem('historicoPontos', JSON.stringify(historico));
}

// === WHATSAPP (abre conversa, não envia nada) ===
function abrirConversaWhatsApp(ag, ganhouBonus) {
    const data = new Date(ag.data + 'T00:00:00').toLocaleDateString('pt-BR');
    const msg = `Olá! Acabei de solicitar um horário pelo site da Barbado's.\n\n` +
        `*Nome:* ${ag.nome}\n` +
        `*Data:* ${data}\n` +
        `*Horário:* ${ag.horario}\n` +
        `*Serviços:* ${ag.servicos}\n` +
        `*Barbeiro:* ${ag.barbeiro}\n\n` +
        (ganhouBonus ? `(Pelo site eu também ganhei 20 pontos de boas-vindas.)\n\n` : '') +
        `Pode confirmar, por favor?`;

    const url = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
}

// === MODAL DE CONFIRMAÇÃO ===
// O texto é deliberadamente honesto: o site NÃO confirma sozinho, NÃO manda
// e-mail e NÃO agenda lembrete. Tudo isso era prometido antes (P0-4).
function mostrarConfirmacaoCompleta(ag, pontosGanhos) {
    const data = new Date(ag.data + 'T00:00:00').toLocaleDateString('pt-BR');
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'tituloConfirmacao');
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-icon" aria-hidden="true">✓</div>
            <h2 id="tituloConfirmacao">Horário solicitado</h2>
            <div class="modal-info">
                <p><strong>${seguro.escaparHtml(data)} às ${seguro.escaparHtml(ag.horario)}</strong></p>
                <p>${seguro.escaparHtml(ag.servicos)}</p>
                <p>Barbeiro: ${seguro.escaparHtml(ag.barbeiro)}</p>
            </div>
            ${pontosGanhos > 0 ? `
            <div class="modal-bonus">
                <i class="fas fa-gift" aria-hidden="true"></i>
                <span>+20 pontos de boas-vindas na sua conta!</span>
            </div>` : ''}
            <div class="modal-info-extra">
                <p><strong>Importante:</strong> este é um site de demonstração.</p>
                <p>O pedido foi registrado apenas <strong>neste navegador</strong>. Nenhum e-mail ou lembrete automático foi enviado.</p>
                <p>Nenhum horário real foi reservado e nenhum contato externo foi aberto.</p>
            </div>
            <button class="btn btn-primary btn-block" onclick="this.closest('.modal-overlay').remove()">Entendi</button>
        </div>
    `;
    document.body.appendChild(modal);

    const botao = modal.querySelector('button');
    if (botao) botao.focus();

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
    } catch (e) { /* som é opcional */ }
}

// === PONTOS ===
function adicionarPontos(telefone, pontos, motivo) {
    const clientes = JSON.parse(localStorage.getItem('clientesConta') || '[]');
    const alvo = somenteDigitos(telefone);
    const idx = clientes.findIndex(c => c.telefone === alvo);
    if (idx >= 0) {
        clientes[idx].pontos = (clientes[idx].pontos || 0) + pontos;
        registrarHistoricoPontos(clientes[idx].id, pontos, motivo);
        localStorage.setItem('clientesConta', JSON.stringify(clientes));
    }
}

// === SISTEMA DE AVALIAÇÃO ===
function initAvaliacao() {
    const avaliacoes = JSON.parse(localStorage.getItem('avaliacoes') || '[]');
    const container = document.getElementById('depoimentosDinamicos');
    if (container && avaliacoes.length > 0) {
        // Escapa nome e comentário (P0-1) e limita a nota a 1..5.
        container.innerHTML = avaliacoes.slice(-3).reverse().map(av => {
            const nota = seguro.inteiroLimitado(av.nota, 1, 5, 5);
            return `
            <div class="depoimento">
                <div class="estrelas">${'★'.repeat(nota)}${'☆'.repeat(5 - nota)}</div>
                <p>"${seguro.escaparHtml(av.comentario)}"</p>
                <strong>- ${seguro.escaparHtml(av.nome)}</strong>
            </div>`;
        }).join('');
    }
}

window.abrirAvaliacao = function (agendamentoId) {
    const notaCrua = prompt('Avalie nosso serviço de 1 a 5 estrelas:');
    if (!notaCrua) return;
    const nota = seguro.inteiroLimitado(notaCrua, 1, 5, NaN);
    if (!Number.isFinite(nota)) {
        mostrarNotificacao('Nota deve ser entre 1 e 5!', '#dc3545');
        return;
    }
    const comentario = prompt('Deixe um comentário (opcional):') || '';

    const avaliacoes = JSON.parse(localStorage.getItem('avaliacoes') || '[]');
    avaliacoes.push({
        agendamentoId,
        nota,
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
        <button id="chatToggle" class="chat-toggle" aria-label="Abrir conversa no WhatsApp" aria-expanded="false" aria-controls="chatBox">
            <i class="fab fa-whatsapp" aria-hidden="true"></i>
        </button>
        <div id="chatBox" class="chat-box hidden">
            <div class="chat-header">
                <strong>💬 Fale com a Barbado's</strong>
                <button onclick="toggleChat()" class="chat-close" aria-label="Fechar conversa">×</button>
            </div>
            <div class="chat-body">
                <p>Olá! 👋 Como podemos te atender?</p>
                <button onclick="abrirWhatsApp('Olá! Gostaria de agendar um horário')" class="chat-option">
                    <i class="far fa-calendar" aria-hidden="true"></i> Agendar horário
                </button>
                <button onclick="abrirWhatsApp('Olá! Gostaria de saber os preços')" class="chat-option">
                    <i class="fas fa-dollar-sign" aria-hidden="true"></i> Ver preços
                </button>
                <button onclick="abrirWhatsApp('Olá! Gostaria de falar com um atendente')" class="chat-option">
                    <i class="fas fa-headset" aria-hidden="true"></i> Falar com atendente
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(widget);

    document.getElementById('chatToggle').addEventListener('click', toggleChat);
}

window.toggleChat = function () {
    const caixa = document.getElementById('chatBox');
    const botao = document.getElementById('chatToggle');
    if (!caixa) return;
    const escondida = caixa.classList.toggle('hidden');
    if (botao) botao.setAttribute('aria-expanded', String(!escondida));
};

window.abrirWhatsApp = function (msg) {
    window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
    toggleChat();
};

// === PWA - INSTALÁVEL ===
function initPWA() {
    // Registra o Service Worker com caminho RELATIVO, para funcionar tanto na
    // raiz quanto em subpasta (GitHub Pages). Antes era '/service-worker.js',
    // que falha em /<repo>/ e quebrava o modo offline (P0-5).
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js')
            .then(reg => {
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    if (!newWorker) return;
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

window.installPWA = function () {
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
    const tinhaControlador = Boolean(navigator.serviceWorker.controller);
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        // A primeira instalação não deve interromper um formulário em uso.
        if (!tinhaControlador || refreshing) return;
        refreshing = true;
        window.location.reload();
    });
}

// === NOTIFICAÇÕES ===
function mostrarNotificacao(mensagem, cor = '#28a745') {
    const div = document.createElement('div');
    div.className = 'notificacao';
    div.setAttribute('role', 'status');
    div.innerHTML = `<i class="fas fa-check-circle" aria-hidden="true"></i> ${seguro.escaparHtml(mensagem)}`;
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
            const menu = document.querySelector('.nav-menu');
            if (menu) menu.classList.remove('active');
            const hamburger = document.querySelector('.hamburger');
            if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
        }
    });
});
