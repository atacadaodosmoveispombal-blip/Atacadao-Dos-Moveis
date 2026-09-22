# Backup e restauração antes de mudanças no Supabase

1. **Antes de cada migration:** confirme em **Supabase → Database → Backups** a existência e a data de um ponto de restauração. Registre o horário, o responsável e a versão do Git em um controle privado. Se o plano não oferecer backup recuperável, faça um dump lógico com a Supabase CLI ou `pg_dump` usando uma conexão segura. Não salve a URL do banco, senha ou dump neste repositório.
2. **Storage é separado:** o backup do banco inclui metadados, mas não os bytes das imagens. Exporte os objetos dos buckets `products`, `site`, `categories`, `environments`, `brands`, `banners`, `inspirations` e `avatars` para armazenamento privado e criptografado. Guarde um inventário de caminhos, tamanho e quantidade por bucket.
3. **Guarda:** mantenha uma cópia fora do projeto Supabase, com acesso restrito. Defina retenção mínima de 7 dias e uma cópia antes de cada release. Não dependa apenas da cópia no mesmo provedor.
4. **Ensaio:** restaure banco e Storage em um projeto separado; verifique contagem de produtos, pedidos, perfis, imagens e policies. Faça um login administrativo de teste e confira que um visitante não lê dados internos nem consegue gravar conteúdo.
5. **Incidente:** suspenda novas alterações, identifique o último ponto íntegro, restaure primeiro em ambiente separado e valide. A troca de produção exige janela de manutenção e atualização segura de DNS/URLs. Após o retorno, revogue sessões e rotacione credenciais se houver suspeita de exposição.

A migration `20260926_security_admin_gate.sql` **não foi aplicada**. Antes de aplicá-la, execute os passos 1–4, revise a lista de perfis `viewer` legítimos e prepare o procedimento de convite/ativação. Após aplicá-la, rode `supabase/audits/production_readonly.sql` e testes de permissão com contas `anon`, `viewer`, `editor` e `super_admin`.

Referências: [Backups do Supabase](https://supabase.com/docs/guides/platform/backups) e [RLS do Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).
