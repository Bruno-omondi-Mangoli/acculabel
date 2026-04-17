import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      const response = await API.get("/images/");
      setImages(response.data);
    } catch (error) {
      console.error("Failed to fetch images", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div style={styles.container}>
      <nav style={styles.navbar}>
        <h1 style={styles.logo}> Acculabel</h1>
        <div>
          <span style={styles.userEmail}>{user?.email}</span>
          {user?.role === "admin" && (
            <>
              <button onClick={() => navigate("/admin")} style={styles.adminBtn}>Admin</button>
              <button onClick={() => navigate("/analytics")} style={styles.analyticsBtn}>Analytics</button>
              <button onClick={() => navigate("/review")} style={styles.reviewBtn}>Review</button>
            </>
          )}
          <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
        </div>
      </nav>

      <div style={styles.content}>
        <h2>Welcome, {user?.email}!</h2>
        <p>Role: {user?.role}</p>

        <div style={styles.section}>
          <h3>Your Images</h3>
          <button
            onClick={() => navigate("/annotate")}
            style={styles.uploadBtn}
          >
            + Upload New Image
          </button>
          <button onClick={() => navigate("/video-annotate")} style={styles.videoBtn}>
             Video Annotation
          </button>
          <button onClick={() => navigate("/batch-upload")} style={styles.batchBtn}>
             Batch Upload (Multiple)
             </button>

          {loading ? (
            <p>Loading...</p>
          ) : (
            <div style={styles.imageGrid}>
              {images.map((image) => (
                <div key={image.id} style={styles.imageCard}>
                  <img
                  src={`${import.meta.env.VITE_API_URL}${image.url}`}
                    alt={image.original_filename}
                    style={styles.thumbnail}
                  />
                  <p>{image.original_filename}</p>
                  <button
                    onClick={() => navigate(`/annotate?id=${image.id}`)}
                    style={styles.annotateBtn}
                  >
                     Annotate
                  </button>
                </div>
              ))}
              {images.length === 0 && (
                <p style={styles.noImages}>No images yet. Click "Upload New Image" to start.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: "100vh",
    background: "#f5f5f5",
  },
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
  logo: {
    margin: 0,
  },
  userEmail: {
    marginRight: "15px",
  },
  adminBtn: {
    padding: "8px 16px",
    background: "#17a2b8",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    marginRight: "10px",
  },
  analyticsBtn: {
    padding: "8px 16px",
    background: "#ffc107",
    color: "#333",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    marginRight: "10px",
  },
  reviewBtn: {
    padding: "8px 16px",
    background: "#28a745",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    marginRight: "10px",
  },
  logoutBtn: {
    padding: "8px 16px",
    background: "#ff4757",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
  content: {
    padding: "30px",
  },
  section: {
    marginTop: "30px",
  },
  uploadBtn: {
    padding: "10px 20px",
    background: "#28a745",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    marginBottom: "20px",
    fontSize: "16px",
  },
  imageGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
    gap: "20px",
  },
  imageCard: {
    background: "white",
    padding: "15px",
    borderRadius: "8px",
    boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
    textAlign: "center",
  },
  thumbnail: {
    width: "100%",
    height: "180px",
    objectFit: "cover",
    borderRadius: "5px",
  },
  annotateBtn: {
    marginTop: "10px",
    padding: "8px 16px",
    background: "#667eea",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
  noImages: {
    textAlign: "center",
    color: "#666",
    padding: "40px",
  },

  batchBtn: {
  padding: "10px 20px",
  background: "#17a2b8",
  color: "white",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
  marginBottom: "20px",
  marginLeft: "10px",
  fontSize: "16px",
},
videoBtn: {
  padding: "10px 20px",
  background: "#9b59b6",
  color: "white",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
  marginBottom: "20px",
  marginLeft: "10px",
  fontSize: "16px",
},
};

export default Dashboard;