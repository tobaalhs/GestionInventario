import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { createUserWithSecurity } from '../../services/authService';
import { UserRole } from '../../interfaces/User';
import './Login.css';
import logoSGI from '../../assets/logo-sgi.png';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Función para validar RUT chileno
  const validateRut = (rut: string) => {
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

  // Formatear RUT con puntos y guión
  const formatRut = (rut: string) => {
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

  // Validación del formulario
  const validationSchema = Yup.object({
    rut: Yup.string()
      .required('El RUT es obligatorio')
      .test('rut-valido', 'RUT inválido', validateRut),
    email: Yup.string()
      .email('Email inválido')
      .required('El email es obligatorio'),
    password: Yup.string()
      .min(6, 'La contraseña debe tener al menos 6 caracteres')
      .required('La contraseña es obligatoria'),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password')], 'Las contraseñas no coinciden')
      .required('Confirma tu contraseña'),
    displayName: Yup.string()
      .required('El nombre es obligatorio'),
    securityQuestion: Yup.string()
      .required('La pregunta de seguridad es obligatoria'),
    securityAnswer: Yup.string()
      .required('La respuesta es obligatoria'),
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
  const formik = useFormik({
    initialValues: {
      rut: '',
      email: '',
      password: '',
      confirmPassword: '',
      displayName: '',
      securityQuestion: '',
      securityAnswer: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setError(null);
        // Limpiar RUT para guardarlo sin formato
        const rutClean = values.rut.replace(/[.-]/g, '');
        
        await createUserWithSecurity({
          rut: rutClean,
          email: values.email,
          password: values.password,
          displayName: values.displayName,
          securityQuestion: values.securityQuestion,
          securityAnswer: values.securityAnswer,
        });
        
        setSuccess('Usuario registrado exitosamente');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } catch (err: any) {
        console.error('Error al registrar usuario:', err);
        setError(err.message || 'Error al registrar usuario');
      }
    },
  });

  return (
    <div className="login-container">
      <div className="login-box">
        {/* Logo y título */}
        <div className="logo-container">
          <img src={logoSGI} alt="SGI Logo" className="logo" />
          <h1 className="system-title">Sistema Gestión de Inventario</h1>
        </div>
        
        <div className="login-form-container">
          <h2 className="form-title">Registro de nuevo usuario</h2>
          
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
          
          <form className="login-form" onSubmit={formik.handleSubmit}>
            <div className="form-group">
              <input
                id="rut"
                name="rut"
                type="text"
                className="form-input"
                placeholder="RUT (12.345.678-9)"
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
                id="email"
                name="email"
                type="email"
                className="form-input"
                placeholder="Email"
                value={formik.values.email}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
              {formik.touched.email && formik.errors.email ? (
                <div className="form-error">{formik.errors.email}</div>
              ) : null}
            </div>
            
            <div className="form-group">
              <input
                id="displayName"
                name="displayName"
                type="text"
                className="form-input"
                placeholder="Nombre completo"
                value={formik.values.displayName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
              {formik.touched.displayName && formik.errors.displayName ? (
                <div className="form-error">{formik.errors.displayName}</div>
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
            
            <div className="form-group">
              <input
                id="securityQuestion"
                name="securityQuestion"
                type="text"
                className="form-input"
                placeholder="Pregunta de seguridad (ej: ¿Cuál es tu color favorito?)"
                value={formik.values.securityQuestion}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
              {formik.touched.securityQuestion && formik.errors.securityQuestion ? (
                <div className="form-error">{formik.errors.securityQuestion}</div>
              ) : null}
            </div>
            
            <div className="form-group">
              <input
                id="securityAnswer"
                name="securityAnswer"
                type="text"
                className="form-input"
                placeholder="Respuesta a la pregunta de seguridad"
                value={formik.values.securityAnswer}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
              {formik.touched.securityAnswer && formik.errors.securityAnswer ? (
                <div className="form-error">{formik.errors.securityAnswer}</div>
              ) : null}
            </div>
            
            <button 
              type="submit" 
              className="login-button"
              disabled={formik.isSubmitting}
            >
              {formik.isSubmitting ? 'Registrando...' : 'Registrarse'}
            </button>
            
            <div className="login-actions">
              <div className="auth-links">
                <p className="auth-link-text">
                  ¿Ya tienes cuenta? <Link to="/login" className="auth-link">Iniciar sesión</Link>
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;