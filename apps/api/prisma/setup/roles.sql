-- the two database users the app uses, run once per postgres server as an admin
-- usage: psql -v migrator_password=... -v app_password=... -f roles.sql
--
-- hh_migrator owns the tables and is only used to run migrations when deploying
-- hh_app is what the api connects with day to day, it can read and write rows but
-- can't change, drop or create tables, so a bug or an injection can't wreck the schema

\set ON_ERROR_STOP on

select format('create role hh_migrator login password %L', :'migrator_password')
where not exists (select 1 from pg_roles where rolname = 'hh_migrator') \gexec

select format('create role hh_app login password %L', :'app_password')
where not exists (select 1 from pg_roles where rolname = 'hh_app') \gexec

-- safety limits for the api user, so one slow or stuck request can't hold up everything else
alter role hh_app set statement_timeout = '5s';
alter role hh_app set lock_timeout = '3s';
alter role hh_app set idle_in_transaction_session_timeout = '10s';
-- caps how many connections the api can open, leaves room for admins and migrations
alter role hh_app connection limit 40;

-- migrations can take longer but still shouldn't sit waiting on locks forever
alter role hh_migrator set lock_timeout = '10s';
