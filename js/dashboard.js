// === DASHBOARD DO CLIENTE ===
const escapar = window.seguranca.escaparHtml;
const argumento = window.seguranca.jsonParaAtributo;

function logout() {
    sessionStorage.removeItem('clienteLogado');
    window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', () => {
    // Verifica login
    const cliente = JSON.parse(sessionStorage.getItem('clienteLogado') || 'null');
    if (!cliente) {
        window.location.href = 'login.html';
        return;
    }

    carregarDashboard(cliente);
    carregarAgendamentos(cliente);
    carregarHistorico(cliente);
    preencherFormulario(cliente);
    verificarLembretes(cliente);
});

// === CARREGAR DASHBOARD ===
function carregarDashboard(cliente) {
    // Atualiza dados mais recentes do localStorage
    const clientes = JSON.parse(localStorage.getItem('clientesConta') || '[]');
    const clienteAtual = clientes.find(c => c.id === cliente.id) || cliente;

    document.getElementById('welcomeMsg').textContent = `Olá, ${clienteAtual.nome.split(' ')[0]}!`;
    document.getElementById('pontosCliente').textContent = clienteAtual.pontos || 0;
    document.getElementById('visitasCliente').textContent = clienteAtual.visitas || 0;

    const cortesRestantes = 10 - ((clienteAtual.visitas || 0) % 10);
    document.getElementById('cortesRestantes').textContent = cortesRestantes === 10 ? 10 : cortesRestantes;

    const progresso = ((clienteAtual.visitas || 0) % 10) * 10;
    document.getElementById('progressFill').style.width = `${progresso}%`;
    document.getElementById('progressPercent').textContent = `${progresso}%`;
    document.getElementById('progressBar')?.setAttribute('aria-valuenow', String(progresso));

    // Próximo brinde
    if (progresso === 0 && (clienteAtual.visitas || 0) > 0) {
        document.querySelector('.progress-text').textContent = 'Meta demonstrativa alcançada. Nenhum serviço real foi resgatado.';
    }
}

// === CARREGAR AGENDAMENTOS ===
function carregarAgendamentos(cliente) {
    const agendamentos = JSON.parse(localStorage.getItem('agendamentos') || '[]');
    const meusAgendamentos = agendamentos
        .filter(a => a.clienteId === cliente.id || a.telefone === cliente.telefone)
        .sort((a, b) => new Date(b.data + 'T' + b.horario) - new Date(a.data + 'T' + a.horario));

    const container = document.getElementById('listaAgendamentos');

    if (meusAgendamentos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="far fa-calendar" aria-hidden="true"></i>
                <h3>Seu próximo cuidado começa aqui.</h3>
                <p>Você ainda não tem simulações neste navegador. Escolha um serviço para experimentar.</p>
                <a href="../index.html#orcamento" class="btn btn-secondary">Simular horário</a>
            </div>
        `;
        return;
    }

    container.innerHTML = meusAgendamentos.map(a => {
        const data = new Date(a.data + 'T00:00:00').toLocaleDateString('pt-BR');
        const status = a.status || 'confirmado';
        const podeAvaliar = a.status === 'concluido' && !a.avaliado;

        return `
            <div class="agendamento-item">
                <div class="agendamento-info">
                    <h4>${escapar(a.servicos || 'Serviço não informado')}</h4>
                    <p><i class="far fa-calendar"></i> ${data} às ${escapar(a.horario)}</p>
                    <p><i class="fas fa-user"></i> Barbeiro: ${escapar(a.barbeiro || 'Não definido')}</p>
                    ${a.observacoes ? `<p><em>${escapar(a.observacoes)}</em></p>` : ''}
                    ${podeAvaliar ? `
                        <button class="btn btn-primary" style="margin-top:10px; padding:8px 16px; font-size:13px;"
                                onclick="abrirAvaliacao(${argumento(a.id)})">
                            <i class="fas fa-star"></i> Avaliar este atendimento
                        </button>
                    ` : ''}
                </div>
                <span class="status-badge status-${escapar(status)}">${escapar(status === 'confirmado' ? 'registro local' : status)}</span>
            </div>
        `;
    }).join('');
}

// === CARREGAR HISTÓRICO ===
function carregarHistorico(cliente) {
    const agendamentos = JSON.parse(localStorage.getItem('agendamentos') || '[]');
    const historico = agendamentos
        .filter(a => (a.clienteId === cliente.id || a.telefone === cliente.telefone) && a.status === 'concluido')
        .sort((a, b) => new Date(b.data + 'T' + b.horario) - new Date(a.data + 'T' + a.horario));

    const container = document.getElementById('historicoVisitas');

    if (historico.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-history" aria-hidden="true"></i><h3>Sua história está começando.</h3><p>Atendimentos marcados como concluídos na demo aparecerão aqui.</p></div>';
        return;
    }

    container.innerHTML = historico.map(h => {
        const data = new Date(h.data + 'T00:00:00').toLocaleDateString('pt-BR');
        const avaliado = h.avaliado ? '<span class="review-label">Avaliado na demo</span>' : '<span>Não avaliado</span>';
        return `
            <div class="visita-item">
                <div class="visita-info">
                    <h4>${escapar(h.servicos || 'Serviço')}</h4>
                    <p><i class="far fa-calendar"></i> ${data} às ${escapar(h.horario)} · ${avaliado}</p>
                    <p><i class="fas fa-user"></i> ${escapar(h.barbeiro || 'Barbeiro')}</p>
                </div>
                <span class="visit-points">+10 pts</span>
            </div>
        `;
    }).join('');
}

// === PREENCHER FORMULÁRIO ===
function preencherFormulario(cliente) {
    document.getElementById('editNome').value = cliente.nome || '';
    document.getElementById('editTelefone').value = cliente.telefone || '';
    document.getElementById('editEmail').value = cliente.email || '';
}

// === SALVAR ALTERAÇÕES ===
const formAtualizar = document.getElementById('formAtualizar');
if (formAtualizar) {
    formAtualizar.addEventListener('submit', (e) => {
        e.preventDefault();
        const cliente = JSON.parse(sessionStorage.getItem('clienteLogado') || 'null');
        if (!cliente) return;

        const clientes = JSON.parse(localStorage.getItem('clientesConta') || '[]');
        const idx = clientes.findIndex(c => c.id === cliente.id);
        const nome = document.getElementById('editNome').value.trim();
        const telefone = document.getElementById('editTelefone').value.replace(/\D/g, '');
        const email = document.getElementById('editEmail').value.trim().toLowerCase();
        if (!nome || !/^\d{10,11}$/.test(telefone) || !formAtualizar.reportValidity()) {
            window.interfaceBarbados.erroFormulario(formAtualizar, 'Informe nome, e-mail e telefone de teste com DDD (10 ou 11 dígitos).');
            return;
        }
        if (clientes.some(c => c.id !== cliente.id && (c.telefone === telefone || c.email?.toLowerCase() === email))) {
            window.interfaceBarbados.erroFormulario(formAtualizar, 'Este telefone ou e-mail já pertence a outra conta local.');
            return;
        }

        if (idx >= 0) {
            clientes[idx].nome = nome;
            clientes[idx].telefone = telefone;
            clientes[idx].email = email;

            localStorage.setItem('clientesConta', JSON.stringify(clientes));

            // Atualiza sessão
            const { senha: _, ...clienteSeguro } = clientes[idx];
            sessionStorage.setItem('clienteLogado', JSON.stringify(clienteSeguro));

            window.interfaceBarbados.erroFormulario(formAtualizar, '');
            mostrarNotificacao('Dados atualizados neste navegador.');
            carregarDashboard(clientes[idx]);
        }
    });
}

// === SISTEMA INDIQUE E GANHE ===
window.mostrarIndiqueGanhe = function() {
    const cliente = JSON.parse(sessionStorage.getItem('clienteLogado') || 'null');
    if (!cliente) return;

    const codigoIndicacao = `BARBADO${cliente.id.toString().slice(-6)}`;
    const linkIndicacao = `${window.location.origin}${window.location.pathname.replace('dashboard.html', '')}cadastro.html?ref=${codigoIndicacao}`;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:500px;">
            <div class="modal-icon" style="background:#17a2b8;"><i class="fas fa-users"></i></div>
            <h2>Indique e Ganhe 🎁</h2>
            <div class="modal-info" style="text-align:left; background:linear-gradient(135deg,#e7f3ff,#fff);">
                <p><strong>Seu código:</strong> <span style="font-family:monospace; background:var(--primary); color:var(--secondary); padding:4px 12px; border-radius:6px;">${escapar(codigoIndicacao)}</span></p>
                <p><strong>Seu link:</strong></p>
                <div style="background:white; padding:10px; border-radius:6px; font-size:12px; word-break:break-all; border:1px solid var(--border);">${escapar(linkIndicacao)}</div>
                <hr style="margin:15px 0;">
                <p><strong>Como funciona:</strong></p>
                <ul style="margin-left:20px; line-height:1.8;">
                    <li>Compartilhe seu código ou link com amigos</li>
                    <li>Recurso planejado: este link ainda não atribui indicações nem concede bônus.</li>
                </ul>
            </div>
            <div class="modal-actions" style="display:flex; gap:10px; justify-content:center; margin-top:20px;">
                <button class="btn btn-primary" onclick="copiarLink(${argumento(linkIndicacao)})"><i class="fas fa-copy"></i> Copiar Link</button>
                <button class="btn btn-secondary" onclick="compartilharWhats(${argumento(linkIndicacao)})"><i class="fab fa-whatsapp"></i> WhatsApp</button>
            </div>
            <button class="btn btn-block" onclick="this.closest('.modal-overlay').remove()" style="margin-top:15px; background:transparent; color:var(--gray);">Fechar</button>
        </div>
    `;
    document.body.appendChild(modal);
};

window.copiarLink = function(link) {
    navigator.clipboard.writeText(link).then(() => {
        mostrarNotificacao('Link copiado! 📋');
    });
};

window.compartilharWhats = function(link) {
    const msg = `Demonstração da Barbado's Barbearia (indicações ainda não implementadas): ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
};

// === VERIFICAR LEMBRETES ===
function verificarLembretes(cliente) {
    const lembretes = JSON.parse(localStorage.getItem('lembretes') || '[]');
    const meusLembretes = lembretes.filter(l => l.clienteTelefone === cliente.telefone && !l.executado && new Date(l.dataLembrete) <= new Date());

    if (meusLembretes.length > 0) {
        setTimeout(() => {
            meusLembretes.forEach(l => {
                const agendamentos = JSON.parse(localStorage.getItem('agendamentos') || '[]');
                const ag = agendamentos.find(a => a.id === l.agendamentoId);
                if (ag && ag.status === 'confirmado' && new Date(ag.data + 'T' + ag.horario) > new Date()) {
                    const data = new Date(ag.data + 'T00:00:00').toLocaleDateString('pt-BR');
                    const modal = document.createElement('div');
                    modal.className = 'modal-overlay active';
                    modal.innerHTML = `
                        <div class="modal-content">
                            <div class="modal-icon" style="background:#ffc107; color:#333;"><i class="fas fa-bell"></i></div>
                            <h2>Lembrete de Agendamento</h2>
                            <div class="modal-info">
                                <p>Olá <strong>${escapar(cliente.nome.split(' ')[0])}</strong>!</p>
                                <p>Registro local de demonstração: <strong>${data} às ${escapar(ag.horario)}</strong></p>
                                <p>Serviço: ${escapar(ag.servicos)}</p>
                            </div>
                            <button class="btn btn-primary btn-block" onclick="this.closest('.modal-overlay').remove()">Entendi!</button>
                        </div>
                    `;
                    document.body.appendChild(modal);

                    // Marca como executado
                    l.executado = true;
                    localStorage.setItem('lembretes', JSON.stringify(lembretes));
                }
            });
        }, 2000);
    }
}

// === AVALIAÇÃO (função global) ===
window.abrirAvaliacao = function(agendamentoId) {
    const cliente = JSON.parse(sessionStorage.getItem('clienteLogado') || 'null');
    const agendamento = JSON.parse(localStorage.getItem('agendamentos') || '[]').find(a => a.id === agendamentoId);
    if (!cliente || !agendamento || agendamento.status !== 'concluido' || agendamento.avaliado ||
        !(agendamento.clienteId === cliente.id || agendamento.telefone === cliente.telefone)) return;
    window.interfaceBarbados.formularioDialogo('Avaliar a experiência da demo', [
        { name: 'nota', label: 'Sua nota de teste', required: true, value: '5', options: [5, 4, 3, 2, 1].map(n => ({ value: String(n), label: `${n} de 5 estrelas` })) },
        { name: 'comentario', label: 'Comentário de teste (opcional)', type: 'textarea', maxLength: 500 }
    ], values => salvarAvaliacaoLocal(agendamentoId, Number(values.nota), values.comentario));
};

function salvarAvaliacaoLocal(agendamentoId, nota, comentario) {
    const atual = JSON.parse(localStorage.getItem('agendamentos') || '[]').find(a => a.id === agendamentoId);
    if (!atual || atual.avaliado) return 'Este registro já foi avaliado nesta demo.';

    const avaliacoes = JSON.parse(localStorage.getItem('avaliacoes') || '[]');
    const cliente = JSON.parse(sessionStorage.getItem('clienteLogado') || 'null');

    avaliacoes.push({
        agendamentoId,
        nota: parseInt(nota),
        comentario,
        nome: cliente?.nome || 'Cliente',
        data: new Date().toISOString()
    });
    localStorage.setItem('avaliacoes', JSON.stringify(avaliacoes));

    // Marca agendamento como avaliado
    const agendamentos = JSON.parse(localStorage.getItem('agendamentos') || '[]');
    const idx = agendamentos.findIndex(a => a.id === agendamentoId);
    if (idx >= 0) {
        agendamentos[idx].avaliado = true;
        localStorage.setItem('agendamentos', JSON.stringify(agendamentos));
    }

    // Adiciona pontos por avaliar
    if (cliente) {
        const clientes = JSON.parse(localStorage.getItem('clientesConta') || '[]');
        const cIdx = clientes.findIndex(c => c.id === cliente.id);
        if (cIdx >= 0) {
            clientes[cIdx].pontos = (clientes[cIdx].pontos || 0) + 5;
            localStorage.setItem('clientesConta', JSON.stringify(clientes));

            const historico = JSON.parse(localStorage.getItem('historicoPontos') || '[]');
            historico.push({
                clienteId: cliente.id,
                pontos: 5,
                motivo: 'Avaliação de serviço',
                data: new Date().toISOString()
            });
            localStorage.setItem('historicoPontos', JSON.stringify(historico));

            // Atualiza sessão
            const { senha: _, ...clienteSeguro } = clientes[cIdx];
            sessionStorage.setItem('clienteLogado', JSON.stringify(clienteSeguro));
            carregarDashboard(clientes[cIdx]);
        }
    }

    mostrarNotificacao('Obrigado pela avaliação! +5 pontos ⭐', '#ffc107');
    carregarAgendamentos(JSON.parse(sessionStorage.getItem('clienteLogado') || 'null'));
    carregarHistorico(JSON.parse(sessionStorage.getItem('clienteLogado') || 'null'));
}

// === NOTIFICAÇÃO ===
function mostrarNotificacao(mensagem, cor = '#28a745') {
    const div = document.createElement('div');
    div.className = 'notificacao';
    div.setAttribute('role', 'status');
    div.textContent = mensagem;
    document.body.appendChild(div);
    setTimeout(() => { div.style.opacity = '0'; setTimeout(() => div.remove(), 300); }, 4000);
}
