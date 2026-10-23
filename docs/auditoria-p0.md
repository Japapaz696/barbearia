# Auditoria P0 — Barbado's Barbearia

Baseline: `30691a6603ebc23b9aa1d61327a753aab325fdfa`
Branch de trabalho: `fix/barbearia-p0`
Ambiente de teste: servidor estático local (`python -m http.server`) + navegador real.

> Este projeto é **estático**, sem backend. Toda a persistência é `localStorage`
> (mesmo navegador) e a sessão é `sessionStorage`. Não existe sincronização
> entre dispositivos, e-mail real, lembrete automático de WhatsApp nem pagamento.

## Defeitos P0 comprovados

### P0-1 — XSS armazenado (execução de JavaScript)
`initAvaliacao`, `mostrarConfirmacaoCompleta`, cupom, notificações e listagens do
admin injetam dados do usuário via `innerHTML` sem escape.

Prova (aba real, `http://127.0.0.1:8080/`):
```js
localStorage.setItem('avaliacoes', JSON.stringify([{nota:5,
  comentario:'<img src=x onerror="window.__xss=1">', nome:'<b>Atacante</b>', data:new Date().toISOString()}]));
initAvaliacao();
// -> window.__xss === true  (script executou)
```
Impacto: qualquer dado gravado (nome, telefone, observações, comentário de
avaliação, código de cupom) executa código no navegador de quem abre o painel
admin, podendo ler `localStorage` (inclui perfis de cliente) e agir como a vítima.

### P0-2 — Conflito de agendamento/dupla reserva
`salvarAgendamento` só compara **data + horário + barbeiro exatos**. Não considera
duração do serviço nem um barbeiro "Qualquer um", e a lista de horários ignora
o barbeiro selecionado.

Provas (aba real):
- Agendamento 10:00 de João (duração 50 min) => 10:30 do mesmo João continua
  disponível (`10:30 disabled = false`).
- Barbeiro "Rafael" selecionado, mas o slot de 10:00 de João aparece
  `(Indisponível)` — disponibilidade não muda com o barbeiro.
- Check-then-write não é atômico: duas reservas concorrentes podem gravar o
  mesmo horário.

### P0-3 — Domingos oferecidos como abertos
A loja fecha domingo (consta no próprio site), mas `atualizarHorariosDisponiveis`
gera 22 horários para domingo (09:00–19:30).

### P0-4 — Divulgação enganosa de confirmação
O modal diz **"Agendamento Confirmado!"**, "Confirmação enviada por e-mail" e
"Você receberá um lembrete via WhatsApp 24h antes". Nada disso acontece:
`enviarConfirmacaoEmail` só grava um log local e `agendarLembrete` só grava um
array local. Mensagem do WhatsApp também afirma "Agendamento Confirmado".

### P0-5 — PWA quebrado em subpasta (GitHub Pages)
`manifest.json` usa `start_url: "/index.html"`, `scope: "/"` e ícones
`icons/icon-*.png` inexistentes (todos `404`). O Service Worker registra caminhos
absolutos (`/index.html`, `/css/...`) e fallback `/index.html`, que falham quando
o site é servido em `/<repo>/`.

### P0-6 — Funções de lógica inacessíveis a testes
Todo o arquivo `js/main.js` é um script que roda no topo e referencia `document`
imediatamente, então as funções de regra (disponibilidade, conflito, desconto)
não podem ser testadas em Node. Sem isso, cada correção de agenda vira fé.

## Itens P1 (fora do P0, reportar)

- Cupom fixo pode deixar total negativo (`NATAL50` em serviço de R$ 25 => `-R$ 25`).
- `new Date().toISOString().split('T')[0]` usa UTC e pode definir data mínima errada após 21h (BRT).
- Exclusão de avaliação usa a data como identificador (colide com avaliações simultâneas).
- Avaliações podem ter `nota` fora de 1–5 (no `main.js`), gerando `repeat()` inválido.
- "Concluir" duas vezes soma +10 pontos duplicados.
- Painel admin sem qualquer autenticação (documentado, mas perigoso se publicado com dados reais).
- `politica-privacidade.html` afirma coleta de IP/cookies e retenção; nada é coletado.
