-- the employees table, see docs/srs/SRS.md section 6 and docs/adr/0010-database-design.md
--
-- part 1 is exactly what prisma generates from schema.prisma (ci checks they match)
-- part 2 adds the rules prisma can't describe: checks and a trigger, so the database
-- protects the data itself even if the api ever has a bug

-- ---------- part 1: table, indexes and the manager link ----------

CREATE TABLE "employees" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_number" VARCHAR(20) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "birth_date" DATE NOT NULL,
    "salary" DECIMAL(12,2) NOT NULL,
    "role" VARCHAR(100) NOT NULL,
    "manager_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "employees_employee_number_key" ON "employees"("employee_number");

CREATE UNIQUE INDEX "employees_email_key" ON "employees"("email");

CREATE INDEX "employees_manager_id_idx" ON "employees"("manager_id");

CREATE INDEX "employees_last_name_first_name_idx" ON "employees"("last_name", "first_name");

CREATE INDEX "employees_role_idx" ON "employees"("role");

CREATE INDEX "employees_salary_idx" ON "employees"("salary");

CREATE INDEX "employees_birth_date_idx" ON "employees"("birth_date");

-- no action means a manager can't be deleted while people still report to them,
-- the api has to move the team up first (br-04). it's checked at the end of each
-- statement, so deleting a whole team in one go still works
ALTER TABLE "employees" ADD CONSTRAINT "employees_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- ---------- part 2: rules prisma can't describe ----------

ALTER TABLE "employees"
    -- br-01 nobody manages themselves
    ADD CONSTRAINT "employees_not_own_manager" CHECK ("manager_id" IS NULL OR "manager_id" <> "id"),
    -- br-06 no negative salaries
    ADD CONSTRAINT "employees_salary_not_negative" CHECK ("salary" >= 0),
    -- a rough sanity check, the "must be in the past" part lives in the trigger below
    ADD CONSTRAINT "employees_birth_date_realistic" CHECK ("birth_date" >= DATE '1900-01-01'),
    ADD CONSTRAINT "employees_names_not_blank" CHECK (
        btrim("first_name") <> '' AND btrim("last_name") <> '' AND btrim("role") <> ''
    ),
    -- emails are stored lower case, so the unique index above is also case insensitive (br-05)
    ADD CONSTRAINT "employees_email_format" CHECK (
        "email" = lower("email") AND "email" ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    ),
    -- employee numbers are stored upper case for the same reason
    ADD CONSTRAINT "employees_number_format" CHECK ("employee_number" ~ '^[A-Z0-9-]+$');

-- runs before every insert and update. it:
--   1. refuses birth dates that aren't in the past (br-07, a check constraint can't use today's date)
--   2. bumps the version and updated_at on every change, which the api uses to spot clashing edits
--   3. stops id and created_at being changed
--   4. refuses a manager change that would create a reporting loop (br-02)
CREATE FUNCTION "employees_guard"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.birth_date >= CURRENT_DATE THEN
        RAISE EXCEPTION 'birth date must be in the past'
            USING ERRCODE = 'check_violation', CONSTRAINT = 'employees_birth_date_in_past';
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF NEW.id IS DISTINCT FROM OLD.id THEN
            RAISE EXCEPTION 'an employee id can''t be changed'
                USING ERRCODE = 'check_violation', CONSTRAINT = 'employees_id_fixed';
        END IF;
        NEW.created_at := OLD.created_at;
        NEW.updated_at := CURRENT_TIMESTAMP;
        NEW.version := OLD.version + 1;

        -- a brand new row can't create a loop, nobody reports to it yet, so only updates are checked
        -- being your own manager is left to the employees_not_own_manager check, so the
        -- error names the real problem rather than calling it a loop
        IF NEW.manager_id IS NOT NULL
            AND NEW.manager_id <> NEW.id
            AND NEW.manager_id IS DISTINCT FROM OLD.manager_id THEN
            -- only one manager change runs this check at a time, so two clashing changes made
            -- at the same instant (a -> b and b -> a) can't both slip through
            PERFORM pg_advisory_xact_lock(hashtext('hierarchy_hub.employees.reporting_lines'));

            -- walk up from the new manager to the top, if we meet this employee it's a loop
            IF EXISTS (
                WITH RECURSIVE chain AS (
                    SELECT e.id, e.manager_id FROM "employees" e WHERE e.id = NEW.manager_id
                    UNION
                    SELECT e.id, e.manager_id FROM "employees" e JOIN chain c ON e.id = c.manager_id
                )
                SELECT 1 FROM chain WHERE chain.id = NEW.id
            ) THEN
                RAISE EXCEPTION 'this change would create a reporting loop'
                    USING ERRCODE = 'check_violation', CONSTRAINT = 'employees_no_reporting_loop';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER "employees_guard"
    BEFORE INSERT OR UPDATE ON "employees"
    FOR EACH ROW EXECUTE FUNCTION "employees_guard"();
