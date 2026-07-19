import React, { useState, useEffect } from 'react';

function Config() {
  const [config, setConfig] = useState({
    extraction: { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct' },
    reasoning: { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct' },
    conversation: { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct' },
    embedding: { provider: 'openrouter', model: 'nvidia/llama-nemotron-embed-vl-1b-v2:free', dimensions: 2048 }
  });

  useEffect(() => {
    fetch('http://127.0.0.1:8000/config')
      .then(res => res.json())
      .then(data => {
        if (data && Object.keys(data).length > 0) {
          setConfig(data);
        }
      })
      .catch(err => console.error('Failed to load config', err));
  }, []);

  const handleChange = (key, field, value) => {
    setConfig({
      ...config,
      [key]: { ...config[key], [field]: field === 'dimensions' ? parseInt(value) || 0 : value }
    });
  };

  const handleSave = () => {
    fetch('http://127.0.0.1:8000/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    })
      .then(res => res.json())
      .then(data => alert(data.message))
      .catch(err => alert('Failed to save config: ' + err.message));
  };

  return (
    <div className="card">
      <h3>Configuration</h3>
      {Object.keys(config).map(key => (
        <div key={key} style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', textTransform: 'capitalize', fontWeight: 'bold' }}>{key} Module:</label>
          <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
            <input 
              type="text" 
              placeholder="Provider (e.g. ollama, openrouter)"
              value={config[key].provider || ''} 
              onChange={e => handleChange(key, 'provider', e.target.value)} 
              style={{ flex: 1, padding: '5px' }}
            />
            <input 
              type="text" 
              placeholder="Model Name"
              value={config[key].model || ''} 
              onChange={e => handleChange(key, 'model', e.target.value)} 
              style={{ flex: 2, padding: '5px' }}
            />
            {key === 'embedding' && (
              <input 
                type="number" 
                placeholder="Dimensions"
                value={config[key].dimensions || ''} 
                onChange={e => handleChange(key, 'dimensions', e.target.value)} 
                style={{ flex: 1, padding: '5px' }}
              />
            )}
          </div>
        </div>
      ))}
      <button onClick={handleSave} style={{ marginTop: '10px' }}>Save Config</button>
    </div>
  );
}

export default Config;
