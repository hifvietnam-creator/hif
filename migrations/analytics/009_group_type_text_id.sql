-- 009_group_type_text_id.sql
--
-- PCO Groups issues a sentinel group type with the literal id "unique", used
-- for groups that belong to no real type. So group type IDs are not numeric
-- and the column cannot be bigint.
--
-- A useful reminder that JSON-API defines `id` as a STRING. We use bigint
-- elsewhere because those IDs are demonstrably numeric and it makes joins
-- cheaper, but that is an optimisation, not a guarantee — hence the toId()
-- guard in the sync modules, which turns a future surprise into a clear
-- error instead of Postgres's "invalid input syntax for type bigint".

alter table pco.groups
  drop constraint if exists groups_group_type_id_fkey;

alter table pco.group_types
  alter column id type text using id::text;

alter table pco.groups
  alter column group_type_id type text using group_type_id::text;

alter table pco.groups
  add constraint groups_group_type_id_fkey
  foreign key (group_type_id) references pco.group_types(id);

comment on column pco.group_types.id is
  'Text, not bigint. PCO issues a sentinel type with id "unique" for groups '
  'that have no real group type.';
