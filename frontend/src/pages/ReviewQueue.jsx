import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

const ReviewQueue = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selectedAnnotation, setSelectedAnnotation] = useState(null);
  const [zoom, setZoom] = useState(1);
  
  const canvasRef = useRef(null);
  const imageRef = useRef(null);

  useEffect(() => {
    if (user?.role !== "admin") {
      navigate("/dashboard");
    } else {
      fetchImagesForReview();
    }
  }, [user]);

  const fetchImagesForReview = async () => {
    try {
      const response = await API.get("/images/");
      setImages(response.data);
    } catch (error) {
      console.error("Failed to fetch images", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnnotationsForReview = async (imageId) => {
    try {
      const response = await API.get(`/annotations/image/${imageId}`);
      setAnnotations(response.data);
      setSelectedImage(images.find(img => img.id === imageId));
      setSelectedAnnotation(null);
      // Wait for image to load then draw
      setTimeout(() => drawAnnotations(), 100);
    } catch (error) {
      console.error("Failed to fetch annotations", error);
    }
  };

  const getLabelColor = (label) => {
    const colors = ["#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD"];
    let hash = 0;
    for (let i = 0; i < label.length; i++) {
      hash = ((hash << 5) - hash) + label.charCodeAt(i);
      hash |= 0;
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const drawAnnotations = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = imageRef.current;
    
    if (!img || !img.complete || !img.naturalWidth) return;
    
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    annotations.forEach((ann) => {
      const isSelected = selectedAnnotation?.id === ann.id;
      const color = getLabelColor(ann.label);
      ctx.lineWidth = isSelected ? 4 : 3;
      ctx.strokeStyle = color;
      
      if (ann.type === "rectangle" || ann.type === "cuboid") {
        ctx.strokeRect(ann.x, ann.y, ann.width, ann.height);
        ctx.fillStyle = color + "33";
        ctx.fillRect(ann.x, ann.y, ann.width, ann.height);
        ctx.fillStyle = color;
        ctx.font = "bold 16px Arial";
        ctx.fillText(ann.label, ann.x, ann.y - 5);
        ctx.font = "12px Arial";
        ctx.fillStyle = "#ffffff";
        ctx.shadowBlur = 2;
        ctx.shadowColor = "black";
        ctx.fillText(`${Math.round(ann.width)}x${Math.round(ann.height)}`, ann.x + 5, ann.y + 20);
        ctx.shadowBlur = 0;
      }
      
      if (ann.type === "polygon" && ann.points && ann.points.length >= 3) {
        ctx.beginPath();
        ctx.moveTo(ann.points[0].x, ann.points[0].y);
        for (let i = 1; i < ann.points.length; i++) {
          ctx.lineTo(ann.points[i].x, ann.points[i].y);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.fillStyle = color + "33";
        ctx.fill();
        ctx.fillStyle = color;
        ctx.font = "bold 16px Arial";
        ctx.fillText(ann.label, ann.points[0].x, ann.points[0].y - 5);
      }
      
      if (ann.type === "polyline" && ann.points && ann.points.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(ann.points[0].x, ann.points[0].y);
        for (let i = 1; i < ann.points.length; i++) {
          ctx.lineTo(ann.points[i].x, ann.points[i].y);
        }
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.font = "bold 16px Arial";
        ctx.fillText(ann.label, ann.points[0].x, ann.points[0].y - 5);
      }
      
      if (ann.type === "sentiment") {
        const sentimentColor = ann.sentiment === "positive" ? "#00ff00" : 
                               ann.sentiment === "negative" ? "#ff0000" : "#ffff00";
        ctx.fillStyle = sentimentColor;
        ctx.beginPath();
        ctx.arc(ann.x, ann.y, 15, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = "#000";
        ctx.font = "bold 14px Arial";
        ctx.fillText(ann.label, ann.x + 10, ann.y - 10);
      }
    });
  };

  useEffect(() => {
    if (imageRef.current && imageRef.current.complete) {
      drawAnnotations();
    }
  }, [annotations, selectedAnnotation]);

  const approveAnnotation = async (annotationId, qualityScore) => {
    try {
      await API.post(`/annotations/${annotationId}/review`, { quality_score: qualityScore });
      setAnnotations(annotations.map(a => 
        a.id === annotationId ? { ...a, reviewed: true, quality_score: qualityScore } : a
      ));
      setMessage("✅ Annotation approved!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Failed to approve", error);
    }
  };

  const rejectAnnotation = async (annotationId) => {
    if (window.confirm("Are you sure you want to reject and delete this annotation?")) {
      try {
        await API.delete(`/annotations/${annotationId}`);
        setAnnotations(annotations.filter(a => a.id !== annotationId));
        setMessage(" Annotation rejected and removed");
        setTimeout(() => setMessage(""), 3000);
      } catch (error) {
        console.error("Failed to reject", error);
      }
    }
  };

  const handleZoomIn = () => setZoom(Math.min(zoom + 0.2, 3));
  const handleZoomOut = () => setZoom(Math.max(zoom - 0.05, 0.05));
  const handleResetZoom = () => setZoom(1);

  if (user?.role !== "admin") {
    return <div style={styles.loading}>Redirecting...</div>;
  }

  return (
    <div style={styles.container}>
      <nav style={styles.navbar}>
        <h1 style={styles.logo}> Review Queue</h1>
        <div>
          <span style={styles.userEmail}>{user?.email}</span>
          <button onClick={() => navigate("/dashboard")} style={styles.dashboardBtn}>Dashboard</button>
          <button onClick={() => navigate("/admin")} style={styles.adminBtn}>Admin</button>
          <button onClick={() => navigate("/analytics")} style={styles.analyticsBtn}>Analytics</button>
          <button onClick={logout} style={styles.logoutBtn}>Logout</button>
        </div>
      </nav>

      <div style={styles.content}>
        {message && <div style={styles.message}>{message}</div>}
        
        <h2>Review Annotations</h2>
        <p>Select an image to review its annotations. Each annotation is shown on the image with colored boxes.</p>
        
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div style={styles.reviewLayout}>
            {/* Left Panel - Image List */}
            <div style={styles.imageList}>
              <h3> Images to Review</h3>
              {images.length === 0 ? (
                <p style={styles.noImages}>No images uploaded yet.</p>
              ) : (
                images.map(img => (
                  <div 
                    key={img.id} 
                    style={{...styles.imageListItem, ...(selectedImage?.id === img.id ? styles.selectedImage : {})}}
                    onClick={() => fetchAnnotationsForReview(img.id)}
                  >
                    <img src={`http://localhost:8000${img.url}`} alt={img.original_filename} style={styles.thumbnail} />
                    <div style={styles.imageInfo}>
                      <p><strong>{img.original_filename}</strong></p>
                      <small>By: User {img.uploaded_by}</small>
                      <small>Uploaded: {new Date(img.uploaded_at).toLocaleDateString()}</small>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Center Panel - Image Viewer with Annotations */}
            <div style={styles.viewerArea}>
              {selectedImage ? (
                <>
                  <div style={styles.viewerHeader}>
                    <h3> Reviewing: {selectedImage.original_filename}</h3>
                    <div style={styles.zoomControls}>
                      <button onClick={handleZoomIn} style={styles.zoomBtn}>🔍 Zoom In</button>
                      <button onClick={handleZoomOut} style={styles.zoomBtn}>🔍 Zoom Out</button>
                      <button onClick={handleResetZoom} style={styles.zoomBtn}>⟳ Reset</button>
                      <span style={styles.zoomLevel}>{Math.round(zoom * 100)}%</span>
                    </div>
                  </div>
                  <div style={styles.canvasContainer}>
                    <div style={{ transform: `scale(${zoom})`, transformOrigin: "0 0", display: "inline-block" }}>
                      <img
                        ref={imageRef}
                        src={`http://localhost:8000${selectedImage.url}`}
                        alt="Review"
                        style={{ display: "block", maxWidth: "none" }}
                        crossOrigin="anonymous"
                        onLoad={drawAnnotations}
                      />
                      <canvas
                        ref={canvasRef}
                        style={styles.canvas}
                      />
                    </div>
                  </div>
                  <div style={styles.viewerInstructions}>
                     <strong>Tip:</strong> Click on any annotation in the right panel to highlight it on the image.
                  </div>
                </>
              ) : (
                <div style={styles.selectPrompt}>
                  <h3> Select an Image</h3>
                  <p>Choose an image from the left panel to review its annotations.</p>
                </div>
              )}
            </div>
            
            {/* Right Panel - Annotations List */}
            <div style={styles.annotationsArea}>
              <h3> Annotations ({annotations.length})</h3>
              {annotations.length === 0 ? (
                <p style={styles.noAnnotations}>No annotations found for this image.</p>
              ) : (
                <div style={styles.annotationsList}>
                  {annotations.map((ann, idx) => {
                    const isReviewed = ann.reviewed;
                    const isSelected = selectedAnnotation?.id === ann.id;
                    return (
                      <div 
                        key={ann.id} 
                        style={{...styles.annotationCard, ...(isSelected ? styles.selectedAnnotationCard : {}), borderLeftColor: getLabelColor(ann.label)}}
                        onClick={() => { setSelectedAnnotation(ann); drawAnnotations(); }}
                      >
                        <div style={styles.annotationHeader}>
                          <span style={styles.annotationNumber}>#{idx + 1}</span>
                          <span style={styles.annotationType}>[{ann.type}]</span>
                          <strong style={{color: getLabelColor(ann.label)}}>{ann.label}</strong>
                          {isReviewed ? (
                            <span style={styles.reviewedBadge}>✓ Reviewed</span>
                          ) : (
                            <span style={styles.pendingBadge}>⏳ Pending</span>
                          )}
                        </div>
                        <div style={styles.annotationDetails}>
                          {ann.x && <span>Position: ({Math.round(ann.x)}, {Math.round(ann.y)})</span>}
                          {ann.width && <span>Size: {Math.round(ann.width)}x{Math.round(ann.height)}</span>}
                          {ann.sentiment && <span>Sentiment: {ann.sentiment}</span>}
                          {ann.comparison_winner && <span>Winner: {ann.comparison_winner}</span>}
                          {ann.quality_score && <span>Quality: {ann.quality_score}</span>}
                        </div>
                        {!isReviewed && (
                          <div style={styles.reviewActions}>
                            <select 
                              onChange={(e) => approveAnnotation(ann.id, parseFloat(e.target.value))}
                              style={styles.qualitySelect}
                              defaultValue=""
                            >
                              <option value="" disabled>Select quality score</option>
                              <option value="1.0">🌟 Perfect (1.0)</option>
                              <option value="0.9">✅ Excellent (0.9)</option>
                              <option value="0.8">👍 Good (0.8)</option>
                              <option value="0.7">👌 Acceptable (0.7)</option>
                              <option value="0.5">⚠️ Poor (0.5)</option>
                              <option value="0.0">❌ Reject (0.0)</option>
                            </select>
                            <button onClick={() => rejectAnnotation(ann.id)} style={styles.rejectBtn}>
                              Reject & Delete
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: { minHeight: "100vh", background: "#f5f5f5" },
  navbar: {
    background: "#667eea",
    color: "white",
    padding: "15px 30px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "10px",
  },
  logo: { margin: 0 },
  userEmail: { marginRight: "15px" },
  dashboardBtn: { padding: "8px 16px", background: "#28a745", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", marginRight: "10px" },
  adminBtn: { padding: "8px 16px", background: "#17a2b8", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", marginRight: "10px" },
  analyticsBtn: { padding: "8px 16px", background: "#ffc107", color: "#333", border: "none", borderRadius: "5px", cursor: "pointer", marginRight: "10px" },
  logoutBtn: { padding: "8px 16px", background: "#ff4757", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" },
  content: { padding: "30px" },
  message: { padding: "10px", background: "#d4edda", color: "#155724", borderRadius: "5px", marginBottom: "20px" },
  reviewLayout: { display: "flex", gap: "20px", marginTop: "20px", flexWrap: "wrap" },
  
  // Left Panel - Image List
  imageList: { width: "280px", background: "white", padding: "15px", borderRadius: "10px", maxHeight: "70vh", overflowY: "auto", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" },
  imageListItem: { display: "flex", gap: "10px", padding: "10px", borderBottom: "1px solid #eee", cursor: "pointer", borderRadius: "8px", marginBottom: "5px", transition: "background 0.2s" },
  selectedImage: { background: "#e3f2fd", borderLeft: "3px solid #2196f3" },
  thumbnail: { width: "60px", height: "60px", objectFit: "cover", borderRadius: "5px" },
  imageInfo: { flex: 1 },
  noImages: { textAlign: "center", color: "#999", padding: "20px" },
  
  // Center Panel - Image Viewer
  viewerArea: { flex: 1, minWidth: "400px", background: "white", borderRadius: "10px", padding: "15px", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" },
  viewerHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "10px" },
  zoomControls: { display: "flex", gap: "5px", alignItems: "center" },
  zoomBtn: { padding: "5px 10px", background: "#667eea", color: "white", border: "none", borderRadius: "3px", cursor: "pointer" },
  zoomLevel: { color: "#333", marginLeft: "10px", fontWeight: "bold" },
  canvasContainer: { textAlign: "center", background: "#f0f0f0", padding: "20px", borderRadius: "8px", overflow: "auto", minHeight: "400px", position: "relative" },
  canvas: { position: "absolute", top: 0, left: 0, cursor: "pointer" },
  viewerInstructions: { marginTop: "15px", padding: "10px", background: "#e3f2fd", borderRadius: "5px", fontSize: "13px", color: "#555" },
  selectPrompt: { textAlign: "center", padding: "60px 20px", color: "#999" },
  
  // Right Panel - Annotations List
  annotationsArea: { width: "320px", background: "white", borderRadius: "10px", padding: "15px", maxHeight: "70vh", overflowY: "auto", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" },
  annotationsList: { display: "flex", flexDirection: "column", gap: "12px" },
  noAnnotations: { textAlign: "center", color: "#999", padding: "20px" },
  annotationCard: { padding: "12px", borderLeftWidth: "4px", borderLeftStyle: "solid", borderRadius: "8px", background: "#fafafa", cursor: "pointer", transition: "all 0.2s" },
  selectedAnnotationCard: { background: "#e8f4f8", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" },
  annotationHeader: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "8px" },
  annotationNumber: { fontWeight: "bold", color: "#666", fontSize: "11px" },
  annotationType: { fontSize: "11px", color: "#ffd700", background: "#333", padding: "2px 6px", borderRadius: "3px" },
  reviewedBadge: { fontSize: "10px", background: "#28a745", color: "white", padding: "2px 6px", borderRadius: "3px" },
  pendingBadge: { fontSize: "10px", background: "#ffc107", color: "#333", padding: "2px 6px", borderRadius: "3px" },
  annotationDetails: { display: "flex", gap: "10px", flexWrap: "wrap", fontSize: "11px", color: "#666", marginBottom: "8px" },
  reviewActions: { display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" },
  qualitySelect: { padding: "5px", borderRadius: "3px", border: "1px solid #ddd", fontSize: "12px", flex: 1 },
  rejectBtn: { padding: "5px 10px", background: "#dc3545", color: "white", border: "none", borderRadius: "3px", cursor: "pointer", fontSize: "12px" },
  loading: { textAlign: "center", padding: "50px", fontSize: "20px" },
};

export default ReviewQueue;