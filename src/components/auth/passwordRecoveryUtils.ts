// src/utils/passwordRecoveryUtils.ts

export const formatRut = (rut: string) => {
  const rutClean = rut.replace(/[.-]/g, '');
  
  if (rutClean.length <= 1) return rutClean;
  
  const body = rutClean.slice(0, -1);
  const dv = rutClean.slice(-1);
  
  let rutFormatted = '';
  for (let i = body.length - 1; i >= 0; i--) {
    rutFormatted = body.charAt(i) + rutFormatted;
    if ((body.length - i) % 3 === 0 && i !== 0) {
      rutFormatted = '.' + rutFormatted;
    }
  }
  
  return `${rutFormatted}-${dv}`;
};

export const validateRut = (rut: string) => {
  const rutClean = rut.replace(/[.-]/g, '');
  if (rutClean.length < 2) return false;
  
  const body = rutClean.slice(0, -1);
  let dv = rutClean.slice(-1).toUpperCase();
  
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

export const isMaxAttemptsReached = (attempts: number) => {
  return attempts >= 3;
};

export const getRemainingAttempts = (attempts: number) => {
  const maxAttempts = 3;
  return Math.max(0, maxAttempts - attempts);
};

export const getErrorMessageForFailedAttempt = (attempts: number) => {
  const remaining = getRemainingAttempts(attempts);
  
  if (remaining > 0) {
    return `Respuesta incorrecta. Te quedan ${remaining} intentos.`;
  } else {
    return 'Has excedido el número máximo de intentos. Tu cuenta ha sido bloqueada por seguridad. Por favor, contacta al administrador.';
  }
};

export const getSuccessResetMessage = () => {
  return 'Se ha enviado un correo de recuperación a tu dirección de email registrada';
};

export const getRedirectPathAfterSuccess = () => {
  return '/login';
};

export const getRedirectTimeAfterSuccess = () => {
  return 3000; 
};

export const validateRequiredField = (value: string) => {
  return !!value && value.trim() !== '';
};