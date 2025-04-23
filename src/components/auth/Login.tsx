import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../../contexts/AuthContext';
import { LoginCredentials, UserRole } from '../../interfaces/User';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import './Login.css';

// Componente temporal para desarrollo - Crear usuarios iniciales
const DevTools: React.FC = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createDevUser = async (email: string, password: string, role: UserRole) => {
    try {
      setError(null);
      setMessage(`Creando usuario ${role}...`);
      
      // crear usuario en bd
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Guardar datos adicionales en Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email: email,
        displayName: role === UserRole.ADMIN ? 'Administrador' : 'Empleado',
        role: role,
        active: true,
        createdAt: Timestamp.now()
      });
      
      setMessage(`Usuario ${role} creado correctamente: ${email}`);
    } catch (err: any) {
      console.error('Error al crear usuario de desarrollo:', err);
      setError(err.message);
    }
  };

  return (
    <div style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}>
      <h3>Herramientas de Desarrollo</h3>
      
      {message && <div style={{ color: 'green', marginBottom: '1rem' }}>{message}</div>}
      {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}
      
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button 
          onClick={() => createDevUser('admin@test.com', 'password123', UserRole.ADMIN)}
          style={{ flex: 1, padding: '0.5rem', backgroundColor: '#2c7a7b', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Crear Admin (admin@test.com)
        </button>
        
        <button 
          onClick={() => createDevUser('employee@test.com', 'password123', UserRole.EMPLOYEE)}
          style={{ flex: 1, padding: '0.5rem', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Crear Empleado (employee@test.com)
        </button>
      </div>
    </div>
  );
};

// Componente principal de Login
const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showDevTools, setShowDevTools] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // validación del formulario
  const validationSchema = Yup.object({
    email: Yup.string()
      .email('Email inválido')
      .required('El email es obligatorio'),
    password: Yup.string()
      .min(6, 'La contraseña debe tener al menos 6 caracteres')
      .required('La contraseña es obligatoria'),
  });

  // Configuración de Formik
  const formik = useFormik<LoginCredentials>({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setError(null);
        await login(values);
        navigate('/dashboard');
      } catch (err: any) {
        console.error('Error al iniciar sesión:', err);
        setError('Credenciales inválidas. Por favor, verifica tu email y contraseña.');
      }
    },
  });

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">Sistema de Inventario</h1>
          <p className="login-subtitle">Inicia sesión para acceder al sistema</p>
        </div>
        
        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}
        
        <form className="login-form" onSubmit={formik.handleSubmit}>
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              className="form-input"
              placeholder="tu@email.com"
              value={formik.values.email}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            {formik.touched.email && formik.errors.email ? (
              <div className="form-error">{formik.errors.email}</div>
            ) : null}
          </div>
          
          <div className="form-group">
            <label htmlFor="password" className="form-label">Contraseña</label>
            <input
              id="password"
              name="password"
              type="password"
              className="form-input"
              placeholder="Contraseña"
              value={formik.values.password}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            {formik.touched.password && formik.errors.password ? (
              <div className="form-error">{formik.errors.password}</div>
            ) : null}
          </div>
          
          <button 
            type="submit" 
            className="login-button"
            disabled={formik.isSubmitting}
          >
            {formik.isSubmitting ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>
        
        {/* Botón para mostrar/ocultar herramientas de desarrollo */}
        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <button 
            onClick={() => setShowDevTools(!showDevTools)}
            style={{ background: 'none', border: 'none', color: '#666', textDecoration: 'underline', cursor: 'pointer' }}
          >
            {showDevTools ? 'Ocultar herramientas de desarrollo' : 'Mostrar herramientas de desarrollo'}
          </button>
        </div>
        
        {/* Herramientas de desarrollo (solo en desarrollo) */}
        {showDevTools && <DevTools />}
      </div>
    </div>
  );
};

export default Login;