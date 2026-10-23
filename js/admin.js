// === PAINEL ADMINISTRATIVO COMPLETO ===
const escapar = window.seguranca.escaparHtml;
const argumento = window.seguranca.jsonParaAtributo;

const ADMIN_CONFIG = {
    intervaloRefresh: 10000, // 10 segundos
    somNotificacao: false
};

// === INICIALIZAÇÃO ===
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initSidebar();
    initFilters();
    initSearch();
    initConfigForm();
    initNotificacoesRealtime();
    carregarTudo();
    iniciarAutoRefresh();
    const initial = location.hash.slice(1);
    if (document.querySelector(`.nav-link[data-tab="${CSS.escape(initial)}"]`)) showTab(initial);
});

// === TABS ===
function initTabs() {
    document.querySelectorAll('.nav-link[data-tab]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showTab(link.dataset.tab);
        });
    });
}

function showTab(tab) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-link[data-tab]').forEach(l => l.classList.remove('active'));

    const tabContent = document.getElementById(tab);
    const tabLink = document.querySelector(`.nav-link[data-tab="${tab}"]`);

    if (tabContent) tabContent.classList.add('active');
    if (tabLink) tabLink.classList.add('active');
    document.querySelectorAll('.nav-link[data-tab]').forEach(link => {
        if (link === tabLink) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
    });

    const titles = {
        dashboard: 'Visão geral',
        agendamentos: 'Agendamentos',
        clientes: 'Clientes',
        servicos: 'Serviços',
        cupons: 'Cupons de Desconto',
        avaliacoes: 'Avaliações',
        financeiro: 'Financeiro',
        configuracoes: 'Configurações'
    };
    document.getElementById('pageTitle').textContent = titles[tab] || 'Dashboard';

    carregarTudo();
    fecharSidebar();
    history.replaceState(null, '', `#${tab}`);
    document.getElementById('pageTitle').focus({ preventScroll: true });
}

function carregarTudo() {
    carregarMetricas();
    carregarProximosAgendamentos();
    carregarClientesVIP();
    carregarTopServicos();
    carregarAgendaSemana();
    carregarAgendamentosAdmin(filtroAtual || 'todos');
    carregarClientes(document.getElementById('buscaCliente')?.value || '');
    carregarServicos();
    carregarCupons();
    carregarEstatisticasCupons();
    carregarAvaliacoes();
    carregarFinanceiro();
    atualizarBadges();
    atualizarLastUpdate();
}

// === SIDEBAR MOBILE ===
function initSidebar() {
    const toggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    if (toggle) {
        toggle.addEventListener('click', () => {
            const open = !sidebar.classList.contains('open');
            sidebar.classList.toggle('open', open);
            toggle.setAttribute('aria-expanded', String(open));
            document.getElementById('sidebarScrim').hidden = !open;
            document.querySelector('.main-content').inert = open;
            if (open) sidebar.querySelector('a').focus();
        });
    }
    document.getElementById('sidebarScrim').addEventListener('click', fecharSidebar);
    document.addEventListener('keydown', event => {
        if (!sidebar.classList.contains('open')) return;
        if (event.key === 'Escape') { fecharSidebar(); toggle.focus(); }
        if (event.key === 'Tab') {
            const items = [toggle, ...sidebar.querySelectorAll('a')];
            const first = items[0], last = items[items.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
    });
}

function fecharSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarToggle').setAttribute('aria-expanded', 'false');
    document.getElementById('sidebarScrim').hidden = true;
    document.querySelector('.main-content').inert = false;
}

// === FILTROS ===
let filtroAtual = 'todos';
function initFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.filter-btn').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
            btn.classList.add('active');
            filtroAtual = btn.dataset.filter;
            carregarAgendamentosAdmin(filtroAtual);
        });
    });
}

// === BUSCA ===
function initSearch() {
    const busca = document.getElementById('buscaCliente');
    if (busca) {
        busca.addEventListener('input', (e) => carregarClientes(e.target.value));
    }
}

// === NOTIFICAÇÕES EM TEMPO REAL ===
function initNotificacoesRealtime() {
    const notifAdmin = document.getElementById('notificacaoAdmin');
    const dropdown = document.getElementById('notifDropdown');

    notifAdmin?.addEventListener('click', () => {
        dropdown.classList.toggle('hidden');
        notifAdmin.setAttribute('aria-expanded', String(!dropdown.classList.contains('hidden')));
    });

    document.getElementById('btnRefresh')?.addEventListener('click', () => {
        carregarTudo();
        tocarSom('refresh');
    });

    // Fecha dropdown ao clicar fora
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.notificacao-admin') && !e.target.closest('.notif-dropdown')) {
            dropdown?.classList.add('hidden');
            notifAdmin?.setAttribute('aria-expanded', 'false');
        }
    });

    // Escuta mudanças no localStorage de outras abas
    window.addEventListener('storage', (e) => {
        if (e.key === 'agendamentos' || e.key === 'clientesConta') {
            adicionarNotificacao('🔔 Dados atualizados em outra aba');
            carregarTudo();
        }
    });

    // Polling para detectar novos agendamentos
    setInterval(verificarNovosAgendamentos, 5000);
}

let ultimoAgendamentoId = null;
function verificarNovosAgendamentos() {
    const agendamentos = JSON.parse(localStorage.getItem('agendamentos') || '[]');
    if (agendamentos.length === 0) return;

    const maisRecente = Math.max(...agendamentos.map(a => a.id));

    if (ultimoAgendamentoId && maisRecente > ultimoAgendamentoId) {
        const novoAg = agendamentos.find(a => a.id === maisRecente);
        adicionarNotificacao(`🆕 Novo agendamento: ${novoAg.nome} às ${novoAg.horario}`);
        tocarSom('novo');
        carregarTudo();
    }

    ultimoAgendamentoId = maisRecente;
    atualizarLastUpdate();
}

function adicionarNotificacao(msg) {
    const lista = JSON.parse(localStorage.getItem('notifAdmin') || '[]');
    lista.unshift({ msg, hora: new Date().toISOString(), lida: false });
    if (lista.length > 20) lista.pop();
    localStorage.setItem('notifAdmin', JSON.stringify(lista));

    const listaEl = document.getElementById('listaNotificacoes');
    if (listaEl) {
        renderizarNotificacoes();
    }

    atualizarBadges();
    mostrarToast(msg);
}

function renderizarNotificacoes() {
    const lista = JSON.parse(localStorage.getItem('notifAdmin') || '[]');
    const container = document.getElementById('listaNotificacoes');

    if (lista.length === 0) {
        container.innerHTML = '<p class="empty-state">Nenhuma notificação</p>';
        return;
    }

    container.innerHTML = lista.map((n, i) => {
        const hora = new Date(n.hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return `
            <div class="notif-item ${n.lida ? '' : 'unread'}">
                <span>${escapar(n.msg)}</span>
                <small>${hora}</small>
            </div>
        `;
    }).join('');
}

function limparNotificacoes() {
    localStorage.setItem('notifAdmin', JSON.stringify([]));
    renderizarNotificacoes();
    atualizarBadges();
}

function atualizarBadges() {
    const lista = JSON.parse(localStorage.getItem('notifAdmin') || '[]');
    const naoLidas = lista.filter(n => !n.lida).length;

    document.getElementById('notifBadge').textContent = naoLidas;
    document.getElementById('badgeNovos').textContent = naoLidas;

    // Pendentes
    const agendamentos = JSON.parse(localStorage.getItem('agendamentos') || '[]');
    const pendentes = agendamentos.filter(a => a.status === 'confirmado').length;
    const badgePend = document.getElementById('badgePendentes');
    if (badgePend) badgePend.textContent = pendentes;
}

function atualizarLastUpdate() {
    const el = document.getElementById('lastUpdate');
    if (el) el.textContent = 'Atualizado: ' + new Date().toLocaleTimeString('pt-BR');
}

function tocarSom(tipo) {
    if (!ADMIN_CONFIG.somNotificacao) return;
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        oscillator.connect(gain);
        gain.connect(audioCtx.destination);
        oscillator.frequency.value = tipo === 'novo' ? 1000 : 600;
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (e) {}
}

function mostrarToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'toast-admin';
    toast.innerHTML = `<i class="fas fa-bell"></i> ${escapar(msg)}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// === AUTO REFRESH ===
let refreshInterval;
function iniciarAutoRefresh() {
    clearInterval(refreshInterval);
    refreshInterval = setInterval(() => {
        carregarTudo();
    }, ADMIN_CONFIG.intervaloRefresh);
}

// === MÉTRICAS ===
function carregarMetricas() {
    const agendamentos = JSON.parse(localStorage.getItem('agendamentos') || '[]');
    const clientes = JSON.parse(localStorage.getItem('clientesConta') || '[]');
    const avaliacoes = JSON.parse(localStorage.getItem('avaliacoes') || '[]');

    const hoje = new Date().toISOString().split('T')[0];
    const agendamentosHoje = agendamentos.filter(a => a.data === hoje);

    document.getElementById('metricAgendamentos').textContent = agendamentosHoje.length;
    document.getElementById('metricClientes').textContent = clientes.length;

    // Faturamento do mês
    const mes = new Date().getMonth();
    const ano = new Date().getFullYear();
    const concluidos = agendamentos.filter(a => {
        const d = new Date(a.data);
        return a.status === 'concluido' && d.getMonth() === mes && d.getFullYear() === ano;
    });

    const faturamento = concluidos.reduce((acc, a) => acc + (Number(a.valorTotal) || 0), 0);
    document.getElementById('metricFaturamento').textContent = `R$ ${faturamento.toFixed(0)}`;

    // Avaliação média
    if (avaliacoes.length > 0) {
        const media = avaliacoes.reduce((acc, a) => acc + a.nota, 0) / avaliacoes.length;
        document.getElementById('metricAvaliacao').textContent = media.toFixed(1);
    } else document.getElementById('metricAvaliacao').textContent = '—';
}

// === PRÓXIMOS AGENDAMENTOS ===
function carregarProximosAgendamentos() {
    const todos = JSON.parse(localStorage.getItem('agendamentos') || '[]');
    const hoje = new Date().toISOString().split('T')[0];

    const proximos = todos
        .filter(a => a.data >= hoje && a.status !== 'cancelado')
        .sort((a, b) => new Date(a.data + 'T' + a.horario) - new Date(b.data + 'T' + b.horario))
        .slice(0, 5);

    const container = document.getElementById('proximosAgendamentos');

    if (proximos.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="far fa-calendar" aria-hidden="true"></i><h3>Sua agenda está livre.</h3><p>Crie uma simulação no site para explorar a gestão local.</p><a href="../index.html#orcamento" class="btn btn-secondary">Nova simulação</a></div>';
        return;
    }

    container.innerHTML = proximos.map(a => {
        const data = new Date(a.data + 'T00:00:00').toLocaleDateString('pt-BR');
        return `
            <div class="admin-item">
                <div class="admin-item-info">
                    <h4>${escapar(a.nome)}</h4>
                    <p><i class="far fa-clock"></i> ${data} às ${escapar(a.horario)}</p>
                    <p><strong>${escapar(a.servicos || 'A definir')}</strong></p>
                </div>
                <span class="status-badge status-${escapar(a.status)}">${escapar(a.status === 'confirmado' ? 'registro local' : a.status)}</span>
            </div>
        `;
    }).join('');
}

// === CLIENTES VIP ===
function carregarClientesVIP() {
    const clientes = JSON.parse(localStorage.getItem('clientesConta') || '[]');
    const vips = clientes.sort((a, b) => (b.pontos || 0) - (a.pontos || 0)).slice(0, 5);

    const container = document.getElementById('clientesVIP');

    if (vips.length === 0) {
        container.innerHTML = '<p class="empty-state">Sem clientes ainda</p>';
        return;
    }

    container.innerHTML = vips.map(c => `
        <div class="admin-item">
            <div class="admin-item-info">
                <h4>${escapar(c.nome)} ${(c.visitas || 0) >= 10 ? '⭐ VIP' : ''}</h4>
                <p><i class="fas fa-phone"></i> ${escapar(c.telefone)}</p>
                <p><i class="fas fa-cut"></i> ${escapar(c.visitas || 0)} visitas · <i class="fas fa-coins"></i> ${escapar(c.pontos || 0)} pts</p>
            </div>
        </div>
    `).join('');
}

// === TOP SERVIÇOS ===
function carregarTopServicos() {
    const agendamentos = JSON.parse(localStorage.getItem('agendamentos') || '[]');
    const contadores = {};

    agendamentos.forEach(a => {
        if (a.servicos) {
            a.servicos.split('+').forEach(s => {
                const nome = s.trim();
                contadores[nome] = (contadores[nome] || 0) + 1;
            });
        }
    });

    const top = Object.entries(contadores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const container = document.getElementById('topServicos');

    if (top.length === 0) {
        container.innerHTML = '<p class="empty-state">Sem dados ainda</p>';
        return;
    }

    const max = top[0][1];
    container.innerHTML = top.map(([nome, qtd]) => `
        <div class="ranking-item">
            <span>${escapar(nome)}</span>
            <div class="ranking-bar">
                <div class="ranking-fill" style="width:${(qtd/max)*100}%"></div>
            </div>
            <strong>${qtd}</strong>
        </div>
    `).join('');
}

// === AGENDA DA SEMANA ===
function carregarAgendaSemana() {
    const agendamentos = JSON.parse(localStorage.getItem('agendamentos') || '[]');
    const dias = [];

    for (let i = 0; i < 7; i++) {
        const data = new Date();
        data.setDate(data.getDate() + i);
        const dataStr = data.toISOString().split('T')[0];
        const qtd = agendamentos.filter(a => a.data === dataStr && a.status !== 'cancelado').length;
        dias.push({
            data: dataStr,
            dia: data.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }),
            qtd
        });
    }

    const max = Math.max(...dias.map(d => d.qtd), 1);
    const container = document.getElementById('agendaSemana');

    container.innerHTML = dias.map(d => `
        <div class="semana-item">
            <span>${d.dia}</span>
            <div class="ranking-bar">
                <div class="ranking-fill" style="width:${(d.qtd/max)*100}%; background:var(--accent)"></div>
            </div>
            <strong>${d.qtd}</strong>
        </div>
    `).join('');
}

// === AGENDAMENTOS ===
function carregarAgendamentosAdmin(filtro) {
    const todos = JSON.parse(localStorage.getItem('agendamentos') || '[]');
    let lista = [...todos];

    if (filtro !== 'todos') {
        lista = lista.filter(a => a.status === filtro);
    }

    lista.sort((a, b) => new Date(b.data + 'T' + b.horario) - new Date(a.data + 'T' + a.horario));

    const container = document.getElementById('listaAgendamentosAdmin');

    if (lista.length === 0) {
        container.innerHTML = '<p class="empty-state">Nenhum agendamento encontrado</p>';
        return;
    }

    container.innerHTML = lista.map(a => {
        const data = new Date(a.data + 'T00:00:00').toLocaleDateString('pt-BR');
        const valor = a.valorTotal ? `R$ ${a.valorTotal.toFixed(2)}` : '';
        return `
            <div class="admin-item">
                <div class="admin-item-info">
                    <h4>${escapar(a.nome)} ${valor ? `<span class="valor">${valor}</span>` : ''}</h4>
                    <p><i class="fas fa-phone"></i> ${escapar(a.telefone)}</p>
                    <p><i class="far fa-calendar"></i> ${data} às ${escapar(a.horario)} · <i class="fas fa-user"></i> ${escapar(a.barbeiro)}</p>
                    <p><strong>${escapar(a.servicos)}</strong></p>
                    ${a.observacoes ? `<p><em>"${escapar(a.observacoes)}"</em></p>` : ''}
                </div>
                <div class="admin-actions">
                    ${a.status === 'confirmado' ? `
                        <button class="btn-action btn-complete" onclick="concluirAgendamento(${argumento(a.id)})" title="Marcar como concluído">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn-action btn-cancel" onclick="cancelarAgendamento(${argumento(a.id)})" title="Cancelar">
                            <i class="fas fa-times"></i>
                        </button>
                        <button class="btn-action btn-whatsapp" onclick="enviarWhatsCliente(${argumento(a.telefone)}, ${argumento(a.nome)})" title="Enviar WhatsApp">
                            <i class="fab fa-whatsapp"></i>
                        </button>
                    ` : ''}
                    ${a.status === 'concluido' && !a.avaliado ? `
                        <button class="btn-action btn-avaliar" onclick="solicitarAvaliacao(${argumento(a.id)}, ${argumento(a.telefone)})" title="Pedir avaliação">
                            <i class="fas fa-star"></i>
                        </button>
                    ` : ''}
                    <button class="btn-action btn-delete" onclick="excluirAgendamento(${argumento(a.id)})" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function concluirAgendamento(id) {
    const agendamentos = JSON.parse(localStorage.getItem('agendamentos') || '[]');
    const idx = agendamentos.findIndex(a => a.id === id);

    if (idx >= 0 && agendamentos[idx].status === 'confirmado') {
        agendamentos[idx].status = 'concluido';
        agendamentos[idx].concluidoEm = new Date().toISOString();
        localStorage.setItem('agendamentos', JSON.stringify(agendamentos));

        const cliente = agendamentos[idx];
        const clientes = JSON.parse(localStorage.getItem('clientesConta') || '[]');
        const cIdx = clientes.findIndex(c => c.telefone === cliente.telefone);
        if (cIdx >= 0) {
            clientes[cIdx].visitas = (clientes[cIdx].visitas || 0) + 1;
            clientes[cIdx].pontos = (clientes[cIdx].pontos || 0) + 10;
            localStorage.setItem('clientesConta', JSON.stringify(clientes));
        }

        mostrarNotificacaoAdmin('Agendamento concluído! +10 pontos ao cliente.');
        carregarTudo();
    }
}

function cancelarAgendamento(id) {
    if (!confirm('Cancelar este agendamento?')) return;
    const agendamentos = JSON.parse(localStorage.getItem('agendamentos') || '[]');
    const idx = agendamentos.findIndex(a => a.id === id);
    if (idx >= 0) {
        agendamentos[idx].status = 'cancelado';
        agendamentos[idx].canceladoEm = new Date().toISOString();
        localStorage.setItem('agendamentos', JSON.stringify(agendamentos));
        carregarTudo();
        mostrarNotificacaoAdmin('Agendamento cancelado.');
    }
}

function excluirAgendamento(id) {
    if (!confirm('Excluir permanentemente?')) return;
    let agendamentos = JSON.parse(localStorage.getItem('agendamentos') || '[]');
    agendamentos = agendamentos.filter(a => a.id !== id);
    localStorage.setItem('agendamentos', JSON.stringify(agendamentos));
    carregarTudo();
}

function enviarWhatsCliente(telefone, nome) {
    const msg = `Olá ${nome}! Aqui é da Barbado's Barbearia. Tudo certo com seu agendamento? 💈`;
    const tel = telefone.replace(/\D/g, '');
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`, '_blank');
}

function solicitarAvaliacao(id, telefone) {
    const agendamentos = JSON.parse(localStorage.getItem('agendamentos') || '[]');
    const idx = agendamentos.findIndex(a => a.id === id);
    if (idx >= 0) {
        agendamentos[idx].avaliado = true;
        localStorage.setItem('agendamentos', JSON.stringify(agendamentos));
    }
    const msg = `Oi! Obrigado por vir à Barbado's 💈 Que tal avaliar nosso atendimento? Responda de 1 a 5 ⭐`;
    const tel = telefone.replace(/\D/g, '');
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`, '_blank');
}

// === CLIENTES ===
function carregarClientes(busca = '') {
    const clientes = JSON.parse(localStorage.getItem('clientesConta') || '[]');
    const filtrados = busca
        ? clientes.filter(c => c.nome.toLowerCase().includes(busca.toLowerCase()) || c.telefone.includes(busca))
        : clientes;

    const container = document.getElementById('listaClientes');

    if (filtrados.length === 0) {
        container.innerHTML = busca ? '<div class="empty-state"><h3>Nenhuma conta encontrada.</h3><p>Tente outro nome ou telefone, ou limpe a busca.</p></div>' : '<div class="empty-state"><i class="fas fa-users" aria-hidden="true"></i><h3>Ainda não há contas locais.</h3><p>Crie uma conta de teste no site para explorar este painel.</p></div>';
        return;
    }

    container.innerHTML = filtrados.map(c => {
        const isVIP = (c.visitas || 0) >= 10;
        return `
        <div class="admin-item">
            <div class="admin-item-info">
                <h4>${escapar(c.nome)} ${isVIP ? '⭐ VIP' : ''}</h4>
                <p><i class="fas fa-phone"></i> ${escapar(c.telefone)} · <i class="fas fa-envelope"></i> ${escapar(c.email || 'N/A')}</p>
                <p><i class="fas fa-cut"></i> ${escapar(c.visitas || 0)} visitas · <i class="fas fa-coins"></i> ${escapar(c.pontos || 0)} pontos</p>
                ${c.aniversario ? `<p>🎂 Aniversário: ${escapar(c.aniversario)}</p>` : ''}
            </div>
            <div class="admin-actions">
                <button class="btn-action btn-whatsapp" onclick="enviarWhatsCliente(${argumento(c.telefone)}, ${argumento(c.nome)})" title="WhatsApp">
                    <i class="fab fa-whatsapp"></i>
                </button>
            </div>
        </div>
    `}).join('');
}

// === SERVIÇOS ===
const servicosPadrao = [
    { id: 1, nome: 'Corte Masculino', preco: 45, duracao: 30, ativo: true, categoria: 'Cabelo' },
    { id: 2, nome: 'Barba', preco: 35, duracao: 25, ativo: true, categoria: 'Barba' },
    { id: 3, nome: 'Corte + Barba', preco: 70, duracao: 50, ativo: true, categoria: 'Combo' },
    { id: 4, nome: 'Pigmentação de Barba', preco: 80, duracao: 40, ativo: true, categoria: 'Barba' },
    { id: 5, nome: 'Hidratação Capilar', preco: 60, duracao: 30, ativo: true, categoria: 'Tratamento' },
    { id: 6, nome: 'Dia do Noivo', preco: 200, duracao: 120, ativo: true, categoria: 'Especial' }
];

function carregarServicos() {
    let servicos = JSON.parse(localStorage.getItem('servicos') || 'null');
    if (!servicos) {
        servicos = servicosPadrao;
        localStorage.setItem('servicos', JSON.stringify(servicos));
    }

    const container = document.getElementById('listaServicos');

    container.innerHTML = servicos.map(s => `
        <div class="admin-item">
            <div class="admin-item-info">
                <h4>${escapar(s.nome)} ${s.ativo ? '' : '<small>(Inativo)</small>'}</h4>
                <p><span class="badge-categoria">${escapar(s.categoria || 'Geral')}</span></p>
                <p><i class="fas fa-money-bill"></i> R$ ${Number(s.preco).toFixed(2)} · <i class="far fa-clock"></i> ${escapar(s.duracao)} min</p>
            </div>
            <div class="admin-actions">
                <button class="btn-action btn-edit" onclick="editarServico(${argumento(s.id)})" title="Editar preço do serviço">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-action btn-delete" onclick="excluirServico(${argumento(s.id)})" title="Excluir serviço local">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function novoServico() {
    window.interfaceBarbados.formularioDialogo('Novo serviço local', [
        { name: 'nome', label: 'Nome demonstrativo', required: true, maxLength: 80 },
        { name: 'preco', label: 'Preço de referência (R$)', type: 'number', min: 0, max: 10000, step: 0.01, required: true },
        { name: 'duracao', label: 'Duração (minutos)', type: 'number', min: 5, max: 600, step: 5, required: true },
        { name: 'categoria', label: 'Categoria (opcional)', maxLength: 40 }
    ], values => {
        const servicos = JSON.parse(localStorage.getItem('servicos') || '[]');
        servicos.push({ id: Date.now(), nome: values.nome.trim(), preco: Number(values.preco), duracao: Number(values.duracao), categoria: values.categoria.trim() || 'Geral', ativo: true });
        localStorage.setItem('servicos', JSON.stringify(servicos));
        carregarServicos();
        mostrarNotificacaoAdmin('Serviço salvo no catálogo local do painel.');
    });
}

function editarServico(id) {
    const servicos = JSON.parse(localStorage.getItem('servicos') || '[]');
    const s = servicos.find(x => x.id === id);
    if (!s) return;

    window.interfaceBarbados.formularioDialogo('Editar preço local', [
        { name: 'preco', label: `Preço de ${s.nome} (R$)`, type: 'number', min: 0, max: 10000, step: 0.01, required: true, value: s.preco }
    ], values => {
        s.preco = Number(values.preco);
        localStorage.setItem('servicos', JSON.stringify(servicos));
        carregarServicos();
        mostrarNotificacaoAdmin('Serviço atualizado!');
    });
}

function excluirServico(id) {
    if (!confirm('Excluir este serviço?')) return;
    let servicos = JSON.parse(localStorage.getItem('servicos') || '[]');
    servicos = servicos.filter(s => s.id !== id);
    localStorage.setItem('servicos', JSON.stringify(servicos));
    carregarServicos();
}

// === CUPONS ===
function carregarCupons() {
    const cupons = JSON.parse(localStorage.getItem('cupons') || '{}');
    const container = document.getElementById('listaCupons');

    const cuponsArray = Object.entries(cupons);

    if (cuponsArray.length === 0) {
        container.innerHTML = '<p class="empty-state">Nenhum cupom criado ainda</p>';
        return;
    }

    container.innerHTML = cuponsArray.map(([codigo, dados]) => {
        const validade = dados.validade ? new Date(dados.validade).toLocaleDateString('pt-BR') : 'Sem expiração';
        const valorTxt = dados.tipo === 'percentual' ? `${dados.valor}%` : `R$ ${dados.valor}`;
        return `
            <div class="admin-item">
                <div class="admin-item-info">
                    <h4><span class="cupom-codigo">${escapar(codigo)}</span></h4>
                    <p>${escapar(dados.descricao || 'Sem descrição')}</p>
                    <p><strong>Desconto:</strong> ${escapar(valorTxt)} · <strong>Validade:</strong> ${validade}</p>
                    <p>Contagem local: ${escapar(dados.usos || 0)} · ${dados.ativo ? 'Ativo' : 'Inativo'}</p>
                </div>
                <div class="admin-actions">
                    <button class="btn-action btn-toggle ${dados.ativo ? 'btn-complete' : 'btn-cancel'}" onclick="toggleCupom(${argumento(codigo)})" title="Ativar/Desativar">
                        <i class="fas fa-${dados.ativo ? 'eye' : 'eye-slash'}"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="excluirCupom(${argumento(codigo)})" title="Excluir cupom local">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function carregarEstatisticasCupons() {
    const cupons = JSON.parse(localStorage.getItem('cupons') || '{}');
    const cuponsArray = Object.entries(cupons);

    const container = document.getElementById('estatisticasCupons');

    if (cuponsArray.length === 0) {
        container.innerHTML = '<p class="empty-state">Sem estatísticas ainda</p>';
        return;
    }

    const totalUsos = cuponsArray.reduce((acc, [_, c]) => acc + (c.usos || 0), 0);
    const maisUsado = cuponsArray.sort((a, b) => (b[1].usos || 0) - (a[1].usos || 0))[0];

    container.innerHTML = `
        <div class="stats-row">
            <div class="stat-box">
                <h3>${cuponsArray.filter(([, c]) => c.ativo).length}</h3>
                <p>Cupons Ativos</p>
            </div>
            <div class="stat-box">
                <h3>${escapar(totalUsos)}</h3>
                <p>Usos Totais</p>
            </div>
            <div class="stat-box">
                <h3>${escapar(totalUsos > 0 && maisUsado ? maisUsado[0] : '—')}</h3>
                <p>Mais Usado</p>
            </div>
        </div>
    `;
}

function novoCupom() {
    window.interfaceBarbados.formularioDialogo('Novo cupom de teste', [
        { name: 'codigo', label: 'Código (letras e números)', required: true, maxLength: 24 },
        { name: 'tipo', label: 'Tipo de desconto', value: 'percentual', options: [{ value: 'percentual', label: 'Percentual (%)' }, { value: 'fixo', label: 'Valor fixo (R$)' }] },
        { name: 'valor', label: 'Valor do desconto', type: 'number', min: 0.01, max: 10000, step: 0.01, required: true },
        { name: 'validade', label: 'Validade (opcional)', type: 'date' },
        { name: 'descricao', label: 'Descrição demonstrativa (opcional)', maxLength: 120 }
    ], values => {
        const codigo = values.codigo.trim().toUpperCase();
        if (!/^[A-Z0-9]{3,24}$/.test(codigo)) return 'Use de 3 a 24 letras e números no código.';
        if (values.tipo === 'percentual' && Number(values.valor) > 100) return 'O percentual precisa ser de até 100%.';
        const cupons = JSON.parse(localStorage.getItem('cupons') || '{}');
        if (Object.hasOwn(cupons, codigo)) return 'Este código já existe. Escolha outro para não substituir o cupom.';
        cupons[codigo] = { tipo: values.tipo, valor: Number(values.valor), validade: values.validade, descricao: values.descricao, ativo: true, usos: 0 };
        localStorage.setItem('cupons', JSON.stringify(cupons));
        carregarCupons(); carregarEstatisticasCupons();
        mostrarNotificacaoAdmin('Cupom salvo somente neste navegador.');
    });
}

function toggleCupom(codigo) {
    const cupons = JSON.parse(localStorage.getItem('cupons') || '{}');
    if (cupons[codigo]) {
        cupons[codigo].ativo = !cupons[codigo].ativo;
        localStorage.setItem('cupons', JSON.stringify(cupons));
        carregarCupons();
    }
}

function excluirCupom(codigo) {
    if (!confirm(`Excluir cupom ${codigo}?`)) return;
    const cupons = JSON.parse(localStorage.getItem('cupons') || '{}');
    delete cupons[codigo];
    localStorage.setItem('cupons', JSON.stringify(cupons));
    carregarCupons();
    carregarEstatisticasCupons();
}

// === AVALIAÇÕES ===
function carregarAvaliacoes() {
    const avaliacoes = JSON.parse(localStorage.getItem('avaliacoes') || '[]');
    const container = document.getElementById('listaAvaliacoes');

    document.getElementById('totalAvaliacoes').textContent = avaliacoes.length;

    if (avaliacoes.length > 0) {
        const media = avaliacoes.reduce((acc, a) => acc + a.nota, 0) / avaliacoes.length;
        document.getElementById('notaMedia').textContent = media.toFixed(1);
    } else {
        document.getElementById('notaMedia').textContent = '—';
    }

    if (avaliacoes.length === 0) {
        container.innerHTML = '<p class="empty-state">Nenhuma avaliação ainda</p>';
        return;
    }

    container.innerHTML = avaliacoes.slice().reverse().map(av => {
        const data = new Date(av.data).toLocaleDateString('pt-BR');
        return `
            <div class="admin-item avaliacao-item">
                <div class="admin-item-info">
                    <h4>${escapar(av.nome)} <span class="estrelas-mini">${'★'.repeat(window.seguranca.inteiroLimitado(av.nota, 1, 5, 5))}${'☆'.repeat(5 - window.seguranca.inteiroLimitado(av.nota, 1, 5, 5))}</span></h4>
                    <p>"${escapar(av.comentario || 'Sem comentário')}"</p>
                    <small><i class="far fa-calendar"></i> ${data}</small>
                </div>
                <button class="btn-icon-sm" onclick="excluirAvaliacao(${argumento(av.data)})" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    }).join('');
}

function excluirAvaliacao(data) {
    if (!confirm('Excluir avaliação?')) return;
    let avaliacoes = JSON.parse(localStorage.getItem('avaliacoes') || '[]');
    avaliacoes = avaliacoes.filter(a => a.data !== data);
    localStorage.setItem('avaliacoes', JSON.stringify(avaliacoes));
    carregarAvaliacoes();
}

// === FINANCEIRO ===
function carregarFinanceiro() {
    const agendamentos = JSON.parse(localStorage.getItem('agendamentos') || '[]');
    const concluidos = agendamentos.filter(a => a.status === 'concluido');

    const mes = new Date().getMonth();
    const ano = new Date().getFullYear();
    const doMes = concluidos.filter(a => {
        const d = new Date(a.data);
        return d.getMonth() === mes && d.getFullYear() === ano;
    });

    const receita = doMes.reduce((acc, a) => acc + (Number(a.valorTotal) || 0), 0);
    document.getElementById('receitaMes').textContent = `R$ ${receita.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
    document.getElementById('lucroMes').textContent = `R$ ${(receita - 800).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

    // Taxa de ocupação: agendamentos / horários disponíveis
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const diasUteis = Math.floor((hoje - inicioMes) / (1000 * 60 * 60 * 24)) * 0.7;
    const slotsDisponiveis = diasUteis * 22; // 22 slots por dia
    const taxa = slotsDisponiveis > 0 ? Math.min(100, (doMes.length / slotsDisponiveis) * 100) : 0;
    document.getElementById('taxaOcupacao').textContent = `${taxa.toFixed(0)}%`;

    const container = document.getElementById('historicoFinanceiro');
    if (doMes.length === 0) {
        container.innerHTML = '<p class="empty-state">Sem receitas registradas este mês</p>';
        return;
    }

    container.innerHTML = doMes.slice(-10).reverse().map(a => {
        const data = new Date(a.data + 'T00:00:00').toLocaleDateString('pt-BR');
        const valor = `R$ ${(Number(a.valorTotal) || 0).toFixed(2)}`;
        return `
            <div class="admin-item">
                <div class="admin-item-info">
                    <h4>${escapar(a.nome)}</h4>
                    <p>${data} às ${escapar(a.horario)} · ${escapar(a.servicos)}</p>
                </div>
                <strong class="finance-value">${valor}</strong>
            </div>
        `;
    }).join('');
}

function exportarRelatorio() {
    const agendamentos = JSON.parse(localStorage.getItem('agendamentos') || '[]');
    const clientes = JSON.parse(localStorage.getItem('clientesConta') || '[]');

    let csv = 'Data,Hora,Cliente,Telefone,Servicos,Barbeiro,Status,Valor\n';
    agendamentos.forEach(a => {
        csv += `${a.data},${a.horario},"${a.nome}","${a.telefone}","${a.servicos}","${a.barbeiro}",${a.status},${a.valorTotal || 0}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio_barbados_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    mostrarNotificacaoAdmin('Relatório exportado!');
}

// === CONFIGURAÇÕES ===
function initConfigForm() {
    const form = document.getElementById('formConfig');
    if (!form) return;

    // Carrega valores salvos
    const config = JSON.parse(localStorage.getItem('barbeariaConfig') || '{}');
    if (config.nome) document.getElementById('configNome').value = config.nome;
    if (config.whatsapp) document.getElementById('configWhatsapp').value = config.whatsapp;
    if (config.email) document.getElementById('configEmail').value = config.email;
    if (config.endereco) document.getElementById('configEndereco').value = config.endereco;
    if (config.abre) document.getElementById('configAbre').value = config.abre;
    if (config.fecha) document.getElementById('configFecha').value = config.fecha;
    if (config.sabado) document.getElementById('configSabado').value = config.sabado;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const config = {
            nome: document.getElementById('configNome').value,
            whatsapp: document.getElementById('configWhatsapp').value,
            email: document.getElementById('configEmail').value,
            endereco: document.getElementById('configEndereco').value,
            abre: parseInt(document.getElementById('configAbre').value),
            fecha: parseInt(document.getElementById('configFecha').value),
            sabado: parseInt(document.getElementById('configSabado').value)
        };
        localStorage.setItem('barbeariaConfig', JSON.stringify(config));
        mostrarNotificacaoAdmin('Configurações salvas!');
    });
}

// === BACKUP / RESTAURAR ===
function backupDados() {
    const dados = {
        agendamentos: localStorage.getItem('agendamentos'),
        clientes: localStorage.getItem('clientesConta'),
        servicos: localStorage.getItem('servicos'),
        cupons: localStorage.getItem('cupons'),
        avaliacoes: localStorage.getItem('avaliacoes'),
        historicoPontos: localStorage.getItem('historicoPontos'),
        barbeariaConfig: localStorage.getItem('barbeariaConfig'),
        dataBackup: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_barbados_${Date.now()}.json`;
    link.click();
    mostrarNotificacaoAdmin('Backup feito com sucesso!');
}

function restaurarDados(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!confirm('Restaurar este backup substituirá os dados atuais. Continuar?')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const dados = JSON.parse(e.target.result);
            Object.entries(dados).forEach(([key, value]) => {
                if (key !== 'dataBackup' && value) localStorage.setItem(key, value);
            });
            alert('Backup restaurado! Recarregue a página.');
            location.reload();
        } catch (err) {
            alert('Arquivo inválido!');
        }
    };
    reader.readAsText(file);
}

function limparTudo() {
    if (!confirm('⚠️ Isso vai APAGAR TODOS os dados. Tem certeza?')) return;
    if (!confirm('Última chance! Todos os clientes, agendamentos e histórico serão perdidos.')) return;

    ['agendamentos', 'clientesConta', 'servicos', 'cupons', 'avaliacoes', 'historicoPontos', 'emailsEnviados'].forEach(k => {
        localStorage.removeItem(k);
    });
    alert('Todos os dados foram apagados.');
    location.reload();
}

// === NOTIFICAÇÃO ADMIN ===
function mostrarNotificacaoAdmin(mensagem, cor = '#28a745') {
    const div = document.createElement('div');
    div.className = 'notificacao';
    div.textContent = mensagem;
    document.body.appendChild(div);
    setTimeout(() => { div.style.opacity = '0'; setTimeout(() => div.remove(), 300); }, 3000);
}
