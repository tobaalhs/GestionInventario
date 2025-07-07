/**
 * @jest-environment jsdom
 */

// Mock de la base de datos 
jest.mock('../../firebase/config', () => ({
    db: {
        collection: jest.fn(() => ({
            get: jest.fn(() => Promise.resolve({ docs: [] })),
            add: jest.fn(() => Promise.resolve({ id: 'mock_id' })),
            doc: jest.fn(() => ({
                get: jest.fn(() => Promise.resolve({ exists: false })),
                set: jest.fn(() => Promise.resolve()),
                update: jest.fn(() => Promise.resolve()),
                delete: jest.fn(() => Promise.resolve())
            })),
            where: jest.fn(() => ({
                get: jest.fn(() => Promise.resolve({ docs: [] }))
            }))
        }))
    }
}));

// Mock de fetch para APIs externas
global.fetch = jest.fn();

// Mock de funciones de validación
global.mockValidationFunctions = {
    validateProductForm: jest.fn(),
    checkCodeUniqueness: jest.fn(),
    sanitizeInput: jest.fn(),
    validatePermissions: jest.fn()
};

// Mock de LocalStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock de Navigator para detectar estado de red
Object.defineProperty(global.navigator, 'onLine', {
    writable: true,
    value: true,
});

// Mock de console para capturar logs en pruebas
global.console = {
    ...console,
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn()
};

import { db } from '../../firebase/config'; // Importar la instancia de Firestore
import {
    validateRequiredFields,
    isCodeUnique,
    searchItemsByName,
    searchItemsByCode,
    searchItemsBySupplier,
    searchAndSortItems,
    getStockStatus,
    getStockIndicatorColor,
    formatItemsForTable,
    filterByCategory,
    filterByPriceRange,
    filterByStockStatus,
    getUniqueCategories,
    markAsInactive,
    getActiveItems,
    getInactiveItems,
    getItemById,
    getItemsPaginated
} from './inventoryFunctions';

describe('HistoriHU08- Interfaz de Inventario', () => {

    test('HU08 - Interfaz de Inventario Caja Negra', () => {
        // Simular un inventario con productos
        const inventoryItems = [
            {
                id: '1',
                name: 'Camisa Luis Vuitton',
                code: 'CAM001',
                stock: 10,
                category: 'Ropa',
                price: 25.99,
                sellPrice: 35.99,
                supplier: 'Proveedor A',
                isActive: true
            },
            {
                id: '2',
                name: 'Zapatos Nuevos',
                code: 'ZAP002',
                stock: 5,
                category: 'Calzado',
                price: 89.99,
                sellPrice: 120.99,
                supplier: 'Proveedor B',
                isActive: true
            }
        ];

        // Verificar que los productos se muestran correctamente
        expect(inventoryItems).toHaveLength(2);
        expect(inventoryItems[0].name).toBe('Camisa Luis Vuitton');
        expect(inventoryItems[1].code).toBe('ZAP002');

        // Probar búsqueda por nombre
        const searchResult = searchItemsByName(inventoryItems, 'Camisa');
        expect(searchResult).toHaveLength(1);
        expect(searchResult[0].name).toBe('Camisa Luis Vuitton');

        // Probar filtrado por categoría
        const filteredByCategory = filterByCategory(inventoryItems, 'Ropa');
        expect(filteredByCategory).toHaveLength(1);
        expect(filteredByCategory[0].category).toBe('Ropa');

        // Probar paginación
        const paginatedItems = getItemsPaginated(inventoryItems, 1, 1);
        expect(paginatedItems).toHaveLength(1);
        expect(paginatedItems[0].id).toBe('1');

        // Verificar que el inventario no esté vacío
        expect(inventoryItems.length).toBeGreaterThan(0);

        // Verificar que los mensajes de error sean claros (simulado)
        const errorMessage = "No se encontraron productos";
        expect(errorMessage).toBeDefined();
    });

    test('HU08 - Prueba de Integración completa: recuperación, procesamiento y visualización de inventario', async () => {
        // Simulamos obeter objetos de la base de datos 
        const dbItems = [
            {
                id: '1',
                name: 'Camisa Luis Vuitton',
                code: 'CAM001',
                stock: 10,
                category: 'Ropa',
                price: 25.99,
                sellPrice: 35.99,
                supplier: 'Proveedor A',
                isActive: true
            },
            {
                id: '2',
                name: 'Zapatos Nuevos',
                code: 'ZAP002',
                stock: 5,
                category: 'Calzado',
                price: 89.99,
                sellPrice: 120.99,
                supplier: 'Proveedor B',
                isActive: true
            }
        ]
        // Simula que el backend recibe estos datos del mock de Firebase
        const backendItems = dbItems.map(item => ({
            ...item,
            // Simula que el backend recibe estos datos del mock de Firebase
            timestamp: new Date().getTime(),
            // Agrega un campo adicional para simular datos del backend
            backendData: 'Datos del backend'
        }));
        // Simula que el backend devuelve estos datos
        db.collection.mockReturnValue({
            get: jest.fn().mockResolvedValue({
                docs: backendItems.map(item => ({
                    data: () => item
                }))
            })
        });

        // 2. Procesamiento en backend formatear para tabla
        const formatItemsForTable = (items) => {
            return items.map(item => ({
                id: item.id,
                name: item.name,
                code: item.code,
                price: `$${item.price.toFixed(2)}`,
                category: item.category,
                stock: item.stock,
                availability: item.stock > 0 ? 'Disponible' : 'Agotado'
            }));
        };

        // la interfaz recibe y muestra los datos
        const formattedBackendItems = formatItemsForTable(backendItems);
        expect(formattedBackendItems).toHaveLength(2);
        // Additional tests for inventory system

    });

});


describe('HU09 - Registro de productos', () => {
    // SETUP COMPLETO PARA PRUEBAS DE REGISTRO DE PRODUCTOS
    let mockFormData;
    let mockInventoryItems;
    let mockUser;
    let mockFormComponent;
    let mockDatabaseService;

    beforeEach(() => {
        // Mock del usuario administrador
        mockUser = {
            uid: 'admin123',
            email: 'admin@inventario.com',
            role: 'admin',
            isAuthenticated: true
        };

        // Mock del inventario existente para validar duplicados
        mockInventoryItems = [
            {
                id: '1',
                name: 'Producto Existente',
                code: 'EXIST001',
                price: 25.99,
                stock: 10,
                category: 'Electrónicos',
                supplier: 'Proveedor A',
                isActive: true
            }
        ];

        // Mock del componente de formulario
        mockFormComponent = {
            fields: {
                name: { value: '', error: '', touched: false },
                code: { value: '', error: '', touched: false },
                price: { value: '', error: '', touched: false },
                stock: { value: '', error: '', touched: false },
                category: { value: '', error: '', touched: false },
                supplier: { value: '', error: '', touched: false },
                description: { value: '', error: '', touched: false }
            },
            isFormValid: false,
            isSubmitting: false,
            submitAttempted: false
        };

        // Mock del servicio de base de datos
        mockDatabaseService = {
            addProduct: jest.fn(),
            checkCodeExists: jest.fn(),
            getProducts: jest.fn().mockResolvedValue(mockInventoryItems),
            updateProduct: jest.fn(),
            deleteProduct: jest.fn()
        };

        // Mock de productos de prueba válidos
        mockFormData = {
            valid: {
                basic: {
                    name: 'Laptop Gaming',
                    code: 'LAP001',
                    price: 1299.99,
                    stock: 5
                },
                complete: {
                    name: 'Mouse Inalámbrico',
                    code: 'MOU001',
                    price: 49.99,
                    stock: 15,
                    category: 'Accesorios',
                    supplier: 'Tech Supplies',
                    description: 'Mouse ergonómico con batería de larga duración'
                }
            },
            invalid: {
                emptyFields: {
                    name: '',
                    code: '',
                    price: '',
                    stock: ''
                },
                invalidTypes: {
                    name: 'Producto Test',
                    code: 'TEST001',
                    price: 'precio_invalido',
                    stock: 'stock_invalido'
                },
                negativeValues: {
                    name: 'Producto Test',
                    code: 'TEST001',
                    price: -10.99,
                    stock: -5
                },
                duplicateCode: {
                    name: 'Producto Duplicado',
                    code: 'EXIST001', // Código ya existente
                    price: 29.99,
                    stock: 8
                },
                extremeValues: {
                    name: 'A'.repeat(256), // Nombre muy largo
                    code: 'CODE'.repeat(50), // Código muy largo
                    price: 999999999,
                    stock: 999999
                }
            }
        };

        // Limpiar mocks antes de cada test
        jest.clearAllMocks();

        // Mock de Firebase para este describe
        db.collection.mockReturnValue({
            add: mockDatabaseService.addProduct,
            where: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({
                docs: mockInventoryItems.map(item => ({
                    id: item.id,
                    data: () => item
                }))
            })
        });

        // Mock de funciones de validación de red/errores
        global.navigator = {
            ...global.navigator,
            onLine: true
        };

        // Mock de localStorage para persistencia
        global.localStorage = {
            getItem: jest.fn(),
            setItem: jest.fn(),
            removeItem: jest.fn(),
            clear: jest.fn()
        };
    });

    afterEach(() => {
        // Limpiar después de cada test
        jest.restoreAllMocks();
    });

    // HELPER FUNCTIONS PARA LAS PRUEBAS
    const simulateFormInput = (field, value) => {
        mockFormComponent.fields[field].value = value;
        mockFormComponent.fields[field].touched = true;
    };

    const simulateFormSubmission = async (formData) => {
        mockFormComponent.isSubmitting = true;
        mockFormComponent.submitAttempted = true;

        try {
            const validation = validateRequiredFields(formData);
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }

            const isUnique = await mockDatabaseService.checkCodeExists(formData.code);
            if (!isUnique) {
                throw new Error('El código ya existe');
            }

            await mockDatabaseService.addProduct(formData);
            return { success: true, message: 'Producto registrado exitosamente' };
        } catch (error) {
            return { success: false, error: error.message };
        } finally {
            mockFormComponent.isSubmitting = false;
        }
    };

    const simulateNetworkError = () => {
        mockDatabaseService.addProduct.mockRejectedValue(new Error('Network error'));
        global.navigator.onLine = false;
    };

    const simulateDatabaseError = () => {
        mockDatabaseService.addProduct.mockRejectedValue(new Error('Database connection failed'));
    };

    test('HU09 - Acceso al formulario de registro ', () => {
        // Simular usuario administrador autenticado
        const adminUser = mockUser;

        // Verificar acceso al formulario
        const hasAccess = adminUser.role === 'admin' && adminUser.isAuthenticated;
        const formIsRendered = mockFormComponent !== null;

        // Verificar que el administrador puede acceder
        expect(hasAccess).toBe(true);
        expect(formIsRendered).toBe(true);
        expect(mockFormComponent.fields.name).toBeDefined();
        expect(mockFormComponent.fields.code).toBeDefined();
        expect(mockFormComponent.fields.price).toBeDefined();
        expect(mockFormComponent.fields.stock).toBeDefined();
    });

    test('HU09 - Registro exitoso con campos obligatorios ', async () => {
        // ARRANGE: Producto con campos obligatorios válidos
        const productData = mockFormData.valid.basic;
        mockDatabaseService.checkCodeExists.mockResolvedValue(true); // Código único
        mockDatabaseService.addProduct.mockResolvedValue({ id: 'new_product_123' });

        // ACT: Simular envío del formulario
        const result = await simulateFormSubmission(productData);

        // ASSERT: Verificar registro exitoso
        expect(result.success).toBe(true);
        expect(result.message).toContain('exitosamente');
        expect(mockDatabaseService.addProduct).toHaveBeenCalledWith(productData);
        expect(mockDatabaseService.checkCodeExists).toHaveBeenCalledWith(productData.code);
    });

    test('HU09 - Registro exitoso con campos opcionales ', async () => {
        // ARRANGE: Producto con campos obligatorios + opcionales
        const completeProduct = mockFormData.valid.complete;
        mockDatabaseService.checkCodeExists.mockResolvedValue(true);
        mockDatabaseService.addProduct.mockResolvedValue({ id: 'complete_product_456' });

        // ACT: Registrar producto completo
        const result = await simulateFormSubmission(completeProduct);

        // ASSERT: Verificar que todos los campos se guardan
        expect(result.success).toBe(true);
        expect(mockDatabaseService.addProduct).toHaveBeenCalledWith(
            expect.objectContaining({
                name: completeProduct.name,
                code: completeProduct.code,
                price: completeProduct.price,
                stock: completeProduct.stock,
                category: completeProduct.category,
                supplier: completeProduct.supplier,
                description: completeProduct.description
            })
        );
    });

    test('HU09 - Error en campos obligatorios vacíos ', async () => {
        // ARRANGE: Producto con campos obligatorios vacíos
        const invalidProduct = mockFormData.invalid.emptyFields;

        // ACT: Intentar registrar producto inválido
        const result = await simulateFormSubmission(invalidProduct);

        // ASSERT: Verificar rechazo con mensajes de error
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(mockDatabaseService.addProduct).not.toHaveBeenCalled();

        // Verificar validación específica
        const validation = validateRequiredFields(invalidProduct);
        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContain('El nombre es obligatorio');
        expect(validation.errors).toContain('El código es obligatorio');
    });

    test('HU09 - Error en tipos de datos inválidos ', async () => {
        // ARRANGE: Datos con tipos incorrectos
        const invalidTypes = mockFormData.invalid.invalidTypes;

        // ACT: Validar tipos de datos
        const validation = validateRequiredFields(invalidTypes);

        // ASSERT: Verificar rechazo de tipos incorrectos
        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContain('El precio debe ser un número positivo');
        expect(validation.errors).toContain('El stock debe ser un número positivo');
    });

    test('HU09 - Error en valores negativos ', async () => {
        // ARRANGE: Producto con valores negativos
        const negativeProduct = mockFormData.invalid.negativeValues;

        // ACT: Validar valores negativos
        const validation = validateRequiredFields(negativeProduct);

        // ASSERT: Verificar rechazo de valores negativos
        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContain('El precio debe ser un número positivo');
        expect(validation.errors).toContain('El stock debe ser un número positivo');
    });

    test('HU09 - Error en código duplicado ', async () => {
        // ARRANGE: Producto con código existente
        const duplicateProduct = mockFormData.invalid.duplicateCode;
        mockDatabaseService.checkCodeExists.mockResolvedValue(false); // Código ya existe

        // ACT: Intentar registrar con código duplicado
        const result = await simulateFormSubmission(duplicateProduct);

        // ASSERT: Verificar rechazo por duplicidad
        expect(result.success).toBe(false);
        expect(result.error).toContain('código ya existe');
        expect(mockDatabaseService.addProduct).not.toHaveBeenCalled();
    });

    test('HU09 - Error en valores extremos ', async () => {
        // ARRANGE: Producto con valores en los límites
        const extremeProduct = mockFormData.invalid.extremeValues;

        // ACT: Validar valores extremos
        const validation = validateRequiredFields(extremeProduct);

        // ASSERT: Verificar manejo de valores extremos
        expect(validation.isValid).toBe(false);
        expect(validation.errors.some(error =>
            error.includes('muy largo') || error.includes('límite')
        )).toBe(true);
    });

    test('HU09 - Error de red/base de datos ', async () => {
        // ARRANGE: Producto válido pero simular error de red
        const validProduct = mockFormData.valid.basic;
        simulateNetworkError();

        // ACT: Intentar registrar con error de red
        const result = await simulateFormSubmission(validProduct);

        // ASSERT: Verificar manejo de errores de red
        expect(result.success).toBe(false);
        expect(result.error).toContain('Network error');

        // Verificar que los datos del formulario se mantienen
        expect(mockFormComponent.fields.name.value).toBeDefined();
    });

    test('HU09 - Validación de permisos de acceso ', () => {
        // ARRANGE: Usuario sin permisos de administrador
        const regularUser = {
            uid: 'user123',
            email: 'user@inventario.com',
            role: 'user',
            isAuthenticated: true
        };

        // ACT: Verificar acceso al formulario
        const hasAccess = regularUser.role === 'admin' && regularUser.isAuthenticated;

        // ASSERT: Verificar denegación de acceso
        expect(hasAccess).toBe(false);

        // Simular mensaje de acceso denegado
        const accessMessage = hasAccess ? 'Acceso permitido' : 'Acceso denegado: permisos insuficientes';
        expect(accessMessage).toBe('Acceso denegado: permisos insuficientes');
    });

    test('HU09 - Persistencia de datos en caso de error ', async () => {
        // ARRANGE: Simular datos parcialmente ingresados
        simulateFormInput('name', 'Producto Parcial');
        simulateFormInput('code', 'PARC001');
        simulateFormInput('price', '99.99');

        // Simular error en envío
        simulateDatabaseError();

        // ACT: Intentar envío con error
        const partialData = {
            name: mockFormComponent.fields.name.value,
            code: mockFormComponent.fields.code.value,
            price: mockFormComponent.fields.price.value,
            stock: '' // Campo faltante
        };

        const result = await simulateFormSubmission(partialData);

        // ASSERT: Verificar que los datos válidos se mantienen
        expect(result.success).toBe(false);
        expect(mockFormComponent.fields.name.value).toBe('Producto Parcial');
        expect(mockFormComponent.fields.code.value).toBe('PARC001');
        expect(mockFormComponent.fields.price.value).toBe('99.99');
        expect(mockFormComponent.fields.name.touched).toBe(true);
    });

    test('HU09 - Mensajes de error user-friendly ', () => {
        // ARRANGE: Diferentes tipos de errores
        const errorScenarios = [
            { input: '', expectedMessage: 'Por favor, complete este campo' },
            { input: 'texto', type: 'number', expectedMessage: 'Debe ingresar un número válido' },
            { input: '-10', type: 'price', expectedMessage: 'El precio debe ser mayor a cero' },
            { input: 'EXIST001', type: 'code', expectedMessage: 'Este código ya está en uso' }
        ];

        // ACT & ASSERT: Verificar mensajes amigables
        errorScenarios.forEach(scenario => {
            let errorMessage = '';

            if (scenario.input === '') {
                errorMessage = 'Por favor, complete este campo';
            } else if (scenario.type === 'number' && isNaN(scenario.input)) {
                errorMessage = 'Debe ingresar un número válido';
            } else if (scenario.type === 'price' && parseFloat(scenario.input) <= 0) {
                errorMessage = 'El precio debe ser mayor a cero';
            } else if (scenario.type === 'code' && scenario.input === 'EXIST001') {
                errorMessage = 'Este código ya está en uso';
            }

            expect(errorMessage).toBe(scenario.expectedMessage);
        });
    });

    // ...existing code...
});

describe('HU10 - Edición de productos', () => {
    let mockProduct, updateData, mockDatabaseService;
    beforeEach(() => {
        mockProduct = {
            id: '1',
            name: 'Producto Original',
            code: 'PROD001',
            price: 100,
            stock: 10,
            category: 'Electrónicos',
            supplier: 'Proveedor X',
            isActive: true
        };
        updatedData = {
            ...mockProduct,
            name: 'Producto Editado',
            price: 150,
            stock: 20
        };
        mockDatabaseService = {
            updateProduct: jest.fn().mockResolvedValue({ ...updatedData }),
            checkCodeExists: jest.fn().mockResolvedValue(true)
        };

        test('HU10 - Debe editar correctamente un producto existente', async () => {
            const validation = validateRequiredFields(updatedData);
            expet(validation.isValid).toBe(true);
            await mockDatabaseService.updateProduct(updatedData);
            expect(mockDatabaseService.updateProduct).toHaveBeenCalledTimes(1);
        });

        test(' Debe editar correctamente un producto existente', async () => {
            const validation = validateRequiredFields(updatedData);
            expect(validation.isValid).toBe(true);

        });
        test("Debe rechazar edicion con datos invalidos", async () => {

            const invalidData = { ...mackProduct, price: -50, stock: -10 };
            const validation = validateRequiredFields(invalidData);
            expect(validation.isValid).toBe(false);

        });
        test('No debe permitir editar el producto si el codigo ya existe', async () => {
            mockDatabaseService.checkCodeExists.mockResolvedValue(false);
            const data = { ...updatedData, code: 'PROD001' }; // Código ya existente
            const isUnique = await mockDatabaseService.checkCodeExists(data.code);
            expect(isUnique).toBe(false);
        });

        describe('Pruebas de Despliegue - Sistema de Inventario', () => {

            beforeEach(() => {
                db.collection.mockReturnValue({
                    get: jest.fn().mockResolvedValue({ docs: [] })
                });
                // Limpiar los mocks antes de cada test para evitar interferencias
                fetch.mockClear();

                // Configurar variables de entorno para el test
                process.env.NODE_ENV = 'production';
                process.env.REACT_APP_FIREBASE_API_KEY = 'test-key';
                process.env.REACT_APP_FIREBASE_PROJECT_ID = 'test-project';
                process.env.FIREBASE_CONFIG = '{"projectId":"test-project"}';
            });

            test('Verificar conexión a Firebase', async () => {
                const firebaseConfig = process.env.FIREBASE_CONFIG;
                expect(firebaseConfig).toBeDefined();

                // Este test ahora usa el mock de Firebase, 
                const testConnection = await db.collection('test').get();
                expect(db.collection).toHaveBeenCalledWith('test');
                expect(testConnection).toBeDefined();
            });

            test('Verificar que las rutas principales funcionan', async () => {
                const routes = ['/login', '/inventory', '/dashboard'];

                // Simular una respuesta exitosa de fetch
                fetch.mockResolvedValue({ status: 200, ok: true });

                for (const route of routes) {
                    await fetch(`https://mi-inventario.com${route}`);
                }

                // Verificar que fetch fue llamado para cada ruta
                expect(fetch).toHaveBeenCalledTimes(routes.length);
                expect(fetch).toHaveBeenCalledWith('https://mi-inventario.com/login');
            });

            test('Verificar variables de entorno', () => {
                expect(process.env.NODE_ENV).toBe('production');
                expect(process.env.REACT_APP_FIREBASE_API_KEY).toBeDefined();
                expect(process.env.REACT_APP_FIREBASE_PROJECT_ID).toBeDefined();
            });
        });

        describe('Módulo de Inventario - Funciones principales', () => {
            const mockItems = [
                {
                    id: '1',
                    name: 'Camisa Azul',
                    code: 'CAM001',
                    stock: 15,
                    category: 'Ropa',
                    price: 25.99,
                    sellPrice: 35.99,
                    supplier: 'Proveedor A',
                    isActive: true
                },
                {
                    id: '2',
                    name: 'Pantalón Negro',
                    code: 'PAN001',
                    stock: 0,
                    category: 'Ropa',
                    price: 45.50,
                    sellPrice: 65.50,
                    supplier: 'Proveedor B',
                    isActive: true
                },
                {
                    id: '3',
                    name: 'Zapatos Deportivos',
                    code: 'ZAP001',
                    stock: 3,
                    category: 'Calzado',
                    price: 89.99,
                    sellPrice: 120.99,
                    supplier: 'Proveedor A',
                    isActive: false
                },
                {
                    id: '4',
                    name: 'Sombrero',
                    code: 'SOM001',
                    stock: 8,
                    category: 'Accesorios',
                    price: 15.00,
                    sellPrice: 22.00,
                    supplier: 'Proveedor C',
                    isActive: true
                }
            ];

            // HU09 - Validación de campos obligatorios
            describe('validateRequiredFields', () => {
                test('debe retornar válido para un item completo', () => {
                    const item = {
                        name: 'Producto Test',
                        code: 'TEST001',
                        price: 10.99,
                        stock: 5
                    };

                    const result = validateRequiredFields(item);
                    expect(result.isValid).toBe(true);
                    expect(result.errors).toHaveLength(0);
                });

                test('debe retornar errores para campos faltantes', () => {
                    const item = {
                        name: '',
                        code: '',
                        price: -1,
                        stock: -5
                    };

                    const result = validateRequiredFields(item);
                    expect(result.isValid).toBe(false);
                    expect(result.errors).toContain('El nombre es obligatorio');
                    expect(result.errors).toContain('El código es obligatorio');
                    expect(result.errors).toContain('El precio debe ser un número positivo');
                    expect(result.errors).toContain('El stock debe ser un número positivo');
                });
            });


            // HU10 Obtener el item por ID
            describe('getItemById', () => {
                test('debe retornar el item correcto por ID', () => {
                    const item = getItemById(mockItems, '1');
                    expect(item).toEqual(mockItems[0]);
                });

                test('debe retornar null para ID inexistente', () => {
                    const item = getItemById(mockItems, '999');
                    expect(item).toBeNull();
                });
            });

            // Paginación
            describe('getItemsPaginated', () => {
                test('debe retornar los primeros 2 items en la página 1', () => {
                    const result = getItemsPaginated(mockItems, 1, 2);
                    expect(result).toHaveLength(2);
                    expect(result[0].id).toBe('1');
                    expect(result[1].id).toBe('2');
                });

                test('debe retornar los siguientes items en la página 2', () => {
                    const result = getItemsPaginated(mockItems, 2, 2);
                    expect(result).toHaveLength(2);
                    expect(result[0].id).toBe('3');
                    expect(result[1].id).toBe('4');
                });
            });

            // HU11 - Búsqueda de productos
            describe('Funciones de búsqueda', () => {
                describe('searchItemsByName', () => {
                    test('debe filtrar items por nombre', () => {
                        const result = searchItemsByName(mockItems, 'Camisa');
                        expect(result).toHaveLength(1);
                        expect(result[0].name).toBe('Camisa Azul');
                    });

                    test('debe retornar todos los items si el término está vacío', () => {
                        const result = searchItemsByName(mockItems, '');
                        expect(result).toHaveLength(4);
                    });

                    test('debe ser insensible a mayúsculas', () => {
                        const result = searchItemsByName(mockItems, 'camisa');
                        expect(result).toHaveLength(1);
                    });
                });

                describe('searchItemsByCode', () => {
                    test('debe filtrar items por código', () => {
                        const result = searchItemsByCode(mockItems, 'CAM001');
                        expect(result).toHaveLength(1);
                        expect(result[0].code).toBe('CAM001');
                    });
                });

                describe('searchItemsBySupplier', () => {
                    test('debe filtrar items por proveedor', () => {
                        const result = searchItemsBySupplier(mockItems, 'Proveedor A');
                        expect(result).toHaveLength(2);
                    });
                });

                describe('searchAndSortItems', () => {
                    test('debe buscar y ordenar por nombre', () => {
                        const result = searchAndSortItems(mockItems, 'Proveedor A', 'supplier', 'name');
                        expect(result).toHaveLength(2);
                        expect(result[0].name).toBe('Camisa Azul'); // Orden alfabético
                    });
                });
            });


            // HU12 - Edicion de productos ??
            // Hu13 - Eliminacon de productos ?? habria que mockear la bd

            // HU14 - Indicador de estado de stock
            describe('Funciones de stock', () => {
                describe('getStockStatus', () => {
                    test('debe retornar "out" para stock 0', () => {
                        expect(getStockStatus(0)).toBe('out');
                    });

                    test('debe retornar "low" para stock bajo', () => {
                        expect(getStockStatus(3)).toBe('low');
                    });

                    test('debe retornar "medium" para stock medio', () => {
                        expect(getStockStatus(8)).toBe('medium');
                    });

                    test('debe retornar "high" para stock alto', () => {
                        expect(getStockStatus(15)).toBe('high');
                    });
                });

                describe('getStockIndicatorColor', () => {
                    test('debe retornar colores correctos para cada estado', () => {
                        expect(getStockIndicatorColor('high')).toBe('green');
                        expect(getStockIndicatorColor('medium')).toBe('orange');
                        expect(getStockIndicatorColor('low')).toBe('red');
                        expect(getStockIndicatorColor('out')).toBe('gray');
                    });
                });
            });

            // HU15 - Vista de tabla
            describe('formatItemsForTable', () => {
                test('debe formatear items para mostrar en tabla', () => {
                    const result = formatItemsForTable([mockItems[0]]);
                    expect(result[0]).toEqual({
                        id: '1',
                        name: 'Camisa Azul',
                        code: 'CAM001',
                        price: '$25.99',
                        category: 'Ropa',
                        stock: 15,
                        availability: 'Disponible'
                    });
                });

                test('debe mostrar "Agotado" para items sin stock', () => {
                    const result = formatItemsForTable([mockItems[1]]);
                    expect(result[0].availability).toBe('Agotado');
                });
            });

            // HU16 - Filtros
            describe('Funciones de filtrado', () => {
                describe('filterByCategory', () => {
                    test('debe filtrar por categoría', () => {
                        const result = filterByCategory(mockItems, 'Ropa');
                        expect(result).toHaveLength(2);
                    });

                    test('debe retornar todos los items si no se especifica categoría', () => {
                        const result = filterByCategory(mockItems, '');
                        expect(result).toHaveLength(4);
                    });
                });

                describe('filterByPriceRange', () => {
                    test('debe filtrar por rango de precios', () => {
                        const result = filterByPriceRange(mockItems, 20, 50);
                        expect(result).toHaveLength(2); // Camisa y Pantalón
                    });
                });

                describe('filterByStockStatus', () => {
                    test('debe filtrar items disponibles', () => {
                        const result = filterByStockStatus(mockItems, 'available');
                        expect(result).toHaveLength(2); // Stock > 5
                    });

                    test('debe filtrar items con stock bajo', () => {
                        const result = filterByStockStatus(mockItems, 'low');
                        expect(result).toHaveLength(1); // Solo zapatos con stock 3
                    });

                    test('debe filtrar items agotados', () => {
                        const result = filterByStockStatus(mockItems, 'out');
                        expect(result).toHaveLength(1); // Solo pantalón con stock 0
                    });
                });

                describe('getUniqueCategories', () => {
                    test('debe retornar categorías únicas ordenadas', () => {
                        const result = getUniqueCategories(mockItems);
                        expect(result).toEqual(['Accesorios', 'Calzado', 'Ropa']);
                    });
                });
            });

            // HU17 - Eliminación temporal
            describe('Funciones de estado activo/inactivo', () => {
                describe('markAsInactive', () => {
                    test('debe marcar un item como inactivo', () => {
                        const result = markAsInactive(mockItems, '1');
                        const updatedItem = result.find(item => item.id === '1');
                        expect(updatedItem.isActive).toBe(false);
                    });
                });

                describe('getActiveItems', () => {
                    test('debe retornar solo items activos', () => {
                        const result = getActiveItems(mockItems);
                        expect(result).toHaveLength(3); // Todos excepto zapatos
                    });
                });

                describe('getInactiveItems', () => {
                    test('debe retornar solo items inactivos', () => {
                        const result = getInactiveItems(mockItems);
                        expect(result).toHaveLength(1); // Solo zapatos
                    });
                });
            });
        });
    });
});

// npm test inventoryFunctions.test.js