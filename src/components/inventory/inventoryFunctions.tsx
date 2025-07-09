import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, getDoc, Timestamp} from "firebase/firestore";
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
    imageAlt?: string;
    createdAt?: Date;
    updatedAt?: Date;
    isActive: boolean;
};

export type ChangeHistory = {
    id: string;
    itemId: string;
    userId: string;
    userEmail: string;
    timestamp: Date;
    changes: {
        field: string;
        oldValue: any;
        newValue: any;
    }[];
    action: 'create' | 'update' | 'delete';
};

export type ItemBackup = {
    id: string;
    itemData: Item;
    deletedAt: Date;
    deletedBy: string;
    reason?: string;
};

export async function getAllItems(): Promise<Item[]> {
    const q = collection(db, "items");
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
    })) as Item[];
}

export function getItemsPaginated(items: Item[], page: number = 1, itemsPerPage: number = 20): Item[] {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
}

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
    
    if (item.sellPrice === undefined || item.sellPrice < 0) {
        errors.push('El precio de venta debe ser un número positivo');
    }
    
    if (item.stock === undefined || item.stock < 0) {
        errors.push('El stock debe ser un número positivo');
    }
    
    if (item.category === undefined || item.category.trim() === '') {
        errors.push('La categoría es obligatoria');
    }
    
    if (item.supplier === undefined || item.supplier.trim() === '') {
        errors.push('El proveedor es obligatorio');
    }
    
    if (item.imageUrl && !isValidImageUrl(item.imageUrl)) {
        errors.push('La URL de la imagen no es válida');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

export function isValidImageUrl(url: string): boolean {
    if (!url || url.trim() === '') return true;
    
    try {
        const urlObj = new URL(url);
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
            return false;
        }
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
        const pathname = urlObj.pathname.toLowerCase();
        const hasValidExtension = imageExtensions.some(ext => pathname.endsWith(ext));
        
        return hasValidExtension || pathname.includes('image') || url.includes('unsplash') || url.includes('pixabay');
    } catch {
        return false;
    }
}

export function getDefaultImageForCategory(category: string): string {
    const defaultImages: { [key: string]: string } = {
        'Ropa': 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop',
        'Calzado': 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=300&fit=crop',
        'Electrónicos': 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&h=300&fit=crop',
        'Hogar': 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop',
        'Deportes': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop',
        'Libros': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop',
        'Juguetes': 'https://images.unsplash.com/photo-1558877192-2d3d567c0e9a?w=400&h=300&fit=crop',
        'Herramientas': 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop',
        'Accesorios': 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=300&fit=crop',
        'Automóvil': 'https://images.unsplash.com/photo-1494976110309-fd2bc0ba0a31?w=400&h=300&fit=crop'
    };
    
    return defaultImages[category] || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop';
}

export function generateImageUrl(productName: string, category: string, useService: 'unsplash' | 'placeholder' = 'unsplash'): string {
    const searchTerm = category || productName || 'product';
    
    switch (useService) {
        case 'unsplash':
            return `https://source.unsplash.com/400x300/?${encodeURIComponent(searchTerm)}`;
        case 'placeholder':
            return `https://via.placeholder.com/400x300/cccccc/666666?text=${encodeURIComponent(productName)}`;
        default:
            return `https://source.unsplash.com/400x300/?${encodeURIComponent(searchTerm)}`;
    }
}

export function isCodeUnique(code: string, existingItems: Item[]): boolean {
    return !existingItems.some(item => item.code === code);
}

export function getItemById(items: Item[], id: string): Item | null {
    return items.find(item => item.id === id) || null;
}

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

// ESTRATEGIAS DE BÚSQUEDA
export function searchAndSortItems(
    items: Item[], 
    searchTerm: string, 
    searchType: 'name' | 'code' | 'supplier',   // <-- ESTRATEGIA SELECCIONABLE
    sortBy: 'name' | 'price' | 'stock' = 'name'
): Item[] {
    let filteredItems: Item[] = [];
    
    // APLICACIÓN DEL PATRÓN STRATEGY
    switch (searchType) {
        case 'name':
            filteredItems = searchItemsByName(items, searchTerm);   // Estrategia A
            break;
        case 'code':
            filteredItems = searchItemsByCode(items, searchTerm);   // Estrategia B
            break;
        case 'supplier':
            filteredItems = searchItemsBySupplier(items, searchTerm);   // Estrategia C
            break;
        default:
            filteredItems = items;
    }
    
    // ESTRATEGIAS DE ORDENAMIENTO
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

export function getItemChanges(oldItem: Partial<Item>, newItem: Partial<Item> | Record<string, any>): { field: string; oldValue: any; newValue: any }[] {
    const changes: { field: string; oldValue: any; newValue: any }[] = [];
    
    if (!oldItem || !newItem) return changes;
    
    const fieldsToCompare = Object.keys(newItem).filter(key => 
        key !== 'id' && 
        key !== 'createdAt' && 
        key !== 'updatedAt' &&
        key !== 'isActive'
    );
    
    fieldsToCompare.forEach(field => {
        const oldValue = oldItem[field as keyof Item];
        const newValue = newItem[field as keyof Item];
        
        const normalizedOldValue = normalizeValue(oldValue);
        const normalizedNewValue = normalizeValue(newValue);
        
        if (normalizedOldValue !== normalizedNewValue) {
            const formattedOldValue = formatFieldValue(field, normalizedOldValue);
            const formattedNewValue = formatFieldValue(field, normalizedNewValue);
            
            changes.push({
                field: getFieldDisplayName(field),
                oldValue: formattedOldValue,
                newValue: formattedNewValue
            });
        }
    });
    
    return changes;
}

function normalizeValue(value: any): any {
    if (value === undefined || value === null || value === '') {
        return '';
    }

    if (typeof value === 'string' && !isNaN(Number(value))) {
        return Number(value);
    }

    if (typeof value === 'string') {
        return value.trim();
    }
    
    return value;
}

function formatFieldValue(field: string, value: any): string {
    if (value === null || value === undefined || value === '') {
        return '(vacío)';
    }
    
    switch (field) {
        case 'price':
        case 'sellPrice':
            return new Intl.NumberFormat('es-CL', {
                style: 'currency',
                currency: 'CLP',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(Number(value));
        case 'stock':
            return `${value} unidades`;
        case 'imageUrl':
            return value ? 'Con imagen' : 'Sin imagen';
        case 'description':
            return value ? (value.length > 50 ? `${value.substring(0, 50)}...` : value) : '(sin descripción)';
        default:
            return String(value);
    }
}

export async function logItemChange(
    itemId: string,
    userId: string,
    userEmail: string,
    changes: { field: string; oldValue: any; newValue: any }[],
    action: 'create' | 'update' | 'delete'
): Promise<void> {
    try {
        const historyData: Omit<ChangeHistory, 'id'> = {
            itemId,
            userId,
            userEmail,
            timestamp: new Date(),
            changes,
            action
        };
        
        console.log('Guardando historial:', historyData);
        
        await addDoc(collection(db, "itemHistory"), historyData);
        console.log('Historial guardado exitosamente');
    } catch (error) {
        console.error('Error logging item change:', error);
        throw error;
    }
}

export async function getItemHistory(itemId: string): Promise<ChangeHistory[]> {
    try {
        console.log('Buscando historial para itemId:', itemId);
        
        const q = collection(db, "itemHistory");
        const querySnapshot = await getDocs(q);
        
        const allHistory: ChangeHistory[] = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                itemId: data.itemId || '',
                userId: data.userId || '',
                userEmail: data.userEmail || '',
                timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp),
                changes: data.changes || [],
                action: data.action || 'update'
            } as ChangeHistory;
        });
        
        console.log('Historial completo obtenido:', allHistory);
        
        const filteredHistory = allHistory.filter(h => h.itemId === itemId);
        
        console.log('Historial filtrado para este producto:', filteredHistory);
        
        return filteredHistory.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
        console.error('Error getting item history:', error);
        return [];
    }
}

export async function updateItem(id: string, updates: Partial<Item>): Promise<void> {
    const itemRef = doc(db, "items", id);
    const updateData = {
        ...updates,
        updatedAt: new Date()
    };
    
    await updateDoc(itemRef, updateData);
}

export async function updateItemWithHistory(
    id: string, 
    updates: Partial<Item>, 
    userId: string, 
    userEmail: string
): Promise<void> {
    try {
        const itemRef = doc(db, "items", id);
        const itemDoc = await getDoc(itemRef);

        if (!itemDoc.exists()) {
            throw new Error('El producto no existe');
        }

        const currentItem = { id: itemDoc.id, ...itemDoc.data() } as Item;

        const cleanedUpdates: Record<string, any> = {};
        
        const validFields = ['name', 'category', 'supplier', 'price', 'sellPrice', 'stock', 'description', 'imageUrl'];
        validFields.forEach(field => {
            const value = updates[field as keyof Item];
            if (value !== undefined) {
                cleanedUpdates[field] = value;
            }
        });

        const changes = getItemChanges(currentItem, cleanedUpdates);

        if (changes.length > 0) {
            await updateDoc(itemRef, cleanedUpdates);
            await logItemChange(id, userId, userEmail, changes, 'update');
        } else {
            console.log('No se detectaron cambios reales para actualizar');
        }
    } catch (error) {
        console.error('Error updating item with history:', error);
        throw error;
    }
}

export async function backupItemBeforeDelete(item: Item, deletedBy: string, reason?: string): Promise<void> {
    try {
        const backup: Omit<ItemBackup, 'id'> = {
            itemData: item,
            deletedAt: new Date(),
            deletedBy,
            reason: reason || 'Sin motivo especificado'
        };
        
        await addDoc(collection(db, "deletedItems"), backup);
        console.log('Backup del producto creado exitosamente');
    } catch (error) {
        console.error('Error creating backup:', error);
        throw error;
    }
}

export async function checkPendingMovements(itemId: string): Promise<boolean> {
    try {
        const q = collection(db, "movements");
        const querySnapshot = await getDocs(q);
        
        const pendingMovements = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter((movement: any) => 
                movement.itemId === itemId && 
                movement.status === 'pending'
            );
        
        return pendingMovements.length > 0;
    } catch (error) {
        console.error('Error checking pending movements:', error);
        return false;
    }
}

export async function deleteItemWithHistory(
    id: string,
    userId: string,
    userEmail: string,
    reason?: string
): Promise<void> {
    try {
        const itemRef = doc(db, "items", id);
        const itemDoc = await getDoc(itemRef);

        if (!itemDoc.exists()) {
            throw new Error('El producto no existe');
        }

        const item = { id: itemDoc.id, ...itemDoc.data() } as Item;

        const hasPendingMovements = await checkPendingMovements(id);
        if (hasPendingMovements) {
            throw new Error('No se puede eliminar el producto porque tiene movimientos pendientes');
        }

        await backupItemBeforeDelete(item, userEmail, reason);

        await deleteDoc(itemRef);

        await logItemChange(id, userId, userEmail, [], 'delete');

        console.log('Producto eliminado exitosamente con backup e historial');
    } catch (error) {
        console.error('Error deleting item with history:', error);
        throw error;
    }
}

export async function deleteItem(id: string): Promise<void> {
    const itemRef = doc(db, "items", id);
    await deleteDoc(itemRef);
}

export async function softDeleteItemWithHistory(
    id: string,
    userId: string,
    userEmail: string,
    reason?: string
): Promise<void> {
    try {
        const itemRef = doc(db, "items", id);
        const itemDoc = await getDoc(itemRef);

        if (!itemDoc.exists()) {
            throw new Error('El producto no existe');
        }

        const currentItem = { id: itemDoc.id, ...itemDoc.data() } as Item;

        if (!currentItem.isActive) {
            throw new Error('El producto ya está inactivo');
        }

        await updateDoc(itemRef, { 
            isActive: false,
            updatedAt: new Date(),
            deactivatedAt: new Date(),
            deactivatedBy: userEmail,
            deactivationReason: reason || 'Desactivación temporal desde interfaz de administrador'
        });

        const changes = [
            {
                field: 'Estado',
                oldValue: 'Activo',
                newValue: 'Inactivo'
            }
        ];

        if (reason) {
            changes.push({
                field: 'Motivo',
                oldValue: '',
                newValue: reason
            });
        }

        await logItemChange(id, userId, userEmail, changes, 'update');

        console.log('Producto desactivado exitosamente');
    } catch (error) {
        console.error('Error deactivating item:', error);
        throw error;
    }
}

export async function reactivateItemWithHistory(
    id: string,
    userId: string,
    userEmail: string
): Promise<void> {
    try {
        const itemRef = doc(db, "items", id);
        const itemDoc = await getDoc(itemRef);

        if (!itemDoc.exists()) {
            throw new Error('El producto no existe');
        }

        const currentItem = { id: itemDoc.id, ...itemDoc.data() } as Item;

        if (currentItem.isActive) {
            throw new Error('El producto ya está activo');
        }

        await updateDoc(itemRef, { 
            isActive: true,
            updatedAt: new Date(),
            reactivatedAt: new Date(),
            reactivatedBy: userEmail
        });

        const changes = [
            {
                field: 'Estado',
                oldValue: 'Inactivo',
                newValue: 'Activo'
            }
        ];

        await logItemChange(id, userId, userEmail, changes, 'update');

        console.log('Producto reactivado exitosamente');
    } catch (error) {
        console.error('Error reactivating item:', error);
        throw error;
    }
}

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

export function getUniqueCategories(items: Item[]): string[] {
    const categories = items.map(item => item.category);
    const uniqueCategories = Array.from(new Set(categories));
    return uniqueCategories.sort();
}

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

export function formatChangeHistory(history: ChangeHistory[]): string[] {
    return history.map(entry => {
        const date = entry.timestamp.toLocaleDateString('es-CL');
        const time = entry.timestamp.toLocaleTimeString('es-CL', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        const user = entry.userEmail.split('@')[0];
        
        let action = '';
        switch (entry.action) {
            case 'create':
                action = 'creó';
                break;
            case 'update':
                action = 'actualizó';
                break;
            case 'delete':
                action = 'eliminó';
                break;
        }
        
        const changesText = entry.changes.map(change => {
            return `${change.field}: ${change.oldValue} → ${change.newValue}`;
        }).join(', ');
        
        return `${date} ${time} - ${user} ${action} el producto${entry.changes.length > 0 ? ` (${changesText})` : ''}`;
    });
}

function getFieldDisplayName(field: string): string {
    const fieldNames: { [key: string]: string } = {
        name: 'Nombre',
        code: 'Código',
        category: 'Categoría',
        supplier: 'Proveedor',
        price: 'Precio',
        sellPrice: 'Precio de venta',
        stock: 'Stock',
        description: 'Descripción',
        imageUrl: 'Imagen',
        isActive: 'Estado'
    };
    
    return fieldNames[field] || field;
}

export async function addItemWithHistory(
    itemData: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>,
    userId: string,
    userEmail: string
): Promise<string> {
    try {
        const newItem = {
            ...itemData,
            createdAt: new Date(),
            updatedAt: new Date(),
            isActive: true
        };
        
        const docRef = await addDoc(collection(db, "items"), newItem);
        
        await logItemChange(docRef.id, userId, userEmail, [], 'create');
        
        return docRef.id;
    } catch (error) {
        console.error('Error adding item with history:', error);
        throw error;
    }
}

/**
 * Agregar producto específicamente para compras - SIN crear movimientos adicionales
 * Esta función solo crea el producto, el movimiento de stock se crea por separado
 */
export const addItemForPurchase = async (
  itemData: {
    name: string;
    code: string;
    category: string;
    price: number;
    sellPrice: number;
    supplier: string;
    stock: number;
    description?: string;
    imageUrl?: string;
    imageAlt?: string;
    isActive?: boolean;
  },
  userId: string,
  userEmail: string,
  purchaseCode?: string // ✅ Agregar código de compra para el historial
): Promise<string> => {
  try {
    console.log('🏗️ Creando producto para compra:', itemData.name);

    // Verificar que el código sea único
    const allItems = await getAllItems();
    if (!isCodeUnique(itemData.code, allItems)) {
      throw new Error('El código ya existe');
    }

    // Preparar datos del producto
    const newItem = {
      name: itemData.name.trim(),
      code: itemData.code.trim().toUpperCase(),
      category: itemData.category.trim(),
      price: itemData.price,
      sellPrice: itemData.sellPrice,
      supplier: itemData.supplier.trim(),
      stock: itemData.stock, // Stock inicial de la compra
      description: itemData.description || '',
      imageUrl: itemData.imageUrl || '',
      imageAlt: itemData.imageAlt || `Imagen de ${itemData.name}`,
      isActive: itemData.isActive !== false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: userEmail
    };

    console.log('📦 Datos del producto a crear:', {
      name: newItem.name,
      code: newItem.code,
      stock: newItem.stock
    });

    // Crear el producto en Firestore
    const docRef = await addDoc(collection(db, 'items'), newItem);
    
    console.log('✅ Producto creado exitosamente con ID:', docRef.id);
    
    // ✅ REGISTRAR EN EL HISTORIAL - PRODUCTO CREADO EN COMPRA
    const historialChanges = [
      {
        field: 'Producto',
        oldValue: 'No existía',
        newValue: `Creado en compra ${purchaseCode || 'N/A'}`
      },
      {
        field: 'Stock inicial',
        oldValue: '0',
        newValue: `${itemData.stock} unidades`
      },
      {
        field: 'Precio de compra',
        oldValue: '$0',
        newValue: `$${itemData.price.toLocaleString('es-CL')}`
      },
      {
        field: 'Proveedor',
        oldValue: '',
        newValue: itemData.supplier
      }
    ];

    await logItemChange(
      docRef.id,
      userId,
      userEmail,
      historialChanges,
      'create'
    );

    console.log('📝 Historial de creación registrado para:', itemData.name);
    
    return docRef.id;
  } catch (error) {
    console.error('💥 Error creando producto para compra:', error);
    throw error;
  }
};

/**
 * Actualizar stock de producto existente con historial durante compra
 */
export const updateStockWithHistoryForPurchase = async (
  productId: string,
  quantityAdded: number,
  unitPrice: number,
  userId: string,
  userEmail: string,
  purchaseCode: string,
  supplierName: string
): Promise<void> => {
  try {
    console.log('📊 Actualizando stock con historial para producto:', productId);

    // Obtener datos actuales del producto
    const productRef = doc(db, 'items', productId);
    const productDoc = await getDoc(productRef);

    if (!productDoc.exists()) {
      throw new Error('El producto no existe');
    }

    const currentData = productDoc.data() as Item;
    const previousStock = currentData.stock || 0;
    const newStock = previousStock + quantityAdded;

    console.log('📈 Cambio de stock:', {
      producto: currentData.name,
      stockAnterior: previousStock,
      cantidad: quantityAdded,
      stockNuevo: newStock
    });

    // ✅ REGISTRAR EN EL HISTORIAL ANTES DE ACTUALIZAR
    const historialChanges = [
      {
        field: 'Stock',
        oldValue: `${previousStock} unidades`,
        newValue: `${newStock} unidades (+${quantityAdded})`
      },
      {
        field: 'Compra',
        oldValue: '',
        newValue: `Compra ${purchaseCode} - ${quantityAdded} unidades a $${unitPrice.toLocaleString('es-CL')} c/u`
      },
      {
        field: 'Proveedor de la compra',
        oldValue: '',
        newValue: supplierName
      },
      {
        field: 'Precio de compra unitario',
        oldValue: '',
        newValue: `$${unitPrice.toLocaleString('es-CL')}`
      },
      {
        field: 'Valor total de la compra',
        oldValue: '',
        newValue: `$${(quantityAdded * unitPrice).toLocaleString('es-CL')}`
      }
    ];

    await logItemChange(
      productId,
      userId,
      userEmail,
      historialChanges,
      'update'
    );

    console.log('📝 Historial de stock actualizado registrado para:', currentData.name);

    // ✅ NO actualizar el stock aquí - se hace en createStockMovement
    // Solo registramos el historial, el stock se actualiza en el movimiento

  } catch (error) {
    console.error('💥 Error actualizando stock con historial:', error);
    throw error;
  }
};