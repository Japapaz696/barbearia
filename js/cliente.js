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
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (formLogin.dataset.enviando === 'true') return;
        formLogin.dataset.enviando = 'true';
        try {
        const telefone = document.getElementById('telefoneLogin').value.replace(/\D/g, '');
        const senha = document.getElementById('senhaLogin').value;

        if (!telefone || !senha) {
            mostrarNotificacao('Preencha todos os campos!', '#dc3545');
            return;
        }

        const clientes = JSON.parse(localStorage.getItem('clientesConta') || '[]');
        const cliente = clientes.find(c => c.telefone === telefone);

        if (cliente) {
            const { confere, formato } = await hashSenha.verificarSenha(senha, cliente.senha);

            if (!confere) {
                mostrarNotificacao('Telefone ou senha incorretos!', '#dc3545');
                return;
            }

            // Conta antiga, com senha em texto puro: aproveita o login e
            // reescreve o registro com o derivador, para nao guardar mais a
            // senha original.
            if (formato === 'texto-puro') {
                cliente.senha = await hashSenha.gerarHashSenha(senha);
                localStorage.setItem('clientesConta', JSON.stringify(clientes));
            }

            // Remove senha do objeto salvo na sessão
            const { senha: _, ...clienteSeguro } = cliente;
            sessionStorage.setItem('clienteLogado', JSON.stringify(clienteSeguro));
            mostrarNotificacao('Login realizado com sucesso!', '#28a745');
            setTimeout(() => window.location.href = 'dashboard.html', 1000);
        } else {
            mostrarNotificacao('Telefone ou senha incorretos!', '#dc3545');
        }
        } catch (erro) {
            mostrarNotificacao('Não foi possível acessar a conta local. Verifique os dados deste navegador.', '#dc3545');
        } finally {
            formLogin.dataset.enviando = 'false';
        }
    });
}

// === CADASTRO ===
const formCadastro = document.getElementById('formCadastro');
if (formCadastro) {
    formCadastro.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (formCadastro.dataset.enviando === 'true') return;
        if (!formCadastro.reportValidity()) return;
        formCadastro.dataset.enviando = 'true';
        try {

        const nome = document.getElementById('nomeCadastro').value.trim();
        const telefone = document.getElementById('telefoneCadastro').value.replace(/\D/g, '');
        const email = document.getElementById('emailCadastro').value.trim();
        const senha = document.getElementById('senhaCadastro').value;
        const confirmaSenha = document.getElementById('confirmaSenha').value;
        const nascimento = document.getElementById('nascimentoCadastro').value;
        const aceitaPrivacidade = document.getElementById('aceitaPrivacidade').checked;
        const aceitaTermos = document.getElementById('aceitaTermos').checked;

        if (!nome || !telefone || !email || !senha) {
            mostrarNotificacao('Preencha todos os campos obrigatórios!', '#dc3545');
            return;
        }

        if (senha.length < 8) {
            mostrarNotificacao('A senha deve ter pelo menos 8 caracteres!', '#dc3545');
            return;
        }

        if (senha !== confirmaSenha) {
            mostrarNotificacao('As senhas não coincidem!', '#dc3545');
            return;
        }

        if (!aceitaPrivacidade) {
            mostrarNotificacao('Leia e aceite o aviso de privacidade da demonstração.', '#dc3545');
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
            senha: await hashSenha.gerarHashSenha(senha),
            nascimento,
            aceitaPromocoes: aceitaTermos,
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
        } catch (erro) {
            mostrarNotificacao('Não foi possível concluir o cadastro local. Verifique o armazenamento do navegador.', '#dc3545');
        } finally {
            formCadastro.dataset.enviando = 'false';
        }
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
    div.setAttribute('role', 'status');
    div.textContent = mensagem;
    div.style.background = cor;
    document.body.appendChild(div);
    setTimeout(() => { div.style.opacity = '0'; setTimeout(() => div.remove(), 300); }, 4000);
}

// Exporta para uso global
window.logout = logout;
window.mostrarNotificacao = mostrarNotificacao;
