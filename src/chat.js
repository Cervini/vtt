import React, { useState } from 'react';
import { MdSend } from 'react-icons/md';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  const handleInputChange = (event) => {
    setNewMessage(event.target.value);
  };

  const handleSendMessage = () => {
    if (newMessage.trim() !== '') {
      const updatedMessages = [...messages, newMessage];
      setMessages(updatedMessages);
      setNewMessage('');
    }
  };

    //update the current state.message
   const handleTextareaChange = (event) => {
        this.setState({
            message: event.target.value
        });
    }

    //render the chat menu
    const renderChat = () =>{
        return (
            <div className="over chat">
                <div className="chatHistory">
                    {this.chatPrint()}
                </div>
                <form className="chatForm" onSubmit={this.handleMessageSubmit}>
                    <textarea className="chatText" placeholder="Write here..." name='message' onChange={this.handleTextareaChange}/>
                    <button className='chatSend' type='submit'><MdSend /></button>
                </form>
            </div>
        );
    }

    //print the chat
    const chatPrint = () =>{
        return (
            <div>
                {this.state.chat.map((mess) =>
                    <p className='chatMess'>{mess}</p>
                )}
            </div>
        );
    }

    const handleMessageSubmit = (event) => {
        event.preventDefault();
        this.sendMessage(this.state.message);
    }

    const sendMessage = (msg) => {
        fetch('http://localhost:8080/chat', { 
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                code: this.state.code,
                message: msg
            })
        }).then(response => response.json())
        .then((response) => {
            if(response.ok){
                this.setState({chat: response.messages});
            }
        }).catch(error => {
            // Handle any error that occurred during the request
            console.error(error);
        });
    }

  return (
    <div className="over chat">
      <div className="chatHistory">
        {messages.map((message, index) => (
          <div key={index} className="chatHistory">
            {message}
          </div>
        ))}
      </div>
      <div className="chat form">
        <input
          type="text"
          value={newMessage}
          onChange={handleInputChange}
          placeholder="Write here..."
        />
        <button onClick={handleSendMessage}><MdSend /></button>
      </div>
    </div>
  );
};

export default Chat;