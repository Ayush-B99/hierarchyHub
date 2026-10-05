-- the audit trail, see docs/adr/0018-audit-trail.md
--
-- part 1 is exactly what prisma generates from schema.prisma (ci checks they match)
-- part 2 makes it append only

-- ---------- part 1: table and indexes ----------

CREATE TABLE "audit_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" VARCHAR(40) NOT NULL,
    "actor_account_id" UUID,
    "actor_employee_id" UUID,
    "actor_name" VARCHAR(100),
    "subject_employee_id" UUID,
    "subject_name" VARCHAR(201),
    "scope" UUID[],
    "changes" JSONB,
    "details" JSONB,
    "request_id" VARCHAR(100),

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_events_at_idx" ON "audit_events"("at" DESC);

CREATE INDEX "audit_events_subject_employee_id_idx" ON "audit_events"("subject_employee_id");

CREATE INDEX "audit_events_actor_account_id_idx" ON "audit_events"("actor_account_id");

CREATE INDEX "audit_events_scope_idx" ON "audit_events" USING GIN ("scope");

-- ---------- part 2: append only ----------

ALTER TABLE "audit_events"
    ADD CONSTRAINT "audit_events_action_known" CHECK ("action" IN (
        'employee.created', 'employee.updated', 'employee.deleted',
        'account.signed_up', 'account.approved', 'account.rejected', 'account.updated',
        'auth.signed_in', 'auth.sign_in_failed', 'auth.locked', 'auth.signed_out'
    ));

-- the api can add and read history, never change or remove it
REVOKE UPDATE, DELETE, TRUNCATE ON "audit_events" FROM hh_app;

-- and nobody else can either, not even the owner, without first dropping this trigger,
-- which is itself a schema change that shows up in a migration
CREATE FUNCTION "audit_events_append_only"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'audit events can''t be changed or deleted'
        USING ERRCODE = 'insufficient_privilege';
END;
$$;

CREATE TRIGGER "audit_events_append_only"
    BEFORE UPDATE OR DELETE ON "audit_events"
    FOR EACH ROW EXECUTE FUNCTION "audit_events_append_only"();

CREATE TRIGGER "audit_events_no_truncate"
    BEFORE TRUNCATE ON "audit_events"
    FOR EACH STATEMENT EXECUTE FUNCTION "audit_events_append_only"();
