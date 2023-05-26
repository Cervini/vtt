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
    if (rooms[i].code == code) {
      return true;
    }
  }
  return false;
}

function broadcast(code, data, type){
  const room = getRoom(code);
  try {
    console.log(room.users.length + " users in room " + code);
    for (let i = 0; i < room.users.length; i++) {
      room.users[i].emit(type, data);
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
    rooms.push(createRoom(code, socket));
    //send code to client
    socket.emit("code",code);
  });

  socket.on("join",(data)=>{
    //check if room exists
    if(checkCode(data.code)){
      //add user to room
      getRoom(data.code).users.push(socket);
      //send code to client
      socket.emit("code",data.code);
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
    broadcast(data.code, data, "message");
  });

  socket.on("map",(data)=>{
    console.log("map changed: " + data);
    broadcast(data.code, data.map, "map");
  });

})

server.listen(PORT, err=> {
  if(err)
    console.log(err);
  console.log("Server running on Port", PORT);
})