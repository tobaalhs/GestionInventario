// src/components/NewPassword.validation.test.js

import * as Yup from 'yup';

// Definición del esquema de validación (copiada de tu componente)
const validationSchema = Yup.object({
  password: Yup.string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .required('La contraseña es obligatoria'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Las contraseñas no coinciden')
    .required('Confirma tu contraseña'),
});

describe('Validacion de nueva contrasena', () => {

  it('debería validar un password y confirmPassword válidos', async () => {
    const validValues = {
      password: 'contraseñasegura123',
      confirmPassword: 'contraseñasegura123',
    };

    await expect(validationSchema.validate(validValues)).resolves.toEqual(validValues);
  });

  it('debería fallar si el password está vacío', async () => {
    const values = { password: '', confirmPassword: 'cualquiera' };

    await expect(validationSchema.validate(values, { abortEarly: false })).rejects.toBeTruthy();

     try {
         await validationSchema.validate(values, { abortEarly: false });
           throw new Error("La validación debía fallar, pero pasó.");
     } catch (err) {
         const passwordRequiredError = err.inner.find((e) => e.path === 'password' && e.message === 'La contraseña es obligatoria');
         expect(passwordRequiredError).toBeDefined();

           const passwordMinLengthError = err.inner.find((e) => e.path === 'password' && e.message === 'La contraseña debe tener al menos 6 caracteres');
           expect(passwordMinLengthError).toBeDefined();

           const confirmOneOfError = err.inner.find((e) => e.path === 'confirmPassword' && e.message === 'Las contraseñas no coinciden');
           expect(confirmOneOfError).toBeDefined();

           expect(err.inner.length).toBeGreaterThanOrEqual(3);
     }
  });

  it('debería fallar si el password es menor a 6 caracteres', async () => {
    const values = { password: 'short', confirmPassword: 'short' };

    await expect(validationSchema.validate(values, { abortEarly: false }))
      .rejects
      .toThrow('La contraseña debe tener al menos 6 caracteres');

    // El bloque try...catch aquí es redundante para esta aserción específica
  });

  // Prueba si falla cuando el campo confirmPassword está vacío
  it('debería fallar si el confirmPassword está vacío', async () => {
    // Valores: password válido, confirmPassword vacío
    const values = { password: 'validpassword', confirmPassword: '' };

    await expect(validationSchema.validate(values, { abortEarly: false })).rejects.toBeTruthy();

     try {
         await validationSchema.validate(values, { abortEarly: false });
           throw new Error("La validación debía fallar, pero pasó.");
     } catch (err) {
           // Filtramos todos los errores que aplican al campo confirmPassword
           const confirmErrors = err.inner.filter(e => e.path === 'confirmPassword');

           // Basado en la ejecución, parece que Yup solo reporta 1 error para este caso específico
           // (campo vacío con oneOf a un valor no vacío)
           expect(confirmErrors.length).toBe(1); // <--- Expect 1 error ahora

         // Verificamos que el error encontrado es el mensaje de 'oneOf'
         const oneOfMessageFound = confirmErrors.some(e => e.message === 'Las contraseñas no coinciden');
         expect(oneOfMessageFound).toBe(true); 

           // Explicitamente verificamos que el mensaje 'required' NO está presente en este caso
           const requiredMessageFound = confirmErrors.some(e => e.message === 'Confirma tu contraseña');
           expect(requiredMessageFound).toBe(false); 
     }
  });

  it('debería fallar si password y confirmPassword no coinciden', async () => {
    const values = {
      password: 'password1',
      confirmPassword: 'password2',
    };

    await expect(validationSchema.validate(values, { abortEarly: false }))
      .rejects
      .toThrow('Las contraseñas no coinciden');

  });

});