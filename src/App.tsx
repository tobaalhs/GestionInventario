import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import RecoverPassword from './components/auth/RecoverPassword';
import NewPassword from './components/auth/NewPassword';
import Dashboard from './components/dashboard/Dashboard';
import UserManagement from './components/admin/UserManagement';
import Inventory from './components/inventory/Inventory';
import StockPurchase from './components/purchases/StockPurchase';
import SaleStock from './components/sales/SaleStock';
import Reports from './components/reports/Reports';
import PublicDownloadPage from './components/reports/PublicDownloadPage';
import './App.css';

// Componente para rutas protegidas que requieren autenticación
const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const auth = useAuth();
  
  if (auth.isLoading) {
    return <div className="loading">Cargando...</div>;
  }
  
  if (!auth.currentUser) {
    return <Navigate to="/login" />;
  }
  
  return children;
};

// Componente para rutas de administrador
const AdminRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const auth = useAuth();
  
  if (auth.isLoading) {
    return <div className="loading">Cargando...</div>;
  }
  
  if (!auth.currentUser || !auth.isAdmin) {
    return <Navigate to="/dashboard" />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/recover" element={<RecoverPassword />} />
          <Route path="/reset-password" element={<NewPassword />} />
          <Route path="/download/:reportId" element={<PublicDownloadPage />} />
          
          {/* Rutas protegidas */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          {/* Ruta del inventario - protegida pero accesible para usuarios normales */}
          <Route path="/inventory" element={
            <ProtectedRoute>
              <Inventory />
            </ProtectedRoute>
          } />

          {/* Ruta de Ventas - protegida pero accesible para usuarios normales */}
          <Route path="/sales" element={
            <ProtectedRoute>
              <SaleStock />
            </ProtectedRoute>
          } />
          
          {/* Rutas de administrador */}
          <Route path="/admin/users" element={
            <AdminRoute>
              <UserManagement />
            </AdminRoute>
          } />

          {/* Rutas de administrador */}
          <Route path="/purchases" element={
            <ProtectedRoute>
              <StockPurchase />
            </ProtectedRoute>
          } />

          {/* Rutas de administrador */}
          <Route path="/reports" element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          } />
          
          {/* Redirección por defecto */}
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;