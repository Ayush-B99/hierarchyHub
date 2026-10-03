-- locks down one database and gives each user only what it needs
-- run as an admin, connected to the database being set up
-- usage: psql -d hierarchy_hub -f database.sql

\set ON_ERROR_STOP on

-- nobody gets in unless we say so
revoke all on database :"DBNAME" from public;
grant connect on database :"DBNAME" to hh_migrator, hh_app;

-- the migrator owns the schema and everything in it
alter schema public owner to hh_migrator;
revoke create on schema public from public;
grant usage on schema public to hh_app;

-- whenever the migrator creates a table later, the app automatically gets row access only
alter default privileges for role hh_migrator in schema public
  grant select, insert, update, delete on tables to hh_app;
alter default privileges for role hh_migrator in schema public
  grant usage, select on sequences to hh_app;
alter default privileges for role hh_migrator in schema public
  grant execute on functions to hh_app;
