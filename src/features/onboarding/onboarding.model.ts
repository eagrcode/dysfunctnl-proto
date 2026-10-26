import { NotFoundError } from "../../lib/errors";
import withTransaction from "../../db/transaction";
import { addUserToGroupWithClient } from "../members/members.model";
import type { PoolClient } from "pg";
import pool from "../../db/pool";

const completeOnboarding = async (userId: string) => {
  const result = await pool.query(
    `
      update users
      set onboarded = true
      where id = $1
    `,
    [userId],
  );

  if (result.rowCount !== 1) {
    throw new NotFoundError("Failed to complete onboarding");
  }

  return true;
};

const redeemCode = async (userId: string, code: string) => {
  return withTransaction(async (client: PoolClient) => {
    // Verify the invite code exists and is valid
    const verifyCode = await client.query(
      `
        select group_invite_id
        from group_invite_codes
        where code = $1
        limit 1
    `,
      [code],
    );

    const isInvalidCode = verifyCode.rows.length === 0;

    if (isInvalidCode) {
      throw new NotFoundError("Invalid invite code");
    }

    const groupInviteId: string = verifyCode.rows[0].group_invite_id;

    // Verify the group invite is still valid
    const verifyValidGroupInvite = await client.query(
      `
        select group_id, group_type
        from group_invites
        where id = $1
        and expires_at > now()
        and used_at is null
        and used_by is null
        limit 1
        for update
    `,
      [groupInviteId],
    );

    const isInvalidGroupInvite = verifyValidGroupInvite.rows.length === 0;

    if (isInvalidGroupInvite) {
      throw new NotFoundError("Invalid group invite");
    }

    const groupToJoinId = verifyValidGroupInvite.rows[0].group_id;
    const groupType = verifyValidGroupInvite.rows[0].group_type;

    // Check user is not already a member, if not add them to the group
    const addUserResult = await addUserToGroupWithClient(client, groupToJoinId, userId, groupType);

    const userNotAdded = !addUserResult.member;

    if (userNotAdded) {
      throw new NotFoundError("Failed to add user to the group");
    }

    // Update the invite status to mark it as used
    const updateInviteStatus = await client.query(
      `
        update group_invites
        set used_at = now(),
        used_by = $1
        where id = $2
    `,
      [userId, groupInviteId],
    );

    const inviteStatus = updateInviteStatus.rowCount === 1;

    if (!inviteStatus) {
      throw new NotFoundError("Failed to update invite status");
    }

    // Joining a group completes onboarding atomically with consuming the invite.
    const onboardingResult = await client.query(
      `UPDATE users SET onboarded = true WHERE id = $1 RETURNING onboarded`,
      [userId],
    );

    if (onboardingResult.rowCount !== 1) {
      throw new NotFoundError("Failed to complete onboarding");
    }

    return {
      inviteRedeemed: inviteStatus,
      groupId: groupToJoinId,
      userId,
      onboarded: onboardingResult.rows[0].onboarded as boolean,
    };
  });
};

export { redeemCode, completeOnboarding };
