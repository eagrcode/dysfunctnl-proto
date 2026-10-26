-- Uses temporary groups belonging to existing users.
-- All fixtures and the temporary assertion helper are rolled back.
-- Requires two users, with at least one user who has no Personal space.

BEGIN;

SET LOCAL statement_timeout = '30s';

CREATE FUNCTION pg_temp.expect_constraint_failure(
    sql_statement text,
    expected_state text,
    expected_constraint text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
    actual_state text;
    actual_constraint text;
BEGIN
    BEGIN
        EXECUTE sql_statement;
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS
            actual_state = RETURNED_SQLSTATE,
            actual_constraint = CONSTRAINT_NAME;

        IF actual_state IS DISTINCT FROM expected_state
            OR (expected_constraint IS NOT NULL
                AND actual_constraint IS DISTINCT FROM expected_constraint) THEN
            RAISE EXCEPTION 'Expected % / %, got % / %',
                expected_state, expected_constraint, actual_state, actual_constraint;
        END IF;

        RETURN;
    END;

    RAISE EXCEPTION 'Statement unexpectedly succeeded; expected % / %',
        expected_state, expected_constraint;
END;
$function$;

DO $tests$
DECLARE
    personal_owner_id uuid;
    other_user_id uuid;
    personal_id uuid;
    shared_id uuid;
    invite_id uuid;
BEGIN
    SELECT u.id INTO personal_owner_id
    FROM public.users u
    WHERE NOT EXISTS (
        SELECT 1 FROM public.groups g
        WHERE g.type = 'personal' AND g.created_by = u.id
    )
    ORDER BY u.id LIMIT 1;

    SELECT u.id INTO other_user_id
    FROM public.users u
    WHERE u.id <> personal_owner_id
    ORDER BY u.id LIMIT 1;

    IF personal_owner_id IS NULL OR other_user_id IS NULL THEN
        RAISE EXCEPTION 'Verification requires two users and one available Personal-space owner';
    END IF;

    -- Personal spaces need no membership or role records.
    INSERT INTO public.groups (name, created_by, description, type)
    VALUES ('Constraint test personal', personal_owner_id, 'Temporary fixture', 'personal')
    RETURNING id INTO personal_id;

    IF EXISTS (SELECT 1 FROM public.group_members WHERE group_id = personal_id)
        OR EXISTS (SELECT 1 FROM public.group_members_roles WHERE group_id = personal_id) THEN
        RAISE EXCEPTION 'Personal creation unexpectedly produced membership or role records';
    END IF;

    -- Existing inserts can omit group_type: shared membership and invites still work.
    INSERT INTO public.groups (name, created_by, description, type)
    VALUES ('Constraint test shared', other_user_id, 'Temporary fixture', 'shared')
    RETURNING id INTO shared_id;

    INSERT INTO public.group_members (group_id, user_id)
    VALUES (shared_id, other_user_id);
    INSERT INTO public.group_members_roles (group_id, user_id, is_admin)
    VALUES (shared_id, other_user_id, true);

    IF (SELECT group_type FROM public.group_members
        WHERE group_id = shared_id AND user_id = other_user_id) IS DISTINCT FROM 'shared' THEN
        RAISE EXCEPTION 'Shared membership default is incorrect';
    END IF;

    INSERT INTO public.group_invites (group_id, invited_by, invite_type)
    VALUES (shared_id, other_user_id, 'code')
    RETURNING id INTO invite_id;

    IF (SELECT group_type FROM public.group_invites WHERE id = invite_id)
        IS DISTINCT FROM 'shared' THEN
        RAISE EXCEPTION 'Shared invitation default is incorrect';
    END IF;

    PERFORM pg_temp.expect_constraint_failure(
        format('INSERT INTO public.group_members (group_id, user_id) VALUES (%L, %L)',
            personal_id, personal_owner_id),
        '23503', 'group_members_shared_group_fkey');

    PERFORM pg_temp.expect_constraint_failure(
        format('INSERT INTO public.group_members_roles (group_id, user_id, is_admin) VALUES (%L, %L, true)',
            personal_id, personal_owner_id),
        '23503', 'group_members_roles_user_id_group_id_fkey');

    PERFORM pg_temp.expect_constraint_failure(
        format('INSERT INTO public.group_invites (group_id, invited_by, invite_type) VALUES (%L, %L, %L)',
            personal_id, personal_owner_id, 'code'),
        '23503', 'group_invites_shared_group_fkey');

    PERFORM pg_temp.expect_constraint_failure(
        format('INSERT INTO public.group_members (group_id, user_id, group_type) VALUES (%L, %L, %L)',
            personal_id, personal_owner_id, 'personal'),
        '23514', 'group_members_shared_type_check');

    PERFORM pg_temp.expect_constraint_failure(
        format('INSERT INTO public.group_members (group_id, user_id, group_type) VALUES (%L, %L, NULL)',
            personal_id, personal_owner_id),
        '23502');

    PERFORM pg_temp.expect_constraint_failure(
        format('INSERT INTO public.group_invites (group_id, invited_by, invite_type, group_type) VALUES (%L, %L, %L, %L)',
            personal_id, personal_owner_id, 'code', 'personal'),
        '23514', 'group_invites_shared_type_check');

    PERFORM pg_temp.expect_constraint_failure(
        format('INSERT INTO public.group_invites (group_id, invited_by, invite_type, group_type) VALUES (%L, %L, %L, NULL)',
            personal_id, personal_owner_id, 'code'),
        '23502');

    -- A member without a role isolates the new FK from the existing role FK.
    INSERT INTO public.group_members (group_id, user_id)
    VALUES (shared_id, personal_owner_id);

    PERFORM pg_temp.expect_constraint_failure(
        format('UPDATE public.group_members SET group_id = %L WHERE group_id = %L AND user_id = %L',
            personal_id, shared_id, personal_owner_id),
        '23503', 'group_members_shared_group_fkey');

    PERFORM pg_temp.expect_constraint_failure(
        format('UPDATE public.group_invites SET group_id = %L WHERE id = %L',
            personal_id, invite_id),
        '23503', 'group_invites_shared_group_fkey');

    PERFORM pg_temp.expect_constraint_failure(
        format('UPDATE public.group_members SET group_type = %L WHERE group_id = %L',
            'personal', shared_id),
        '23514', 'group_members_shared_type_check');

    PERFORM pg_temp.expect_constraint_failure(
        format('UPDATE public.group_invites SET group_type = %L WHERE id = %L',
            'personal', invite_id),
        '23514', 'group_invites_shared_type_check');

    PERFORM pg_temp.expect_constraint_failure(
        format('UPDATE public.groups SET type = %L WHERE id = %L', 'shared', personal_id),
        '23514', 'groups_type_immutable');

    PERFORM pg_temp.expect_constraint_failure(
        format('UPDATE public.groups SET type = %L WHERE id = %L', 'personal', shared_id),
        '23514', 'groups_type_immutable');

    PERFORM pg_temp.expect_constraint_failure(
        format('UPDATE public.groups SET created_by = %L WHERE id = %L', other_user_id, personal_id),
        '23514', 'groups_personal_owner_immutable');

    PERFORM pg_temp.expect_constraint_failure(
        format('INSERT INTO public.groups (name, created_by, type) VALUES (%L, %L, %L)',
            'Duplicate personal fixture', personal_owner_id, 'personal'),
        '23505', 'groups_one_personal_per_owner');

    -- Ordinary edits and assignments that preserve identity remain valid.
    UPDATE public.groups
    SET name = 'Updated personal fixture', description = 'Updated fixture',
        type = type, created_by = created_by
    WHERE id = personal_id;

    IF (SELECT name FROM public.groups WHERE id = personal_id)
        IS DISTINCT FROM 'Updated personal fixture' THEN
        RAISE EXCEPTION 'Ordinary Personal-space edits were not preserved';
    END IF;

    DELETE FROM public.groups WHERE id = shared_id;
    IF EXISTS (SELECT 1 FROM public.group_members WHERE group_id = shared_id)
        OR EXISTS (SELECT 1 FROM public.group_members_roles WHERE group_id = shared_id)
        OR EXISTS (SELECT 1 FROM public.group_invites WHERE group_id = shared_id) THEN
        RAISE EXCEPTION 'Shared-group deletion did not cascade';
    END IF;

    RAISE NOTICE 'Passed 20 database constraint checks';
END;
$tests$;

ROLLBACK;
