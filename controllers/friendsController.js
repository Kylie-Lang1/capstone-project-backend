const express = require("express");

const friends = express.Router();

const {
  sendFriendRequest,
  acceptFriendRequest,
  deleteFriendRequest,
  getFriendsList,
  getFriendRequests,
  deleteFriends,
} = require("../queries/Friends");

friends.post("/", async (req, res) => {
  try {
    const request = await sendFriendRequest(req.body);
    res.json(request);
  } catch (error) {
    console.log(error);
    res.status(400).json({ error: error.message });
  }
});

friends.post("/:userId/accept/:senderId", async (req, res) => {
  const { userId, senderId } = req.params;
  try {
    const accept = await acceptFriendRequest(userId, senderId);
    res.json(accept);
  } catch (error) {
    console.log(error);
    res.status(404).json("Can't Accept Request");
  }
});

friends.delete("/:userId/denied/:senderId", async (req, res) => {
  const { userId, senderId } = req.params;

  try {
    await deleteFriendRequest(userId, senderId);
    res.status(200).json("Request deleted successfully");
  } catch (error) {
    console.log(error);
    res.status(500).json("An error occurred while deleting the request");
  }
});

friends.get(`/:userId/list`, async (req, res) => {
  const { userId } = req.params;

  const getFriends = await getFriendsList(userId);

  const filter = req.query;
  const filterFriends = getFriends.filter((friend) => {
    let isValid = true;
    for (key in filter) {
      if (isNaN(filter[key])) {
        isValid =
          isValid && friend[key].toLowerCase() === filter[key].toLowerCase();
      } else {
        isValid = isValid && friend[key] == parseInt(filter[key]);
      }
    }
    return isValid;
  });

  if (filterFriends.length === 0) {
    res.status(404).json({ error: "No matching friends found" });
  } else {
    res.json(filterFriends);
  }
});

friends.get(`/:userId/request`, async (req, res) => {
  const { userId } = req.params;

  const getRequest = await getFriendRequests(userId);

  const filter = req.query;

  const filterRequest = getRequest.filter((req) => {
    let isValid = true;
    for (key in filter) {
      if (isNaN(filter[key])) {
        isValid =
          isValid && req[key].toLowerCase() === filter[key].toLowerCase();
      } else {
        isValid = isValid && req[key] == parseInt(filter[key]);
      }
    }
    return isValid;
  });
  res.json(filterRequest);
});

friends.delete(`/:userId/deletefriend/:friendId`, async (req, res) => {
  const { userId, friendId } = req.params;

  const deleteFriend = await deleteFriends(userId, friendId);

  if (deleteFriend) {
    res.status(200).json(deleteFriend);
  } else {
    res.status(404).json(`Can not found friend`);
  }
});

module.exports = friends;
