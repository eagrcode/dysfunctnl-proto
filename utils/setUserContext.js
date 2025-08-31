const isInGroup = (userContext, groupId) => {
  return userContext.groups.some((g) => g.groupId === groupId);
};

const isAdmin = (userContext, groupId) => {
  return userContext.groups.some((g) => g.groupId === groupId && g.isAdmin);
};

const isCreator = (userContext, groupId) => {
  return userContext.groups.some((g) => g.groupId === groupId && g.isCreator);
};

module.exports = {
  isInGroup,
  isAdmin,
  isCreator,
};
