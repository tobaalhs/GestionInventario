import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { auth } from '../../firebase/config';
import { sendPasswordResetEmail } from 'firebase/auth';
import { getUserByRut, getSecurityQuestionByRut, verifySecurityAnswer, blockUserAfterFailedAttempts } from '../../services/authService';
import './Login.css';
import logoSGI from '../../assets/logo-sgi.png';

const RecoverPassword: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [securityQuestion, setSecurityQuestion] = useState<string | null>(null);
  const [showSecurityQuestion, setShowSecurityQuestion] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [attempts, setAttempts] = useState(0);

  // Validación del formulario
  const validationSchema = Yup.object({
    rut: Yup.string()
      .required('El RUT es obligatorio'),
  });

  // Formatear RUT
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

  // Manejar el cambio en el campo RUT para formatear
  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const filtered = input.replace(/[^0-9kK.-]/g, '');
    formik.setFieldValue('rut', formatRut(filtered));
  };

  // Configuración de Formik
  const formik = useFormik({
    initialValues: {
      rut: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setError(null);
        // Limpiar RUT para buscar en la base de datos
        const rutClean = values.rut.replace(/[.-]/g, '');
        
        // Buscar el usuario por RUT
        const userInfo = await getUserByRut(rutClean);
        
        if (!userInfo.exists) {
          setError('No se encontró ningún usuario con ese RUT');
          return;
        }
        
        // Guardar el email y el ID para usarlos después
        setUserEmail(userInfo.email);
        setUserId(userInfo.uid || '');
        
        // Buscar la pregunta de seguridad
        const question = await getSecurityQuestionByRut(rutClean);
        
        if (!question) {
          setError('No se encontró una pregunta de seguridad para este usuario');
          return;
        }
        
        setSecurityQuestion(question);
        setShowSecurityQuestion(true);
        
      } catch (err: any) {
        console.error('Error al buscar usuario:', err);
        setError('Ocurrió un error al buscar el usuario');
      }
    },
  });

  // Validación para la respuesta a la pregunta de seguridad
  const answerValidationSchema = Yup.object({
    securityAnswer: Yup.string()
      .required('La respuesta es obligatoria'),
  });

  // Configuración de Formik para la respuesta
  const answerFormik = useFormik({
    initialValues: {
      securityAnswer: '',
    },
    validationSchema: answerValidationSchema,
    onSubmit: async (values) => {
      try {
        setError(null);
        
        // Limpiar RUT para verificar
        const rutClean = formik.values.rut.replace(/[.-]/g, '');
        
        // Verificar la respuesta
        const isCorrect = await verifySecurityAnswer(rutClean, values.securityAnswer);
        
        if (isCorrect) {
          // Enviar email de recuperación
          await sendPasswordResetEmail(auth, userEmail);
          setSuccess('Se ha enviado un correo de recuperación a tu dirección de email registrada');
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        } else {
          const newAttempts = attempts + 1;
          setAttempts(newAttempts);
          
          if (newAttempts >= 3) { // 3 intentos en total
            // Bloquear usuario
            if (userId) {
              await blockUserAfterFailedAttempts(userId);
            }
            setError('Has excedido el número máximo de intentos. Tu cuenta ha sido bloqueada por seguridad. Por favor, contacta al administrador.');
            setTimeout(() => {
              navigate('/login');
            }, 3000);
          } else {
            setError(`Respuesta incorrecta. Te quedan ${3 - newAttempts} intentos.`);
          }
        }
        
      } catch (err: any) {
        console.error('Error al verificar respuesta:', err);
        setError('Ocurrió un error al procesar tu solicitud');
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
          <h2 className="form-title">Recuperar Contraseña</h2>
          
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
          
          {!showSecurityQuestion ? (
            <form className="login-form" onSubmit={formik.handleSubmit}>
              <div className="form-group">
                <input
                  id="rut"
                  name="rut"
                  type="text"
                  className="form-input"
                  placeholder="Ingresa tu RUT"
                  value={formik.values.rut}
                  onChange={handleRutChange}
                  onBlur={formik.handleBlur}
                />
                {formik.touched.rut && formik.errors.rut ? (
                  <div className="form-error">{formik.errors.rut}</div>
                ) : null}
              </div>
              
              <button 
                type="submit" 
                className="login-button"
                disabled={formik.isSubmitting}
              >
                {formik.isSubmitting ? 'Buscando...' : 'Continuar'}
              </button>
              
              <div className="login-actions">
                <Link to="/login" className="auth-link">Volver a inicio de sesión</Link>
              </div>
            </form>
          ) : (
            <form className="login-form" onSubmit={answerFormik.handleSubmit}>
              <div className="form-group">
                <label htmlFor="securityQuestion" className="form-label">
                  Pregunta de seguridad:
                </label>
                <p className="security-question">{securityQuestion}</p>
              </div>
              
              <div className="form-group">
                <input
                  id="securityAnswer"
                  name="securityAnswer"
                  type="text"
                  className="form-input"
                  placeholder="Tu respuesta"
                  value={answerFormik.values.securityAnswer}
                  onChange={answerFormik.handleChange}
                  onBlur={answerFormik.handleBlur}
                />
                {answerFormik.touched.securityAnswer && answerFormik.errors.securityAnswer ? (
                  <div className="form-error">{answerFormik.errors.securityAnswer}</div>
                ) : null}
              </div>
              
              <button 
                type="submit" 
                className="login-button"
                disabled={answerFormik.isSubmitting}
              >
                {answerFormik.isSubmitting ? 'Verificando...' : 'Verificar respuesta'}
              </button>
              
              <div className="login-actions">
                <Link to="/login" className="auth-link">Volver a inicio de sesión</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecoverPassword;