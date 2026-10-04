import { NotFoundError } from "../../lib/errors";
import withTransaction from "../../db/transaction";
import { addUserToGroupWithClient } from "../members/members.model";
import type { PoolClient } from "pg";

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
        select group_id
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

    // Check user is not already a member, if not add them to the group
    // This ensures that the user is added to the group within the same transaction
    const addUserResult = await addUserToGroupWithClient(client, groupToJoinId, userId);

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

    return { inviteRedeemed: inviteStatus, groupId: groupToJoinId, userId: userId };
  });
};

export { redeemCode };
