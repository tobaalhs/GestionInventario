import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { auth } from '../../firebase/config';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import './Login.css';
import logoSGI from '../../assets/logo-sgi.png';

const NewPassword: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [validCode, setValidCode] = useState(false);
  const [oobCode, setOobCode] = useState<string | null>(null);

  useEffect(() => {
    // Obtener el código oob de la URL
    const queryParams = new URLSearchParams(location.search);
    const code = queryParams.get('oobCode');
    
    if (!code) {
      setError('Enlace inválido o expirado');
      setLoading(false);
      return;
    }
    
    setOobCode(code);
    
    // Verificar el código
    verifyPasswordResetCode(auth, code)
      .then(() => {
        setValidCode(true);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error al verificar código:', err);
        setError('El enlace de restablecimiento no es válido o ha expirado');
        setLoading(false);
      });
  }, [location]);

  // Validación del formulario
  const validationSchema = Yup.object({
    password: Yup.string()
      .min(6, 'La contraseña debe tener al menos 6 caracteres')
      .required('La contraseña es obligatoria'),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password')], 'Las contraseñas no coinciden')
      .required('Confirma tu contraseña'),
  });

  // Configuración de Formik
  const formik = useFormik({
    initialValues: {
      password: '',
      confirmPassword: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        if (!oobCode) {
          setError('Código de recuperación no encontrado');
          return;
        }
        
        setError(null);
        // Cambiar la contraseña
        await confirmPasswordReset(auth, oobCode, values.password);
        setSuccess('Tu contraseña ha sido actualizada exitosamente');
        
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } catch (err: any) {
        console.error('Error al cambiar contraseña:', err);
        setError('Ocurrió un error al actualizar la contraseña');
      }
    },
  });

  if (loading) {
    return (
      <div className="login-container">
        <div className="loading">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-box">
        {/* Logo y título */}
        <div className="logo-container">
          <img src={logoSGI} alt="SGI Logo" className="logo" />
          <h1 className="system-title">Sistema Gestión de Inventario</h1>
        </div>
        
        <div className="login-form-container">
          <h2 className="form-title">Crear nueva contraseña</h2>
          
          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}
          
          {success && (
            <div className="success-message" role="alert">
              {success}
            </div>
          )}
          
          {validCode && !success && (
            <form className="login-form" onSubmit={formik.handleSubmit}>
              <div className="form-group">
                <input
                  id="password"
                  name="password"
                  type="password"
                  className="form-input"
                  placeholder="Nueva contraseña"
                  value={formik.values.password}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                {formik.touched.password && formik.errors.password ? (
                  <div className="form-error">{formik.errors.password}</div>
                ) : null}
              </div>
              
              <div className="form-group">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  className="form-input"
                  placeholder="Confirmar contraseña"
                  value={formik.values.confirmPassword}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                {formik.touched.confirmPassword && formik.errors.confirmPassword ? (
                  <div className="form-error">{formik.errors.confirmPassword}</div>
                ) : null}
              </div>
              
              <button 
                type="submit" 
                className="login-button"
                disabled={formik.isSubmitting}
              >
                {formik.isSubmitting ? 'Actualizando...' : 'Actualizar contraseña'}
              </button>
            </form>
          )}
          
          {!validCode && !loading && (
            <div className="login-actions">
              <p>Este enlace no es válido o ha expirado.</p>
              <a href="/login" className="auth-link">Volver a inicio de sesión</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewPassword;