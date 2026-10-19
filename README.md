# 💈 Barbado's Barbearia - Site Completo Profissional

Site profissional completo para a **Barbado's Barbearia** com sistema de agendamento, orçamento online, área do cliente, painel administrativo e recursos avançados.

## 📋 Informações do Negócio
- **Nome:** Barbado's Barbearia
- **Instagram:** [@barbadosbarbershop1.0](https://instagram.com/barbadosbarbershop1.0)
- **Endereço:** Rua Sena Madureira, 516 - Belo Horizonte, MG
- **Telefone:** (31) 2516-0233
- **Horário:** Seg-Sex 9h-20h | Sáb 9h-18h

## 🚀 Como Usar

### 1. Abrir o Site
Dê duplo clique em `index.html` ou abra no navegador. Para testar o Service Worker/PWA, use um servidor local:

```bash
# Python
python -m http.server 8000

# Node.js
npx serve .

# PHP
php -S localhost:8000
```

### 2. Páginas Disponíveis
- **Site principal** (`index.html`) - Página inicial com todas as funcionalidades
- **Login cliente** (`cliente/login.html`) - Área do cliente
- **Cadastro** (`cliente/cadastro.html`) - Criar conta (10% OFF no 1º agendamento)
- **Dashboard cliente** (`cliente/dashboard.html`) - Ver agendamentos, pontos, histórico, Indique e Ganhe
- **Painel admin** (`admin/index.html`) - Gerenciar tudo
- **Política de Privacidade** (`politica-privacidade.html`) - LGPD completa

## ✨ Funcionalidades Completas

### 🌐 Para Clientes (Site Principal)

| Funcionalidade | Descrição |
|---|---|
| **Catálogo de Serviços** | 6 serviços com preços e descrições |
| **Orçamento Online** | Calculadora interativa com descontos progressivos (10% 2 serviços, 15% 3+) |
| **Sistema de Cupons** | Códigos promocionais (ex: BEMVINDO10, BARBADOS20, NATAL50, ANIVERSARIO) |
| **Agendamento Inteligente** | Bloqueia horários já ocupados em tempo real por barbeiro |
| **Confirmação WhatsApp** | Abre WhatsApp com mensagem formatada ao confirmar |
| **Confirmação E-mail** | Log de e-mails simulado (pronto para API real) |
| **Lembrete 24h** | Notificação automática no dia anterior |
| **Chat Widget** | Botão flutuante WhatsApp com opções rápidas |
| **Modo Escuro** | Toggle persistente (salva no localStorage) |
| **PWA Instalável** | Service Worker + Manifest - funciona offline, instala como app |
| **Avaliações** | Sistema de estrelas + comentários pós-serviço (+5 pts) |
| **Galeria** | Fotos dos trabalhos com hover effects |
| **FAQ + LGPD** | Perguntas frequentes e Política de Privacidade completa |
| **Depoimentos Dinâmicos** | Carrega avaliações reais dos clientes |

### 👤 Área do Cliente (`cliente/`)

| Funcionalidade | Descrição |
|---|---|
| **Cadastro/Login** | Autenticação com telefone + senha |
| **Bônus Boas-vindas** | +20 pontos ao criar conta |
| **Dashboard** | Pontos, visitas, progresso para brinde |
| **Programa Fidelidade** | A cada 10 cortes = 1 grátis (barra de progresso) |
| **Meus Agendamentos** | Próximos e histórico com status |
| **Indique e Ganhe** | Código/link próprio +50 pts por indicação convertida |
| **Avaliar Serviços** | Botão aparece após serviço concluído |
| **Editar Perfil** | Atualizar nome, telefone, e-mail |
| **Lembretes** | Modal automático 24h antes do agendamento |

### 🛠️ Painel Administrativo (`admin/`)

| Aba | Funcionalidades |
|---|---|
| **Dashboard** | Métricas em tempo real (agendamentos hoje, clientes, faturamento, avaliação), próximos agendamentos, clientes VIP, top serviços, agenda da semana |
| **Agendamentos** | Filtros (todos/confirmados/concluídos/cancelados), concluir (+10 pts cliente), cancelar, excluir, **WhatsApp direto**, solicitar avaliação |
| **Clientes** | Lista com busca, VIP badge (≥10 visitas), WhatsApp direto |
| **Serviços** | CRUD completo (nome, preço, duração, categoria, ativo/inativo) |
| **Cupons** | Criar/ativar/desativar/excluir cupons (% ou fixo), validade, estatísticas de uso |
| **Avaliações** | Ver todas, nota média, excluir inadequadas |
| **Financeiro** | Receitas do mês, lucro (despesas fixas R$800), taxa de ocupação, histórico, **Exportar CSV** |
| **Configurações** | Dados da barbearia, **Backup/Restore JSON**, limpar tudo |

### 🔔 Sistema de Notificações Admin (Tempo Real)

- **Polling a cada 5s** detecta novos agendamentos de outras abas/dispositivos
- **Evento `storage`** sincroniza mudanças entre abas
- **Badge** na sidebar mostra notificações não lidas
- **Dropdown** com histórico de notificações
- **Toast** animado para avisos imediatos
- **Som** de notificação (Web Audio API)

## 🛠️ Tecnologias

- **HTML5** semântico e acessível
- **CSS3** com variáveis customizadas, Grid/Flexbox, animações
- **JavaScript Vanilla** (ES6+) - sem dependências externas (exceto Font Awesome via CDN)
- **localStorage** para persistência (protótipo funcional sem backend)
- **Service Worker** para PWA (cache offline, background sync)
- **Web Audio API** para sons de notificação
- **Web Share / Clipboard API** para Indique e Ganhe

## 📱 Recursos de UX/UI

- **Design System** com variáveis CSS (fácil personalização)
- **Mobile First** - responsivo em qualquer dispositivo
- **Dark Mode** completo com persistência
- **Animações sutis** (hover, focus, modais, progress bars)
- **Feedback visual** (toasts, modais, badges, skeletons)
- **Acessibilidade** (labels, contrastes, foco visível, ARIA)
- **Performance** (lazy loading, cache SW, minificação sugerida)

## 🔐 Login Admin
O painel admin não tem login fixo (para o protótipo). Em produção, adicione autenticação JWT/session.

## 🔐 Senha do cliente

A senha **nunca é gravada em texto puro**. O `localStorage` guarda um derivador
PBKDF2-SHA256 com sal aleatório, no formato `pbkdf2$<sal>$<hash>`, e a
comparação no login é feita sobre o derivador.

- **Senha nova:** o derivador é gerado no cadastro (`js/senha.js`).
- **Conta antiga:** quem tinha a senha em texto puro continua entrando — o
  login reconhece o formato antigo e reescreve o registro com o derivador
  assim que o acesso é confirmado.
- **Sessão:** o objeto salvo em `sessionStorage` não contém a senha.

Isso continua sendo um protótipo sem backend: a verificação acontece no
navegador, então quem controla o navegador controla a comparação. O ganho real
é não deixar a senha original em disco. A porta de entrada de verdade de uma
conta de cliente seria o servidor, com a senha verificada do lado de lá e a
sessão mantida por cookie `HttpOnly`.

Cobertura: `node --test tests/senha.test.mjs` → **10/10** (o derivador não
contém a senha, o sal muda a cada conta, a senha errada é recusada, um valor
adulterado não passa, um valor malformado não causa exceção e a conta antiga é
migrada).

## 🐛 Service Worker

O cache offline lista os 15 arquivos estáticos do projeto. Antes, cinco
entradas apontavam para caminhos inexistentes (`/cliente/js/...`,
`/admin/js/...`) e, como `cache.addAll()` falha inteiro se **uma** URL falhar,
o Service Worker não instalava — o modo offline nunca funcionou.

Agora os caminhos batem com a estrutura real, o `js/senha.js` entrou no cache e
a instalação usa `Promise.allSettled`, para que um arquivo indisponível não
derrube o resto.

## 📦 Estrutura de Arquivos
```
barbearia/
├── index.html                 # Site principal
├── politica-privacidade.html  # LGPD
├── manifest.json              # PWA Manifest
├── service-worker.js          # Service Worker (offline, cache, push)
├── css/
│   ├── style.css              # Estilos principais + dark mode + componentes
│   ├── admin.css              # Painel admin (sidebar, tabs, métricas)
│   └── cliente.css            # Área do cliente (auth, dashboard)
├── js/
│   ├── main.js                # Site principal (agendamento, orçamento, PWA, chat)
│   ├── admin.js               # Painel admin completo + notificações realtime
│   ├── cliente.js             # Auth (login/cadastro/logout)
│   ├── senha.js               # Derivador PBKDF2 da senha do cliente
│   └── dashboard.js           # Dashboard cliente (pontos, agendamentos, indique)
├── cliente/
│   ├── login.html
│   ├── cadastro.html
│   └── dashboard.html
├── admin/
│   └── index.html
├── tests/
│   └── senha.test.mjs         # Testes do tratamento de senha
```

## 💾 Persistência de Dados (localStorage Keys)

| Key | Descrição |
|---|---|
| `agendamentos` | Array de todos os agendamentos |
| `clientesConta` | Clientes cadastrados (a senha fica como derivador PBKDF2, nunca em texto puro) |
| `servicos` | Catálogo de serviços editável |
| `cupons` | Cupons de desconto |
| `avaliacoes` | Avaliações dos clientes |
| `historicoPontos` | Log de ganhos/gastos de pontos |
| `emailsEnviados` | Log de confirmações por e-mail |
| `lembretes` | Agendamento de lembretes 24h |
| `orcamentoAtual` | Orçamento em andamento |
| `barbeariaConfig` | Configurações do estabelecimento |
| `notifAdmin` | Notificações do painel admin |
| `darkMode` | Preferência de tema |

## 🔧 Configuração para Produção

Para transformar em produto real:

1. **Backend:** Node.js/Express, Python/FastAPI, PHP/Laravel
2. **Banco:** PostgreSQL (recomendado) ou MySQL
3. **Auth:** JWT + HttpOnly cookies, 2FA opcional
4. **WhatsApp:** WhatsApp Business API (Meta) ou Twilio
5. **E-mail:** SendGrid, Mailgun, Amazon SES
6. **Pagamentos:** Mercado Pago, Stripe, Asaas (PIX)
7. **Calendar:** Google Calendar API para sincronizar
8. **Deploy:** Vercel, Netlify, Railway, VPS (Docker)
9. **Monitoramento:** Sentry, LogRocket, GA4
10. **LGPD:** Consentimento de cookies, DPO, relatórios de impacto

## 💡 Ideias para Expansão Futura

- [ ] **App Mobile** (React Native / Capacitor)
- [ ] **Sistema de Caixa** (PDV integrado)
- [ ] **Gestão de Estoque** (produtos para venda)
- [ ] **Agenda Recorrente** (cortes quinzenais automáticos)
- [ ] **Múltiplas Unidades** (filiais)
- [ ] **Marketplace** (outros barbeiros alugam cadeira)
- [ ] **IA** (sugestão de horários, previsão de demanda)
- [ ] **Webhooks** (integração com CRM, Zapier)
- [ ] **Multi-idioma** (EN/ES para turistas)

## 📞 Contato do Desenvolvedor

Projeto desenvolvido por **Lucas Santana**  
📧 lucasdpaz@email.com | 💼 [LinkedIn](https://linkedin.com/in/lucasdpaz) | 🐙 [GitHub](https://github.com/lucasdpaz)

---

**⭐ Se este projeto te ajudou, deixe uma estrela no GitHub!**  
**Licença:** MIT - Use livremente para fins educacionais e comerciais.