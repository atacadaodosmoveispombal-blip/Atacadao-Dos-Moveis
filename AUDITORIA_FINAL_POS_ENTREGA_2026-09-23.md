# AUDITORIA FINAL PÓS-ENTREGA
## ATACAREJO MÓVEIS

Data: 23/09/2026  
Ambiente: Produção Vercel (https://atacarejomoveis.com.br) + Supabase; validação pós-correção em servidor local  
Branch: main  
Commit inicial: 2f7e75532a38a217f9e04e5cdb0878125fe2e0d7

## Estado inicial preservado

Antes da auditoria já existiam alterações locais em admin-app.js, admin.css, app.js, storefront-cms.js, styles.css e supabase/audits/production_readonly.sql, além de output/ e das migrations 20260930, 20261001 e 20261002 não rastreadas. Essas alterações foram preservadas. Nenhuma migration foi aplicada, nenhum dado real foi alterado e nenhum produto de teste foi criado.

## Resumo executivo

O fluxo público principal está funcional: Home, catálogo real do Supabase, categorias, busca, sacola, WhatsApp, assistente, PWA e responsividade responderam sem erro de console nos testes executados. O build e todos os testes automatizados disponíveis passaram.

A produção possui 64 produtos ativos, 42 categorias ativas, 6 ambientes, 3 banners ativos e 64 mídias válidas. Todas as mídias cadastradas são imagens; não há nenhum vídeo em produção. A migration de galeria de mídia está presente no schema remoto, mas upload, edição, exclusão e reprodução de vídeo não puderam ser validados ponta a ponta sem sessão administrativa e sem criar dados reais.

Foram encontrados e corrigidos três bugs pequenos no código local:

1. o checkout interno aparecia mesmo com vendas online, PIX e cartão desativados;
2. as mensagens do WhatsApp omitiam Frete Grátis e Armação Gratuita;
3. o link do produto no WhatsApp podia herdar a rota /sacola.

As correções passaram em sintaxe, testes, build e navegador headless local. Elas ainda precisam ser publicadas para chegar à produção.

## Testes executados

- Estado Git, branch, commit, remote, arquivos modificados e migrations.
- npm install --ignore-scripts: 0 vulnerabilidades e dependências atualizadas.
- npm run check: passou.
- npm run test:account: passou.
- npm run test:assistant: passou.
- npm run test:voice: passou.
- node scripts/test-virtual-assistant.mjs: 19 intenções passaram.
- node --use-system-ca scripts/test-virtual-assistant-real.mjs: passou com 64 produtos, 42 categorias e 6 ambientes reais.
- npm run build: passou; 29 arquivos copiados para dist.
- npm run verify:cms: falhou por expectativas de conteúdo (8 ambientes e 8 produtos por categoria), não por indisponibilidade do Supabase.
- Consulta somente leitura ao Supabase: 64 produtos ativos, 0 inativos, 0 excluídos, 42 categorias, 6 ambientes, 3 banners e 64 mídias.
- Validação HTTP de todas as 64 URLs de mídia: 64/64 responderam 200; nenhuma mídia quebrada.
- Validação de preços promocionais e estoque negativo: nenhum registro inválido encontrado.
- Busca pública real: sofá/sofa, armário/armario, roupeiro, mesa, cama, colchão e termo sem resultado.
- Assistente: armário, armário 2 portas, mesa de computador, sofá até R$ 2.000, roupeiro 6 portas, cama casal, colchão queen e fallback real; intenções de promoções, sacola, WhatsApp, mais barato, frete grátis e armação gratuita em testes automatizados.
- Sacola com dois produtos: inclusão, quantidade, subtotal, desconto, total, persistência após reload e mensagem WhatsApp.
- Compra direta pelo WhatsApp: nome, variação, SKU, preço, quantidade, link e benefícios. A URL foi interceptada para inspeção; nenhuma mensagem foi enviada.
- Responsividade headless em 320, 360, 375, 390, 412, 430, 768, 1024 e 1440 px.
- PWA: service worker controlando a página, escopo correto, manifest standalone, start_url e ícones 192/512/maskable.
- HTTPS, HSTS, nosniff, SAMEORIGIN, Referrer-Policy, Permissions-Policy, robots.txt, sitemap.xml e rota /admin.
- Painel sem autenticação: exibiu apenas o formulário de login; nenhum dado administrativo foi exposto.
- RLS anônima: perfis e endereços retornaram 401; pedidos e itens retornaram conjuntos vazios; tabelas administrativas privadas não foram expostas pela API pública.
- SEO estático: title, description, canonical, Open Graph, favicon, robots e sitemap presentes.
- Acessibilidade básica automatizada: imagens sem alt = 0 e botões sem nome acessível = 0 nas cargas completas testadas.

## Testes não executados

- Login administrativo autenticado e percurso completo do painel.
- CRUD real de produto, categoria, banner e configuração.
- Upload, substituição e exclusão real de foto/vídeo.
- Criação/desativação/remoção de produto de teste em produção.
- Permissão real de microfone em hardware/navegador interativo.
- Envio efetivo de mensagem para o WhatsApp.
- Instalação PWA pelo prompt nativo.
- Inventário completo de objetos órfãos no bucket Storage.

Esses itens não foram inventados como aprovados.

## Correções realizadas

### 1. Checkout exibido fora do escopo

PROBLEMA: a sacola mostrava “Continuar para o checkout” e texto sobre gateway, apesar de online_sales_enabled, pix_enabled e card_enabled estarem false.  
CAUSA: o botão era renderizado independentemente das configurações remotas.  
CORREÇÃO: quando vendas online estão desativadas, o drawer remove o botão e a observação de checkout, mantendo a finalização por WhatsApp.  
ARQUIVO: app.js, linha 261.  
TESTE APÓS CORREÇÃO: checkoutVisible=false; somente “Comprar sacola pelo WhatsApp” permaneceu; check, testes e build passaram.

### 2. Benefícios ausentes no WhatsApp

PROBLEMA: Frete Grátis e Armação Gratuita não eram incluídos nas mensagens direta e da sacola.  
CAUSA: o gerador de mensagem ignorava os campos free_city_shipping e free_assembly.  
CORREÇÃO: benefícios ativos agora são acrescentados ao produto correspondente.  
ARQUIVO: app.js, linhas 124, 127 e 128.  
TESTE APÓS CORREÇÃO: mensagens interceptadas continham “Benefícios: Frete Grátis + Armação Gratuita”; subtotal e produtos permaneceram corretos.

### 3. Link do produto herdava a rota atual

PROBLEMA: ao gerar o link a partir da sacola, a URL podia ser /sacola?product=... em vez da URL canônica da loja.  
CAUSA: productUrl partia de location.href.  
CORREÇÃO: a URL agora parte da raiz da origem e adiciona somente o parâmetro product.  
ARQUIVO: app.js, linha 123.  
TESTE APÓS CORREÇÃO: link gerado no teste local foi /?product=<id>, sem herdar /sacola.

## Status por área

| Área | Status | Evidência |
|---|---|---|
| Home | 🟢 FUNCIONANDO | Carga real, seções, banners, links e assets principais sem 404 |
| Produtos | 🟢 FUNCIONANDO | 64 produtos ativos reais carregados |
| Fotos | 🟢 FUNCIONANDO | 64/64 URLs válidas |
| Vídeos | ⚪ NÃO TESTADO | Schema existe, mas produção tem 0 vídeos |
| Galeria | 🟡 FUNCIONANDO COM RESSALVA | Fotos funcionam; combinação foto+vídeo não pôde ser exercitada |
| Cores | 🟡 FUNCIONANDO COM RESSALVA | Código e testes de variações passaram; CRUD admin não testado |
| Medidas | 🟡 FUNCIONANDO COM RESSALVA | Renderização no código; amostragem E2E autenticada não executada |
| Categorias | 🟡 FUNCIONANDO COM RESSALVA | 42 ativas e navegação funciona; cobertura de dados abaixo do verificador |
| Busca | 🟢 FUNCIONANDO | Acentos, sem acento, termos parciais e sem resultado |
| Banners | 🟡 FUNCIONANDO COM RESSALVA | 3 ativos e renderizados; CRUD admin não testado |
| Sacola | 🟢 FUNCIONANDO | Quantidade, subtotal, desconto, remoção lógica e persistência |
| WhatsApp | 🟢 FUNCIONANDO NO CÓDIGO LOCAL | Conteúdo validado sem envio; correções aguardam deploy |
| Assistente | 🟢 FUNCIONANDO | Testes unitários e catálogo real passaram |
| Microfone | 🟡 FUNCIONANDO COM RESSALVA | Testes automatizados passaram; permissão/hardware não testados |
| Painel ADM | 🟡 FUNCIONANDO COM RESSALVA | Gate público funciona; sessão autenticada indisponível |
| Supabase | 🟢 FUNCIONANDO | Consultas reais e schema responderam |
| Storage | 🟡 FUNCIONANDO COM RESSALVA | Imagens válidas; vídeo e órfãos não confirmados |
| Segurança | 🟡 FUNCIONANDO COM RESSALVA | Gate/RLS básicos passaram; auditoria autenticada completa pendente |
| Mobile | 🟢 FUNCIONANDO | Viewports solicitados sem overflow global |
| PWA | 🟢 FUNCIONANDO | Registro, controle, manifest e estratégia de atualização confirmados |
| Performance | 🟡 FUNCIONANDO COM RESSALVA | Sem vídeos carregados no catálogo; hero PNG de 1,89 MB |
| SEO | 🟡 FUNCIONANDO COM RESSALVA | Metadados básicos presentes; sitemap contém apenas a Home |
| Acessibilidade | 🟡 FUNCIONANDO COM RESSALVA | Checagens básicas passaram; auditoria manual de contraste/teclado incompleta |
| Build | 🟢 FUNCIONANDO | Sintaxe, testes e build passaram |

## Implementação de vídeos

Upload funciona? ⚪ Não confirmado em produção; implementação aceita MP4/WebM até 50 MB.  
Edição funciona? ⚪ Não confirmado com sessão administrativa.  
Exclusão funciona? ⚪ Não confirmada em produção.  
Preview funciona? 🟡 Implementado com preload=metadata, muted e playsinline; não exercitado com arquivo real.  
Player funciona? 🟡 Implementado com controles, poster e preload=metadata; não há vídeo real para teste.  
Fotos + vídeo funcionam juntos? 🟡 Fluxo implementado, mas não validado ponta a ponta.  
Mobile funciona? ⚪ Não testado com vídeo real.  
Storage está correto? 🟡 Migration e políticas estão coerentes; upload e inventário de órfãos não foram confirmados.  
Performance está aceitável? 🟡 Arquitetura evita autoplay e não carrega vídeo no catálogo; falta medição com arquivo real.  
Existe regressão causada pelo vídeo? Não foi detectada regressão no catálogo apenas com fotos, busca, sacola, WhatsApp ou responsividade. Regressão específica com vídeo permanece não testada.

## Problemas restantes

### 🚨 Críticos

Nenhum crítico confirmado nos testes executados.

### ⚠️ Importantes

1. Publicar e validar em produção as três correções locais.
2. Executar E2E administrativo autenticado com produto TESTE, incluindo upload/edição/exclusão de vídeo e limpeza segura.
3. Decidir se o verificador CMS ainda deve exigir 8 ambientes e 8 produtos por categoria. Hoje ele falha, mas preencher automaticamente criaria dados não reais e contrariaria a preservação do catálogo.
4. Revisar atomicidade do salvamento administrativo: produto, galeria, variações e Storage são persistidos em etapas; uma falha tardia pode deixar atualização parcial ou arquivo órfão.

### 💡 Melhorias futuras

1. Otimizar o hero editorial-room-clean.png, atualmente com aproximadamente 1,89 MB.
2. Gerar sitemap/canonical específicos para produtos, se páginas indexáveis por produto fizerem parte da estratégia.
3. Adicionar teste automatizado dedicado às mensagens WhatsApp e à regra de ocultar checkout.
4. Executar auditoria manual WCAG de contraste, foco e navegação por teclado.

## Resultado final

STATUS FINAL DO PROJETO:

🟡 FUNCIONANDO, MAS RECOMENDO CORRIGIR OS ITENS ABAIXO

CORRIGIR AGORA:

1. Fazer deploy das três correções já testadas.
2. Validar vídeo ponta a ponta com sessão administrativa e dado TESTE.
3. Alinhar o verificador CMS com a quantidade real/intencional de ambientes e produtos.

PODE FICAR PARA UMA PRÓXIMA VERSÃO:

1. Otimização adicional de imagens.
2. SEO individual de produtos.
3. Cobertura automatizada adicional e auditoria manual WCAG.
