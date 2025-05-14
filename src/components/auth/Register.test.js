import * as Yup from 'yup';
    const validateRut = (rut) => {
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

  describe("Validacion de credenciales de registro", () => {

  // Test para un datos válidos
  it("Deberia validar credenciales de registro correctas", async () => {
    const validData = {
      rut: '17.138.973-k', 
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      displayName: 'Nombre de Prueba',
      securityQuestion: 'Color favorito',
      securityAnswer: 'Azul',
    };

    // Yup.validate() devuelve una promesa que se resuelve si es válido
    await expect(validationSchema.validate(validData)).resolves.toEqual(validData);
  });

  // Test para campos obligatorios faltantes
  it("Deberia fallar si faltan campos obligatorios", async () => {
    const invalidData = {
      rut: '', 
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      displayName: 'Nombre de Prueba',
      securityQuestion: 'Color favorito',
      securityAnswer: '', 
    };

   
    await expect(validationSchema.validate(invalidData)).rejects.toThrow(Yup.ValidationError);

    try {
      await validationSchema.validate(invalidData, { abortEarly: false }); // Usa abortEarly: false para obtener todos los errores
    } catch (error) {
      expect(error.errors).toContain('El RUT es obligatorio');
      expect(error.errors).toContain('La respuesta es obligatoria');
    }
  });

  // Email invaldos
  it("Deberia fallar con un formato de email inválido", async () => {
    const invalidData = {
      rut: '17.138.973-k',
      email: 'invalid-email', // Formato inválido
      password: 'password123',
      confirmPassword: 'password123',
      displayName: 'Nombre de Prueba',
      securityQuestion: 'Color favorito',
      securityAnswer: 'Azul',
    };

    await expect(validationSchema.validate(invalidData)).rejects.toThrow(Yup.ValidationError);

    try {
      await validationSchema.validate(invalidData);
    } catch (error) {
      expect(error.errors).toContain('Email inválido');
    }
  });

  // Test para contraseña demasiado corta
  it("Deberia fallar si la contraseña es demasiado corta", async () => {
    const invalidData = {
      rut: '17.138.973-k',
      email: 'test@example.com',
      password: 'short', // Menos de 6 caracteres
      confirmPassword: 'short',
      displayName: 'Nombre de Prueba',
      securityQuestion: 'Color favorito',
      securityAnswer: 'Azul',
    };

    await expect(validationSchema.validate(invalidData)).rejects.toThrow(Yup.ValidationError);

    try {
      await validationSchema.validate(invalidData);
    } catch (error) {
      expect(error.errors).toContain('La contraseña debe tener al menos 6 caracteres');
    }
  });

  // Test para contraseñas que no coinciden
  it("Deberia fallar si las contraseñas no coinciden", async () => {
    const invalidData = {
      rut: '17.138.973-k',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'passwordabc', // No coincide
      displayName: 'Nombre de Prueba',
      securityQuestion: 'Color favorito',
      securityAnswer: 'Azul',
    };

    await expect(validationSchema.validate(invalidData)).rejects.toThrow(Yup.ValidationError);

    try {
      await validationSchema.validate(invalidData);
    } catch (error) {
      expect(error.errors).toContain('Las contraseñas no coinciden');
    }
  });

  it("Deberia fallar con un formato de RUT inválido segun validateRut", async () => {
    const invalidData = {
      rut: '17138973-1', // Asumiendo que validateRut lo considera inválido (sin puntos)
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      displayName: 'Nombre de Prueba',
      securityQuestion: 'Color favorito',
      securityAnswer: 'Azul',
    };

    await expect(validationSchema.validate(invalidData)).rejects.toThrow(Yup.ValidationError);

    try {
      await validationSchema.validate(invalidData);
    } catch (error) {
      expect(error.errors).toContain('RUT inválido');
    }
  });

});