import React from 'react';
import ReactDOM from 'react-dom/client';
import { Rnd } from 'react-rnd';
import {io} from 'socket.io-client';
import './index.css';
import battlemap from './map.jpg';
import { MdMap, MdAddCircle, MdGridOn, MdControlPoint, MdSend } from 'react-icons/md';
import { TiDelete } from 'react-icons/ti';
import { FaTrashAlt } from 'react-icons/fa';

class Table extends React.Component {

    //constructor, required room 'code'
    constructor(props){
        super(props);
        const socket = io('http://localhost:8080')
        socket.on('connect', () => {
            console.log(socket.id);
        });
        socket.on("code",(data) => (this.setState({code:data})));
        socket.on('connect_error', ()=>{
        setTimeout(()=>socket.connect(),5000)});
        socket.on('disconnect',()=>console.log('disconnected'));
        this.state = {
            socket: socket,
            code: '',
            map: battlemap,
            appear: false,
            tokens: [],
            tstyle: 'token-hello',
            grid: true,
            width: 0,
            height: 0,
            messages: [],
            newMessage: '',
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
    }
    
    //prenvent default behaviour when dragging an image
    preventDragHandler = (e) =>{
        e.preventDefault(); 
    }

    //render the map
    renderMap = () =>{
        return (
            <Rnd
            default={{
                x: 50,
                y: 0,
                width: 1000,
            }}
            onDragStart={this.preventDragHandler}
            lockAspectRatio={true}
            onDrag={e => {
                e.stopImmediatePropagation();
            }}
            >
                <img src={this.state.map} alt='map' style={{width: '100%'}}/>
                {this.renderTokens()}
            </Rnd>
        );
    }

    //render the actions menu
    renderActions = () =>{
        if(this.state.appear === true){
            return (
                <div className='popup DM'>
       
                   <label title='Upload Map' htmlFor='uploadMap'>
                       <MdMap />
                       <input type="file" id="uploadMap" style={{display:'none'}} onChange={(e) => {
                           try{
                               this.setState({map: URL.createObjectURL(e.target.files[0])});
                           } catch {
                                console.log('Error');
                           }
                       }}/>
                   </label><br/>
       
                   <label title='Upload Token' htmlFor='uploadToken'>
                       <MdAddCircle />
                       <input type="file" id="uploadToken" style={{display:'none'}} onChange={(e) => {
                           let arr = this.state.tokens;
                           arr.push(URL.createObjectURL(e.target.files[0]));
                           this.setState({tokens: arr});
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
                </div>
               );
        }
        else {
            return (<div></div>);
        }    
    }

    //render the tokens
    renderTokens = () =>{
        //TODO: generate unique key for each token
        return this.state.tokens.map((token, index) =>
            <Rnd
            default={{
                x: 30,
                y: 30,
                width: 50,
            }}
            lockAspectRatio={1}
            onDragStart={this.preventDragHandler}
            minHeight={30}
            minWidth={30}
            className={this.state.tstyle}
            onDrag={e => {
                e.stopImmediatePropagation();
            }}
            >
                <div className='token-X' key={index} onDoubleClick={() => {
                    this.setState({tstyle: 'token-bye'});
                }}
                ><TiDelete/></div>
                <img src={token} key={index+200} alt="token" style={{height: '100%', width:'100%'}} />
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
            let cellSize = 50;
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
            const updatedMessages = [...this.state.messages, this.state.newMessage];
            this.setMessages(updatedMessages);
            this.setNewMessage('');
            this.state.socket.emit('message', {code: this.state.code, message: temp});
        }
    }

    renderChat = () => {
        return (
            <div className="over chat">
                  <div className="chatHistory">
                      {this.state.messages.map((message, index) => (
                          <div key={index} className="chatHistory">
                              {message}
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

    //render the table
    render() {
        return (
            <div>
                <div className='for-grid'>
                    {this.renderGrid()}
                </div>
                {this.renderMap()}
                {this.renderCommands()}
                {this.renderChat()}
                {this.renderCode()}
            </div>
        );
    }
}

function Home() {
    return (
        <div className='container'>
            <div className='container window'>
                <button className='btn' type='submit' onClick={() => {
                    root.render(<Table />);
                    /*
                    
                    fetch('http://localhost:8080/create', { method: 'POST' })
                    .then(response => response.json())
                        .then((response) => {
                            if(response.ok){
                                console.log('Code generated: ' + response.code);
                                root.render(<Table code={response.code}/>);
                            }
                    });
                    
                    */
                }}>
                    Create
                </button>
                <button className='btn'>Join</button>
                <form action='http://localhost:8080/post' method='post'>
                    <button className='btn' type='submit'>Test connectivity</button>
                </form>
            </div>
        </div>
    );
}

//====================================================================================================

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <Home />
);