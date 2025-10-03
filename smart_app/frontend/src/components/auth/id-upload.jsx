import React, { useRef } from 'react';
import { Form, Button, Card } from 'react-bootstrap';
import { FaUpload, FaFilePdf, FaImage } from 'react-icons/fa';

const IDUpload = ({ onUpload, uploadedFile, idType }) => {
  const fileInputRef = useRef();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onUpload(file, idType);
    }
  };

  return (
    <Card className="upload-card">
      <Card.Body className="text-center">
        <FaFilePdf size={48} className="text-muted mb-3" />
        <h6>Upload {idType.toUpperCase()} Document</h6>
        <p className="text-muted small">
          Supported formats: PDF, JPG, PNG (Max 5MB)
        </p>
        
        {uploadedFile ? (
          <div className="upload-preview">
            <FaImage size={64} className="text-success mb-2" />
            <p className="small">Document uploaded successfully</p>
            <Button 
              variant="outline-secondary" 
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              Change Document
            </Button>
          </div>
        ) : (
          <div 
            className="upload-area"
            onClick={() => fileInputRef.current?.click()}
          >
            <FaUpload className="mb-2" />
            <p>Click to upload</p>
          </div>
        )}
        
        <Form.Control
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.jpg,.jpeg,.png"
          style={{ display: 'none' }}
        />
      </Card.Body>
    </Card>
  );
};

export default IDUpload;