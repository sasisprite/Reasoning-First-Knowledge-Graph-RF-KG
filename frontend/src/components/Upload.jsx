import React, { useState } from 'react';
import axios from 'axios';

function Upload() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus('Uploading and starting processing...');
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await axios.post('http://localhost:8000/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const docId = response.data.document_id;
      setStatus('Processing started... (Monitoring)');
      
      const interval = setInterval(async () => {
        try {
          const res = await axios.get(`http://localhost:8000/documents/${docId}/status`);
          const docStatus = res.data.status;
          setStatus(`Status: ${res.data.message}`);
          if (docStatus === 'completed' || docStatus === 'error') {
            clearInterval(interval);
          }
        } catch (e) {
          console.error(e);
          clearInterval(interval);
          setStatus('Status check failed.');
        }
      }, 3000);
      
    } catch (error) {
      console.error(error);
      setStatus('Upload failed.');
    }
  };

  return (
    <div className="card">
      <h3>Upload Document</h3>
      <input type="file" onChange={handleFileChange} accept=".pdf,.docx,.txt" />
      <button onClick={handleUpload} disabled={!file} style={{ marginTop: '10px' }}>
        Process Document
      </button>
      {status && <p style={{ marginTop: '10px' }}>{status}</p>}
    </div>
  );
}

export default Upload;
