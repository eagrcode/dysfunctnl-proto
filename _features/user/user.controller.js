const { getUserProfile, updateUserProfile, deleteUserAccount } = require("./user.model");

// GET USER PROFILE
const handleGetUserProfile = async (req, res) => {
  const userId = req.user.id;

  const result = await getUserProfile(userId);

  res.status(200).json({
    success: true,
    data: result,
  });
};

// UPDATE USER PROFILE
const handleUpdateUserProfile = async (req, res) => {
  const userId = req.user.id;
  const { updates } = req.body;

  const result = await updateUserProfile(userId, updates);

  res.status(200).json({
    success: true,
    data: result,
  });
};

// DELETE USER ACCOUNT
const handleDeleteUserAccount = async (req, res) => {
  const userId = req.user.id;

  const result = await deleteUserAccount(userId);

  res.status(200).json({
    success: true,
    data: result,
  });
};

module.exports = {
  handleGetUserProfile,
  handleUpdateUserProfile,
  handleDeleteUserAccount,
};
