import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  getAllUsers, 
  toggleUserActive, 
  getBlockedUsers,
  loginWithRutAndPassword
} from '../../services/authService';
import { User, UserRole } from '../../interfaces/User';
import './UserManagement.css';

const UserManagement: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showBlockedOnly, setShowBlockedOnly] = useState<boolean>(false);
  const [showUnblockModal, setShowUnblockModal] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  useEffect(() => {
    if (!currentUser || !isAdmin) {
      navigate('/dashboard');
      return;
    }

    fetchUsers();
  }, [currentUser, isAdmin, navigate]);

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

  const handleBlockUser = async (user: User) => {
    try {
      setIsProcessing(true);
      await toggleUserActive(user.uid, false);
      
      setUsers(users.map(u => 
        u.uid === user.uid ? { ...u, active: false } : u
      ));
      
      showSuccessMessage(`Usuario ${user.displayName} bloqueado exitosamente`);
    } catch (err: any) {
      console.error('Error al bloquear usuario:', err);
      showErrorMessage('Error al bloquear el usuario. Inténtalo nuevamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnblockRequest = (user: User) => {
    setSelectedUser(user);
    setAdminPassword('');
    setShowUnblockModal(true);
  };

  const handleConfirmUnblock = async () => {
    if (!selectedUser || !adminPassword.trim()) {
      showErrorMessage('Debes ingresar tu contraseña para confirmar el desbloqueo');
      return;
    }

    try {
      setIsProcessing(true);
      
      // Verificar la contraseña del administrador actual
      const isValidPassword = await verifyAdminPassword(currentUser?.email || '', adminPassword);
      
      if (!isValidPassword) {
        showErrorMessage('Contraseña incorrecta. No se puede desbloquear el usuario.');
        return;
      }

      await toggleUserActive(selectedUser.uid, true);
      
      setUsers(users.map(u => 
        u.uid === selectedUser.uid ? { ...u, active: true } : u
      ));
      
      setShowUnblockModal(false);
      setSelectedUser(null);
      setAdminPassword('');
      
      showSuccessMessage(`Usuario ${selectedUser.displayName} desbloqueado exitosamente`);
    } catch (err: any) {
      console.error('Error al desbloquear usuario:', err);
      showErrorMessage('Error al desbloquear el usuario. Verifica tu contraseña e inténtalo nuevamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const verifyAdminPassword = async (email: string, password: string) => {
    try {
      // Usar Firebase Auth directamente para verificar la contraseña
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const { auth } = await import('../../firebase/config');
      
      // Verificar credenciales con Firebase Auth
      const credential = await signInWithEmailAndPassword(auth, email, password);
      return !!credential;
    } catch (error) {
      console.error('Error verificando contraseña:', error);
      return false;
    }
  };

  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setError(null);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  const showErrorMessage = (message: string) => {
    setError(message);
    setSuccessMessage(null);
    setTimeout(() => {
      setError(null);
    }, 5000);
  };

  const filteredUsers = showBlockedOnly 
    ? users.filter(user => !user.active)
    : users;

  const blockedUsersCount = users.filter(user => !user.active).length;

  if (loading) {
    return (
      <div className="admin-container">
        <div className="loading-spinner">
          <div className="spinner-icon">⏳</div>
          <p>Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div className="header-content">
          <h2>👥 Gestión de Usuarios</h2>
          <p>Administra el acceso y permisos de los usuarios del sistema</p>
        </div>
        <button 
          className="btn btn-secondary back-btn"
          onClick={() => navigate('/dashboard')}
        >
          ← Volver al Dashboard
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">❌</span>
          <span className="alert-message">{error}</span>
          <button 
            className="alert-close"
            onClick={() => setError(null)}
            aria-label="Cerrar mensaje"
          >
            ✕
          </button>
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success">
          <span className="alert-icon">✅</span>
          <span className="alert-message">{successMessage}</span>
          <button 
            className="alert-close"
            onClick={() => setSuccessMessage(null)}
            aria-label="Cerrar mensaje"
          >
            ✕
          </button>
        </div>
      )}

      <div className="stats-section">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>Total Usuarios</h3>
            <p className="stat-number">{users.length}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>Usuarios Activos</h3>
            <p className="stat-number">{users.filter(u => u.active).length}</p>
          </div>
        </div>
        <div className="stat-card blocked-stat">
          <div className="stat-icon">🚫</div>
          <div className="stat-content">
            <h3>Usuarios Bloqueados</h3>
            <p className="stat-number">{blockedUsersCount}</p>
          </div>
        </div>
      </div>

      <div className="filter-section">
        <div className="filter-controls">
          <button 
            className={`filter-btn ${!showBlockedOnly ? 'active' : ''}`}
            onClick={() => setShowBlockedOnly(false)}
          >
            👥 Todos los usuarios ({users.length})
          </button>
          <button 
            className={`filter-btn ${showBlockedOnly ? 'active' : ''}`}
            onClick={() => setShowBlockedOnly(true)}
          >
            🚫 Solo bloqueados ({blockedUsersCount})
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Estado</th>
              <th>RUT</th>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Fecha Registro</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="no-users">
                  <div className="no-users-content">
                    <span className="no-users-icon">
                      {showBlockedOnly ? '🚫' : '👥'}
                    </span>
                    <p>
                      {showBlockedOnly 
                        ? 'No hay usuarios bloqueados' 
                        : 'No se encontraron usuarios'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredUsers.map(user => (
                <tr 
                  key={user.uid} 
                  className={`user-row ${!user.active ? 'user-blocked' : ''}`}
                >
                  <td>
                    <span className={`status-badge ${user.active ? 'active' : 'blocked'}`}>
                      <span className="status-icon">
                        {user.active ? '✅' : '🚫'}
                      </span>
                      {user.active ? 'Activo' : 'Bloqueado'}
                    </span>
                  </td>
                  <td className="rut-cell">
                    <code>{user.rut}</code>
                  </td>
                  <td className="name-cell">
                    <div className="user-info">
                      <span className="user-name">{user.displayName}</span>
                      {user.uid === currentUser?.uid && (
                        <span className="current-user-badge">Tú</span>
                      )}
                    </div>
                  </td>
                  <td className="email-cell">{user.email}</td>
                  <td>
                    <span className={`role-badge ${user.role.toLowerCase()}`}>
                      {user.role === UserRole.ADMIN ? '👑 Administrador' : '👤 Empleado'}
                    </span>
                  </td>
                  <td className="date-cell">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString('es-CL') : 'N/A'}
                  </td>
                  <td>
                    <div className="action-buttons">
                      {user.uid === currentUser?.uid ? (
                        <span className="self-action-disabled">
                          No puedes modificar tu propio estado
                        </span>
                      ) : user.active ? (
                        <button 
                          className="action-btn block-btn"
                          onClick={() => handleBlockUser(user)}
                          disabled={isProcessing}
                          title="Bloquear acceso del usuario"
                        >
                          {isProcessing ? '⏳' : '🚫'} Bloquear
                        </button>
                      ) : (
                        <button 
                          className="action-btn unblock-btn"
                          onClick={() => handleUnblockRequest(user)}
                          disabled={isProcessing}
                          title="Desbloquear usuario (requiere contraseña)"
                        >
                          {isProcessing ? '⏳' : '🔓'} Desbloquear
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showUnblockModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>🔓 Confirmar Desbloqueo de Usuario</h3>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowUnblockModal(false);
                  setSelectedUser(null);
                  setAdminPassword('');
                }}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              <div className="user-info-section">
                <div className="user-avatar">👤</div>
                <div className="user-details">
                  <h4>{selectedUser.displayName}</h4>
                  <p><strong>RUT:</strong> {selectedUser.rut}</p>
                  <p><strong>Email:</strong> {selectedUser.email}</p>
                  <p><strong>Rol:</strong> {selectedUser.role === UserRole.ADMIN ? 'Administrador' : 'Empleado'}</p>
                </div>
              </div>

              <div className="warning-section">
                <div className="warning-icon">⚠️</div>
                <div className="warning-content">
                  <h4>Confirmación de Responsabilidad</h4>
                  <p>Al desbloquear este usuario, asumes la responsabilidad de que:</p>
                  <ul>
                    <li>✅ El usuario tiene autorización para acceder al sistema</li>
                    <li>✅ Has verificado la identidad del solicitante</li>
                    <li>✅ El desbloqueo está justificado y documentado</li>
                  </ul>
                </div>
              </div>

              <div className="password-section">
                <label htmlFor="admin-password">
                  🔑 Confirma tu contraseña de administrador:
                </label>
                <input
                  id="admin-password"
                  type="password"
                  placeholder="Ingresa tu contraseña..."
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="password-input"
                  disabled={isProcessing}
                />
                <small className="password-help">
                  Esta verificación garantiza que solo administradores autorizados 
                  puedan desbloquear usuarios.
                </small>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowUnblockModal(false);
                  setSelectedUser(null);
                  setAdminPassword('');
                }}
                disabled={isProcessing}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-success"
                onClick={handleConfirmUnblock}
                disabled={isProcessing || !adminPassword.trim()}
              >
                {isProcessing ? '🔄 Desbloqueando...' : '🔓 Confirmar Desbloqueo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;