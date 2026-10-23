# Entrega da etapa P0 — Barbado's

Data: 22/10/2026. Baseline: `30691a6603ebc23b9aa1d61327a753aab325fdfa`.
Branch: `fix/barbearia-p0`. Worktree: `C:\Users\Lucas\AppData\Local\Temp\opencode\barbearia-p0`.
O clone original em `C:\Users\Lucas\Downloads\barbearia` continua limpo em `main`.

## Resultado e escopo

Correções locais de segurança de renderização, agenda, comunicação de demonstração, sessão/logout, PWA e acessibilidade básica. **Não houve merge, push, deploy ou alteração de serviços externos.** Não foram implementados backend, autenticação fictícia de admin, pagamentos, e-mail ou sincronização simulada.

O escopo desta entrega é a etapa P0 aprovada e a avaliação visual. Redesign estrutural e funcionalidades P1/P2 ficam como recomendações, não como trabalho concluído. O documento inicial `auditoria-p0.md` preserva o diagnóstico anterior à correção; a numeração P0-6 ali identifica testabilidade, que é suporte à correção, não uma vulnerabilidade explorável independente.

## Correções e evidências

| Defeito encontrado | Correção | Evidência |
| --- | --- | --- |
| XSS armazenado em avaliações, reservas, clientes e admin | Escape de texto HTML e serialização JSON + escape para argumentos de handlers; notificações tratadas como texto | Testes unitários e browser com `<img onerror>` e quebra de aspas; zero execução, inclusive ao clicar no handler do admin |
| 10:30 disponível dentro de atendimento de 10:00–10:50 | Comparação de intervalos, duração persistida e inferência do catálogo legado | `legacyOverlapBlocked`, testes de agenda |
| Reserva de João bloqueava Rafael | Recalcular horários ao mudar profissional | `otherBarberFree` |
| Domingo aberto; passado e duração além do fechamento | Regras de expediente e validação também no salvamento | `sundayClosed`, `closingRejectedOnSave`, testes unitários |
| Duas abas podiam gravar o mesmo intervalo | Web Locks envolvendo leitura, validação e gravação local | `concurrentTabsSingleSave`; não cobre aparelhos diferentes ou navegadores sem Web Locks |
| Atendimento concluído continuava bloqueando | Excluir cancelados e concluídos do cálculo de conflito | Regressão de agenda |
| Modal afirmava reserva, e-mail e lembrete enviados | Registro explicitamente local, sem envio ou abertura automática de WhatsApp | `honestModal`; não há log de e-mail fingindo envio |
| Bônus de primeira reserva não confiável | Reserva simulada não concede novo bônus; cadastro mantém seus 20 pontos locais | Fluxo integrado de cadastro e reserva |
| Cupom maior que subtotal deixava preço negativo | Desconto limitado ao subtotal, percentual limitado a 100% | `zeroFloor`; valor final R$ 0 |
| Botão Sair não tinha função carregada | Logout remove a sessão e retorna ao login | `logout`, seguido de `login` |
| Consentimento de marketing obrigatório/mal rotulado | Privacidade separada de marketing opcional; dupla submissão assíncrona bloqueada | `signupWithoutMarketing` |
| Privacidade alegava controles inexistentes | Página reescrita para descrever armazenamento, limitações e terceiros reais | Inspeção de código; não constitui validação jurídica |
| SW/manifest apontavam para raiz e PNGs inexistentes | URLs relativas ao escopo, SVG inline e fallback para páginas exatas em cache estático | Testes de paths + offline em raiz e subpasta |
| SW apagava caches de outros projetos na origem | Nomes isolados por escopo; limpeza apenas do próprio prefixo | `unrelatedPreserved` em ambas as bases |
| Primeira instalação do SW recarregava a página em uso | Recarregar por troca de controlador somente quando já havia controlador anterior | Repetição dos testes PWA sem a interrupção de contexto observada inicialmente |
| HTML inválido, iframe sem título, links sem nome e contraste baixo | Fechamento correto, landmark main, rótulos, título do mapa e dourado escuro para texto em fundo claro | Lighthouse da home: acessibilidade 80 → 100 |
| Navegação/tablet e admin com overflow | Menu pelo espaço disponível, grids móveis e flex com `min-width:0` | 20 combinações sem overflow horizontal |

## README original versus comportamento real

As alegações antigas foram substituídas por uma documentação de demonstração. Comparação por grupo funcional:

| Alegação anterior | Verificação real / estado atual |
| --- | --- |
| Site completo profissional / pronto para uso | Protótipo estático; não pronto para operação comercial |
| Abrir por duplo clique | Parte visual pode abrir, mas PWA/Web Crypto precisam de localhost ou HTTPS; orientação atual usa servidor |
| Orçamento e combos | Funcionam no catálogo fixo, com desconto por quantidade e cupom local; sem transação financeira |
| Cadastro com 10% automático na primeira reserva | Não existia aplicação automática; copy agora orienta uso explícito de BEMVINDO10, não benefício garantido |
| Login seguro / PBKDF2 | Derivação no cliente funciona e migra senha legada; não há sessão autenticada por servidor nem controle de acesso confiável |
| Agenda com disponibilidade | Agora valida profissional, intervalo e expediente localmente. Não existe inventário central; “Qualquer um” bloqueia conservadoramente quando qualquer profissional está ocupado |
| Confirmação por WhatsApp/e-mail | Nunca houve envio automático. Salvar não abre serviços externos; links de contato abrem conversa somente por ação explícita |
| Lembretes 24h antes | Array local e modal ao visitar a conta não são agendador nem envio WhatsApp. Não são prometidos como integração real |
| Dashboard e histórico | Consultam registros locais, não de outros aparelhos. Logout corrigido. Alterações de perfil ainda precisam de validações adicionais |
| Fidelidade e brinde | Pontos/visitas locais são editáveis. Concluir repetidamente pelo código pode duplicar pontos; não há resgate comercial seguro nem conciliação |
| Indique e Ganhe +50 e cupom do amigo | Atribuição de `?ref=` e conversão não estão implementadas. Promessas retiradas, recurso identificado como planejado |
| Avaliações e bônus | Persistência local e renderização protegida. Não são avaliações verificadas de consumidores; bônus e idempotência ainda têm limitações |
| Admin com notificações em tempo real | Apenas localStorage da mesma origem, eventos entre abas e polling. Sem autenticação, RBAC ou sincronização entre dispositivos |
| CRUD de serviços e configurações | Grava dados no painel, mas o catálogo público/CONFIG não é alimentado integralmente por esses registros; integração pendente |
| Cupons e estatísticas | Regras locais; validade/valor verificados no orçamento. Contagem de usos, restrição por cliente e elegibilidade não são completas |
| Financeiro, lucro e ocupação | Estimativas demonstrativas; há fallback de receita e despesa fixa de R$ 800 no código. Não representam contabilidade nem recebimento real |
| Exportar CSV e backup/restauração | Implementados em código para dados locais. Não foram validados ponta a ponta nesta rodada; CSV e importação exigem endurecimento antes de dados não confiáveis |
| PWA instalável e offline | Offline de quatro páginas verificado na raiz e em subpasta após visita online. Instalação não testada em aparelhos físicos; SVG pode não satisfazer todas as plataformas |
| Push e sincronização em background | Handlers preparatórios, sem servidor, inscrição de push ou API; não são serviços operacionais |
| Dark mode, menu, FAQ | Implementações locais existentes; foco e redução de movimento ajustados. Sem auditoria assistiva completa de todos os estados |
| Fotos, 500 clientes e depoimentos | Contagem não comprovada retirada. Fotos de banco e depoimentos iniciais agora identificados como ilustrativos |
| Mapa, telefone, Instagram, endereço e horários comerciais | URLs e apresentação revisadas; mapa tem título e query de endereço. Não se verificou titularidade, precisão comercial nem disponibilidade permanente dos terceiros |
| LGPD, HTTPS/TLS, logs, backups seguros, acesso autorizado e retenção | Não são garantidos pelo código estático; política agora não alega esses controles nem conformidade integral |
| CI/testes | Workflow existe, testes locais passaram. Sem push nesta rodada, não houve nova execução remota do Actions |

## Testes executados

### Automatizados, realmente executados

- `node --test`: **37/37**, Node 24.19.0. Senha, escape, intervalos, legado, expediente e manifest/SW.
- `node --check`: main, admin, cliente, dashboard e Service Worker, sem erro de sintaxe.
- `scripts/verificar-browser.cjs`: **16 verificações** de fluxo no Edge headless real com Playwright Core 1.64.1. Inclui cadastro, consentimento opcional, login/logout, XSS, handler com aspas, reserva, concorrência entre abas e offline. Zero erros JavaScript capturados no fluxo principal.
- 5 páginas × 4 larguras (**320/390/768/1440**): 20 medições e 20 capturas, sem overflow horizontal. Seis imagens da galeria carregaram nas quatro larguras. Capturas aguardam decode das imagens, evitando provas vazias por lazy loading.
- `scripts/verificar-pwa.cjs`: SW controlando a página, cache alheio preservado e **4 páginas offline em cada uma das duas bases**, raiz e `/barbearia-p0/`.
- Lighthouse da home: **100 acessibilidade, 100 boas práticas, 100 SEO**, sem falhas dessas categorias. Não foi executado benchmark de desempenho.
- `git diff --check`: sem problemas de whitespace. Avisos de LF/CRLF decorrem da configuração do repositório.

### Inspeção assistida, não confundir com cobertura automatizada

Inspeção de código de todas as páginas/módulos, execução assistida de scripts no navegador e revisão das capturas desktop/mobile. Não houve teste com leitor de tela, aparelho físico, instalação Android/iOS, mensagens reais, e-mails, pagamentos ou um pentest abrangente. Lighthouse 100 na home não prova acessibilidade integral do site nem segurança de produção. Backup/restore, todos os tabs de admin e todos os edge cases não estão cobertos pelo E2E.

Resultados e capturas: `docs/evidencias/`. Scripts reutilizáveis: `scripts/verificar-browser.cjs` e `scripts/verificar-pwa.cjs`. Dependência de navegador usada fora do repositório; não se adicionou framework/build ao site.

## Avaliação visual e recomendação P1

Preservados: nome, preto/carvão `#1a1a1a`, dourado `#d4a574`, fotografia do universo da barbearia e CTA de agenda. Para texto em superfícies claras, dourado escuro `#875528` corrige contraste sem descaracterizar a identidade.

- **320/390:** fluxo linear legível e sem largura excedente; ainda muito longo. Agrupar escolha de serviço → horário → dados, reduzir repetição entre orçamento e reserva e melhorar espaçamento do FAQ.
- **768:** menu completo não cabia; agora usa navegação recolhível. Em redesign, dar prioridade a serviços, simulação e localização, reduzindo links simultâneos.
- **1440:** seis serviços em 4+2 geram desequilíbrio; preferir 3×2 ou lista editorial com preço/duração. Hero e áreas grandes têm espaçamento pouco hierarquizado; evitar transformar toda seção em cards iguais.
- Tipografia: definir uma escala curta, títulos mais contidos fora do hero e preços com alinhamento consistente. Manter a assinatura forte da marca sem adicionar fontes externas só por decoração.
- Galeria: substituir fotos genéricas por imagens autorizadas e correspondentes às legendas. Não apresentar foto de banco como trabalho realizado.
- Conta/admin: separar aviso permanente de demo de estados de sucesso; aprimorar menus por teclado, foco em modais, semântica de tabs e validações de formulário.
- Simplificar narrativa: um CTA principal para simular, contato externo separado e claramente identificado. FAQ com áreas de toque maiores e respostas sem promessas comerciais não verificadas.

## Limitações e plano P0/P1/P2

### P0 — antes de qualquer uso com clientes reais

Não é resolvível só com JavaScript estático: backend, autenticação no servidor, autorização/RBAC/RLS e fonte central de agenda. Sessões com cookie HttpOnly/Secure, proteção CSRF quando aplicável, rate limiting, validação server-side e restrição atômica de sobreposição no banco. Não habilitar uso comercial mantendo o admin atual exposto.

**Opções indicativas, não orçamentos ou contratação:**

| Caminho | Complexidade | Infraestrutura indicativa |
| --- | --- | --- |
| Backend gerenciado com Postgres e autenticação (ex.: Supabase ou equivalente), API/RLS revisadas | Média; requer modelagem, políticas, testes de autorização e conflitos | Protótipo pode caber em franquia gratuita; reservar aproximadamente US$ 25–60/mês para início de operação, conforme provedor/uso |
| API própria + Postgres + autenticação mantida no servidor | Alta; inclui manutenção, backups, observabilidade e atualizações | VPS pequena pode custar US$ 5–30/mês; serviços gerenciados, backups, e-mail e trabalho operacional são adicionais |

Regras de reserva devem ser atômicas (por exemplo, exclusão de intervalos por profissional no Postgres). E-mail/WhatsApp exigem credenciais mantidas no servidor, filas, consentimento e confirmação de entrega. Custos de mensagens e integrações dependem do fornecedor e volume; nenhuma conta foi criada ou alterada.

### P1 — próxima rodada, não implementada nesta entrega

1. Integrar catálogo e configurações do admin à simulação pública; preço/duração não podem divergir.
2. Uma fonte de verdade para serviço, duração e orçamento; o campo livre e os checkboxes ainda podem descrever conjuntos diferentes. Serviços desconhecidos e legados não reconhecidos assumem 30 minutos.
3. Tornar conclusão, avaliação, pontos e conversões idempotentes; definir resgate e evitar dupla pontuação.
4. Validar atualização de perfil, telefone normalizado, unicidade e referências em histórico; tratar storage corrompido/quota em todas as páginas.
5. Corrigir exclusão de avaliação por timestamp e marcação de “avaliado” ao apenas solicitar avaliação.
6. Corrigir métricas financeiras fictícias, uso de cupons, elegibilidade, aniversário e retenção. Sanear CSV contra fórmulas e validar esquema de backups/importação.
7. Endurecer CSP e reduzir handlers inline; auditar foco/trap dos modais e acessibilidade de todas as tabs/temas, não só a home.
8. Executar redesign recomendado com aprovação separada, fotos autorizadas e dados comerciais confirmados.

### P2

Ícones raster/maskable reais e instalação física, desempenho/LCP/CLS em rede móvel, cache e atualização offline mais completos, fluxos reais de consentimento/privacidade, testes de integração do backend, monitoramento e observabilidade.

## Publicação e rollback propostos — não executados

1. Revisar diff/relatório e aprovar a demo como **demo**, sem dados reais.
2. Rodar testes locais e posteriormente Actions numa PR, sem mesclar automaticamente.
3. Se autorizado, publicar primeiro em preview isolado e testar caminhos de subpasta, atualização do SW, offline e limpeza de dados fictícios.
4. Só depois de nova autorização, publicar a versão aprovada. Não cadastrar segredos em JavaScript.
5. Rollback por **revert do commit de entrega**, sem reset destrutivo. Como há cache de SW, distribuir também uma versão de cache nova; voltar só o HTML pode deixar assets antigos no cliente. Para operação real futura, rollback de código e migração de dados precisam ser planejados separadamente.

Commit desta entrega: localizar por `git log -1` na branch `fix/barbearia-p0`; o relatório faz parte do mesmo commit. Sem alterações nos projetos SupportFlow, SQL Lab, Verônica, Profile README ou portfólio.
