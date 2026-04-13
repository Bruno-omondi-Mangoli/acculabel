import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

const ProjectManagement = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProject, setNewProject] = useState({ name: "", description: "", priority: "medium", deadline: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== "admin") {
      navigate("/dashboard");
    } else {
      fetchProjects();
    }
  }, [user]);

  const fetchProjects = async () => {
    try {
      // This would need a backend endpoint
      const response = await API.get("/projects/");
      setProjects(response.data);
    } catch (error) {
      console.error("Failed to fetch projects", error);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    try {
      const response = await API.post("/projects/", newProject);
      setProjects([...projects, response.data]);
      setShowCreateModal(false);
      setNewProject({ name: "", description: "", priority: "medium", deadline: "" });
    } catch (error) {
      console.error("Failed to create project", error);
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'urgent': return '#dc3545';
      case 'high': return '#fd7e14';
      case 'medium': return '#ffc107';
      default: return '#28a745';
    }
  };

  if (user?.role !== "admin") {
    return <div style={styles.loading}>Redirecting...</div>;
  }

  return (
    <div style={styles.container}>
      <nav style={styles.navbar}>
        <h1 style={styles.logo}> Project Management</h1>
        <div>
          <span style={styles.userEmail}>{user?.email}</span>
          <button onClick={() => navigate("/dashboard")} style={styles.dashboardBtn}>Dashboard</button>
          <button onClick={() => navigate("/admin")} style={styles.adminBtn}>Admin</button>
          <button onClick={() => navigate("/quality")} style={styles.qualityBtn}>Quality</button>
          <button onClick={logout} style={styles.logoutBtn}>Logout</button>
        </div>
      </nav>

      <div style={styles.content}>
        <div style={styles.header}>
          <h2>Projects</h2>
          <button onClick={() => setShowCreateModal(true)} style={styles.createBtn}>+ New Project</button>
        </div>
        
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div style={styles.projectGrid}>
            {projects.map(project => (
              <div key={project.id} style={styles.projectCard}>
                <div style={{...styles.priorityBadge, background: getPriorityColor(project.priority)}}>
                  {project.priority.toUpperCase()}
                </div>
                <h3>{project.name}</h3>
                <p>{project.description}</p>
                <div style={styles.projectMeta}>
                  <span> Deadline: {project.deadline || "Not set"}</span>
                  <span> Status: {project.status}</span>
                </div>
                <div style={styles.progressBar}>
                  <div style={{...styles.progressFill, width: `${project.progress || 0}%`}} />
                </div>
                <button style={styles.viewBtn}>View Details</button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Create Project Modal */}
      {showCreateModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3>Create New Project</h3>
            <input 
              type="text" 
              placeholder="Project Name" 
              value={newProject.name}
              onChange={(e) => setNewProject({...newProject, name: e.target.value})}
              style={styles.modalInput}
            />
            <textarea 
              placeholder="Description" 
              value={newProject.description}
              onChange={(e) => setNewProject({...newProject, description: e.target.value})}
              style={styles.modalTextarea}
            />
            <select 
              value={newProject.priority}
              onChange={(e) => setNewProject({...newProject, priority: e.target.value})}
              style={styles.modalSelect}
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
              <option value="urgent">Urgent</option>
            </select>
            <input 
              type="date" 
              value={newProject.deadline}
              onChange={(e) => setNewProject({...newProject, deadline: e.target.value})}
              style={styles.modalInput}
            />
            <div style={styles.modalButtons}>
              <button onClick={createProject} style={styles.saveBtn}>Create</button>
              <button onClick={() => setShowCreateModal(false)} style={styles.cancelBtn}>Cancel</button>
            </div>
          </div>
        </div>
      )}
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
  qualityBtn: { padding: "8px 16px", background: "#e94560", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", marginRight: "10px" },
  logoutBtn: { padding: "8px 16px", background: "#ff4757", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" },
  content: { padding: "30px", maxWidth: "1200px", margin: "0 auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
  createBtn: { padding: "10px 20px", background: "#28a745", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" },
  projectGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "20px" },
  projectCard: { background: "white", padding: "20px", borderRadius: "10px", position: "relative", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" },
  priorityBadge: { position: "absolute", top: "10px", right: "10px", padding: "3px 8px", borderRadius: "3px", fontSize: "10px", color: "white" },
  projectMeta: { display: "flex", gap: "15px", fontSize: "12px", color: "#666", margin: "10px 0" },
  progressBar: { height: "8px", background: "#e0e0e0", borderRadius: "4px", margin: "10px 0", overflow: "hidden" },
  progressFill: { height: "100%", background: "#667eea", transition: "width 0.3s ease" },
  viewBtn: { width: "100%", padding: "8px", background: "#667eea", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", marginTop: "10px" },
  
  modal: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modalContent: { background: "white", padding: "30px", borderRadius: "10px", width: "400px" },
  modalInput: { width: "100%", padding: "10px", marginBottom: "10px", border: "1px solid #ddd", borderRadius: "5px" },
  modalTextarea: { width: "100%", padding: "10px", marginBottom: "10px", border: "1px solid #ddd", borderRadius: "5px", minHeight: "80px" },
  modalSelect: { width: "100%", padding: "10px", marginBottom: "10px", border: "1px solid #ddd", borderRadius: "5px" },
  modalButtons: { display: "flex", gap: "10px", marginTop: "20px" },
  saveBtn: { flex: 1, padding: "10px", background: "#28a745", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" },
  cancelBtn: { flex: 1, padding: "10px", background: "#dc3545", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" },
  loading: { textAlign: "center", padding: "50px", fontSize: "20px" }
};

export default ProjectManagement;