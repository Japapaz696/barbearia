# Barbado's Barbearia — demonstração estática

Protótipo de portfólio com orçamento, simulação de agenda, área do cliente e painel administrativo local. **Não é um sistema de produção. Use apenas dados fictícios e senha exclusiva de teste.**

## Redesign P1

Identidade preto/carvão e dourado preservada, tipografia e fotografias locais, dois temas, catálogo selecionável, orçamento conectado à seleção, atalhos de horário acessíveis, formulários com erros inline e painéis unificados. Nenhuma dependência de frontend ou backend foi adicionada. Fontes e ícones incluem suas licenças em `assets/`.

- [Comparação visual antes/depois](docs/p1/comparacao.html)
- [Relatório da fase P1](docs/p1/relatorio.md)
- [Capturas e resultados finais](docs/p1/final/)

## Limites importantes

- Os dados ficam no `localStorage` do navegador. Não existe backend, banco central ou sincronização entre aparelhos.
- A sessão fica no `sessionStorage` da aba. PBKDF2 no cliente reduz a exposição da senha original, mas **não é autenticação de servidor**.
- O painel administrativo **não tem autenticação nem autorização real**. Ele acessa os dados locais da mesma origem.
- Salvar uma simulação não confirma reserva real, não envia e-mail, não dispara lembretes, não efetua pagamento e não contata WhatsApp automaticamente.
- O programa de indicações não está implementado. Pontos e cupons são demonstrativos, sem valor comercial.
- Imagens e depoimentos iniciais são ilustrativos. Informações comerciais fornecidas no projeto precisam de validação antes de uso público.

## Executar

Na pasta do projeto:

```sh
python -m http.server 8080 --bind 127.0.0.1
```

Abra `http://127.0.0.1:8080/`. Não use `file://` para testar Service Worker, armazenamento ou Web Crypto.

| Página | Caminho |
| --- | --- |
| Site e simulação | `index.html` |
| Cadastro / login | `cliente/cadastro.html`, `cliente/login.html` |
| Conta e histórico local | `cliente/dashboard.html` |
| Painel sem autenticação | `admin/index.html` |
| Privacidade da demonstração | `politica-privacidade.html` |

## O que funciona

- Seleção de serviços do orçamento, descontos por quantidade e cupons locais; total limitado a zero.
- Agenda por profissional, intervalos de duração, domingo fechado, sábado até 18h e dias úteis até 20h. Horários passados e atendimentos que ultrapassam o expediente são recusados no salvamento.
- Conflitos locais revalidados ao salvar. Web Locks serializa gravações entre abas quando suportado; não resolve concorrência entre aparelhos.
- “Qualquer um” é conservador: sobreposição com qualquer profissional bloqueia esse intervalo. Não distribui automaticamente a reserva entre profissionais.
- Cadastro, login, logout, perfil, histórico, avaliações e pontos locais. Não confundir com controles de acesso seguros.
- Cache offline de páginas e arquivos locais após a primeira visita online. Imagens, mapa e ícones externos dependem de rede; o manifest usa SVG inline, sem garantia de instalação em todos os sistemas.
- Atualização local entre abas via evento `storage` e consultas periódicas no admin, **não tempo real entre dispositivos**.

## Testes

Node.js 20 ou superior, sem dependências para testes unitários:

```sh
node --test
```

Regressões de senha, escape de HTML, regras de agenda e caminhos do PWA. O workflow `.github/workflows/ci.yml` executa esses testes em PRs para `main` e pushes em `main`. A execução local não significa que o Actions remoto foi executado.

Verificações opcionais de navegador usam `playwright-core` e Edge/Chromium, instalados separadamente. Defina `PLAYWRIGHT_MODULE_PATH` para o caminho do pacote e `EDGE_PATH` se necessário:

```sh
node scripts/verificar-browser.cjs
node scripts/verificar-pwa.cjs
```

O primeiro script preserva as 16 verificações P0 e gera capturas em `docs/p1/final/`. O segundo também requer um servidor na porta 8081 apontando para a pasta-pai, disponibilizando o projeto em `/barbearia-p0/`; cobre seis páginas, cadastro local, fontes e imagens offline. Ambos usam contextos descartáveis e somente dados fictícios. Os artefatos originais P0 continuam em `docs/evidencias/`.

Validação adicional de interface usa `@axe-core/playwright`, separadamente, sem incluir a dependência no site. Defina `AXE_MODULE_PATH` quando instalado fora do projeto:

```sh
node scripts/verificar-interface.cjs
```

Performance e outras categorias do Lighthouse são medidas por CLI, em sequência, nos perfis mobile e desktop. Ferramenta externa (Lighthouse 13.5 requer Node 22.19+); defina `LIGHTHOUSE_CLI` para `lighthouse/cli/index.js` e `EDGE_PATH` se necessário:

```sh
node scripts/auditar-lighthouse.cjs
```

O CSS dos ícones utilizados pode ser regenerado com `node scripts/subset-icons.cjs`, a partir da distribuição original incluída. Não é necessário build para executar o site.

## Auditoria e próximos passos

- [Diagnóstico inicial](docs/auditoria-p0.md)
- [Relatório de entrega, limitações e plano priorizado](docs/relatorio-entrega.md)
- [Resultados de navegador](docs/evidencias/browser-results.json)
- [Resultados do PWA](docs/evidencias/pwa-results.json)

Não publicar como agenda operacional sem backend, autenticação/autorização de servidor, restrição atômica de conflitos no banco, política de privacidade adequada e integrações reais verificadas. Esta branch não foi implantada nem mesclada.
