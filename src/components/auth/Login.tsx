import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../../contexts/AuthContext';
import { LoginCredentials, UserRole } from '../../interfaces/User';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import './Login.css';
import logoSGI from '../../assets/logo-sgi.png';

//exportar funciones para validaciones
  // Función para validar RUT chileno
  export const validateRut = (rut: string) => {
    // Eliminar puntos y guión
    const rutClean = rut.replace(/[.-]/g, '');
    
    if (rutClean.length < 2) return false;
    
    const body = rutClean.slice(0, -1);
    let dv = rutClean.slice(-1).toUpperCase();
    
    // Calcular dígito verificador
    let suma = 0;
    let multiplo = 2;
    
    for (let i = body.length - 1; i >= 0; i--) {
      suma += Number(body.charAt(i)) * multiplo;
      multiplo = multiplo < 7 ? multiplo + 1 : 2;
    }
    
    const dvEsperado = 11 - (suma % 11);
    let dvCalculado = '';
    
    if (dvEsperado === 11) dvCalculado = '0';
    else if (dvEsperado === 10) dvCalculado = 'K';
    else dvCalculado = String(dvEsperado);
    
    return dvCalculado === dv;
  };

// Componente temporal para desarrollo - Crear usuarios iniciales
const DevTools: React.FC = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createDevUser = async (email: string, password: string, role: UserRole, rut: string) => {
    try {
      setError(null);
      setMessage(`Creando usuario ${role}...`);
      
      // crear usuario en bd
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Guardar datos adicionales en Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email: email,
        rut: rut,
        displayName: role === UserRole.ADMIN ? 'Administrador' : 'Empleado',
        role: role,
        active: true,
        createdAt: Timestamp.now()
      });
      
      setMessage(`Usuario ${role} creado correctamente: ${email} (RUT: ${rut})`);
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
          onClick={() => createDevUser('admin@test.com', 'password123', UserRole.ADMIN, '11111111-1')}
          className="admin-button"
        >
          Crear Admin (RUT: 11111111-1)
        </button>
        
        <button 
          onClick={() => createDevUser('employee@test.com', 'password123', UserRole.EMPLOYEE, '22222222-2')}
          className="employee-button"
        >
          Crear Empleado (RUT: 22222222-2)
        </button>
      </div>
    </div>
  );
};

// Función para formatear RUT
export const formatRut = (rut: string) => {
  // Eliminar puntos y guión
  const rutClean = rut.replace(/[.-]/g, '');
  
  if (rutClean.length <= 1) return rutClean;
  
  const body = rutClean.slice(0, -1);
  const dv = rutClean.slice(-1);
  
  // Formatear con puntos cada 3 dígitos
  let rutFormatted = '';
  for (let i = body.length - 1; i >= 0; i--) {
    rutFormatted = body.charAt(i) + rutFormatted;
    if ((body.length - i) % 3 === 0 && i !== 0) {
      rutFormatted = '.' + rutFormatted;
    }
  }
  
  return `${rutFormatted}-${dv}`;
};

// Componente principal de Login
const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showDevTools, setShowDevTools] = useState(false);
  const [error, setError] = useState<string | null>(null);



  // validación del formulario
  const validationSchema = Yup.object({
    rut: Yup.string()
      .required('El RUT es obligatorio')
      .test('rut-valido', 'RUT inválido', validateRut),
    password: Yup.string()
      .min(6, 'La contraseña debe tener al menos 6 caracteres')
      .required('La contraseña es obligatoria'),
  });

  // Manejar el cambio en el campo RUT para formatear
  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    // Solo permitir números, letras K y k, puntos y guiones
    const filtered = input.replace(/[^0-9kK.-]/g, '');
    // Formatear RUT
    formik.setFieldValue('rut', formatRut(filtered));
  };

  // Configuración de Formik
  const formik = useFormik<LoginCredentials>({
    initialValues: {
      rut: '',
      password: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setError(null);
        // Limpiar RUT para la autenticación
        const rutClean = values.rut.replace(/[.-]/g, '');
        await login({
          rut: rutClean,
          password: values.password
        });
        navigate('/dashboard');
      } catch (err: any) {
        console.error('Error al iniciar sesión:', err);
        setError('Credenciales inválidas. Por favor, verifica tu RUT y contraseña.');
      }
    },
  });

  return (
    <div className="login-container">
      <div className="login-box">
        {/* Logo y título */}
        <div className="logo-container">
          <img src={logoSGI} alt="SGI Logo" className="logo" />
        </div>
        
        <div className="login-form-container">
          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}
          
          <form className="login-form" onSubmit={formik.handleSubmit}>
            <div className="form-group">
              <input
                id="rut"
                name="rut"
                type="text"
                className="form-input"
                placeholder="Rut"
                value={formik.values.rut}
                onChange={handleRutChange}
                onBlur={formik.handleBlur}
              />
              {formik.touched.rut && formik.errors.rut ? (
                <div className="form-error">{formik.errors.rut}</div>
              ) : null}
            </div>
            
            <div className="form-group">
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
            
            <div className="login-actions">
              <div className="auth-links">
                <p className="auth-link-text">
                  ¿Aún no tienes cuenta? <Link to="/register" className="auth-link">Regístrate</Link>
                </p>
                <p className="auth-link-text">
                  ¿Olvidaste la contraseña? <Link to="/recover" className="auth-link">Recuperar</Link>
                </p>
              </div>
            </div>
          </form>
        </div>
        
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