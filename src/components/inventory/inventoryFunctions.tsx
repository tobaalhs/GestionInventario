// inventory.ts - Funciones principales del módulo de inventario
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc } from "firebase/firestore";
import { db } from "../../firebase/config";

export type Item = {
    id: string;
    name: string;
    code: string;
    stock: number;
    category: string;
    price: number;
    sellPrice: number;
    supplier: string;
    description?: string;
    imageUrl?: string;
    createdAt?: Date;
    updatedAt?: Date;
    isActive: boolean;
};

// HU08 - Interfaz de Inventario
export async function getAllItems(): Promise<Item[]> {
    const q = collection(db, "items");
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
    })) as Item[];
}

// Función para obtener items paginados (20 por página por defecto)
export function getItemsPaginated(items: Item[], page: number = 1, itemsPerPage: number = 20): Item[] {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
}

// HU09 - Registro de Productos
export async function addItem(itemData: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const newItem = {
        ...itemData,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
    };
    
    const docRef = await addDoc(collection(db, "items"), newItem);
    return docRef.id;
}

// Validación de campos obligatorios
export function validateRequiredFields(item: Partial<Item>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!item.name || item.name.trim() === '') {
        errors.push('El nombre es obligatorio');
    }
    
    if (!item.code || item.code.trim() === '') {
        errors.push('El código es obligatorio');
    }
    
    if (item.price === undefined || item.price < 0) {
        errors.push('El precio debe ser un número positivo');
    }
    
    if (item.stock === undefined || item.stock < 0) {
        errors.push('El stock debe ser un número positivo');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

// Validación de código único
export function isCodeUnique(code: string, existingItems: Item[]): boolean {
    return !existingItems.some(item => item.code === code);
}

// HU10 - Interfaz de Productos (Modal de detalles)
export function getItemById(items: Item[], id: string): Item | null {
    return items.find(item => item.id === id) || null;
}

// HU11 - Búsqueda de Productos
export function searchItemsByName(items: Item[], searchTerm: string): Item[] {
    if (!searchTerm.trim()) return items;
    
    const term = searchTerm.toLowerCase().trim();
    return items.filter(item => 
        item.name.toLowerCase().includes(term)
    );
}

export function searchItemsByCode(items: Item[], code: string): Item[] {
    if (!code.trim()) return items;
    
    const term = code.toLowerCase().trim();
    return items.filter(item => 
        item.code.toLowerCase().includes(term)
    );
}

export function searchItemsBySupplier(items: Item[], supplier: string): Item[] {
    if (!supplier.trim()) return items;
    
    const term = supplier.toLowerCase().trim();
    return items.filter(item => 
        item.supplier.toLowerCase().includes(term)
    );
}

// Función de búsqueda combinada con ordenamiento
export function searchAndSortItems(
    items: Item[], 
    searchTerm: string, 
    searchType: 'name' | 'code' | 'supplier',
    sortBy: 'name' | 'price' | 'stock' = 'name'
): Item[] {
    let filteredItems: Item[] = [];
    
    switch (searchType) {
        case 'name':
            filteredItems = searchItemsByName(items, searchTerm);
            break;
        case 'code':
            filteredItems = searchItemsByCode(items, searchTerm);
            break;
        case 'supplier':
            filteredItems = searchItemsBySupplier(items, searchTerm);
            break;
        default:
            filteredItems = items;
    }
    
    // Usar las funciones de ordenamiento existentes
    switch (sortBy) {
        case 'name':
            return filteredItems.sort((a, b) => a.name.localeCompare(b.name));
        case 'price':
            return filteredItems.sort((a, b) => b.price - a.price);
        case 'stock':
            return filteredItems.sort((a, b) => b.stock - a.stock);
        default:
            return filteredItems;
    }
}

// HU12 - Edición de Productos
export async function updateItem(id: string, updates: Partial<Item>): Promise<void> {
    const itemRef = doc(db, "items", id);
    const updateData = {
        ...updates,
        updatedAt: new Date()
    };
    
    await updateDoc(itemRef, updateData);
}

// HU13 - Eliminación de Productos
export async function deleteItem(id: string): Promise<void> {
    const itemRef = doc(db, "items", id);
    await deleteDoc(itemRef);
}

// Eliminación temporal (marcar como inactivo)
export async function softDeleteItem(id: string): Promise<void> {
    await updateItem(id, { isActive: false });
}

// HU14 - Indicador de Estado de Stock
export function getStockStatus(stock: number, minStock: number = 5): 'high' | 'medium' | 'low' | 'out' {
    if (stock === 0) return 'out';
    if (stock <= minStock) return 'low';
    if (stock <= minStock * 2) return 'medium';
    return 'high';
}

export function getStockIndicatorColor(status: 'high' | 'medium' | 'low' | 'out'): string {
    switch (status) {
        case 'high': return 'green';
        case 'medium': return 'orange';
        case 'low': return 'red';
        case 'out': return 'gray';
        default: return 'gray';
    }
}

// HU15 - Vista de Tabla de Inventario
export function formatItemsForTable(items: Item[]): Array<{
    id: string;
    name: string;
    code: string;
    price: string;
    category: string;
    stock: number;
    availability: string;
}> {
    return items.map(item => ({
        id: item.id,
        name: item.name,
        code: item.code,
        price: `$${item.price.toFixed(2)}`,
        category: item.category,
        stock: item.stock,
        availability: item.stock > 0 ? 'Disponible' : 'Agotado'
    }));
}

// HU16 - Filtro de Búsqueda
export function filterByCategory(items: Item[], category: string): Item[] {
    if (!category) return items;
    return items.filter(item => item.category === category);
}

export function filterByPriceRange(items: Item[], minPrice: number, maxPrice: number): Item[] {
    return items.filter(item => item.price >= minPrice && item.price <= maxPrice);
}

export function filterByStockStatus(items: Item[], status: 'available' | 'low' | 'out'): Item[] {
    switch (status) {
        case 'available':
            return items.filter(item => item.stock > 5);
        case 'low':
            return items.filter(item => item.stock > 0 && item.stock <= 5);
        case 'out':
            return items.filter(item => item.stock === 0);
        default:
            return items;
    }
}

// Obtener categorías únicas para filtros
export function getUniqueCategories(items: Item[]): string[] {
    const categories = items.map(item => item.category);
    const uniqueCategories = Array.from(new Set(categories));
    return uniqueCategories.sort();
}

// HU17 - Eliminación Temporal
export function markAsInactive(items: Item[], id: string): Item[] {
    return items.map(item => 
        item.id === id ? { ...item, isActive: false } : item
    );
}

export function getActiveItems(items: Item[]): Item[] {
    return items.filter(item => item.isActive);
}

export function getInactiveItems(items: Item[]): Item[] {
    return items.filter(item => !item.isActive);
}