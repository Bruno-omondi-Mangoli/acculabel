import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

const QualityDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("week");

  useEffect(() => {
    if (user?.role !== "admin") {
      navigate("/dashboard");
    } else {
      fetchAnalytics();
    }
  }, [user, timeRange]);

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

  // Calculate statistics
  const totalAnnotations = analytics?.total_annotations || 0;
  const reviewedAnnotations = analytics?.reviewed_annotations || 0;
  const approvalRate = totalAnnotations > 0 ? (reviewedAnnotations / totalAnnotations * 100).toFixed(1) : 0;
  const avgQuality = analytics?.average_quality_score || 0;

  // Find top annotator
  const annotationsPerUser = analytics?.annotations_per_user || [];
  const topAnnotator = annotationsPerUser.length > 0 ? 
    annotationsPerUser.reduce((max, item) => item.count > max.count ? item : max, annotationsPerUser[0]) : 
    { email: "None", count: 0 };

  return (
    <div style={styles.container}>
      <nav style={styles.navbar}>
        <h1 style={styles.logo}> Quality Control Dashboard</h1>
        <div>
          <span style={styles.userEmail}>{user?.email}</span>
          <button onClick={() => navigate("/dashboard")} style={styles.dashboardBtn}>Dashboard</button>
          <button onClick={() => navigate("/admin")} style={styles.adminBtn}>Admin</button>
          <button onClick={() => navigate("/review")} style={styles.reviewBtn}>Review</button>
          <button onClick={logout} style={styles.logoutBtn}>Logout</button>
        </div>
      </nav>

      <div style={styles.content}>
        <h2>Quality Metrics</h2>
        
        <div style={styles.timeRangeSelector}>
          <button onClick={() => setTimeRange("day")} style={timeRange === "day" ? styles.activeTimeBtn : styles.timeBtn}>Today</button>
          <button onClick={() => setTimeRange("week")} style={timeRange === "week" ? styles.activeTimeBtn : styles.timeBtn}>This Week</button>
          <button onClick={() => setTimeRange("month")} style={timeRange === "month" ? styles.activeTimeBtn : styles.timeBtn}>This Month</button>
          <button onClick={() => setTimeRange("all")} style={timeRange === "all" ? styles.activeTimeBtn : styles.timeBtn}>All Time</button>
        </div>
        
        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            {/* Key Metrics Cards */}
            <div style={styles.metricsGrid}>
              <div style={styles.metricCard}>
                <div style={styles.metricIcon}>📝</div>
                <div style={styles.metricValue}>{totalAnnotations}</div>
                <div style={styles.metricLabel}>Total Annotations</div>
              </div>
              
              <div style={styles.metricCard}>
                <div style={styles.metricIcon}>✅</div>
                <div style={styles.metricValue}>{reviewedAnnotations}</div>
                <div style={styles.metricLabel}>Reviewed</div>
              </div>
              
              <div style={styles.metricCard}>
                <div style={styles.metricIcon}>⭐</div>
                <div style={styles.metricValue}>{approvalRate}%</div>
                <div style={styles.metricLabel}>Approval Rate</div>
              </div>
              
              <div style={styles.metricCard}>
                <div style={styles.metricIcon}>🎯</div>
                <div style={styles.metricValue}>{avgQuality}%</div>
                <div style={styles.metricLabel}>Avg Quality Score</div>
              </div>
            </div>
            
            {/* Quality Score Bar */}
            <div style={styles.qualitySection}>
              <h3>Overall Quality Score</h3>
              <div style={styles.qualityBarContainer}>
                <div style={{...styles.qualityBar, width: `${avgQuality}%`, background: avgQuality >= 80 ? '#28a745' : avgQuality >= 60 ? '#ffc107' : '#dc3545'}} />
                <span style={styles.qualityPercentage}>{avgQuality}%</span>
              </div>
              <p style={styles.qualityLabel}>
                {avgQuality >= 80 ? "Excellent! Keep up the great work!" :
                 avgQuality >= 60 ? "Good, but there's room for improvement." :
                 "Needs improvement. Review the guidelines."}
              </p>
            </div>
            
            {/* Annotations per User Table */}
            <div style={styles.section}>
              <h3> Annotations per User</h3>
              <div style={styles.leaderboard}>
                <div style={styles.leaderboardHeader}>
                  <span>Rank</span>
                  <span>User</span>
                  <span>Count</span>
                  <span>Progress</span>
                </div>
                {annotationsPerUser.map((item, idx) => {
                  const percentage = totalAnnotations > 0 ? (item.count / totalAnnotations * 100) : 0;
                  const isTop = idx === 0;
                  return (
                    <div key={idx} style={{...styles.leaderboardRow, ...(isTop ? styles.topRow : {})}}>
                      <span style={styles.rank}>{idx + 1}{isTop && " 🏆"}</span>
                      <span style={styles.userEmailCell}>{item.email}</span>
                      <span style={styles.countCell}>{item.count}</span>
                      <div style={styles.progressCell}>
                        <div style={{...styles.progressBar, width: `${percentage}%`}} />
                        <span style={styles.progressText}>{percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Quality Heat Map Suggestions */}
            <div style={styles.section}>
              <h3> Annotation Density Heat Map</h3>
              <p style={styles.infoText}>
                Most annotations: 
                {annotationsPerUser.length > 0 ? ` ${topAnnotator.email} (${topAnnotator.count} annotations)` : " No data yet"}
              </p>
              <div style={styles.heatMapPreview}>
                {['car', 'person', 'dog', 'cat', 'truck'].map((label, idx) => {
                  const count = annotations.filter(a => a.label === label).length;
                  const intensity = Math.min(count / 10, 1);
                  return (
                    <div key={idx} style={{...styles.heatMapItem, opacity: 0.3 + intensity * 0.7}}>
                      {label}: {count}
                    </div>
                  );
                })}
              </div>
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
  content: { padding: "30px", maxWidth: "1200px", margin: "0 auto" },
  
  timeRangeSelector: { display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" },
  timeBtn: { padding: "8px 16px", background: "#e0e0e0", border: "none", borderRadius: "5px", cursor: "pointer" },
  activeTimeBtn: { padding: "8px 16px", background: "#667eea", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" },
  
  metricsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "30px" },
  metricCard: { background: "white", padding: "20px", borderRadius: "10px", textAlign: "center", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" },
  metricIcon: { fontSize: "32px", marginBottom: "10px" },
  metricValue: { fontSize: "36px", fontWeight: "bold", color: "#667eea" },
  metricLabel: { fontSize: "14px", color: "#666", marginTop: "5px" },
  
  qualitySection: { background: "white", padding: "20px", borderRadius: "10px", marginBottom: "30px" },
  qualityBarContainer: { position: "relative", height: "30px", background: "#e0e0e0", borderRadius: "15px", overflow: "hidden", marginTop: "10px" },
  qualityBar: { height: "100%", transition: "width 0.5s ease" },
  qualityPercentage: { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", color: "#fff", fontWeight: "bold" },
  qualityLabel: { marginTop: "10px", fontSize: "14px", color: "#666", textAlign: "center" },
  
  section: { background: "white", padding: "20px", borderRadius: "10px", marginBottom: "30px" },
  leaderboard: { marginTop: "15px" },
  leaderboardHeader: { display: "grid", gridTemplateColumns: "60px 1fr 80px 150px", gap: "10px", padding: "10px", background: "#f0f0f0", fontWeight: "bold", borderRadius: "5px" },
  leaderboardRow: { display: "grid", gridTemplateColumns: "60px 1fr 80px 150px", gap: "10px", padding: "10px", borderBottom: "1px solid #eee", alignItems: "center" },
  topRow: { background: "#fff8e1" },
  rank: { fontWeight: "bold" },
  userEmailCell: { overflow: "hidden", textOverflow: "ellipsis" },
  countCell: { fontWeight: "bold", color: "#667eea" },
  progressCell: { position: "relative", height: "20px", background: "#e0e0e0", borderRadius: "10px", overflow: "hidden" },
  progressBar: { height: "100%", background: "#28a745", transition: "width 0.3s ease" },
  progressText: { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: "10px", color: "#fff", fontWeight: "bold" },
  
  heatMapPreview: { display: "flex", gap: "15px", flexWrap: "wrap", marginTop: "15px" },
  heatMapItem: { padding: "8px 16px", background: "#e94560", color: "white", borderRadius: "5px", transition: "opacity 0.3s ease" },
  infoText: { color: "#666", marginTop: "10px" },
  loading: { textAlign: "center", padding: "50px", fontSize: "20px" }
};

export default QualityDashboard;