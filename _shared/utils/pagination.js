const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const parsePaginationParams = (query) => {
  let limit = parseInt(query.limit, 10);
  if (isNaN(limit) || limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  const cursor = query.cursor || null;

  return { limit, cursor };
};

const buildPaginationResponse = (rows, limit, cursorField) => {
  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? data[data.length - 1][cursorField] : null;

  return {
    data,
    pagination: {
      nextCursor,
      hasMore,
    },
  };
};

module.exports = { parsePaginationParams, buildPaginationResponse };
