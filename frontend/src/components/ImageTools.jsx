import React, { useState } from 'react';

const ImageTools = ({ imageRef, canvasRef, onImageUpdate }) => {
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [showTools, setShowTools] = useState(false);

  const applyFilter = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;
    
    if (!img) return;
    
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    
    // Apply brightness and contrast
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
    ctx.drawImage(img, 0, 0);
    ctx.filter = 'none';
    
    if (onImageUpdate) onImageUpdate(canvas.toDataURL());
  };

  const rotateImage = () => {
    const newRotation = (rotation + 90) % 360;
    setRotation(newRotation);
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;
    
    canvas.width = img.naturalHeight;
    canvas.height = img.naturalWidth;
    
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(90 * Math.PI / 180);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    if (onImageUpdate) onImageUpdate(canvas.toDataURL());
  };

  const flipHorizontal = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;
    
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    if (onImageUpdate) onImageUpdate(canvas.toDataURL());
  };

  const resetTools = () => {
    setBrightness(100);
    setContrast(100);
    setRotation(0);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;
    ctx.drawImage(img, 0, 0);
    if (onImageUpdate) onImageUpdate(canvas.toDataURL());
  };

  return (
    <div style={styles.container}>
      <button onClick={() => setShowTools(!showTools)} style={styles.toggleBtn}>
        🛠️ Image Tools {showTools ? '▲' : '▼'}
      </button>
      
      {showTools && (
        <div style={styles.toolsPanel}>
          <div style={styles.toolGroup}>
            <label>Brightness: {brightness}%</label>
            <input 
              type="range" 
              min="0" max="200" 
              value={brightness} 
              onChange={(e) => setBrightness(parseInt(e.target.value))}
              onMouseUp={applyFilter}
            />
          </div>
          
          <div style={styles.toolGroup}>
            <label>Contrast: {contrast}%</label>
            <input 
              type="range" 
              min="0" max="200" 
              value={contrast} 
              onChange={(e) => setContrast(parseInt(e.target.value))}
              onMouseUp={applyFilter}
            />
          </div>
          
          <div style={styles.toolButtons}>
            <button onClick={rotateImage} style={styles.toolBtn}>🔄 Rotate 90°</button>
            <button onClick={flipHorizontal} style={styles.toolBtn}>↔️ Flip Horizontal</button>
            <button onClick={resetTools} style={styles.resetBtn}>⟳ Reset</button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { marginBottom: '10px' },
  toggleBtn: { padding: '8px 16px', background: '#0f3460', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', width: '100%' },
  toolsPanel: { background: '#0f3460', padding: '15px', borderRadius: '5px', marginTop: '10px' },
  toolGroup: { marginBottom: '10px', color: 'white' },
  toolButtons: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  toolBtn: { padding: '5px 10px', background: '#e94560', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' },
  resetBtn: { padding: '5px 10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }
};

export default ImageTools;