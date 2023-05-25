const express = require("express");

const socketIo = require("socket.io");
const http = require("http");
const PORT = process.env.PORT || 8080;

const app = express();
const server = http.createServer(app);
const cors = require("cors");

const io = socketIo(server,{
  cors: {
    origin: "http://localhost:3000",
  }
});

app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(cors());

const rooms = [];

function createRoom(code){
  const room = {
    code: code,
    users: [],
  }
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

//broadcast message to all users in room
function broadcastRoom(code, message){
  const room = getRoom(code);
  for (let i = 0; i < room.users.length; i++) {
    console.log("sending message to: " + room.users[i].id);
    room.users[i].emit("message", message);
  }
}

io.on("connection",(socket)=>{

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
    rooms.push(createRoom(code));
    getRoom(code).users.push(socket);
    //send code to client
    socket.emit("code",code);
  });

  socket.on("join",(data)=>{
    console.log("client trying to join in room: ", data.code);
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
      console.log("message recieved: " + data.message);
      broadcastRoom(data.code, data);
  });

})

io.on('message', (data) => {
  console.log("message recieved: " + data.message);
});

server.listen(PORT, err=> {
  if(err)
    console.log(err);
  console.log("Server running on Port", PORT);
})