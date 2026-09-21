# CMS do Atacarejo dos Móveis

O site público e o painel administrativo usam as mesmas tabelas do projeto Supabase. O frontend utiliza somente a chave publicável; nenhuma chave `service_role` deve ser adicionada aos arquivos do navegador.

## Ativar o conteúdo atual no Supabase

O banco remoto usa as tabelas e políticas versionadas em `supabase/migrations`. A carga idempotente do catálogo atual está em:

`supabase/migrations/20260919_seed_current_storefront.sql`

Ela pode ser executada pelo fluxo normal de migrations do Supabase ou colada no SQL Editor do projeto. A operação é idempotente: não duplica registros existentes e não substitui alterações futuras do catálogo.

Para ativar o componente oficial de produtos, aplique também:

`supabase/migrations/20260920_product_commerce_cards.sql`

Essa migração adiciona as permissões individuais de WhatsApp/sacola, os benefícios sobre a fotografia e os textos globais configuráveis do WhatsApp. Ela também é idempotente.

Para concluir campanhas, promoções, buckets de imagem e Realtime, aplique:

`supabase/migrations/20260921_finalize_admin_storefront_integration.sql`

Essa migration preserva os registros existentes e pode ser executada novamente com segurança. As migrations são aplicadas manualmente no SQL Editor do Supabase pelo responsável pelo projeto.

Para concluir o editor completo de produtos e permitir que o código/SKU seja realmente opcional, aplique:

`supabase/migrations/20260922_complete_product_editor.sql`

Ela apenas converte SKUs vazios em `NULL` e remove a obrigatoriedade da coluna, preservando a restrição de unicidade para os códigos preenchidos.

Para ativar a estrutura de apresentação do e-commerce, aplique:

`supabase/migrations/20260923_ecommerce_foundation.sql`

Ela cria configurações de venda online, pedidos, snapshots dos itens, reservas de estoque, histórico e registro idempotente de webhooks. A venda online, PIX e cartão permanecem desativados até a escolha e configuração segura de um gateway oficial. A migration não cria cobranças, não contém credenciais e não permite que o administrador marque pagamentos como aprovados.

Para ativar a navegação por ambientes e a escolha de ícones no painel, aplique em ordem:

`supabase/migrations/20260924_environment_subcategory_navigation.sql`
`supabase/migrations/20260925_category_icon_keys.sql`

A segunda migration adiciona `icon_key` a ambientes e subcategorias e preenche os ícones conhecidos. Sem ela, o site continua usando os ícones automáticos pelo nome, mas o painel não pode salvar uma escolha manual.

Depois de aplicar as migrations, execute:

```powershell
npm run verify:cms
```

O verificador faz apenas leituras públicas e confirma a presença mínima de produtos, categorias, ambientes, banners, seções da home e configurações da loja. Ele também valida as colunas administrativas de produtos, categorias, campanhas e promoções.

## Validação funcional recomendada

1. Entrar em `admin.html` com um usuário autorizado do Supabase Auth.
2. Criar um produto e adicionar fotos.
3. Editar nome, preço, preço promocional, estoque e opções de venda pelo WhatsApp/sacola.
4. Reordenar as fotos e escolher a imagem principal.
5. Desativar e reativar o produto.
6. Criar ou editar banner, inspiração, promoção e cupom.
7. Abrir a página pública e confirmar as mudanças sem recarregar manualmente.
8. Alterar o preço e confirmar a atualização no site.
9. Desativar o produto e confirmar que ele desaparece do catálogo.
10. Excluir os registros de teste somente depois de remover seus vínculos.
11. Abrir **Pedidos** e **Vendas online** no ADM para validar a estrutura do checkout.

As operações administrativas continuam protegidas pelas políticas RLS existentes. Se um usuário autenticado não puder gravar, revise o papel/perfil administrativo desse usuário no projeto antes de alterar as políticas.
