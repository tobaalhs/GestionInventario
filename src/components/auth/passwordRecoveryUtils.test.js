// src/utils/passwordRecoveryUtils.test.js

import {
  formatRut,
  validateRut,
  isMaxAttemptsReached,
  getRemainingAttempts,
  getErrorMessageForFailedAttempt,
  getSuccessResetMessage,
  getRedirectPathAfterSuccess,
  getRedirectTimeAfterSuccess,
  validateRequiredField
} from './passwordRecoveryUtils';

// Mock para los servicios de autenticación 
jest.mock('../../services/authService', () => ({
  getUserByRut: jest.fn(),
  getSecurityQuestionByRut: jest.fn(),
  verifySecurityAnswer: jest.fn(),
  blockUserAfterFailedAttempts: jest.fn()
}));

describe('HU06-Recuperación de contraseña', () => {
  
  // 1. Formateo de RUT
  describe('formatRut', () => {
    it('debe formatear RUTs correctamente', () => {
      expect(formatRut('123456789')).toBe('12.345.678-9');
      expect(formatRut('171389730')).toBe('17.138.973-0');
      expect(formatRut('111111111')).toBe('11.111.111-1');
    });

    it('debe manejar RUTs ya formateados', () => {
      expect(formatRut('12.345.678-9')).toBe('12.345.678-9');
      expect(formatRut('17.138.973-0')).toBe('17.138.973-0');
    });

    it('debe manejar RUTs con letra K', () => {
      expect(formatRut('20922492k')).toBe('20.922.492-k');
      expect(formatRut('20922492K')).toBe('20.922.492-K');
    });

  });

  // 2. Validación de RUT
  describe('validateRut', () => {
    it('debe validar RUTs con formato correcto', () => {
      expect(validateRut('17.138.973-k')).toBe(true);
      expect(validateRut('12345678-9')).toBe(true);
      expect(validateRut('11.111.111-1')).toBe(true);
    });

    it('debe invalidar RUTs con formato incorrecto', () => {
      expect(validateRut('123')).toBe(false);
      expect(validateRut('17138973-1')).toBe(false);
      expect(validateRut('11111111-2')).toBe(false); // Dígito verificador incorrecto
    });

    it('debe manejar diferentes formatos de entrada de RUT', () => {
      expect(validateRut('17138973k')).toBe(true); // Sin puntos ni guión
      expect(validateRut('17.138.973-K')).toBe(true); // K mayúscula
      expect(validateRut('17138973-k')).toBe(true); // k minúscula
    });

    it('debe manejar casos borde', () => {
      expect(validateRut('')).toBe(false);
      expect(validateRut('1')).toBe(false);
      expect(validateRut('k')).toBe(false);
    });
  });

  // 3. Verificación de intentos máximos
  describe('isMaxAttemptsReached', () => {
    it('debe determinar correctamente cuando se alcanza el máximo de intentos', () => {
      expect(isMaxAttemptsReached(0)).toBe(false);
      expect(isMaxAttemptsReached(1)).toBe(false);
      expect(isMaxAttemptsReached(2)).toBe(false);
      expect(isMaxAttemptsReached(3)).toBe(true);
      expect(isMaxAttemptsReached(4)).toBe(true);
    });
  });

  // 4. Cálculo de intentos restantes
  describe('getRemainingAttempts', () => {
    it('debe calcular correctamente los intentos restantes', () => {
      expect(getRemainingAttempts(0)).toBe(3);
      expect(getRemainingAttempts(1)).toBe(2);
      expect(getRemainingAttempts(2)).toBe(1);
      expect(getRemainingAttempts(3)).toBe(0);
      expect(getRemainingAttempts(4)).toBe(0);
    });
  });

  // 5. Mensajes de error para intentos fallidos
  describe('getErrorMessageForFailedAttempt', () => {
    it('debe proporcionar el mensaje de error correcto según los intentos realizados', () => {
      expect(getErrorMessageForFailedAttempt(0))
        .toBe('Respuesta incorrecta. Te quedan 3 intentos.');
      
      expect(getErrorMessageForFailedAttempt(1))
        .toBe('Respuesta incorrecta. Te quedan 2 intentos.');
      
      expect(getErrorMessageForFailedAttempt(2))
        .toBe('Respuesta incorrecta. Te quedan 1 intentos.');
      
      const blockedMessage = getErrorMessageForFailedAttempt(3);
      expect(blockedMessage).toContain('Has excedido el número máximo de intentos');
      expect(blockedMessage).toContain('bloqueada por seguridad');
    });
  });

  // 6. Mensaje de éxito al restablecer
  describe('getSuccessResetMessage', () => {
    it('debe proporcionar el mensaje de éxito adecuado', () => {
      const message = getSuccessResetMessage();
      expect(message).toContain('Se ha enviado un correo');
      expect(message).toContain('recuperación');
    });
  });

  // 7. Ruta de redirección después del éxito
  describe('getRedirectPathAfterSuccess', () => {
    it('debe proporcionar la ruta correcta de redirección', () => {
      expect(getRedirectPathAfterSuccess()).toBe('/login');
    });
  });

  // 8. Tiempo de redirección
  describe('getRedirectTimeAfterSuccess', () => {
    it('debe proporcionar el tiempo correcto de redirección', () => {
      expect(getRedirectTimeAfterSuccess()).toBe(3000);
    });
  });

  // 9. Validación de campos requeridos
  describe('validateRequiredField', () => {
    it('debe validar correctamente si un campo está vacío', () => {
      expect(validateRequiredField('')).toBe(false);
      expect(validateRequiredField('  ')).toBe(false);
      expect(validateRequiredField(null)).toBe(false);
      expect(validateRequiredField(undefined)).toBe(false);
    });

    it('debe validar correctamente si un campo tiene contenido', () => {
      expect(validateRequiredField('respuesta')).toBe(true);
      expect(validateRequiredField('123')).toBe(true);
      expect(validateRequiredField(' texto con espacios ')).toBe(true);
    });
  });

  // 10. Pruebas de integración de flujo completo (simuladas)
  describe('Flujo completo de recuperación de contraseña', () => {
    it('debe gestionar correctamente el flujo de respuesta correcta', () => {
      // Simulación del flujo:
      
      // 1. Un usuario hace 0 intentos previos
      let attempts = 0;
      
      // 2. El usuario proporciona una respuesta incorrecta 
      attempts++;
      
      // 3. Verificamos que no ha superado el máximo de intentos
      expect(isMaxAttemptsReached(attempts)).toBe(false);
      
      // 4. Verificamos que muestra el mensaje de error correcto
      expect(getErrorMessageForFailedAttempt(attempts))
        .toBe('Respuesta incorrecta. Te quedan 2 intentos.');
      
      // 5. El usuario proporciona la respuesta correcta (simulado)
      const successMessage = getSuccessResetMessage();
      const redirectPath = getRedirectPathAfterSuccess();
      
      // 6. Verificamos los resultados esperados
      expect(successMessage).toContain('correo de recuperación');
      expect(redirectPath).toBe('/login');
    });

    it('debe bloquear la cuenta después de 3 intentos fallidos', () => {
      // 1. Un usuario comienza con 0 intentos
      let attempts = 0;
      
      // 2. El usuario falla tres veces
      attempts = 3;
      
      // 3. Verificamos que se ha superado el límite
      expect(isMaxAttemptsReached(attempts)).toBe(true);
      
      // 4. Verificamos el mensaje de bloqueo
      const errorMessage = getErrorMessageForFailedAttempt(attempts);
      expect(errorMessage).toContain('Has excedido el número máximo de intentos');
      expect(errorMessage).toContain('bloqueada por seguridad');
    });
  });
});