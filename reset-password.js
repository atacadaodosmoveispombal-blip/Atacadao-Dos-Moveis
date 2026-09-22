(()=>{
  'use strict';
  const SUPABASE_URL='https://ejcmuygnfrmytdqlyhjr.supabase.co';
  const SUPABASE_ANON_KEY='sb_publishable__J4jaeMvdcVL9EguRpCApw_nV2ymCUP';
  const root=document.querySelector('#resetPasswordApp');
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  if(!root||!window.supabase?.createClient){
    if(root)root.innerHTML='<div class="account-alert">Não foi possível abrir a recuperação agora. Tente novamente em instantes.</div><a href="/">Voltar para a loja</a>';
    return;
  }

  const client=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{
    auth:{storageKey:'atacarejo-customer-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
  });

  const invalid=()=>{root.innerHTML='<h1>Link inválido ou expirado</h1><p>Solicite um novo link de recuperação na área Minha conta. Por segurança, links antigos deixam de funcionar.</p><a href="/?conta=recuperar">Solicitar novo link</a>'};
  const form=()=>{root.innerHTML=`<h1>Crie uma nova senha</h1><p>Use pelo menos 8 caracteres e não reutilize senhas de outros serviços.</p><div id="resetAlert"></div><form id="newPasswordForm"><div class="account-fields"><label>Nova senha<input name="password" type="password" minlength="8" autocomplete="new-password" required></label><label>Confirmar nova senha<input name="confirm_password" type="password" minlength="8" autocomplete="new-password" required></label></div><button class="account-primary" type="submit">Salvar nova senha</button></form>`;
    root.querySelector('#newPasswordForm').addEventListener('submit',submit);
  };
  const submit=async event=>{
    event.preventDefault();
    const button=event.currentTarget.querySelector('button');
    const data=new FormData(event.currentTarget);
    const password=String(data.get('password')||'');
    const confirm=String(data.get('confirm_password')||'');
    const alert=root.querySelector('#resetAlert');
    if(password!==confirm){alert.innerHTML='<div class="account-alert">As senhas não coincidem.</div>';return}
    button.disabled=true;button.textContent='Salvando…';
    const {error}=await client.auth.updateUser({password});
    if(error){alert.innerHTML=`<div class="account-alert">${esc(error.message||'Não foi possível alterar a senha.')}</div>`;button.disabled=false;button.textContent='Salvar nova senha';return}
    await client.auth.signOut({scope:'local'});
    root.innerHTML='<h1>Senha alterada</h1><div class="account-alert success">Sua senha foi atualizada com segurança.</div><a class="account-primary" style="display:grid;place-items:center;text-decoration:none" href="/?conta=entrar">Entrar na minha conta</a>';
  };

  let resolved=false;
  const timer=setTimeout(()=>{if(!resolved)invalid()},6000);
  client.auth.onAuthStateChange((event,session)=>{
    if((event==='PASSWORD_RECOVERY'||session?.user)&&!resolved){resolved=true;clearTimeout(timer);form()}
  });
  client.auth.getSession().then(({data})=>{
    if(data.session&&!resolved){resolved=true;clearTimeout(timer);form()}
  }).catch(()=>invalid());
})();
