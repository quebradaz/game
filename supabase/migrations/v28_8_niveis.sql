-- v28.8: custos dos 5 nós novos da árvore (Fôlego, Lábia, Olho de águia, Pé de pedreiro, Segunda chance).
-- O jogo deixa o nó "em breve" enquanto o custo não existe aqui; aplicar esta migração abre os nós.
-- Valores de docs/ECONOMIA_v28.md: segunda linha 2 / 3 / 4 chips, Segunda chance 6.
-- Atenção: o nível do personagem exigido por cada nó (7, 12, 17, 22, 32) só é conferido no jogo, não aqui.
insert into public.skill_costs (skill, level, chips) values
  ('folego', 1, 2), ('folego', 2, 3), ('folego', 3, 4),
  ('labia', 1, 2), ('labia', 2, 3), ('labia', 3, 4),
  ('mira', 1, 2), ('mira', 2, 3), ('mira', 3, 4),
  ('chute', 1, 2), ('chute', 2, 3), ('chute', 3, 4),
  ('segunda', 1, 6)
on conflict do nothing;
