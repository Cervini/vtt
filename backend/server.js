//imports
const express = require("express");
const http = require("http");
const PORT = process.env.PORT || 8080;
const app = express();
const server = http.createServer(app);
const socketIo = require("socket.io")(server,{
  cors: {
    origin: "http://localhost:3000",
  },
  maxHttpBufferSize: 1e8
});
const cors = require("cors");

app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(cors());

//set array containing all rooms
const rooms = [];

//createRoom creates a room object with its own code and an array of users
function createRoom(code, socket){
  const room = {
    code: code,
    users: [],
  }
  //add the socket that created the room to the users array
  room.users.push(socket);
  return room;
}

//getRoom returns the room object with the given code
function getRoom(code){
  for (let i = 0; i < rooms.length; i++) {
    if (rooms[i].code == code) {
      return rooms[i];
    }
  }
  return null;
}

//checkCode checks if a room with the given code exists
function checkCode(code){
  for (let i = 0; i < rooms.length; i++) {
    if (rooms[i].code == code){
      return true;
    }
  }
  return false;
}

//broadcast to all users in room using 'type' emit the data
function broadcast(code, data, type){
  const room = getRoom(code);
  try {
    for (let i = 0; i < room.users.length; i++) {
      room.users[i].socket.emit(type, data);
    }
  } catch(e) {
    console.log(e);
  }
}

//socketIo.on listens for events from the client
socketIo.on("connection",(socket)=>{

  //log when a client connects
  console.log("client connected: ", socket.id);

  //if the user is creating a room
  socket.on("create",()=>{
    let code;
    //generate code
    do{
      //repeat if code already exists
      code = Math.floor(Math.random() * 1000000);
      console.log("Generated code " + code);
    }while(checkCode(code));
    //create room and add it to the rooms array
    const user = {
      socket: socket,
      role: "DM",
    }
    rooms.push(createRoom(code, user));
    //send code to client
    socket.emit("code",code);
  });

  //if the user is joining a room
  socket.on("join",(data)=>{
    //check if room exists
    if(checkCode(data.code)){
      const user = {
        socket: socket,
        role: "Player",
      }
      //add user to room
      getRoom(data.code).users.push(user);
      //send code to client
      socket.emit("code",data.code);
      //send message to all users in room
      const announcement = {
        message: "A new adventurer joined the party.",
        usename: "",
      }
      broadcast(data.code, announcement, "message");

      //look for DM in room
      for (let i = 0; i < getRoom(data.code).users.length; i++) {
        if(getRoom(data.code).users[i].role == "DM"){
          //send to the DM the command to update the newly joined player
          const socket = {
            id: user.socket.id,
          }
          getRoom(data.code).users[i].socket.emit("state", socket);
        }
      }
    }
    else{
      //send error to client
      socket.emit("error","Room does not exist");
    }
  });

  socket.join(socket.id+"-room");

  //on disconnect log the reason
  socket.on("disconnect",(reason)=>{
    console.log(reason);
  });

  //on message send the message to all users in the room if it is not a command
  socket.on("message",(data)=>{

    if(data.message[0] == "/"){
      //if the message is a command parse it
      const parsed = data.message.split(" ");

      switch(data.message[1]){
        case "d":{
          //if the command is a dice roll
          const result = Math.floor(Math.random() * parsed[1]) + 1;
          //build the message
          const announcement = {
            message: data.username + " rolled a " + result + " on a d" + parsed[1],
            usename: "",
          }
          if((parsed[2] == "+") && parsed[3]){
            announcement.message += " + " + parsed[3];
          }
          //send message to all users in room
          broadcast(data.code, announcement, "message");
        }
      }
    } else {
      //if the message is not a command send it to all users in room
      broadcast(data.code, data, "message");
    }
  });

  //send the data to all users in room
  socket.on("map", (data) => {
    broadcast(data.code, data, "map");
  });

  socket.on("update", (data) => {
    if(!data.id){
      //if the update contains no id send it to all users in room
      broadcast(data.code, data, "update");
    } else {
      //if the update contains an id send it to the user with that id
      for(let i = 0; i < getRoom(data.code).users.length; i++){
        if(getRoom(data.code).users[i].socket.id == data.id){
          getRoom(data.code).users[i].socket.emit("update", data);
        }
      }
    }
  });

  //send the data to all users in room
  socket.on("grid", (data) => {
    broadcast(data.code, data, "grid");
  });


  socket.on("token", (data) => {
    if(!data.id){
      //if the token contains no id send it to all users in room
      broadcast(data.code, data, "token");
    } else {
      //if the token contains an id send it to the user with that id
      for(let i = 0; i < getRoom(data.code).users.length; i++){
        if(getRoom(data.code).users[i].socket.id == data.id){
          console.log("sending token to " + getRoom(data.code).users[i].socket.id);
          getRoom(data.code).users[i].socket.emit("token", data);
        }
      }
    }
  });

  //send the data to all users in room
  socket.on("delete", (data) => {
    broadcast(data.code, data, "delete");
  });
  
  //send the data to all users in room
  socket.on("resize", (data) => {
    broadcast(data.code, data, "resize");
  });

});

//start server
server.listen(PORT, err=> {
  if(err)
    console.log(err);
  console.log("Server running on Port", PORT);
})