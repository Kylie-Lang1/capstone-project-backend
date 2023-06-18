const db = require("../db/dbConfig");

const sendFriendRequest = async (request) => {
  try {
    const getFriendRequest = await db.oneOrNone(
      `SELECT * FROM users_request WHERE users_id = $1 AND senders_id = $2`,
      [request.users_id, request.senders_id]
    );

    if (getFriendRequest) {
      return { error: "Duplicate friend request." };
    } else {
      const sendRequest = await db.none(
        `
        INSERT INTO users_request (users_id, senders_id)
        VALUES ($1, $2);
      `,
        [request.users_id, request.senders_id]
      );
      return sendRequest;
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const acceptFriendRequest = async (userId, senderId) => {
  try {
    await db.task(async (t) => {
      // Check if the friendship already exists
      const friendshipExists = await t.oneOrNone(
        `
        SELECT *
        FROM users_friends
        WHERE users_id = $1 AND friends_id = $2;
        `,
        [userId, senderId]
      );

      if (friendshipExists) {
        throw new Error("Friendship already exists.");
      }

      // Delete the friend request
      else {
        await t.none(
          `
          DELETE FROM users_request
          WHERE users_id = $1 AND senders_id = $2;
          `,
          [userId, senderId]
        );

        // Insert the friendship
        await t.none(
          `
          INSERT INTO users_friends (users_id, friends_id)
          VALUES ($1, $2);
          `,
          [userId, senderId]
        );

        // Insert the reverse friendship
        await t.none(
          `
          INSERT INTO users_friends (users_id, friends_id)
          VALUES ($1, $2);
          `,
          [senderId, userId]
        );
      }
    });
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const deleteFriendRequest = async (userId, senderId) => {
  try {
    await db.none(
      `
        DELETE FROM users_request
        WHERE users_id = $1 AND senders_id = $2;
      `,
      [userId, senderId]
    );
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const getFriendsList = async (userId) => {
  try {
    return await db.any(
      `
        SELECT u.id, u.first_name, u.last_name, u.profile_img, u.pronouns, u.username
        FROM users u
        INNER JOIN users_friends uf ON u.id = uf.friends_id
        WHERE uf.users_id = $1;
      `,
      [userId]
    );
  } catch (error) {
    return error;
  }
};

const getFriendRequests = async (userId) => {
  try {
    return await db.any(
      `
        SELECT u.id, u.first_name, u.last_name, u.profile_img
        FROM users u
        INNER JOIN users_request uq ON u.id = uq.senders_id
        WHERE uq.users_id = $1;
      `,
      [userId]
    );
  } catch (error) {
    throw error;
  }
};

const deleteFriends = async (userId, friendId) => {
  try {
    await db.task(async (t) => {
      await t.none(
        `DELETE FROM users_friends WHERE users_id =$1 AND friends_id=$2`,
        [userId, friendId]
      );
      await t.none(
        `DELETE FROM users_friends WHERE users_id =$1 AND friends_id=$2`,
        [friendId, userId]
      );
    });
  } catch (error) {
    console.log(error);
    return error;
  }
};


module.exports = {
  sendFriendRequest,
  acceptFriendRequest,
  deleteFriendRequest,
  getFriendsList,
  getFriendRequests,
  deleteFriends,
};
