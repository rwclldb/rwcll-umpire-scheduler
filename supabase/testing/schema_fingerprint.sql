-- RWCLL: "fingerprint" of a project's database structure and permissions.
--
-- Run this on the TEST project and on the LIVE project, save each result as
-- a CSV, and compare the two files. If they are identical, the two databases
-- have the same tables, columns, rules, permissions, and functions.
--
-- This query only READS. It changes nothing.
--
-- Output: one row per category (about 10 rows), so the SQL Editor's
-- 100-row result limit cannot hide anything.
--
-- What it covers:   tables (and whether row-level security is on), columns,
--                   constraints, indexes, policies, table permissions,
--                   functions (and a checksum of their code), who may run each
--                   function, triggers, and the seeded roles.
-- What it does NOT cover: data, dashboard settings, installed extensions.

with fingerprint as (

select 'table' as category, c.relname::text as object,
       'rls=' || c.relrowsecurity::text as detail
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'

union all
select 'column', table_name::text || '.' || column_name::text,
       data_type::text || ' | nullable=' || is_nullable::text
         || ' | default=' || coalesce(column_default::text, '-')
from information_schema.columns
where table_schema = 'public'

union all
select 'constraint', conrelid::regclass::text || '.' || conname::text,
       pg_get_constraintdef(oid)
from pg_constraint
where connamespace = 'public'::regnamespace

union all
select 'index', tablename::text || '.' || indexname::text, indexdef
from pg_indexes
where schemaname = 'public'

union all
select 'policy', tablename::text || '.' || policyname::text,
       cmd || ' | roles=' || roles::text
           || ' | using: ' || coalesce(qual, '-')
           || ' | check: ' || coalesce(with_check, '-')
from pg_policies
where schemaname = 'public'

union all
select 'grant', table_name::text || ' -> ' || grantee::text,
       string_agg(privilege_type::text, ',' order by privilege_type::text)
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon', 'authenticated')
group by table_name, grantee

union all
select 'function',
       p.proname::text || '(' || pg_get_function_identity_arguments(p.oid) || ')',
       'secdef=' || p.prosecdef::text
         || ' | config=' || coalesce(p.proconfig::text, '-')
         || ' | md5=' || md5(regexp_replace(p.prosrc, '\s+', ' ', 'g'))
from pg_proc p
where p.pronamespace = 'public'::regnamespace

union all
select 'function_access',
       p.proname::text || '(' || pg_get_function_identity_arguments(p.oid) || ')',
       'anon=' || has_function_privilege('anon', p.oid, 'execute')::text
         || ' | authenticated=' || has_function_privilege('authenticated', p.oid, 'execute')::text
from pg_proc p
where p.pronamespace = 'public'::regnamespace

union all
select 'trigger', c.relname::text || '.' || t.tgname::text,
       pg_get_triggerdef(t.oid)
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
where c.relnamespace = 'public'::regnamespace and not t.tgisinternal

union all
select 'seed', 'roles.' || id::text, description::text
from public.roles

)
select category,
       count(*) as items,
       md5(string_agg(object || '|' || detail, E'\n' order by object, detail)) as checksum,
       string_agg(object || ' => ' || detail, E'\n' order by object, detail) as listing
from fingerprint
group by category
order by category;
