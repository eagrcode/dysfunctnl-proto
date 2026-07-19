const { getUserGroups } = require("../../_features/groups/groups.model");

const handleCheckUserGroups = async (userId) => {
  try {
    const groups = await getUserGroups(userId);
    const groupIds = groups.map((group) => group.id);

    return groupIds;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  handleCheckUserGroups,
};
