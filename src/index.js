import React from 'react';
import ReactDOM from 'react-dom/client';
import { Rnd } from 'react-rnd';
import './index.css';
import battlemap from './map.jpg';
import { MdMap, MdAddCircle, MdGridOn, MdControlPoint } from 'react-icons/md';
import { TiDelete } from 'react-icons/ti';
import { FaTrashAlt } from 'react-icons/fa';

class Table extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            code: props,
            map: battlemap,
            actions: '',
            appear: true,
            tokens: [],
            tstyle: 'token-hello',
            grid: false
        };
    }

    //prenvent default behaviour when dragging an image
    preventDragHandler(e){
        e.preventDefault(); 
    }

    renderActions(){
        return (
         <div className='popup DM'>
            <label title='Upload Map' htmlFor='uploadMap'>
                <MdMap />
                <input type="file" id="uploadMap" style={{display:'none'}} onChange={(e) => {
                    try{
                        this.setState({map: URL.createObjectURL(e.target.files[0])});
                    } catch {

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

    renderTokens(){
        return this.state.tokens.map((token) =>
            <Rnd
            default={{
                x: 30,
                y: 30,
                width: 50,
            }}
            lockAspectRatio={true} 
            onDragStart={this.preventDragHandler}
            minHeight={30}
            minWidth={30}
            className={this.state.tstyle}
            onDrag={e => {
                e.stopImmediatePropagation();
            }}
            >
                <div className='token-X' onDoubleClick={() => {
                    this.setState({tstyle: 'token-bye'});
                }}
                ><TiDelete/></div>
                <img src={token} key={(token)} alt="token" style={{height: '100%', width:'100%'}} />
            </Rnd>
        );
    }

    renderMap(){
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
                <img src={this.state.battleMap} alt='map' style={{width: '100%'}}/>
                {this.renderTokens()}
            </Rnd>
        );
    }

    renderGrid(){
        if(this.state.grid){
            const grid = [];
            let cellSize = 50;
            let numRows = 5000/cellSize;
            let numCols = 5000/cellSize;
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

    renderCommands(){
        return (
            <div className="over command">
                <span className='alwaysClickable' onClick={this.handleClick()}>
                    <MdControlPoint />
                </span>
                {this.state.actions}
            </div>
        );
    }

    handleClick(){
        if(this.state.appear === true) {
            this.setState({appear: false, actions: this.renderActions()});
        } else {
            this.setState({appear: true, actions: ''});
        }
    }

    renderChat = () =>{
        return (
            <div className="over chat">
            </div>
        );
    }

    render() {
        return (
            <div>
                <div className='for-grid'>
                    {this.renderGrid()}
                </div>
                {this.renderMap()}
                {this.renderCommands()}
                {this.renderChat()}
            </div>
        );
    }
}


function Home() {
    return (
        <div className='container'>
            <div className='container window'>
                    <button className='btn' type='submit' onClick={() => {
                        fetch('../../create', { method: 'POST' })
                        .then(response => response.json())
                            .then((response) => {
                                if(response.ok){
                                    console.log('Code generated: ' + response.code);
                                    root.render(<Table code={response.code}/>);
                                }
                        });
                    }}>Create</button>
                <button className='btn'>Join</button>
                <form action='../../post' method='post'>
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