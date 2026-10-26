-- Personal spaces use groups.created_by for ownership.
-- Memberships, roles, and invitations belong to shared groups.
-- Run once as the table owner after deploying the updated creation/discovery code.
-- Back up legacy Personal membership and role rows before running this migration.

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

LOCK TABLE public.groups, public.group_members,
    public.group_members_roles, public.group_invites IN ACCESS EXCLUSIVE MODE;

-- Unexpected members or invitations require a separate data review.
DO $preflight$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.group_members gm
        JOIN public.groups g ON g.id = gm.group_id
        WHERE g.type = 'personal' AND gm.user_id <> g.created_by
    ) THEN
        RAISE EXCEPTION 'Personal groups contain non-owner memberships; review before migrating';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.group_invites gi
        JOIN public.groups g ON g.id = gi.group_id
        WHERE g.type = 'personal'
    ) THEN
        RAISE EXCEPTION 'Personal groups contain invitations; review before migrating';
    END IF;
END;
$preflight$;

-- The existing membership-to-role foreign key cascades deletion of these roles.
DELETE FROM public.group_members gm
USING public.groups g
WHERE g.id = gm.group_id AND g.type = 'personal';

ALTER TABLE public.groups
    ADD CONSTRAINT groups_id_type_key UNIQUE (id, type);

ALTER TABLE public.group_members
    ADD COLUMN group_type varchar(20) NOT NULL DEFAULT 'shared',
    ADD CONSTRAINT group_members_shared_type_check CHECK (group_type = 'shared'),
    DROP CONSTRAINT group_members_group_id_fkey,
    ADD CONSTRAINT group_members_shared_group_fkey
        FOREIGN KEY (group_id, group_type)
        REFERENCES public.groups (id, type)
        ON DELETE CASCADE ON UPDATE RESTRICT;

ALTER TABLE public.group_invites
    ADD COLUMN group_type varchar(20) NOT NULL DEFAULT 'shared',
    ADD CONSTRAINT group_invites_shared_type_check CHECK (group_type = 'shared'),
    DROP CONSTRAINT fk_group_invites_group,
    ADD CONSTRAINT group_invites_shared_group_fkey
        FOREIGN KEY (group_id, group_type)
        REFERENCES public.groups (id, type)
        ON DELETE CASCADE ON UPDATE RESTRICT;

-- Cross-table foreign keys enforce membership/invite restrictions.
-- This trigger separately prevents changing the identity of an existing space.
CREATE FUNCTION public.enforce_group_identity()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    IF NEW.type IS DISTINCT FROM OLD.type THEN
        RAISE EXCEPTION USING
            ERRCODE = '23514',
            CONSTRAINT = 'groups_type_immutable',
            MESSAGE = 'Group type cannot be changed after creation';
    END IF;

    IF OLD.type = 'personal'
        AND NEW.created_by IS DISTINCT FROM OLD.created_by THEN
        RAISE EXCEPTION USING
            ERRCODE = '23514',
            CONSTRAINT = 'groups_personal_owner_immutable',
            MESSAGE = 'Personal group ownership cannot be changed';
    END IF;

    RETURN NEW;
END;
$function$;

CREATE TRIGGER enforce_groups_identity
BEFORE UPDATE OF type, created_by ON public.groups
FOR EACH ROW EXECUTE FUNCTION public.enforce_group_identity();

COMMIT;
