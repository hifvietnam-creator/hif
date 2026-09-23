-- 016_kidzquest_card_codes.sql
--
-- Moves the security code from the attendance row onto the child.
--
-- WHY IT MOVED
--
-- 010 generated a fresh three-character code every Sunday, on the reasoning
-- that a code which never changes ends up photographed and reused. That was the
-- right worry for a printed label handed to a parent.
--
-- It is the wrong design for what actually happens. The ministry keeps a box of
-- physical cards, one per child. A parent is handed their child's card at
-- drop-off and gives it back at pick-up. The card never leaves the building.
--
-- That changes the threat entirely. The token is an object the ministry
-- controls, so a guessable code costs nothing — knowing that Abigail Bui is
-- EX-AB-BU gets you no further without the card in your hand. And because the
-- card is physical, the code has to be STABLE. A code that rotated weekly would
-- mean reprinting 169 cards every Sunday.
--
-- So: readable, stable, and stored on the child.
--
--   EX-AB-BU   Explorers · Abigail · Bui
--   VO-BA-NG   Voyagers  · Bảo Anh · Nguyễn   (diacritics stripped)
--   EX-GE-NI-2 second child in Explorers whose letters collide
--
-- A volunteer reads that and knows who it is and which room. "K7M" told them
-- nothing and had to be matched character by character.

alter table kq.children add column if not exists card_code text;

create unique index if not exists kq_children_card_code_idx
  on kq.children (card_code) where card_code is not null;

comment on column kq.children.card_code is
  'Printed on the physical card. Generated once and then left alone: a card '
  'exists in the world, so correcting a spelling in the database must not '
  'silently invalidate it. Changes only when somebody reissues, or at the '
  'August rollover when the group prefix moves.';

alter table kq.children add column if not exists card_issued_at timestamptz;

comment on column kq.children.card_issued_at is
  'When Ate last printed this child a card. Null means no card exists yet, '
  'which is the list she works from.';

-- ── Let attendance stop carrying a code ──────────────────────────────────────
--
-- 010 added: check (source = 'import' or security_code is not null)
--
-- That made sense when the station minted a code per check-in. Now the code
-- belongs to the child and the attendance row has no need of one, so this
-- constraint would reject every real check-in next Sunday — and the error would
-- name a security code, which is nowhere near where anyone would look.

alter table kq.attendance drop constraint if exists station_rows_need_a_code;

-- Existing rows keep whatever they were given. Those really were the codes in
-- use at the time, and rewriting history to match a scheme invented later would
-- make the record less true, not more.
comment on column kq.attendance.security_code is
  'Historical only. Check-ins before September 2026 carried a per-session code '
  'generated at the door. The code now lives on kq.children.card_code and is '
  'the same every week, so new rows leave this null.';

-- ── Generate the codes ───────────────────────────────────────────────────────
--
-- Done in SQL rather than the application so every existing child gets one in a
-- single pass, deterministically, with collisions resolved in a defined order
-- rather than by whoever happens to be saved first.

create or replace function kq.card_letters(v text, n integer default 2)
returns text language sql immutable as $$
  -- Strip diacritics, drop anything that is not a letter, take the first n.
  -- 'Bảo Anh' -> 'BA', 'de Armas' -> 'DE', "nyang'ondi" -> 'NY'.
  select upper(
    substr(
      regexp_replace(
        translate(
          v,
          'àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ' ||
          'ÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ',
          'aaaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd' ||
          'AAAAAAAAAAAAAAAAAAEEEEEEEEEEEIIIIIOOOOOOOOOOOOOOOOOUUUUUUUUUUUYYYYYD'
        ),
        '[^A-Za-z]', '', 'g'
      ),
      1, n
    )
  );
$$;

create or replace function kq.group_prefix(code text)
returns text language sql immutable as $$
  select case code
           when 'explorers'    then 'EX'
           when 'voyagers'     then 'VO'
           when 'trailblazers' then 'TR'
           when 'pathfinders'  then 'PA'
           when 'aftershock'   then 'AS'
           else 'KQ'
         end;
$$;

-- Assign a code to every active child who has one missing.
--
-- Ordered by id so the run is repeatable: the same child always takes the
-- unsuffixed code and the later arrival takes -2. Running it twice changes
-- nothing, because only null codes are touched.
with candidates as (
  select c.id,
         kq.group_prefix(e.group_code) || '-' ||
         kq.card_letters(c.first_name)  || '-' ||
         kq.card_letters(c.last_name)   as base
    from kq.children c
    join kq.enrollments e on e.child_id = c.id and e.ended_on is null
   where c.card_code is null
     and c.status = 'active'
     and length(kq.card_letters(c.first_name)) = 2
     and length(kq.card_letters(c.last_name))  = 2
),
numbered as (
  select id, base,
         row_number() over (partition by base order by id) as n
    from candidates
)
update kq.children c
   set card_code = case when n.n = 1 then n.base else n.base || '-' || n.n end
  from numbered n
 where c.id = n.id;

-- A view of who still has no card, and why. Two reasons: the child has no
-- surname yet, or Ate has not printed one.
create or replace view kq.cards_outstanding as
  select c.id as child_id,
         c.first_name, c.last_name,
         e.group_code,
         c.card_code,
         c.card_issued_at,
         case
           when length(kq.card_letters(c.first_name)) < 2 then 'first name too short'
           when length(kq.card_letters(c.last_name))  < 2 then 'no family name recorded'
           when c.card_code is null                       then 'no code yet'
           else 'card not printed'
         end as reason
    from kq.children c
    join kq.enrollments e on e.child_id = c.id and e.ended_on is null
   where c.status = 'active'
     and (c.card_code is null or c.card_issued_at is null);

comment on view kq.cards_outstanding is
  'Children who cannot be handed a card. Mostly the ones with no family name '
  'on file — a code needs two letters from each name, and about thirty '
  'children came across from the spreadsheets with only a first name.';
