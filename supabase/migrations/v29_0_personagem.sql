-- v29.0: personagem da conta (0 = Marcus, 1 = Duda). Escolhido uma vez só, na criação do personagem.
-- Contas que já existem ficam com o Marcus. A coluna não tem grant de escrita: só muda pela RPC set_body,
-- e a RPC só grava quando ainda está vazio. Cliente: tools/patches/v29.0-personagem.js
alter table public.profiles add column if not exists body smallint check (body in (0, 1));

-- contas antigas: Marcus, travado
update public.profiles set body = 0 where body is null;

-- grava a escolha só se ainda não houver uma; devolve o que ficou valendo (a escolha nova ou a antiga)
create or replace function public.set_body(p_body integer)
returns smallint
language plpgsql
security definer
set search_path to ''
as $$
declare v smallint;
begin
  if auth.uid() is null then raise exception 'SEM_LOGIN'; end if;
  if p_body is null or p_body not in (0, 1) then raise exception 'CORPO_INVALIDO'; end if;
  update public.profiles set body = p_body where id = auth.uid() and body is null;
  select body into v from public.profiles where id = auth.uid();
  return v;
end $$;

revoke all on function public.set_body(integer) from public, anon;
grant execute on function public.set_body(integer) to authenticated;
