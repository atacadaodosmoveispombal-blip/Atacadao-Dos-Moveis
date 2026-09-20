# CMS do Atacarejo dos Móveis

O site público e o painel administrativo usam as mesmas tabelas do projeto Supabase. O frontend utiliza somente a chave publicável; nenhuma chave `service_role` deve ser adicionada aos arquivos do navegador.

## Ativar o conteúdo atual no Supabase

O banco remoto já possui as tabelas e as políticas, mas ainda precisa receber o conteúdo atual da loja. Aplique, na ordem, as migrações que ainda não estiverem no projeto. A carga idempotente do catálogo atual está em:

`supabase/migrations/20260919_seed_current_storefront.sql`

Ela pode ser executada pelo fluxo normal de migrations do Supabase ou colada no SQL Editor do projeto. A operação é idempotente: não duplica registros existentes e não substitui alterações futuras do catálogo.

Depois de aplicar a migration, execute:

```powershell
npm run verify:cms
```

O verificador faz apenas leituras públicas e confirma a presença mínima de produtos, categorias, ambientes, banners, seções da home e configurações da loja.

## Validação funcional recomendada

1. Entrar em `admin.html` com um usuário autorizado do Supabase Auth.
2. Criar um produto e adicionar fotos.
3. Editar nome, preço, preço promocional e estoque.
4. Reordenar as fotos e escolher a imagem principal.
5. Desativar e reativar o produto.
6. Criar ou editar banner, inspiração, promoção e cupom.
7. Abrir a página pública e confirmar as mudanças sem recarregar manualmente.
8. Excluir os registros de teste.

As operações administrativas continuam protegidas pelas políticas RLS existentes. Se um usuário autenticado não puder gravar, revise o papel/perfil administrativo desse usuário no projeto antes de alterar as políticas.
