const pool = require("../../_shared/utils/db");

const getListsData = async (groupId) => {
  const listsQuery = `
        select count(id):: int as count
        from lists
        where group_id = $1
        and completed = false;
    `;

  const { rows } = await pool.query(listsQuery, [groupId]);

  return {
    count: rows[0].count ?? 0,
  };
};

const getAlbumsData = async (groupId) => {
  const albumsQuery = `
        select count(id):: int as count 
        from media_albums
        where group_id = $1;
    `;

  const { rows } = await pool.query(albumsQuery, [groupId]);

  return {
    count: rows[0].count ?? 0,
  };
};

const getTextChannelMessagesData = async (groupId) => {
  const textChannelsQuery = `
        select count(tcm.id):: int as count 
        from text_channel_messages tcm
        inner join text_channels tc
            on tcm.channel_id = tc.id
        where tc.group_id = $1;
    `;

  const { rows } = await pool.query(textChannelsQuery, [groupId]);

  return {
    count: rows[0].count ?? 0,
  };
};

const getCalendarData = async (groupId) => {
  const calendarQuery = `
        select count(id):: int as count 
        from calendar
        where group_id = $1
        and end_time > now();
    `;

  const { rows } = await pool.query(calendarQuery, [groupId]);

  return {
    count: rows[0].count ?? 0,
  };
};

module.exports = {
  getListsData,
  getAlbumsData,
  getTextChannelMessagesData,
  getCalendarData,
};
