-- Testes do corpo do personagem (v29.0). Roda depois de mock_supabase.sql + v29_0_personagem.sql.
\set ON_ERROR_STOP 1
insert into auth.users (id) values ('00000000-0000-0000-0000-00000000000a');
-- contas antigas: inseridas ANTES da migração no run.sh, então já têm body = 0
do $$ begin
  assert (select body from public.profiles where id = '00000000-0000-0000-0000-000000000001') = 0, 'conta antiga deveria ser Marcus';
end $$;
insert into public.profiles (id) values ('00000000-0000-0000-0000-00000000000a');
set role authenticated;
-- conta antiga não troca
select set_config('qz.uid', '00000000-0000-0000-0000-000000000001', false);
do $$ begin assert public.set_body(1) = 0, 'conta antiga trocou de corpo'; end $$;
-- conta nova escolhe a Duda uma vez
select set_config('qz.uid', '00000000-0000-0000-0000-00000000000a', false);
do $$ begin assert public.set_body(1) = 1, 'conta nova não gravou a Duda'; end $$;
do $$ begin assert public.set_body(0) = 1, 'conta nova trocou depois de escolher'; end $$;
-- valor inválido
do $$ begin perform public.set_body(2); raise exception 'aceitou corpo 2'; exception when others then if sqlerrm <> 'CORPO_INVALIDO' then raise; end if; end $$;
-- escrita direta na tabela não passa (sem grant de update)
do $$ begin update public.profiles set body = 0 where id = auth.uid(); raise exception 'update direto passou'; exception when insufficient_privilege then null; end $$;
-- sem login
select set_config('qz.uid', '', false);
do $$ begin perform public.set_body(1); raise exception 'sem login passou'; exception when others then if sqlerrm <> 'SEM_LOGIN' then raise; end if; end $$;
reset role;
\echo 'personagem: todos os testes passaram'
