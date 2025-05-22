/**
 * @jest-environment jsdom
 */
import { sortByStock, sortByCategory, sortById, sortByName } from './itemsRecovery.js';

describe('Funciones de ordenamiento de items', () => {
    const items = [
        { id: 'b2', name: 'Zapato', stock: 5, category: 'Calzado' },
        { id: 'a1', name: 'Camisa', stock: 10, category: 'Ropa' },
        { id: 'c3', name: 'Pantalón', stock: 0, category: 'Ropa' },
        { id: 'd4', name: 'Sombrero', stock: 2, category: 'Accesorios' },
    ];

    test('sortByStock ordena por stock descendente', () => {
        expect(sortByStock(items)).toEqual([
            { id: 'a1', name: 'Camisa', stock: 10, category: 'Ropa' },
            { id: 'b2', name: 'Zapato', stock: 5, category: 'Calzado' },
            { id: 'd4', name: 'Sombrero', stock: 2, category: 'Accesorios' },
            { id: 'c3', name: 'Pantalón', stock: 0, category: 'Ropa' },
        ]);
    });

    test('sortByCategory ordena por categoría alfabética', () => {
        expect(sortByCategory(items)).toEqual([
            { id: 'd4', name: 'Sombrero', stock: 2, category: 'Accesorios' },
            { id: 'b2', name: 'Zapato', stock: 5, category: 'Calzado' },
            { id: 'a1', name: 'Camisa', stock: 10, category: 'Ropa' },
            { id: 'c3', name: 'Pantalón', stock: 0, category: 'Ropa' },
        ]);
    });

    test('sortById ordena por id alfabético', () => {
        expect(sortById(items)).toEqual([
            { id: 'a1', name: 'Camisa', stock: 10, category: 'Ropa' },
            { id: 'b2', name: 'Zapato', stock: 5, category: 'Calzado' },
            { id: 'c3', name: 'Pantalón', stock: 0, category: 'Ropa' },
            { id: 'd4', name: 'Sombrero', stock: 2, category: 'Accesorios' },
        ]);
    });

    test('sortByName ordena por nombre alfabético', () => {
        expect(sortByName(items)).toEqual([
            { id: 'a1', name: 'Camisa', stock: 10, category: 'Ropa' },
            { id: 'c3', name: 'Pantalón', stock: 0, category: 'Ropa' },
            { id: 'd4', name: 'Sombrero', stock: 2, category: 'Accesorios' },
            { id: 'b2', name: 'Zapato', stock: 5, category: 'Calzado' },
        ]);
    });
});