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

const rooms = [];

function createRoom(code, socket){
  const room = {
    code: code,
    users: [],
  }
  room.users.push(socket);
  return room;
}

function getRoom(code){
  for (let i = 0; i < rooms.length; i++) {
    if (rooms[i].code == code) {
      return rooms[i];
    }
  }
  return null;
}

function checkCode(code){
  for (let i = 0; i < rooms.length; i++) {
    if (rooms[i].code == code){
      return true;
    }
  }
  return false;
}

//broadcast to all users in room using 'type' emit
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

socketIo.on("connection",(socket)=>{

  console.log("client connected: ", socket.id);

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

      /*
      //send command to the first client connected to share the room state
      const command = {
        command: "share",
      }
      for(let i = 0; i < getRoom(data.code).users.length; i++){
        if(getRoom(data.code).users[i].role == "DM"){
          getRoom(data.code).users[i].socket.emit("command", command);
          break;
        }
      }
      */

    }
    else{
      //send error to client
      socket.emit("error","Room does not exist");
    }
  });

  socket.join(socket.id+"-room");

  socket.on("disconnect",(reason)=>{
    console.log(reason);
  });

  socket.on("message",(data)=>{
    
    if(data.message[0] == "/"){
      //if the message is a command parse it
      const parsed = data.message.split(" ");

      switch(data.message[1]){
        case "d":{
          //if the command is a dice roll
          const result = Math.floor(Math.random() * parsed[1]) + 1;
          const announcement = {
            message: data.username + " rolled a " + result + " on a d" + parsed[1],
            usename: "",
          }
          if((parsed[2] == "+") && parsed[3]){
            announcement.message += " + " + parsed[3];
          }
          broadcast(data.code, announcement, "message");
        }
      }
    } else {
      broadcast(data.code, data, "message");
    }
  });

  /*
  socket.on("map",(data)=>{
    console.log("map: " + toString(data.file));
    broadcast(data.code, data.file, "map");
  });*/

  socket.on("map", (data) => {
    const imageData = data.file;
    broadcast(data.code, imageData, "map");
  });

})

server.listen(PORT, err=> {
  if(err)
    console.log(err);
  console.log("Server running on Port", PORT);
})