const { NotFoundError, ForbiddenError } = require("../utils/errors");
const pool = require("../utils/db");

const checkAlbumOwnership = async (req, res, next) => {
  const { albumId, groupId } = req.params;
  const { id: userId } = req.user;

  const isAdmin = req.groupMembership && req.groupMembership.is_admin;

  console.log(
    `\n→ Checking if user ${userId} is the creator of album ${albumId} in group ${groupId}...`
  );

  const albumCreatorId = await getAlbumCreatorId(albumId, groupId);

  console.log(`Album created by user ${albumCreatorId}`);

  if (albumCreatorId !== userId && !isAdmin) {
    throw new ForbiddenError(
      "You are not the creator of this album, or an admin user"
    );
  }

  console.log("User is the creator of the album, or an admin user");
  next();
};

const getAlbumCreatorId = async (albumId, groupId) => {
  const result = await pool.query(
    "SELECT created_by FROM media_albums WHERE id = $1 AND group_id = $2",
    [albumId, groupId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError("Album not found");
  }

  return result.rows[0].created_by;
};

module.exports = checkAlbumOwnership;
