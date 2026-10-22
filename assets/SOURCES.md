# Fontes dos assets

Todos os arquivos são locais; não há CDN necessária para renderizar a interface.

## Fotografias ilustrativas

Reutilizadas das referências Unsplash já presentes no P0, com autorização do usuário para fotos de banco identificadas como ilustrativas. Não são fotos de clientes, profissionais ou estabelecimento comprovados da Barbado's.

| Arquivo | Origem | Transformação entregue pelo serviço |
| --- | --- | --- |
| `images/barber-800.webp` | https://images.unsplash.com/photo-1599351431202-1e0f0137899a | original WebP 1000px; derivação FFmpeg/libwebp 800px, qualidade 68 |
| `images/barber-480.webp` | https://images.unsplash.com/photo-1599351431202-1e0f0137899a | mesma fonte; derivação FFmpeg/libwebp 480px, qualidade 68 |
| `images/barber-detail.webp` | https://images.unsplash.com/photo-1622286342621-4bd786c2447c | largura 640, WebP, qualidade 78 |
| `images/barbershop.webp` | https://images.unsplash.com/photo-1585747860715-2ba37e788b70 | largura 800, WebP, qualidade 78 |

Licença do banco: https://unsplash.com/license. URLs originais preservadas; nenhuma autoria ou relação comercial com a marca é alegada. Obtidas em 22/10/2026. Sem imagens geradas por IA.

## Tipografia

- Barlow Condensed 700 Latin: Google Fonts, https://github.com/google/fonts/tree/main/ofl/barlowcondensed. SIL OFL incluída em `fonts/Barlow-Condensed-OFL.txt`.
- Manrope 400–700 Latin variável: Google Fonts, https://github.com/google/fonts/tree/main/ofl/manrope. SIL OFL em `fonts/Manrope-OFL.txt`.
- Subconjunto Latin inclui os caracteres portugueses. `font-display:swap`, sem chamada ao Google Fonts no cliente.

## Ícones

Font Awesome Free 6.4.0, a mesma família existente no projeto. CSS e fontes WOFF2 locais, sem JavaScript ou biblioteca adicional de componentes. Distribuição original via cdnjs. Licença em `vendor/fontawesome/LICENSE.txt` (ícones CC BY 4.0, fontes SIL OFL, código MIT, conforme distribuição).

O site carrega `used.css`, subconjunto gerado por `node scripts/subset-icons.cjs` a partir do CSS original preservado em `all.min.css`. Declarações e glifos originais, apenas classes utilizadas e fontes v6; sem substituição por desenhos manuais. CSS de 102 KB reduzido para aproximadamente 3 KB.

`favicon.svg`: monograma tipográfico B sobre o carvão/dourado da identidade; não representa um logotipo comercial registrado.
