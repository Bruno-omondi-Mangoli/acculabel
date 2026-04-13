import React, { useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

const BatchUpload = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadedImages, setUploadedImages] = useState([]);
  const [message, setMessage] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    const imageFiles = droppedFiles.filter(file => file.type.startsWith("image/"));
    
    if (imageFiles.length === 0) {
      setMessage("Please drop image files only (JPG, PNG)", true);
      return;
    }
    
    setFiles(prev => [...prev, ...imageFiles]);
    setMessage(`Added ${imageFiles.length} image(s). Total: ${files.length + imageFiles.length}`);
    setTimeout(() => setMessage(""), 3000);
  }, [files]);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const imageFiles = selectedFiles.filter(file => file.type.startsWith("image/"));
    
    if (imageFiles.length === 0) {
      setMessage("Please select image files only (JPG, PNG)", true);
      return;
    }
    
    setFiles(prev => [...prev, ...imageFiles]);
    setMessage(`Added ${imageFiles.length} image(s). Total: ${files.length + imageFiles.length}`);
    setTimeout(() => setMessage(""), 3000);
  };

  const removeFile = (index) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
    setMessage(`Removed 1 image. Total: ${newFiles.length}`);
    setTimeout(() => setMessage(""), 2000);
  };

  const uploadAll = async () => {
    if (files.length === 0) {
      setMessage("Please select images to upload", true);
      return;
    }
    
    setUploading(true);
    const results = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append("file", file);
      
      setUploadProgress(prev => ({ ...prev, [i]: 0 }));
      
      try {
        const response = await API.post("/images/upload", formData);
        results.push({ file: file.name, success: true, data: response.data });
        setUploadedImages(prev => [...prev, response.data]);
        setUploadProgress(prev => ({ ...prev, [i]: 100 }));
      } catch (error) {
        console.error("Upload failed for", file.name, error);
        results.push({ file: file.name, success: false, error: error.message });
        setUploadProgress(prev => ({ ...prev, [i]: -1 }));
      }
    }
    
    setUploading(false);
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    if (successCount > 0) {
      setMessage(`✅ Uploaded ${successCount} image(s) successfully! ${failCount > 0 ? `${failCount} failed.` : ""}`);
    } else {
      setMessage(`❌ Upload failed. Please try again.`);
    }
    
    setTimeout(() => setMessage(""), 5000);
  };

  const clearAll = () => {
    if (confirm("Clear all selected images?")) {
      setFiles([]);
      setUploadProgress({});
      setMessage("Cleared all images");
      setTimeout(() => setMessage(""), 2000);
    }
  };

  const getTotalSize = () => {
    const total = files.reduce((sum, file) => sum + file.size, 0);
    if (total < 1024 * 1024) return `${(total / 1024).toFixed(1)} KB`;
    return `${(total / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div style={styles.container}>
      <nav style={styles.navbar}>
        <h1 style={styles.logo}>📦 Batch Image Upload</h1>
        <div>
          <span style={styles.userEmail}>{user?.email}</span>
          <button onClick={() => navigate("/dashboard")} style={styles.dashboardBtn}>Dashboard</button>
          <button onClick={() => navigate("/annotate")} style={styles.annotateBtn}>Annotate</button>
        </div>
      </nav>

      <div style={styles.content}>
        {message && <div style={message.includes("✅") ? styles.successMsg : styles.message}>{message}</div>}
        
        <div style={styles.uploadSection}>
          <h2>📸 Batch Upload Images</h2>
          <p>Upload multiple images at once to annotate them later</p>
          
          <div 
            style={{...styles.dropZone, ...(dragActive ? styles.dropZoneActive : {})}}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div style={styles.dropZoneContent}>
              <span style={styles.dropIcon}>📁</span>
              <p>Drag & drop images here</p>
              <p style={styles.dropSubtext}>or</p>
              <label style={styles.browseBtn}>
                Browse Files
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  style={{ display: "none" }}
                  disabled={uploading}
                />
              </label>
              <p style={styles.supportedFormats}>Supported: JPG, PNG, GIF (Max 10MB each)</p>
            </div>
          </div>
          
          {files.length > 0 && (
            <div style={styles.previewSection}>
              <div style={styles.previewHeader}>
                <h3>Selected Images ({files.length})</h3>
                <div style={styles.previewActions}>
                  <span style={styles.totalSize}>Total: {getTotalSize()}</span>
                  <button onClick={clearAll} style={styles.clearBtn} disabled={uploading}>Clear All</button>
                </div>
              </div>
              
              <div style={styles.imageGrid}>
                {files.map((file, index) => (
                  <div key={index} style={styles.imageCard}>
                    <img src={URL.createObjectURL(file)} alt={file.name} style={styles.previewImage} />
                    <div style={styles.imageInfo}>
                      <p style={styles.imageName} title={file.name}>
                        {file.name.length > 20 ? file.name.substring(0, 20) + "..." : file.name}
                      </p>
                      <p style={styles.imageSize}>{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                    
                    {uploadProgress[index] !== undefined && uploadProgress[index] > 0 && (
                      <div style={styles.progressContainer}>
                        <div style={{...styles.progressBar, width: `${uploadProgress[index] === -1 ? 100 : uploadProgress[index]}%`, background: uploadProgress[index] === -1 ? "#dc3545" : "#28a745"}} />
                        <span style={styles.progressText}>{uploadProgress[index] === -1 ? "Failed" : `${uploadProgress[index]}%`}</span>
                      </div>
                    )}
                    
                    {!uploading && uploadProgress[index] === undefined && (
                      <button onClick={() => removeFile(index)} style={styles.removeBtn}>✕</button>
                    )}
                  </div>
                ))}
              </div>
              
              <div style={styles.uploadActions}>
                <button onClick={uploadAll} style={styles.uploadBtn} disabled={uploading}>
                  {uploading ? "Uploading..." : `📤 Upload All (${files.length} images)`}
                </button>
              </div>
            </div>
          )}
          
          {uploadedImages.length > 0 && (
            <div style={styles.successSection}>
              <h3>✅ Successfully Uploaded ({uploadedImages.length})</h3>
              <div style={styles.successGrid}>
                {uploadedImages.slice(0, 6).map((img, idx) => (
                  <div key={idx} style={styles.successCard}>
                    <img src={`http://localhost:8000${img.url}`} alt={img.original_filename} style={styles.successThumb} />
                    <p>{img.original_filename}</p>
                    <button onClick={() => navigate(`/annotate?id=${img.id}`)} style={styles.annotateNowBtn}>Annotate Now</button>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate("/dashboard")} style={styles.goToDashboardBtn}>Go to Dashboard</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: { minHeight: "100vh", background: "#f5f5f5" },
  navbar: { background: "#667eea", color: "white", padding: "15px 30px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" },
  logo: { margin: 0 },
  userEmail: { marginRight: "15px" },
  dashboardBtn: { padding: "8px 16px", background: "#28a745", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", marginRight: "10px" },
  annotateBtn: { padding: "8px 16px", background: "#e94560", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", marginRight: "10px" },
  content: { padding: "30px", maxWidth: "1200px", margin: "0 auto" },
  message: { padding: "10px", background: "#0f3460", color: "white", borderRadius: "5px", marginBottom: "20px", textAlign: "center" },
  successMsg: { padding: "10px", background: "#28a745", color: "white", borderRadius: "5px", marginBottom: "20px", textAlign: "center" },
  uploadSection: { background: "white", borderRadius: "10px", padding: "30px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" },
  dropZone: { border: "2px dashed #ccc", borderRadius: "10px", padding: "40px", textAlign: "center", marginTop: "20px", transition: "all 0.3s ease", cursor: "pointer" },
  dropZoneActive: { borderColor: "#667eea", background: "#f0f0ff" },
  dropZoneContent: { textAlign: "center" },
  dropIcon: { fontSize: "48px" },
  dropSubtext: { margin: "10px 0", color: "#999" },
  browseBtn: { padding: "10px 20px", background: "#667eea", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", display: "inline-block" },
  supportedFormats: { fontSize: "12px", color: "#999", marginTop: "10px" },
  previewSection: { marginTop: "30px", borderTop: "1px solid #eee", paddingTop: "20px" },
  previewHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "10px" },
  previewActions: { display: "flex", gap: "10px", alignItems: "center" },
  totalSize: { fontSize: "14px", color: "#666" },
  clearBtn: { padding: "5px 10px", background: "#dc3545", color: "white", border: "none", borderRadius: "3px", cursor: "pointer" },
  imageGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "15px", marginBottom: "20px" },
  imageCard: { position: "relative", background: "#fafafa", borderRadius: "8px", overflow: "hidden", border: "1px solid #eee" },
  previewImage: { width: "100%", height: "120px", objectFit: "cover" },
  imageInfo: { padding: "8px" },
  imageName: { fontSize: "11px", margin: "0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  imageSize: { fontSize: "10px", color: "#999", margin: "5px 0 0" },
  removeBtn: { position: "absolute", top: "5px", right: "5px", background: "#dc3545", color: "white", border: "none", borderRadius: "50%", width: "20px", height: "20px", cursor: "pointer", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center" },
  progressContainer: { position: "relative", height: "20px", background: "#e0e0e0", margin: "5px", borderRadius: "3px", overflow: "hidden" },
  progressBar: { height: "100%", transition: "width 0.3s ease" },
  progressText: { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: "10px", color: "#fff", fontWeight: "bold" },
  uploadActions: { textAlign: "center", marginTop: "20px" },
  uploadBtn: { padding: "12px 30px", background: "#28a745", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "16px" },
  successSection: { marginTop: "30px", borderTop: "1px solid #eee", paddingTop: "20px" },
  successGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "15px", marginTop: "15px", marginBottom: "20px" },
  successCard: { background: "#fafafa", borderRadius: "8px", padding: "10px", textAlign: "center", border: "1px solid #ddd" },
  successThumb: { width: "100%", height: "100px", objectFit: "cover", borderRadius: "5px" },
  annotateNowBtn: { marginTop: "8px", padding: "5px 10px", background: "#667eea", color: "white", border: "none", borderRadius: "3px", cursor: "pointer", fontSize: "11px" },
  goToDashboardBtn: { padding: "10px 20px", background: "#28a745", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", marginTop: "10px" },
};

export default BatchUpload;