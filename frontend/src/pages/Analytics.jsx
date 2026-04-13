import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

const Analytics = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== "admin") {
      navigate("/dashboard");
    } else {
      fetchAnalytics();
    }
  }, [user]);

  const fetchAnalytics = async () => {
    try {
      const response = await API.get("/admin/analytics");
      setAnalytics(response.data);
    } catch (error) {
      console.error("Failed to fetch analytics", error);
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== "admin") {
    return <div style={styles.loading}>Redirecting...</div>;
  }

  return (
    <div style={styles.container}>
      <nav style={styles.navbar}>
        <h1 style={styles.logo}>Analytics Dashboard</h1>
        <div>
          <span style={styles.userEmail}>{user?.email}</span>
          <button onClick={() => navigate("/dashboard")} style={styles.dashboardBtn}>Dashboard</button>
          <button onClick={() => navigate("/admin")} style={styles.adminBtn}>Admin</button>
          <button onClick={() => navigate("/review")} style={styles.reviewBtn}>Review</button>
          <button onClick={logout} style={styles.logoutBtn}>Logout</button>
        </div>
      </nav>

      <div style={styles.content}>
        <h2>Platform Analytics</h2>
        
        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <h3>Total Users</h3>
                <p style={styles.statNumber}>{analytics?.total_users || 0}</p>
              </div>
              <div style={styles.statCard}>
                <h3>Total Images</h3>
                <p style={styles.statNumber}>{analytics?.total_images || 0}</p>
              </div>
              <div style={styles.statCard}>
                <h3>Total Annotations</h3>
                <p style={styles.statNumber}>{analytics?.total_annotations || 0}</p>
              </div>
              <div style={styles.statCard}>
                <h3>Reviewed Annotations</h3>
                <p style={styles.statNumber}>{analytics?.reviewed_annotations || 0}</p>
              </div>
              <div style={styles.statCard}>
                <h3>Average Quality Score</h3>
                <p style={styles.statNumber}>{analytics?.average_quality_score || 0}%</p>
              </div>
            </div>

            <div style={styles.section}>
              <h3> Annotations per User</h3>
              {analytics?.annotations_per_user?.length === 0 ? (
                <p>No annotations yet.</p>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th>User Email</th>
                      <th>Annotation Count</th>
                      <th>Progress Bar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics?.annotations_per_user?.map((item, idx) => {
                      const maxCount = Math.max(...(analytics?.annotations_per_user?.map(i => i.count) || [1]));
                      const percentage = (item.count / maxCount) * 100;
                      return (
                        <tr key={idx}>
                          <td>{item.email}</td>
                          <td style={styles.countCell}>{item.count}</td>
                          <td style={styles.progressCell}>
                            <div style={{...styles.progressBar, width: `${percentage}%`}} />
                            <span style={styles.progressText}>{percentage.toFixed(0)}%</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
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
  reviewBtn: { padding: "8px 16px", background: "#ffc107", color: "#333", border: "none", borderRadius: "5px", cursor: "pointer", marginRight: "10px" },
  logoutBtn: { padding: "8px 16px", background: "#ff4757", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" },
  content: { padding: "30px" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "40px" },
  statCard: { background: "white", padding: "20px", borderRadius: "10px", textAlign: "center", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" },
  statNumber: { fontSize: "36px", fontWeight: "bold", color: "#667eea", margin: "10px 0" },
  section: { background: "white", padding: "20px", borderRadius: "10px", marginTop: "20px" },
  table: { width: "100%", borderCollapse: "collapse", marginTop: "15px" },
  countCell: { fontWeight: "bold", textAlign: "center", width: "100px" },
  progressCell: { position: "relative", width: "200px" },
  progressBar: { height: "30px", background: "#4ECDC4", borderRadius: "5px", transition: "width 0.3s ease" },
  progressText: { position: "absolute", left: "10px", top: "5px", fontSize: "12px", color: "#333", fontWeight: "bold" },
  loading: { textAlign: "center", padding: "50px", fontSize: "20px" },
};

export default Analytics;