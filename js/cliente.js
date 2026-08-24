// === AUTENTICAÇÃO DO CLIENTE ===

document.addEventListener('DOMContentLoaded', () => {
    // Verifica se já está logado
    const logado = sessionStorage.getItem('clienteLogado');
    if (logado && !window.location.pathname.includes('login.html') && !window.location.pathname.includes('cadastro.html')) {
        // Já logado, redireciona para dashboard se estiver na página de login
    }
});

// === LOGIN ===
const formLogin = document.getElementById('formLogin');
if (formLogin) {
    formLogin.addEventListener('submit', (e) => {
        e.preventDefault();
        const telefone = document.getElementById('telefoneLogin').value.replace(/\D/g, '');
        const senha = document.getElementById('senhaLogin').value;

        if (!telefone || !senha) {
            mostrarNotificacao('Preencha todos os campos!', '#dc3545');
            return;
        }

        const clientes = JSON.parse(localStorage.getItem('clientesConta') || '[]');
        const cliente = clientes.find(c => c.telefone === telefone && c.senha === senha);

        if (cliente) {
            // Remove senha do objeto salvo na sessão
            const { senha: _, ...clienteSeguro } = cliente;
            sessionStorage.setItem('clienteLogado', JSON.stringify(clienteSeguro));
            mostrarNotificacao('Login realizado com sucesso!', '#28a745');
            setTimeout(() => window.location.href = 'dashboard.html', 1000);
        } else {
            mostrarNotificacao('Telefone ou senha incorretos!', '#dc3545');
        }
    });
}

// === CADASTRO ===
const formCadastro = document.getElementById('formCadastro');
if (formCadastro) {
    formCadastro.addEventListener('submit', (e) => {
        e.preventDefault();

        const nome = document.getElementById('nomeCadastro').value.trim();
        const telefone = document.getElementById('telefoneCadastro').value.replace(/\D/g, '');
        const email = document.getElementById('emailCadastro').value.trim();
        const senha = document.getElementById('senhaCadastro').value;
        const confirmaSenha = document.getElementById('confirmaSenha').value;
        const nascimento = document.getElementById('nascimentoCadastro').value;
        const aceitaTermos = document.getElementById('aceitaTermos').checked;

        if (!nome || !telefone || !email || !senha) {
            mostrarNotificacao('Preencha todos os campos obrigatórios!', '#dc3545');
            return;
        }

        if (senha.length < 6) {
            mostrarNotificacao('A senha deve ter pelo menos 6 caracteres!', '#dc3545');
            return;
        }

        if (senha !== confirmaSenha) {
            mostrarNotificacao('As senhas não coincidem!', '#dc3545');
            return;
        }

        if (!aceitaTermos) {
            mostrarNotificacao('Você deve aceitar os termos!', '#dc3545');
            return;
        }

        const clientes = JSON.parse(localStorage.getItem('clientesConta') || '[]');

        if (clientes.find(c => c.telefone === telefone)) {
            mostrarNotificacao('Este telefone já está cadastrado!', '#dc3545');
            return;
        }

        if (clientes.find(c => c.email === email)) {
            mostrarNotificacao('Este e-mail já está cadastrado!', '#dc3545');
            return;
        }

        const novoCliente = {
            id: Date.now(),
            nome,
            telefone,
            email,
            senha,
            nascimento,
            pontos: 20, // Bônus de boas-vindas
            visitas: 0,
            primeiroAgendamento: false,
            dataCadastro: new Date().toISOString(),
            indicadoPor: null,
            indicacoes: []
        };

        clientes.push(novoCliente);
        localStorage.setItem('clientesConta', JSON.stringify(clientes));

        // Login automático
        const { senha: _, ...clienteSeguro } = novoCliente;
        sessionStorage.setItem('clienteLogado', JSON.stringify(clienteSeguro));

        // Registra pontos de boas-vindas
        const historico = JSON.parse(localStorage.getItem('historicoPontos') || '[]');
        historico.push({
            clienteId: novoCliente.id,
            pontos: 20,
            motivo: 'Bônus de cadastro',
            data: new Date().toISOString()
        });
        localStorage.setItem('historicoPontos', JSON.stringify(historico));

        mostrarNotificacao('Conta criada! +20 pontos de boas-vindas 🎁', '#28a745');
        setTimeout(() => window.location.href = 'dashboard.html', 1500);
    });
}

// === LOGOUT ===
function logout() {
    sessionStorage.removeItem('clienteLogado');
    window.location.href = 'login.html';
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

// Exporta para uso global
window.logout = logout;
window.mostrarNotificacao = mostrarNotificacao;