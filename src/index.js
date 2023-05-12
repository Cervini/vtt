import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';


class Table extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            code: props
        };
    }

    render() {
        return (
            <div className='container'>
                
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