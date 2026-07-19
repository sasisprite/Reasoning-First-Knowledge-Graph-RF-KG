import React, { useState } from 'react';
import axios from 'axios';

function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    const newMsg = { role: 'user', content: input };
    setMessages(msgs => [...msgs, newMsg]);
    setInput('');
    setLoading(true);
    
    try {
      const res = await axios.post('http://localhost:8000/chat', { message: input });
      setMessages(msgs => [...msgs, { role: 'assistant', content: res.data.response }]);
    } catch (error) {
      console.error(error);
      setMessages(msgs => [...msgs, { role: 'assistant', content: 'Error communicating with backend.' }]);
    }
    setLoading(false);
  };

  return (
    <div className="card chat-container">
      <h3>Chat</h3>
      <div className="chat-history" style={{ height: '300px', overflowY: 'auto', border: '1px solid #ccc', padding: '10px', marginBottom: '10px' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ textAlign: msg.role === 'user' ? 'right' : 'left', margin: '5px 0' }}>
            <span style={{ background: msg.role === 'user' ? '#e0f7fa' : '#f1f8e9', padding: '5px 10px', borderRadius: '10px', display: 'inline-block' }}>
              <strong>{msg.role}: </strong>{msg.content}
            </span>
          </div>
        ))}
        {loading && <div style={{ textAlign: 'left', margin: '5px 0' }}><span>...</span></div>}
      </div>
      <div style={{ display: 'flex' }}>
        <input 
          type="text" 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          onKeyPress={e => e.key === 'Enter' && handleSend()}
          style={{ flex: 1, padding: '5px' }}
        />
        <button onClick={handleSend} style={{ marginLeft: '5px' }} disabled={loading}>Send</button>
      </div>
    </div>
  );
}

export default Chat;
