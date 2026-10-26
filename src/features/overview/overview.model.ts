import pool from "../../db/pool";

const getOverviewLists = async (userId: string) => {
  const query = `
    SELECT
      l.id AS list_id,
      l.title AS list_title,
      l.list_type,
      l.created_at AS list_created_at,
      g.id AS group_id,
      g.name AS group_name
    FROM lists l
    JOIN groups g
      ON g.id = l.group_id
    LEFT JOIN group_members gm
      ON gm.group_id = g.id
      AND gm.user_id = $1
    WHERE
      l.completed = false
      AND (
        (g.type = 'personal' AND g.created_by = $1)
        OR (g.type = 'shared' AND gm.user_id IS NOT NULL)
      )
    ORDER BY l.created_at DESC, l.id;
  `;

  const { rows } = await pool.query(query, [userId]);

  return rows;
};

export { getOverviewLists };
