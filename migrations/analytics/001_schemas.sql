-- 001_schemas.sql
--
-- Three schemas in the same Neon database as Payload.
--
--   pco  — raw mirror of Planning Center. Never hand-edited.
--   ml   — raw mirror of MailerLite.     Never hand-edited.
--   hif  — our own derived data: sync state, cross-system links.
--
-- Payload keeps `public` to itself. Its Postgres adapter only manages tables
-- it knows about, so these schemas are invisible to it and safe from its
-- schema push.
--
-- Nothing here encodes journey stages or business rules. Those come later,
-- once the raw data is loaded and leadership has agreed definitions.

create schema if not exists pco;
create schema if not exists ml;
create schema if not exists hif;

-- Case-insensitive text, so email comparison doesn't need lower() everywhere
-- (and indexes actually get used).
create extension if not exists citext;

comment on schema pco is 'Raw mirror of Planning Center Online. Written only by sync jobs.';
comment on schema ml  is 'Raw mirror of MailerLite. Written only by sync jobs.';
comment on schema hif is 'HIF-derived data: sync watermarks, cross-system identity links.';
