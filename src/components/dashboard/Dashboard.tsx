import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const { currentUser, isAdmin, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      // La redirección a /login está configurada en AuthContext
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Sistema de Gestión de Inventario</h1>
        <div className="user-info">
          <span>{currentUser?.displayName || 'Usuario'} ({currentUser?.rut})</span>
          <button className="logout-button" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="welcome-section">
          <h2>Bienvenido al Sistema de Gestión de Inventario</h2>
          <p>Selecciona una opción del menú para comenzar.</p>
        </div>

        <div className="dashboard-modules">
          {/* Módulos comunes para todos los usuarios */}
          <div className="module-card">
            <h3>Inventario</h3>
            <p>Gestión de productos e inventario</p>
            <Link to="/inventory" className="module-link">Acceder</Link>
          </div>

          {/* Módulos comunes para todos los usuarios */}
          <div className="module-card">
            <h3>Venta de stock</h3>
            <p>Registrar ventas y gestión de clientes</p>
            <Link to="/sales" className="module-link">Acceder</Link>
          </div>

          {/* Módulos solo para administradores */}
          {isAdmin && (
            <>
              <div className="module-card admin-module">
                <h3>Administración de Usuarios</h3>
                <p>Gestionar usuarios del sistema</p>
                <Link to="/admin/users" className="module-link">Acceder</Link>
              </div>
              
              <div className="module-card admin-module">
                <h3>Reportes</h3>
                <p>Acceder a reportes y estadísticas</p>
                <Link to="/reports" className="module-link">Acceder</Link>
              </div>

              <div className="module-card admin-module">
                <h3>Compra de Stock</h3>
                <p>Registrar nuevas compras e ingresos de inventario</p>
                <Link to="/purchases" className="module-link">Acceder</Link>
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="dashboard-footer">
        <p>© 2025 Sistema de Gestión de Inventario</p>
      </footer>
    </div>
  );
};

export default Dashboard;