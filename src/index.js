//imports
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Rnd } from 'react-rnd';
import {io} from 'socket.io-client';
import './index.css';
import battlemap from './map.jpg';
import { MdMap, MdAddCircle, MdGridOn, MdControlPoint, MdSend } from 'react-icons/md';
import { FaTrashAlt } from 'react-icons/fa';
import { RiUserSettingsLine } from 'react-icons/ri';

const img = React.createRef();
const ADDRESS = 'http://localhost:8080';
//locally memorized map and token files
let mapFile, tokenFiles = [];

class Table extends React.Component {

    constructor(props){
        super(props);
        let socket, username, role;
        if(this.props.type === 'create'){
            //if the type is create, create a new room
            //room creation routine
            socket = io(ADDRESS);
            //connect to server
            socket.on('connect', () => {
                socket.emit('create', {});
            });
            //set username and rola as DM
            username = 'DM';
            role = 'DM';
        } else {
            //if the type is join, join an existing room
            //room joining routine
            socket = io(ADDRESS);
            socket.on('connect', () => {
                socket.emit('join', {code: this.props.code});
            });
            //set username as Adventurer and role as Player
            username = 'Adventurer';
            role = 'Player';
        }

        //socket event listeners
        socket.on('message', (data) => {
            //create the message object
            const tMessage = {
                username: data.username,
                message: data.message
            }
            //add the message to the messages array
            const updatedMessages = [...this.state.messages, tMessage];
            this.setMessages(updatedMessages);
        });

        //set room code when received from server
        socket.on('code',(data) => (this.setState({code:data})));

        //error handling
        socket.on('connect_error', ()=>{
            setTimeout(()=>socket.connect(),5000);
        });

        //print message to console when disconnected
        socket.on('disconnect',()=>console.log('disconnected'));

        //set map when received from server
        socket.on('map', (data) => {
            const blobby = new Blob([data.file], {type: 'image/jpeg'});
            this.setState({map: URL.createObjectURL(blobby)});
        });

        //add token and update token position when received from server
        socket.on('token', (data) => {
            const blobby = new Blob([data.file], {type: 'image/jpeg'});
            let arr = this.state.tokens;
            console.log(data.key);
            const element = {
                token: URL.createObjectURL(blobby),
                key: data.key,
                x: 0,
                y: 0,
                w: data.w,
                h: data.h,
            }
            arr.push(element);
            this.setState({tokens: arr});
        });

        //update grid size when received from server
        socket.on('grid', (data) => {
            this.setState({cellSize: data.cellSize});
        });

        //start the update routine when 'state' command received from server
        socket.on('state', (data) => {
            const id = data.id;
            // Emit the mapFile (stored locally when the map was uploaded)
            if(mapFile){
                // Emit only if the map was changed from the default one
                const dataFile = {
                    code: this.state.code,
                    file: mapFile,
                };
                this.state.socket.emit('map', dataFile);
            }
            for(let i=0; i < tokenFiles.length; i++){
                //emit the token files stored locally
                tokenFiles[i].id = id;
                this.state.socket.emit('token', tokenFiles[i]);
            }
            for(let i=0; i < this.state.tokens.length; i++){
                //emit the token positions and token sizes
                const update = {
                    x: this.state.tokens[i].x,
                    y: this.state.tokens[i].y,
                    w: this.state.tokens[i].w,
                    h: this.state.tokens[i].h,
                    key: this.state.tokens[i].key,
                    code: this.state.code,
                    id: id,
                }
                this.state.socket.emit('update', update);
            }
            this.state.socket.emit('grid', {code: this.state.code, cellSize: this.state.cellSize});
        });

        //delete token when received from server
        socket.on('delete', (data) => {
            console.log("delete token");
            for(let i = 0; i < this.state.tokens.length; i++){
                if(this.state.tokens[i].key === data.key){
                    this.deleteToken(data.key);
                    break;
                }
            }
            for(let i=0; i < tokenFiles.length; i++){
                if(tokenFiles[i].key === data.key){
                    tokenFiles.splice(i, 1);
                    break;
                }
            }
        });

        //update token position when received from server
        socket.on('update', (data) => {
            this.updatePosition(data.x, data.y, data.key);
        });

        //resize token when received from server
        socket.on('resize' , (data) => {
            for(let i = 0; i < this.state.tokens.length; i++){
                const arr = this.state.tokens;
                if(arr[i].key === data.key){
                    arr[i].w = data.w;
                    arr[i].h = data.h;
                }
                this.setState({tokens: arr});
            }
            for(let i=0; i<tokenFiles.length; i++){
                if(tokenFiles[i].key === data.key){
                    tokenFiles[i].w = data.w;
                    tokenFiles[i].h = data.h;
                }
            }
        });

        this.state = {
            socket: socket,
            role: role,
            code: '',
            map: battlemap,
            appear: false,
            usermenu: false,
            tokens: [],
            tmenu: false,
            grid: true,
            username: username,
            messages: [],
            newMessage: '',
            height: 570,
            width: 1500,
            cellSize: 50,
        };
    }

    //update the position of a token given coordinates and the token id
    updatePosition = (x, y, id) => {
        for(let i = 0; i < this.state.tokens.length; i++){
            if(this.state.tokens[i].key === id){
                let arr = this.state.tokens;
                arr[i].x = x;
                arr[i].y = y;
                this.setState({tokens: arr});
                break;
            }
        }
    };
    
    //prenvent default behaviour when dragging an image
    preventDragHandler = (e) =>{
        e.preventDefault(); 
    }

    //render the map
    renderMap = () =>{
        return (
            <div className='map-container'>
                <div className='for-grid'>
                    {this.renderGrid()}
                </div>
                <img src={this.state.map} draggable={false} key={'map'} alt='map' className='battlemap' ref={img} onLoad={() => {
                    this.setState({
                        height: img.current.clientHeight,
                        width: img.current.clientWidth,
                    });
                }}/>
                {this.renderTokens()}
            </div>
        );
    }

    //toggle the user menu
    toggleUserMenu = () =>{
        if(this.state.usermenu){
            this.setState({usermenu: false});
        } else {
            this.setState({usermenu: true});
        }
    }

    //render the actions menu
    renderActions = () =>{
        if(this.state.appear === true){
            if(this.state.role === 'DM'){
                return (
                    <div className='popup DM'>

                    <div className="iconButton"></div>

                    <label title='Upload Map' htmlFor='uploadMap'>
                        <MdMap />
                        <input type="file" id="uploadMap" style={{display:'none'}} onChange={(e) => {
                            try{
                                //create blob from file
                                const image = new Blob([e.target.files[0]], {type: 'image/jpeg'});
                                //set map
                                this.setState({ map: URL.createObjectURL(image) });
                                //build file data object
                                const fileData = {
                                    code: this.state.code,
                                    file: image,
                                }
                                //copy file to local memory
                                mapFile = image;
                                // Emit the file data to the server through the socket
                                this.state.socket.emit('map', fileData);
                            } catch (err) {
                                console.log(err);
                            }
                        }}/>
                    </label><br/>

                    <label title='Upload Token' htmlFor='uploadToken'>
                        <MdAddCircle />
                        <input type="file" id="uploadToken" style={{display:'none'}} onChange={(e) => {
                            try{
                                //create blob from file
                                const token_image = new Blob([e.target.files[0]], {type: 'image/jpeg'});
                                //generate token key
                                const time = new Date();
                                const token_key = "k"+this.state.code.toString()+time.getTime().toString();
                                //build file data object
                                console.log("rnd-"+token_key);
                                const fileData = {
                                    code: this.state.code,
                                    file: token_image,
                                    key: token_key,
                                    w: this.state.cellSize,
                                    h: this.state.cellSize,
                                    id: null,
                                }
                                tokenFiles.push({
                                    code: this.state.code,
                                    file: token_image,
                                    key: token_key,
                                    w: this.state.cellSize,
                                    h: this.state.cellSize,
                                    id: null,
                                });
                                // Emit the file data to the server through the socket
                                this.state.socket.emit('token', fileData);
                            } catch (err) {
                                console.log(err);
                            }
                        }}/>
                    </label><br/>

                    <div className='container grid'>
                        <MdGridOn  title='Toggle Grid' id='drawGrid' onClick={() => {
                            //toggle grid
                            if(this.state.grid){
                                this.setState({grid: false});
                            } else {
                                this.setState({grid: true});
                            }
                        }}/>
                        <input title="Grid Size" type="range" className="gridSize" orient="vertical" id="sizeGrid" min="10" max="250" value={this.state.cellSize} onChange={(e) => {
                            //change grid size
                            this.setState({cellSize: e.target.value});
                            //emit changes to server
                            this.state.socket.emit('grid', {code: this.state.code, cellSize: e.target.value});
                        }}></input>
                    </div>

                    <div title='Clear Room' id="clearRoom" onClick={() => {
                        this.setState({map: battlemap, tokens: []});
                        tokenFiles = [];
                        mapFile = null;
                    }}>
                        <FaTrashAlt />
                    </div>

                    <div title='User settings' id="settings" onClick={() => {this.toggleUserMenu()} }>
                        <RiUserSettingsLine />
                    </div>
                    </div>
                );
            }else{
                return (
                <div className='popup DM'>
                    <div title='User settings' id="settings" onClick={() => {this.toggleUserMenu()} }>
                        <RiUserSettingsLine />
                    </div>
                </div>
                );
            }
        }
        else {
            return (<div></div>);
        }    
    }

    //render the tokens
    renderTokens = () =>{
        return this.state.tokens.map((token) =>
            <Rnd
            position={{ x: token.x, y: token.y }}
            default={{
                width: token.w,
                height: token.h,
            }}
            size={{ width: token.w, height: token.h }}
            lockAspectRatio={true}
            onDragStart={this.preventDragHandler}
            minHeight={30}
            minWidth={30}
            className={this.state.tstyle}
            onDrag={e => {
                e.stopImmediatePropagation();
            }}
            onDragStop={(d) => {
                //get the changes by the changing CSS
                const string = document.getElementById("rnd-"+token.key).style.transform;
                //filter the string to get the x and y values
                let filtered = /translate\((-?\d+)px, (-?\d+)px\)/;
                let arr = string.match(filtered);
                const x = parseInt(arr[1]);
                const y = parseInt(arr[2]);
                //update the token position
                token.x = x;
                token.y = y;
                //emit the changes to the server
                const update = {
                    x: x,
                    y: y,
                    key: token.key,
                    code: this.state.code,
                }
                this.state.socket.emit('update', update);
            }}
            onResizeStop={(e, dir, ref, delta, position) => {
                token.w += delta.width;
                token.h += delta.height;
                const resize = {
                    w: token.w,
                    h: token.w,
                    key: token.key,
                    code: this.state.code,
                }
                console.log("sending: " + resize.w + " " + resize.h);
                this.state.socket.emit('resize', resize);
            }}
            key={"rnd-"+token.key}
            id={"rnd-"+token.key}
            onClick={() => {
                this.toggleTokenMenu(token.key);
            }}
            >
                <img src={token.token} key={token.key} alt="token" style={{height: '100%', width:'100%'}} />
            </Rnd>
        );
    }

    //toggle the token menu
    toggleTokenMenu = (key) => {
        console.log("token toggled");
        if(this.state.tmenu === key){
            this.setState({tmenu: false});
        } else {
            this.setState({tmenu: key});
        }
    }

    renderTokenMenu = () => {
        if(this.state.tmenu!==false){
            return (
                <div className='over container lateral'>
                    <button className='btn mini' type='submit' onClick={() => {
                        this.deleteToken(this.state.tmenu);
                        this.setState({tmenu: false});
                    }}>Delete</button>
                </div>
            );
        } else {
            return null;
        }
        
    }

    //update the window dimensions
    updateWindowDimensions = () =>{
        this.setState({ width: window.innerWidth, height: window.innerHeight });
    }

    //render the grid
    renderGrid = () =>{
        if(this.state.grid){
            const grid = [];
            let numRows = this.state.height/this.state.cellSize;
            let numCols = this.state.width/this.state.cellSize;
            for (let row = 0; row < numRows; row++) {
                for (let col = 0; col < numCols; col++) {
                    const cellStyle = {
                    top: row * this.state.cellSize,
                    left: col * this.state.cellSize,
                    width: this.state.cellSize + "px",
                    height: this.state.cellSize + "px",
                    border: '1px solid grey',
                    position: 'absolute',
                    boxSizing: 'border-box',
                    };
                    grid.push(<div style={cellStyle} key={`${row}-${col}`}></div>);
                }
            }
            return grid;
        }
        else
            return null;
    }

    //render the commands menu
    renderCommands = () =>{
        return (
            <div className="over command">
                <span className="alwaysClickable" onClick={() => {
                    if(this.state.appear === true) {
                        //make the actions menu disappear
                        this.setState({appear: false});
                    } else {
                        this.setState({appear: true});
                    }
                }}>
                    <MdControlPoint />
                </span>
                {this.renderActions()}
            </div>
        );
    }

    //render the room code on top
    renderCode = () =>{
        return (
            <div className='over code'>
                <span>Room code: {this.state.code}</span>
            </div>
        );
    }

    //set messages state
    setMessages = (messages) => {
        this.setState({messages: messages});
    }

    //set newMessage state
    setNewMessage = (newMessage) => {
        this.setState({newMessage: newMessage});
    }

    //get typed message from input
    handleInputChange = (event) => {
        this.setNewMessage(event.target.value);
    }

    //send message to server
    handleSendMessage = () => {
        let temp = this.state.newMessage;
        if (this.state.newMessage.trim() !== '') {
            this.setNewMessage('');
            this.state.socket.emit('message', {
                code: this.state.code,
                username: this.state.username,
                message: temp,
                cmd: false
            });
        }
    }

    renderChat = () => {
        return (
            <div className="over chat">
                  <div className="chatHistory">
                      {this.state.messages.map((message, index) => (
                          <div key={index} className="chatHistory">
                               {message.username}: {message.message}
                          </div>
                      ))}
                  </div>
                  <div className="chatForm">
                      <input
                          className="chatText"
                          type="text"
                          value={this.state.newMessage}
                          onChange={this.handleInputChange}
                          placeholder="Write here..."
                      />
                      <button className="chatSend" onClick={this.handleSendMessage}><MdSend /></button>
                  </div>
            </div>
        );
    }

    renderUserMenu = () => {
        let username = '';
        if(this.state.usermenu){
            return (
                <div className='over container window'> 
                    <input type='text' placeholder='Write username' className='input' onChange={() => {
                        username = document.querySelector('.input').value;
                    }}/>
                    <button className='btn' type='submit' onClick={() => {
                        this.setState({username: username,
                            usermenu: false});

                    }}>Change Username</button>
                </div>
            );
        }
    }

    deleteToken = (key) => {
        let arr = this.state.tokens;
        for(let i = 0; i < arr.length; i++){
            if(arr[i].key === key){
                arr.splice(i, 1);
                break;
            }
        }
        this.setState({tokens: arr});
        this.state.socket.emit('delete', {code: this.state.code, key: key});
    }

    //render the table
    render() {
        return (
            <div className='container'>
                {this.renderTokenMenu()}
                {this.renderMap()}
                {this.renderCommands()}
                {this.renderChat()}
                {this.renderCode()}
                {this.renderUserMenu()}
            </div>
        );
    }
}

//====================================================================================================

function Join() {
    let roomCode = '';

    return (
        <div className='container'>
            <div className='container window'>
                <input type='text' placeholder='Room Code' className='input' onChange={() => {
                    roomCode = document.querySelector('.input').value;
                }}/>
                <button className='btn' type='submit' onClick={() => {
                    if(roomCode !== ''){
                        //render the table
                        root.render(<Table type='join' code={roomCode}/>);
                    }
                }}>Join</button>
                <button className='btn' type='submit' onClick={() => {
                    root.render(<Home />);
                }}>Back</button>
            </div>
        </div>
    );
}

function Home() {
    return (
        <div className='container'>
            <div className='container window'>
                <button className='btn' type='submit' onClick={() => {
                    root.render(<Table type='create'/>);
                }}>
                    Create
                </button>
                <button className='btn' type='submit' onClick={() => {
                    //render the join window
                    root.render(<Join />);
                }}>Join</button>
            </div>
        </div>
    );
}

//====================================================================================================

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <Home />
);