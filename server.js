const express = require("express");
const socket = require("socket.io");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

const server = app.listen("8080", () => {
  console.log("Server Running on Port 8080...");
});

const eventsController = require("./controllers/eventsController"); 

const categoryController = require("./controllers/categoriesController")

const userController = require("./controllers/usersController")
const roomsController = require("./controllers/roomsController")
const friendsController = require("./controllers/friendsController");
const { getAllMessages, sendMessage } =  require("./queries/Messages")
// MIDDLEWARE
// app.use(cors());
// app.use(express.json());

const { makeNewRoom } = require("./queries/rooms");

// ROUTES
app.get('/', (req, res) => {
    // res.send('Welcome to Team 2 - Capstone Project')
    res.json({ message: 'Welcome to Team 2 - Capstone Project'})
});

app.use("/events", eventsController);

app.use("/category", categoryController)

app.use("/users", userController)

app.use("/friends", friendsController)

app.use("/rooms", roomsController);


app.get('*', (req, res) => {
    res.status(404).send('Not Found')
});


// io = socket(server);
const io = require("socket.io")(server, {
	cors: {
	  origin: "http://localhost:3000",
	  methods: ["GET", "POST"],
	  allowedHeaders: ["my-custom-header"],
	  credentials: true
	}
  });

  io.on("connection", (socket) => {
    console.log(socket.id);
    console.log("a user connected");
  
    socket.on("switch_room", (roomId) => {
      socket.leaveAll(); // Leave the current room
      socket.join(roomId); // Join the new room
    });
  
    socket.on("create_room", async (data) => {
      // Extract user1Id and user2Id from data
      const { user1_id, user2_id } = data;
  
      try {
        // Save message and create new room if needed
        const newMessage = await sendMessage(null, user1_id, user2_id, "New conversation");
  
        if (newMessage.rooms_id === null) {
          const newRoom = await makeNewRoom(user1_id, user2_id);
          newMessage.rooms_id = newRoom.id;
        }
  
        // Emit the new room and message to the appropriate users
        socket.to(`user_${user1_id}`).emit("new_room_created", newMessage);
        socket.to(`user_${user2_id}`).emit("new_room_created", newMessage);
      } catch (error) {
        console.log(error);
      }
    });
  
    socket.on("send_message", async (data) => {
      try {
        const { roomId, user1_id, user2_id, content } = data;
        
        const newMessage = await sendMessage(roomId, user1_id, user2_id, content);
        
        // Broadcast the new message to the room
        io.to(roomId).emit("receive_message", newMessage);
      } catch (error) {
        console.log(error);
      }
    });
  
    socket.on("disconnect", () => {
      console.log("USER DISCONNECTED");
    });
  });
  