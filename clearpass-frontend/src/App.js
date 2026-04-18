import "./App.css";

import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import AdminDashboard from "./pages/AdminDashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import StudentDashboard from "./pages/StudentDashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import ProfilePage from "./pages/Profile";
import SettingsPage from "./pages/Settings";
import SubjectListPage from "./pages/SubjectListPage";
import AcademicStructurePage from "./pages/AcademicStructurePage";

function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <ToastProvider>
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRole="student">
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher"
          element={
            <ProtectedRoute allowedRole="teacher">
              <TeacherDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/super-admin"
          element={
            <ProtectedRoute allowedRole="super_admin">
              <SuperAdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/super-admin/subjects"
          element={
            <ProtectedRoute allowedRole="super_admin">
              <SubjectListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/super-admin/structure"
          element={
            <ProtectedRoute allowedRole="super_admin">
              <AcademicStructurePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute allowedRole={["student","teacher","admin","super_admin"]}>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute allowedRole={["student","teacher","admin","super_admin"]}>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
      </ToastProvider>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
