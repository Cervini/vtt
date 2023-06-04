import React from 'react';
import ReactDOM from 'react-dom/client';
import { Rnd } from 'react-rnd';
import {io} from 'socket.io-client';
import './index.css';
import battlemap from './map.jpg';
import { MdMap, MdAddCircle, MdGridOn, MdControlPoint, MdSend } from 'react-icons/md';
import { FaTrashAlt } from 'react-icons/fa';
import { RiUserSettingsLine } from 'react-icons/ri';


const ADDRESS = 'http://localhost:8080';

class Table extends React.Component {

    //constructor required room 'code'
    constructor(props){
        super(props);
        let socket, username, role;
        if(this.props.type === 'create'){
            //room creation routine
            socket = io(ADDRESS);
            socket.on('connect', () => {
                console.log(socket.id);
                socket.emit('create', {});
            });
            username = 'DM';
            role = 'DM';
        } else {
            //room joining routine
            socket = io(ADDRESS);
            socket.on('connect', () => {
                console.log(socket.id);
                socket.emit('join', {code: this.props.code});
            });
            username = 'Adventurer';
            role = 'Player';
        }

        //socket event listeners
        socket.on('message', (data) => {
            const tMessage = {
                username: data.username,
                message: data.message
            }
            const updatedMessages = [...this.state.messages, tMessage];
            this.setMessages(updatedMessages);
        });

        //set room code when received from server
        socket.on('code',(data) => (this.setState({code:data})));

        socket.on('command', (data) => {
            switch(data.command){
                case 'share': {
                    console.log('share command received');
                    let image;
                    //find the map in the files array
                    for(let i = 0; i < this.state.files.length; i++){
                        if(this.state.files[i].type === 'map'){
                            image = this.state.files[i].file;
                        }
                    }
                    //build file data object
                    const fileData = {
                        code: this.state.code,
                        file: image,
                    }
                    // Emit the file data to the server through the socket
                    this.state.socket.emit('map', fileData);
                    break;
                }
                default: {
                    console.log('Unknown command');
                }
            }
        });

        socket.on('update', (data) => {
            this.updatePosition(data.x, data.y, data.key);
        });

        //error handling
        socket.on('connect_error', ()=>{
            setTimeout(()=>socket.connect(),5000);
        });

        //print message to console when disconnected
        socket.on('disconnect',()=>console.log('disconnected'));

        //set map when received from server
        socket.on('map', (data) => {
            const blobby = new Blob([data], {type: 'image/jpeg'});
            console.log(blobby);
            this.setState({map: URL.createObjectURL(blobby)});
        });

        socket.on('token', (data) => {
            const blobby = new Blob([data], {type: 'image/jpeg'});
            console.log(blobby);
            let arr = this.state.tokens;
            const element = {
                token: URL.createObjectURL(blobby),
                key: arr.length,
                x: 0,
                y: 0,
            }
            arr.push(element);
            this.setState({tokens: arr});
        });
        
        this.state = {
            socket: socket,
            role: role,
            code: '',
            map: battlemap,
            appear: false,
            usermenu: false,
            tokens: [],
            grid: true,
            username: username,
            width: 0,
            height: 0,
            messages: [],
            newMessage: '',
            files: [],
            };
        this.updateWindowDimensions = this.updateWindowDimensions.bind(this);
    }
    
    //when component mounts, add event listener for window resize
    componentDidMount = () =>{
        this.updateWindowDimensions();
        window.addEventListener('resize', this.updateWindowDimensions);
    }
    
    //when component unmounts, remove event listener for window resize
    componentWillUnmount = () =>{
        window.removeEventListener('resize', this.updateWindowDimensions);
        //clearInterval(this.state.interval);
    }

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
                <img src={this.state.map} draggable={false} key={'map'} alt='map' style={{width: '100%'}}/>
                {this.renderTokens()}
            </div>
        );
    }

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

                    <label title='Upload Map' htmlFor='uploadMap'>
                        <MdMap />
                        <input type="file" id="uploadMap" style={{display:'none'}} onChange={(e) => {
                            try{
                                //create blob from file
                                const image = new Blob([e.target.files[0]], {type: 'image/jpeg'});
                                this.setState({ map: URL.createObjectURL(image) });
                                //build file data object
                                const fileData = {
                                    code: this.state.code,
                                    file: image,
                                }
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
                                //build file data object
                                const fileData = {
                                    code: this.state.code,
                                    file: token_image,
                                }
                                // Emit the file data to the server through the socket
                                this.state.socket.emit('token', fileData);
                            } catch (err) {
                                console.log(err);
                            }




                        }}/>
                    </label><br/>

                    <div title='Toggle Grid' id='drawGrid' onClick={() => {
                            if(this.state.grid){
                                this.setState({grid: false});
                            } else {
                                this.setState({grid: true});
                            }
                    }}>
                        <MdGridOn />
                    </div>

                    <div title='Clear Room' id="clearRoom" onClick={() => {
                        this.setState({map: battlemap, tokens: []});
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
                width: 50,
            }}
            lockAspectRatio={true}
            onDragStart={this.preventDragHandler}
            minHeight={30}
            minWidth={30}
            className={this.state.tstyle}
            onDrag={e => {
                e.stopImmediatePropagation();
                console.log()
            }}
            onDragStop={(d) => {
                const string = document.getElementById("rnd-"+token.key).style.transform;
                let filtered = /translate\((-?\d+)px, (-?\d+)px\)/;
                let arr = string.match(filtered);
                const x = parseInt(arr[1]);
                const y = parseInt(arr[2]);
                const update = {
                    x: x,
                    y: y,
                    key: token.key,
                    code: this.state.code,
                }
                this.state.socket.emit('update', update);
            }}
            key={"rnd-"+token.key}
            id={"rnd-"+token.key}
            >
                <img src={token.token} key={token.key} alt="token" style={{height: '100%', width:'100%'}} />
            </Rnd>
        );
    }

    //update the window dimensions
    updateWindowDimensions = () =>{
        this.setState({ width: window.innerWidth, height: window.innerHeight });
    }

    //render the grid
    renderGrid = () =>{
        if(this.state.grid){
            const grid = [];
            let cellSize = 30;
            //get the height and width of the window to minimize the number of cells rendered
            let numRows = this.state.height/cellSize;
            let numCols = this.state.width/cellSize;
            for (let row = 0; row < numRows; row++) {
                for (let col = 0; col < numCols; col++) {
                    const cellStyle = {
                    top: row * cellSize,
                    left: col * cellSize,
                    width: cellSize,
                    height: cellSize,
                    border: '1px solid grey',
                    position: 'absolute',
                    boxSizing: 'border-box'
                    };
                    grid.push(<div style={cellStyle} key={`${row}-${col}`} />);
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

    setMessages = (messages) => {
        this.setState({messages: messages});
    }

    setNewMessage = (newMessage) => {
        this.setState({newMessage: newMessage});
    }

    handleInputChange = (event) => {
        this.setNewMessage(event.target.value);
    }

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

    //render the table
    render() {
        return (
            <div className='container'>
                <div className='for-grid'>
                    {this.renderGrid()}
                </div>
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