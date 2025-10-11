const jwt = require("jsonwebtoken");
const pool = require("../utils/db");

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });

    // Just store basic user info - no groups needed here
    req.user = user;
    next();
  });
};

// const authenticate = async (req, res, next) => {
//   const token = req.headers.authorization?.split(" ")[1];
//   if (!token) return res.status(401).json({ error: "Unauthorized" });

//   jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
//     if (err) return res.status(403).json({ error: "Invalid token" });

//     try {
//       const userGroups = await pool.query(
//         `SELECT g.created_by, gm.group_id, gmr.is_admin
//          FROM group_members gm
//          INNER JOIN groups g ON g.id = gm.group_id
//          LEFT JOIN group_members_roles gmr ON gm.user_id = gmr.user_id
//          AND gm.group_id = gmr.group_id
//          WHERE gm.user_id = $1`,
//         [user.id]
//       );

//       req.user = {
//         ...user,
//         groups: userGroups.rows.map((g) => ({
//           groupId: g.group_id,
//           isAdmin: g.is_admin,
//           isCreator: g.created_by === user.id,
//         })),
//       };

//       // console.log(req.user);

//       next();
//     } catch (error) {
//       console.error("Failed to load user groups:", error);
//       return res.status(500).json({ error: "Authentication failed" });
//     }
//   });
// };

module.exports = authenticate;
