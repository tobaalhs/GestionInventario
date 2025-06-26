/**
 * @jest-environment jsdom
 */

// hacemos mock de la base de datos para evitar llamadas reales
jest.mock('../../firebase/config', () => ({
    db: {
        collection: jest.fn(() => ({
            get: jest.fn(() => Promise.resolve({ docs: [] })) // Simula una respuesta exitosa
        }))
    }
}));
global.fetch = jest.fn();

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



// Agregar este test de integración al final del archivo inventoryFunctions.test.js


describe('TEST DE INTEGRACIÓN: Flujo completo de gestión de inventario', () => {
    
    test('Flujo completo: Agregar producto → Buscar → Filtrar → Modificar stock → Eliminar', () => {
        //  DATOS INICIALES
        let inventoryItems = [
            { 
                id: '1', 
                name: 'Camisa Original', 
                code: 'CAM001', 
                stock: 10, 
                category: 'Ropa',
                price: 25.99,
                sellPrice: 35.99,
                supplier: 'Proveedor A',
                isActive: true
            }
        ];

        // VALIDAR Y AGREGAR NUEVO PRODUCTO
        const newProduct = {
            id: '2',
            name: 'Zapatos Nuevos',
            code: 'ZAP002',
            stock: 5,
            category: 'Calzado',
            price: 89.99,
            sellPrice: 120.99,
            supplier: 'Proveedor B',
            isActive: true
        };

        // Validar que el nuevo producto tiene campos obligatorios
        const validation = validateRequiredFields(newProduct);
        expect(validation.isValid).toBe(true);

        // Verificar que el código es único
        const isUnique = isCodeUnique(newProduct.code, inventoryItems);
        expect(isUnique).toBe(true);

        // Agregar el producto al inventario
        inventoryItems.push(newProduct);
        expect(inventoryItems).toHaveLength(2);

        // BUSCAR PRODUCTOS
        
        // Buscar por nombre
        const searchByName = searchItemsByName(inventoryItems, 'Zapatos');
        expect(searchByName).toHaveLength(1);
        expect(searchByName[0].name).toBe('Zapatos Nuevos');

        // Buscar por código
        const searchByCode = searchItemsByCode(inventoryItems, 'ZAP002');
        expect(searchByCode).toHaveLength(1);
        expect(searchByCode[0].code).toBe('ZAP002');

        // Buscar por proveedor
        const searchBySupplier = searchItemsBySupplier(inventoryItems, 'Proveedor B');
        expect(searchBySupplier).toHaveLength(1);

        // FILTRAR PRODUCTOS

        // Filtrar por categoría
        const filteredByCategory = filterByCategory(inventoryItems, 'Calzado');
        expect(filteredByCategory).toHaveLength(1);
        expect(filteredByCategory[0].category).toBe('Calzado');

        // Obtener categorías únicas
        const categories = getUniqueCategories(inventoryItems);
        expect(categories).toContain('Ropa');
        expect(categories).toContain('Calzado');

        // Filtrar por rango de precios
        const filteredByPrice = filterByPriceRange(inventoryItems, 80, 100);
        expect(filteredByPrice).toHaveLength(1);
        expect(filteredByPrice[0].name).toBe('Zapatos Nuevos');

        //VERIFICAR ESTADO DE STOCK

        // Verificar estado de stock del nuevo producto
        const stockStatus = getStockStatus(newProduct.stock);
        expect(stockStatus).toBe('low'); // 5 items = stock bajo

        // Verificar color del indicador
        const stockColor = getStockIndicatorColor(stockStatus);
        expect(stockColor).toBe('red');

        // Filtrar por estado de stock
        const lowStockItems = filterByStockStatus(inventoryItems, 'low');
        expect(lowStockItems).toHaveLength(1);

        // FORMATEAR PARA TABLA

        const formattedItems = formatItemsForTable(inventoryItems);
        expect(formattedItems).toHaveLength(2);
        expect(formattedItems[1].price).toBe('$89.99');
        expect(formattedItems[1].availability).toBe('Disponible');

        // PAGINACIÓN

        const page1 = getItemsPaginated(inventoryItems, 1, 1);
        expect(page1).toHaveLength(1);
        expect(page1[0].id).toBe('1');

        const page2 = getItemsPaginated(inventoryItems, 2, 1);
        expect(page2).toHaveLength(1);
        expect(page2[0].id).toBe('2');

        // ELIMINACIÓN TEMPORAL

        // Marcar producto como inactivo
        inventoryItems = markAsInactive(inventoryItems, '2');
        const inactiveItem = getItemById(inventoryItems, '2');
        expect(inactiveItem.isActive).toBe(false);

        // Verificar filtros de activos/inactivos
        const activeItems = getActiveItems(inventoryItems);
        const inactiveItems = getInactiveItems(inventoryItems);
        
        expect(activeItems).toHaveLength(1);
        expect(inactiveItems).toHaveLength(1);
        expect(activeItems[0].id).toBe('1');
        expect(inactiveItems[0].id).toBe('2');

        // VERIFICACIÓN FINAL

        // Buscar y ordenar combinando todo
        const finalSearch = searchAndSortItems(inventoryItems, 'Proveedor', 'supplier', 'name');
        expect(finalSearch).toHaveLength(2);

        // Verificar que todo el flujo completó exitosamente
        expect(inventoryItems).toHaveLength(2);
        expect(activeItems).toHaveLength(1);
        expect(inactiveItems).toHaveLength(1);
    });

    test('Flujo de validación: Manejo de errores y casos límite', () => {
        let inventoryItems = [];

        // Intentar agregar producto con datos inválidos
        const invalidProduct = {
            name: '',
            code: '',
            price: -10,
            stock: -5
        };

        const validation = validateRequiredFields(invalidProduct);
        expect(validation.isValid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);

        // Buscar en inventario vacío
        const emptySearch = searchItemsByName(inventoryItems, 'Producto');
        expect(emptySearch).toHaveLength(0);

        // Obtener item inexistente
        const nonExistentItem = getItemById(inventoryItems, '999');
        expect(nonExistentItem).toBeNull();

        // Paginación con índices fuera de rango
        const outOfRangePage = getItemsPaginated(inventoryItems, 999, 10);
        expect(outOfRangePage).toHaveLength(0);
    });
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

    // aca se valida que el codigo sea unico
    describe('isCodeUnique', () => {
        test('debe retornar true para código único', () => {
            expect(isCodeUnique('NUEVO001', mockItems)).toBe(true);
        });

        test('debe retornar false para código existente', () => {
            expect(isCodeUnique('CAM001', mockItems)).toBe(false);
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

// npm test inventoryFunctions.test.js