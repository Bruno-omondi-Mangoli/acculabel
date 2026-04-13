import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (user?.role !== "admin") {
      navigate("/dashboard");
    } else {
      fetchUsers();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      const response = await API.get("/admin/users");
      setUsers(response.data);
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      await API.put(`/admin/users/${userId}/role`, { role: newRole });
      setMessage(`User role updated to ${newRole}`);
      fetchUsers();
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Failed to update role", error);
    }
  };

  const deleteUser = async (userId, userEmail) => {
    if (window.confirm(`Delete user ${userEmail}? This cannot be undone.`)) {
      try {
        await API.delete(`/admin/users/${userId}`);
        setMessage(`User ${userEmail} deleted`);
        fetchUsers();
        setTimeout(() => setMessage(""), 3000);
      } catch (error) {
        console.error("Failed to delete user", error);
      }
    }
  };

  if (user?.role !== "admin") {
    return <div style={styles.loading}>Redirecting...</div>;
  }

  return (
    <div style={styles.container}>
      <nav style={styles.navbar}>
        <h1 style={styles.logo}>Admin Dashboard</h1>
        <div>
          <span style={styles.userEmail}>{user?.email}</span>
          <button onClick={() => navigate("/dashboard")} style={styles.dashboardBtn}>Dashboard</button>
          <button onClick={() => navigate("/analytics")} style={styles.analyticsBtn}>Analytics</button>
          <button onClick={() => navigate("/review")} style={styles.reviewBtn}>📋 Review Queue</button>
          <button onClick={logout} style={styles.logoutBtn}>Logout</button>
          <button onClick={() => navigate("/quality")} style={styles.qualityBtn}>📊 Quality</button>
          <button onClick={() => navigate("/projects")} style={styles.projectsBtn}>📁 Projects</button>
        </div>
      </nav>

      <div style={styles.content}>
        {message && <div style={styles.message}>{message}</div>}
        
        <h2>User Management</h2>
        
        {loading ? (
          <p>Loading...</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.email}</td>
                  <td>
                    <select
                      value={u.role}
                      onChange={(e) => updateUserRole(u.id, e.target.value)}
                      style={styles.select}
                      disabled={u.id === user.id}
                    >
                      <option value="annotator">Annotator</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    <button
                      onClick={() => deleteUser(u.id, u.email)}
                      style={styles.deleteBtn}
                      disabled={u.id === user.id}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
  dashboardBtn: {
    padding: "8px 16px",
    background: "#28a745",
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
    background: "#17a2b8",
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
  content: { padding: "30px" },
  message: {
    padding: "10px",
    background: "#d4edda",
    color: "#155724",
    borderRadius: "5px",
    marginBottom: "20px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    background: "white",
    borderRadius: "8px",
    overflow: "hidden",
  },
  select: {
    padding: "5px",
    borderRadius: "3px",
    border: "1px solid #ddd",
  },
  deleteBtn: {
    padding: "5px 10px",
    background: "#ff4757",
    color: "white",
    border: "none",
    borderRadius: "3px",
    cursor: "pointer",
  },
  loading: { textAlign: "center", padding: "50px", fontSize: "20px" },
  qualityBtn: {
  padding: "8px 16px",
  background: "#9b59b6",
  color: "white",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
  marginRight: "10px",
},
projectsBtn: {
  padding: "8px 16px",
  background: "#e94560",
  color: "white",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
  marginRight: "10px",
},
};

export default AdminDashboard;