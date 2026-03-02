const { checkGroupMembership } = require("../../_features/members/members.model");

const handleCheckGroupMembership = async (userId, groupId) => {
  try {
    await checkGroupMembership(groupId, userId);
    return true; // User is a member of the group
  } catch (error) {
    return false; // User is not a member of the group
  }
};

module.exports = {
  handleCheckGroupMembership,
};
