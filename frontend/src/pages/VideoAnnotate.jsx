import React, { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

const VideoAnnotate = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [videoFile, setVideoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [videoUrl, setVideoUrl] = useState(null);
  const [uploadedVideo, setUploadedVideo] = useState(null);
  const videoRef = useRef(null);

  const handleVideoSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("video/")) {
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setMessage(`Selected: ${file.name}`);
    } else {
      setMessage("Please select a valid video file", true);
    }
  };

  const uploadVideo = async () => {
    if (!videoFile) {
      setMessage("Please select a video first", true);
      return;
    }
    
    setUploading(true);
    const formData = new FormData();
    formData.append("file", videoFile);
    
    try {
      const response = await API.post("/video/upload", formData);
      setUploadedVideo(response.data);
      setMessage(`✅ Video uploaded: ${response.data.filename}`);
    } catch (error) {
      console.error("Upload failed", error);
      setMessage("Upload failed", true);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={styles.container}>
      <nav style={styles.navbar}>
        <h1 style={styles.logo}>🎥 Video Annotation</h1>
        <div>
          <span style={styles.userEmail}>{user?.email}</span>
          <button onClick={() => navigate("/dashboard")} style={styles.backBtn}>Dashboard</button>
        </div>
      </nav>
      
      <div style={styles.content}>
        {message && <div style={styles.message}>{message}</div>}
        
        <div style={styles.uploadArea}>
          <h2>Upload Video for Annotation</h2>
          <p>Supported formats: MP4, AVI, MOV (coming soon: frame extraction)</p>
          <input type="file" accept="video/*" onChange={handleVideoSelect} style={styles.fileInput} />
          
          {videoUrl && (
            <div style={styles.previewArea}>
              <video ref={videoRef} src={videoUrl} controls style={styles.videoPreview} />
              <button onClick={uploadVideo} disabled={uploading} style={styles.uploadBtn}>
                {uploading ? "Uploading..." : "📤 Upload Video"}
              </button>
            </div>
          )}
        </div>
        
        <div style={styles.infoBox}>
          <h3>ℹ️ Video Annotation Features</h3>
          <ul>
            <li>Upload videos for frame-by-frame annotation</li>
            <li>Extract key frames automatically</li>
            <li>Annotate objects across multiple frames</li>
            <li>Track objects through video sequences</li>
          </ul>
          <p style={styles.note}>Note: Full video annotation features coming soon!</p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: { minHeight: "100vh", background: "#1a1a2e" },
  navbar: { background: "#16213e", color: "white", padding: "15px 30px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  logo: { margin: 0 },
  userEmail: { marginRight: "15px" },
  backBtn: { padding: "8px 16px", background: "#e94560", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" },
  content: { padding: "30px", maxWidth: "800px", margin: "0 auto" },
  message: { padding: "10px", background: "#0f3460", color: "white", borderRadius: "5px", marginBottom: "20px", textAlign: "center" },
  uploadArea: { background: "#16213e", padding: "30px", borderRadius: "10px", textAlign: "center", color: "white" },
  fileInput: { marginTop: "20px", padding: "10px" },
  previewArea: { marginTop: "20px" },
  videoPreview: { width: "100%", maxHeight: "300px", borderRadius: "5px", marginBottom: "15px" },
  uploadBtn: { padding: "10px 20px", background: "#28a745", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "16px" },
  infoBox: { background: "#16213e", padding: "20px", borderRadius: "10px", marginTop: "20px", color: "white" },
  note: { marginTop: "15px", padding: "10px", background: "#0f3460", borderRadius: "5px", color: "#ffc107" }
};

export default VideoAnnotate;