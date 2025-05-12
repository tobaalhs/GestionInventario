// src/components/RecoverPassword.answerValidation.test.js (o similar)

import * as Yup from 'yup'; // Importa la librería Yup

// Copia la definición exacta del esquema de validación de tu componente
const answerValidationSchema = Yup.object({
  securityAnswer: Yup.string()
    .required('La respuesta es obligatoria'),
});

// --- Suite de Pruebas para la Lógica de Validación de la Respuesta de Seguridad ---
describe('Security Answer Validation Schema (Jest + Yup)', () => {

  // Prueba si una respuesta no vacía pasa la validación
  it('debería validar una respuesta no vacía', async () => {
    const validValues = {
      securityAnswer: 'Mi respuesta secreta', // Una cadena no vacía
    };

    // Yup.validate(values) debería resolverse para valores válidos
    await expect(answerValidationSchema.validate(validValues)).resolves.toBe(validValues);
  });

  // Prueba si falla la validación cuando la respuesta está vacía
  it('debería fallar si la respuesta está vacía', async () => {
    const values = { securityAnswer: '' }; // Cadena vacía

    // Espera que la validación rechace la promesa (lance un error)
    await expect(answerValidationSchema.validate(values, { abortEarly: false }))
      .rejects // Indica que esperamos que la promesa sea rechazada
      .toThrow('La respuesta es obligatoria'); // Verifica el mensaje de error específico

     // Opcional: Verificación más detallada del error por campo usando try...catch
     try {
         await answerValidationSchema.validate(values, { abortEarly: false });
     } catch (err) { // err es el objeto de error capturado
         // Busca el error específico para el campo 'securityAnswer'
         const answerError = err.inner.find((e) => e.path === 'securityAnswer');
         expect(answerError).toBeDefined(); // Verifica que existe un error para este campo
         expect(answerError.message).toBe('La respuesta es obligatoria'); // Verifica el mensaje exacto
     }
  });

   // Prueba si falla la validación cuando la respuesta es null o undefined
   it('debería fallar si la respuesta es null o undefined', async () => {
    const valuesNull = { securityAnswer: null };
    const valuesUndefined = { securityAnswer: undefined };

    // Prueba con null
    await expect(answerValidationSchema.validate(valuesNull, { abortEarly: false }))
      .rejects
      .toThrow('La respuesta es obligatoria');

     try {
         await answerValidationSchema.validate(valuesNull, { abortEarly: false });
     } catch (err) {
         const answerError = err.inner.find((e) => e.path === 'securityAnswer');
         expect(answerError).toBeDefined();
         expect(answerError.message).toBe('La respuesta es obligatoria');
     }

     // Prueba con undefined
     await expect(answerValidationSchema.validate(valuesUndefined, { abortEarly: false }))
      .rejects
      .toThrow('La respuesta es obligatoria');

      try {
         await answerValidationSchema.validate(valuesUndefined, { abortEarly: false });
     } catch (err) {
         const answerError = err.inner.find((e) => e.path === 'securityAnswer');
         expect(answerError).toBeDefined();
         expect(answerError.message).toBe('La respuesta es obligatoria');
     }
  });



});