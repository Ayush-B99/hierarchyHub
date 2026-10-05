-- employees must be at least 15, not just born before today (br-07)
-- only the birth date check in the guard changes, everything else is exactly as before
CREATE OR REPLACE FUNCTION "employees_guard"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    -- br-07: at least 15 years old on the day of the change, the youngest anyone can be employed
    -- in south africa. it also covers dates in the future. a check constraint can't use today's date
    IF NEW.birth_date > (CURRENT_DATE - INTERVAL '15 years')::date THEN
        RAISE EXCEPTION 'employees must be at least 15 years old'
            USING ERRCODE = 'check_violation', CONSTRAINT = 'employees_minimum_age';
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
