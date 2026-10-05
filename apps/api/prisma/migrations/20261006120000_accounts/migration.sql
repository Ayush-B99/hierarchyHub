-- accounts and sessions, see docs/adr/0016-accounts-and-sessions.md
--
-- part 1 is exactly what prisma generates from schema.prisma (ci checks they match)
-- part 2 adds the rules prisma can't describe

-- ---------- part 1: tables, indexes and links ----------

CREATE TABLE "accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(254) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "status" VARCHAR(10) NOT NULL DEFAULT 'pending',
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "employee_id" UUID,
    "failed_logins" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(3),
    "approved_at" TIMESTAMPTZ(3),
    "approved_by" UUID,
    "last_login_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sessions" (
    "id" VARCHAR(64) NOT NULL,
    "account_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "accounts_email_key" ON "accounts"("email");

CREATE UNIQUE INDEX "accounts_employee_id_key" ON "accounts"("employee_id");

CREATE INDEX "accounts_status_idx" ON "accounts"("status");

CREATE INDEX "sessions_account_id_idx" ON "sessions"("account_id");

CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

ALTER TABLE "accounts" ADD CONSTRAINT "accounts_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sessions" ADD CONSTRAINT "sessions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------- part 2: rules prisma can't describe ----------

ALTER TABLE "accounts"
    ADD CONSTRAINT "accounts_status_known" CHECK ("status" IN ('pending', 'active', 'disabled')),
    ADD CONSTRAINT "accounts_email_lower_case" CHECK ("email" = lower("email")),
    ADD CONSTRAINT "accounts_email_format" CHECK ("email" ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    ADD CONSTRAINT "accounts_name_not_blank" CHECK (length(btrim("name")) > 0),
    ADD CONSTRAINT "accounts_failed_logins_not_negative" CHECK ("failed_logins" >= 0),
    -- only an argon2id hash can be stored, so a plain password can never end up here by mistake
    ADD CONSTRAINT "accounts_password_is_argon2id" CHECK ("password_hash" LIKE '$argon2id$%'),
    -- an approved account always says who it is and who approved it
    ADD CONSTRAINT "accounts_pending_until_approved" CHECK ("status" = 'pending' OR "approved_at" IS NOT NULL);

ALTER TABLE "sessions"
    -- a session id is a sha-256 hash in hex, never the cookie value itself
    ADD CONSTRAINT "sessions_id_is_a_hash" CHECK ("id" ~ '^[0-9a-f]{64}$'),
    ADD CONSTRAINT "sessions_expire_after_creation" CHECK ("expires_at" > "created_at");
