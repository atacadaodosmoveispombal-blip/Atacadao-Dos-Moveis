# Política permanente de publicação

A única branch oficial de produção é `main`. Uma entrega nova sempre deve partir
do commit mais recente de `origin/main` e preservar todas as funcionalidades já
registradas em `config/admin-feature-contract.json`.

## Fluxo obrigatório

1. Execute `git fetch origin --prune`.
2. Confirme que `HEAD` e `origin/main` são o mesmo commit.
3. Crie um commit de segurança antes de mudanças estruturais.
4. Faça alterações apenas sobre a versão atual e adicione testes ao contrato.
5. Envie a alteração por uma branch; a `main` exige o check `verify-admin` aprovado.
6. Execute `npm run build`. Qualquer regressão interrompe o build.
7. Faça merge em `main` somente após a validação.
8. Publique com `npm run deploy:production` quando um deploy manual for necessário.
9. O comando valida o domínio, o manifesto, o commit e o CMS após a publicação.

## Banco de dados

- Migrations são incrementais e executadas manualmente, fora do build da Vercel.
- Migrations históricas não podem ser removidas nem alteradas; seus hashes ficam em
  `config/migration-baseline.json`.
- Uma migration nova deve ser revisada e registrada no baseline antes do deploy.
- `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, `DELETE`, reset, seed e dados de
  demonstração são bloqueados para migrations novas.
- O build e o deploy do site nunca executam migrations automaticamente.

## Registro de cada deploy

O build gera `deploy-manifest.json` com commit, branch, data, funcionalidades,
migrations verificadas e hashes dos artefatos. O pós-deploy compara o domínio com
esse manifesto. Se o domínio não corresponder ao commit esperado, a publicação é
considerada falha.

## Mensagem de bloqueio

Se uma função protegida desaparecer, o build termina com:

> REGRESSÃO DETECTADA:  
> a nova versão remove funcionalidade existente.

