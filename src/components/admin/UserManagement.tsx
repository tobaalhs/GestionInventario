import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getAllUsers, activateUser, toggleUserActive } from '../../services/authService';
import { User, UserRole } from '../../interfaces/User';

const UserManagement: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Cargar usuarios al montar el componente
  useEffect(() => {
    // Verificar si el usuario actual es administrador
    if (!currentUser || !isAdmin) {
      navigate('/dashboard');
      return;
    }

    const fetchUsers = async () => {
      try {
        setLoading(true);
        const usersList = await getAllUsers();
        setUsers(usersList);
        setError(null);
      } catch (err: any) {
        console.error('Error al cargar usuarios:', err);
        setError('Error al cargar la lista de usuarios');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [currentUser, isAdmin, navigate]);

  // Función para desbloquear/bloquear usuario
  const handleToggleUserActive = async (user: User) => {
    try {
      await toggleUserActive(user.uid, !user.active);
      
      // Actualizar la lista de usuarios
      setUsers(users.map(u => 
        u.uid === user.uid ? { ...u, active: !user.active } : u
      ));
      
      setSuccessMessage(`Usuario ${user.active ? 'bloqueado' : 'desbloqueado'} exitosamente`);
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err: any) {
      console.error('Error al cambiar estado de usuario:', err);
      setError('Error al cambiar estado del usuario');
      
      // Limpiar mensaje de error después de 3 segundos
      setTimeout(() => {
        setError(null);
      }, 3000);
    }
  };

  return (
    <div className="admin-container">
      <h2>Gestión de Usuarios</h2>
      
      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}
      
      {loading ? (
        <div>Cargando usuarios...</div>
      ) : (
        <table className="users-table">
          <thead>
            <tr>
              <th>RUT</th>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.uid} className={!user.active ? 'user-blocked' : ''}>
                <td>{user.rut}</td>
                <td>{user.displayName}</td>
                <td>{user.email}</td>
                <td>{user.role === UserRole.ADMIN ? 'Administrador' : 'Empleado'}</td>
                <td>
                  <span className={`status-badge ${user.active ? 'active' : 'blocked'}`}>
                    {user.active ? 'Activo' : 'Bloqueado'}
                  </span>
                </td>
                <td>
                  <button 
                    className={`toggle-button ${user.active ? 'block' : 'unblock'}`}
                    onClick={() => handleToggleUserActive(user)}
                  >
                    {user.active ? 'Bloquear' : 'Desbloquear'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default UserManagement;