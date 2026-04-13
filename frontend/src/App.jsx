import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Annotate from "./pages/Annotate";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AdminDashboard from "./pages/AdminDashboard";
import Analytics from "./pages/Analytics";
import ReviewQueue from "./pages/ReviewQueue";
import BatchUpload from "./pages/BatchUpload";
import VideoAnnotate from "./pages/VideoAnnotate";
import QualityDashboard from "./pages/QualityDashboard";
import ProjectManagement from "./pages/ProjectManagement";

const PrivateRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={styles.loading}>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/dashboard" />;
  return children;
};

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div style={styles.loading}>Loading...</div>;
  
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      
      {/* Protected Routes (Any authenticated user) */}
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/annotate" element={<PrivateRoute><Annotate /></PrivateRoute>} />
      <Route path="/batch-upload" element={<PrivateRoute><BatchUpload /></PrivateRoute>} />
      <Route path="/video-annotate" element={<PrivateRoute><VideoAnnotate /></PrivateRoute>} />
      
      {/* Admin Only Routes */}
      <Route path="/admin" element={<PrivateRoute adminOnly={true}><AdminDashboard /></PrivateRoute>} />
      <Route path="/analytics" element={<PrivateRoute adminOnly={true}><Analytics /></PrivateRoute>} />
      <Route path="/review" element={<PrivateRoute adminOnly={true}><ReviewQueue /></PrivateRoute>} />
      <Route path="/quality" element={<PrivateRoute adminOnly={true}><QualityDashboard /></PrivateRoute>} />
      <Route path="/projects" element={<PrivateRoute adminOnly={true}><ProjectManagement /></PrivateRoute>} />
      
      {/* Default Route */}
      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

const styles = {
  loading: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    fontSize: "20px",
    color: "#667eea",
    background: "#1a1a2e",
  }
};

export default App;