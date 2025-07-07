import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Item, 
    getAllItems, 
    searchItemsByName,
    searchItemsBySupplier,
    searchItemsByCode,
    filterByCategory, 
    filterByStockStatus,
    getUniqueCategories,
    getStockStatus,
    getItemsPaginated,
    addItem,
    updateItemWithHistory,
    deleteItemWithHistory,
    softDeleteItemWithHistory,
    reactivateItemWithHistory,
    validateRequiredFields,
    isCodeUnique,
    generateImageUrl,
    getDefaultImageForCategory,
    isValidImageUrl,
    addItemWithHistory,
    getItemHistory,
    checkPendingMovements
} from './inventoryFunctions';
import { useAuth } from '../../contexts/AuthContext';
import './Inventory.css';

type ChangeEntry = {
    field: string;
    oldValue: any;
    newValue: any;
};

const ProductImage: React.FC<{
    imageUrl?: string;
    category: string;
    alt: string;
    className?: string;
    size?: 'small' | 'medium' | 'large';
}> = ({ imageUrl, category, alt, className = '', size = 'medium' }) => {
    const [imgSrc, setImgSrc] = useState(imageUrl || getDefaultImageForCategory(category));
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    
    const sizeClasses = {
        small: 'w-8 h-8',
        medium: 'w-20 h-20',
        large: 'w-full h-48'
    };
    
    const handleError = () => {
        setHasError(true);
        setImgSrc(getDefaultImageForCategory(category));
        setIsLoading(false);
    };
    
    const handleLoad = () => {
        setIsLoading(false);
        setHasError(false);
    };
    
    return (
        <div className={`product-image ${className}`}>
            {isLoading && (
                <div className={`image-placeholder ${sizeClasses[size]}`}>
                    <span>📷</span>
                </div>
            )}
            <img
                src={imgSrc}
                alt={alt}
                className={`${sizeClasses[size]} object-cover rounded-lg border border-gray-200 ${
                    isLoading ? 'opacity-0' : 'opacity-100'
                }`}
                onError={handleError}
                onLoad={handleLoad}
                loading="lazy"
            />
            {hasError && (
                <div className="image-error">!</div>
            )}
        </div>
    );
};

const Inventory: React.FC = () => {
    const navigate = useNavigate();
    const { currentUser, isAdmin } = useAuth();
    const [items, setItems] = useState<Item[]>([]);
    const [filteredItems, setFilteredItems] = useState<Item[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [searchType, setSearchType] = useState<'name' | 'code' | 'supplier'>('name');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [stockFilter, setStockFilter] = useState('');
    const [priceFilter, setPriceFilter] = useState('');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'stock' | 'category' | 'id' | 'supplier'>('name');
    
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<string[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
    const [showSoftDeleteModal, setShowSoftDeleteModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
    
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [itemHistory, setItemHistory] = useState<any[]>([]);
    const [deleteReason, setDeleteReason] = useState('');
    const [softDeleteReason, setSoftDeleteReason] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [hasPendingMovements, setHasPendingMovements] = useState(false);
    
    const [newItem, setNewItem] = useState({
        name: '',
        code: '',
        category: '',
        price: '',
        sellPrice: '',
        supplier: '',
        stock: '',
        description: '',
        imageUrl: '',
        imageAlt: ''
    });
    const [editItem, setEditItem] = useState({
        name: '',
        code: '',
        category: '',
        price: '',
        sellPrice: '',
        supplier: '',
        stock: '',
        description: '',
        imageUrl: '',
        imageAlt: ''
    });
    const [formErrors, setFormErrors] = useState<string[]>([]);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    const formatCLP = (amount: number): string => {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const showSuccessMessage = (message: string) => {
        setSuccessMessage(message);
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    const showErrorMessage = (message: string) => {
        setErrorMessage(message);
        setTimeout(() => setErrorMessage(null), 5000);
    };

    const handleGenerateImage = (productName: string, category: string) => {
        const imageUrl = generateImageUrl(productName, category, 'unsplash');
        setNewItem({...newItem, imageUrl, imageAlt: `Imagen de ${productName}`});
    };

    const handleGenerateImageEdit = (productName: string, category: string) => {
        const imageUrl = generateImageUrl(productName, category, 'unsplash');
        setEditItem({...editItem, imageUrl, imageAlt: `Imagen de ${productName}`});
        setHasUnsavedChanges(true);
    };

    const sortByStock = (items: Item[]): Item[] => {
        return [...items].sort((a, b) => b.stock - a.stock);
    };

    const sortByCategory = (items: Item[]): Item[] => {
        return [...items].sort((a, b) => (a.category || '').localeCompare(b.category || ''));
    };

    const sortById = (items: Item[]): Item[] => {
        return [...items].sort((a, b) => a.id.localeCompare(b.id));
    };

    const sortByName = (items: Item[]): Item[] => {
        return [...items].sort((a, b) => a.name.localeCompare(b.name));
    };

    const sortBySupplier = (items: Item[]): Item[] => {
        return [...items].sort((a, b) => a.supplier.localeCompare(b.supplier));
    };

    const validateEditForm = (): boolean => {
        const errors: string[] = [];
        
        if (!editItem.name.trim()) errors.push('El nombre es obligatorio');
        if (!editItem.category.trim()) errors.push('La categoría es obligatoria');
        if (!editItem.supplier.trim()) errors.push('El proveedor es obligatorio');
        if (!editItem.price || parseFloat(editItem.price) <= 0) errors.push('El precio debe ser mayor a 0');
        if (!editItem.sellPrice || parseFloat(editItem.sellPrice) <= 0) errors.push('El precio de venta debe ser mayor a 0');
        if (!editItem.stock || parseInt(editItem.stock) < 0) errors.push('El stock debe ser mayor o igual a 0');
        
        if (editItem.imageUrl && !isValidImageUrl(editItem.imageUrl)) {
            errors.push('La URL de la imagen no es válida');
        }
        
        setFormErrors(errors);
        return errors.length === 0;
    };

    const getChanges = (): string[] => {
        if (!selectedItem) return [];
        
        const changes: string[] = [];
        
        if (editItem.name !== selectedItem.name) changes.push(`Nombre: "${selectedItem.name}" → "${editItem.name}"`);
        if (editItem.category !== selectedItem.category) changes.push(`Categoría: "${selectedItem.category}" → "${editItem.category}"`);
        if (editItem.supplier !== selectedItem.supplier) changes.push(`Proveedor: "${selectedItem.supplier}" → "${editItem.supplier}"`);
        if (parseFloat(editItem.price) !== selectedItem.price) changes.push(`Precio: ${formatCLP(selectedItem.price)} → ${formatCLP(parseFloat(editItem.price))}`);
        if (parseFloat(editItem.sellPrice) !== selectedItem.sellPrice) changes.push(`Precio venta: ${formatCLP(selectedItem.sellPrice)} → ${formatCLP(parseFloat(editItem.sellPrice))}`);
        if (parseInt(editItem.stock) !== selectedItem.stock) changes.push(`Stock: ${selectedItem.stock} → ${editItem.stock}`);
        if (editItem.description !== (selectedItem.description || '')) changes.push(`Descripción actualizada`);
        if (editItem.imageUrl !== (selectedItem.imageUrl || '')) changes.push(`Imagen actualizada`);
        
        return changes;
    };

    const handleConfirmEdit = () => {
        if (!validateEditForm()) return;
        
        const changes = getChanges();
        if (changes.length === 0) {
            showErrorMessage('No se han realizado cambios');
            return;
        }
        
        setShowConfirmModal(true);
    };

    const handleConfirmDelete = async () => {
        if (!selectedItem || !currentUser) return;

        try {
            setIsDeleting(true);
            
            await deleteItemWithHistory(
                selectedItem.id,
                currentUser.uid,
                currentUser.email || currentUser.displayName || 'Usuario desconocido',
                deleteReason || 'Eliminación desde interfaz de administrador'
            );
            
            setShowConfirmDeleteModal(false);
            setSelectedItem(null);
            setDeleteReason('');
            setHasPendingMovements(false);
            
            showSuccessMessage(`Producto "${selectedItem.name}" eliminado exitosamente`);
            
            loadItems();
        } catch (error) {
            console.error('Error eliminando item:', error);
            showErrorMessage(error instanceof Error ? error.message : 'Error al eliminar el producto');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCancelEdit = () => {
        if (hasUnsavedChanges) {
            if (window.confirm('¿Estás seguro de que deseas cancelar? Se perderán todos los cambios realizados.')) {
                setShowEditModal(false);
                setEditingItemId(null);
                setSelectedItem(null);
                setFormErrors([]);
                setHasUnsavedChanges(false);
            }
        } else {
            setShowEditModal(false);
            setEditingItemId(null);
            setSelectedItem(null);
            setFormErrors([]);
            setHasUnsavedChanges(false);
        }
    };

    const handleEditItemChange = (field: string, value: string) => {
        setEditItem({ ...editItem, [field]: value });
        setHasUnsavedChanges(true);
    };

    useEffect(() => {
        loadItems();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [items, searchTerm, searchType, selectedCategory, stockFilter, priceFilter, minPrice, maxPrice, sortBy]);

    const loadItems = async () => {
        try {
            setLoading(true);
            const allItems = await getAllItems();
            setItems(allItems);
            setCategories(getUniqueCategories(allItems));
        } catch (error) {
            console.error('Error cargando items:', error);
            showErrorMessage('Error al cargar los productos');
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...items];

        if (searchTerm) {
            if (searchType === 'name') {
                filtered = searchItemsByName(filtered, searchTerm);
            } else if (searchType === 'code') {
                filtered = searchItemsByCode(filtered, searchTerm);
            } else if (searchType === 'supplier') {
                filtered = searchItemsBySupplier(filtered, searchTerm);
            }
        }

        if (selectedCategory) {
            filtered = filterByCategory(filtered, selectedCategory);
        }

        if (stockFilter) {
            filtered = filterByStockStatus(filtered, stockFilter as 'available' | 'low' | 'out');
        }

        if (priceFilter) {
            switch (priceFilter) {
                case 'low':
                    filtered = filtered.filter(item => item.sellPrice <= 10000);
                    break;
                case 'medium':
                    filtered = filtered.filter(item => item.sellPrice > 10000 && item.sellPrice <= 50000);
                    break;
                case 'high':
                    filtered = filtered.filter(item => item.sellPrice > 50000 && item.sellPrice <= 100000);
                    break;
                case 'premium':
                    filtered = filtered.filter(item => item.sellPrice > 100000);
                    break;
                case 'custom':
                    const min = minPrice ? parseFloat(minPrice) : 0;
                    const max = maxPrice ? parseFloat(maxPrice) : Infinity;
                    if (min >= 0 && max > 0 && max >= min) {
                        filtered = filtered.filter(item => item.sellPrice >= min && item.sellPrice <= max);
                    }
                    break;
            }
        }

        switch (sortBy) {
            case 'stock':
                filtered = sortByStock(filtered);
                break;
            case 'category':
                filtered = sortByCategory(filtered);
                break;
            case 'supplier':
                filtered = sortBySupplier(filtered);
                break;
            case 'id':
                filtered = sortById(filtered);
                break;
            default:
                filtered = sortByName(filtered);
        }

        setFilteredItems(filtered);
        setCurrentPage(1);
    };

    const clearFilters = () => {
        setSearchTerm('');
        setSelectedCategory('');
        setStockFilter('');
        setPriceFilter('');
        setMinPrice('');
        setMaxPrice('');
        setSortBy('name');
    };

    const handleAddItem = async () => {
        const itemData = {
            name: newItem.name,
            code: newItem.code,
            category: newItem.category,
            price: parseFloat(newItem.price),
            sellPrice: parseFloat(newItem.sellPrice),
            supplier: newItem.supplier,
            stock: parseInt(newItem.stock),
            description: newItem.description,
            imageUrl: newItem.imageUrl || getDefaultImageForCategory(newItem.category),
            imageAlt: newItem.imageAlt || `Imagen de ${newItem.name}`,
            isActive: true
        };

        const validation = validateRequiredFields(itemData);
        
        if (!validation.isValid) {
            setFormErrors(validation.errors);
            return;
        }

        if (!isCodeUnique(newItem.code, items)) {
            setFormErrors(['El código ya existe']);
            return;
        }

        try {
            if (currentUser) {
                await addItemWithHistory(itemData, currentUser.uid, currentUser.email || currentUser.displayName || 'Usuario desconocido');
            } else {
                await addItem(itemData);
            }
            
            setShowAddModal(false);
            setNewItem({
                name: '', code: '', category: '', price: '', sellPrice: '',
                supplier: '', stock: '', description: '', imageUrl: '', imageAlt: ''
            });
            setFormErrors([]);
            showSuccessMessage(`Producto "${newItem.name}" agregado exitosamente`);
            loadItems();
        } catch (error) {
            console.error('Error agregando item:', error);
            showErrorMessage('Error al guardar el producto');
        }
    };

    const handleViewItem = (item: Item) => {
        setSelectedItem(item);
        setShowViewModal(true);
    };

    const handleEditItem = (item: Item) => {
        if (editingItemId && editingItemId !== item.id) {
            showErrorMessage('Ya hay otro producto siendo editado. Guarda o cancela los cambios antes de editar otro producto.');
            return;
        }
        
        setEditingItemId(item.id);
        setSelectedItem(item);
        setEditItem({
            name: item.name,
            code: item.code,
            category: item.category,
            price: item.price.toString(),
            sellPrice: item.sellPrice.toString(),
            supplier: item.supplier,
            stock: item.stock.toString(),
            description: item.description || '',
            imageUrl: item.imageUrl || '',
            imageAlt: item.imageAlt || `Imagen de ${item.name}`
        });
        setFormErrors([]);
        setHasUnsavedChanges(false);
        setShowEditModal(true);
    };

    const getChangeIcon = (field: string): string => {
        switch (field.toLowerCase()) {
            case 'nombre': return '📝';
            case 'precio': 
            case 'precio de venta': return '💰';
            case 'stock': return '📦';
            case 'categoría': return '🏷️';
            case 'proveedor': return '🏢';
            case 'descripción': return '📄';
            case 'imagen': return '🖼️';
            default: return '📝';
        }
    };

    const handleSaveEdit = async () => {
        if (!selectedItem || !currentUser) return;
        
        if (!validateEditForm()) return;
        
        try {
            console.log('Guardando cambios del producto...');
            
            const itemData: Partial<Item> = {
                name: editItem.name,
                category: editItem.category,
                price: parseFloat(editItem.price),
                sellPrice: parseFloat(editItem.sellPrice),
                supplier: editItem.supplier,
                stock: parseInt(editItem.stock),
                description: editItem.description,
                imageUrl: editItem.imageUrl || getDefaultImageForCategory(editItem.category),
                imageAlt: editItem.imageAlt || `Imagen de ${editItem.name}`
            };
            
            const fieldsToUpdate: Partial<Item> = {};
            
            if (itemData.name !== selectedItem.name) fieldsToUpdate.name = itemData.name;
            if (itemData.category !== selectedItem.category) fieldsToUpdate.category = itemData.category;
            if (itemData.price !== selectedItem.price) fieldsToUpdate.price = itemData.price;
            if (itemData.sellPrice !== selectedItem.sellPrice) fieldsToUpdate.sellPrice = itemData.sellPrice;
            if (itemData.supplier !== selectedItem.supplier) fieldsToUpdate.supplier = itemData.supplier;
            if (itemData.stock !== selectedItem.stock) fieldsToUpdate.stock = itemData.stock;
            if (itemData.description !== (selectedItem.description || '')) fieldsToUpdate.description = itemData.description;
            if (itemData.imageUrl !== (selectedItem.imageUrl || '')) fieldsToUpdate.imageUrl = itemData.imageUrl;
            if (itemData.imageAlt !== (selectedItem.imageAlt || '')) fieldsToUpdate.imageAlt = itemData.imageAlt;
            
            console.log('Campos a actualizar:', fieldsToUpdate);
            
            if (Object.keys(fieldsToUpdate).length > 0) {
                await updateItemWithHistory(
                    selectedItem.id, 
                    fieldsToUpdate, 
                    currentUser.uid, 
                    currentUser.email || currentUser.displayName || 'Usuario desconocido'
                );
                
                showSuccessMessage(`Producto "${editItem.name}" actualizado exitosamente`);
            } else {
                showSuccessMessage('No se detectaron cambios para actualizar');
            }
            
            setShowEditModal(false);
            setShowConfirmModal(false);
            setEditingItemId(null);
            setSelectedItem(null);
            setFormErrors([]);
            setHasUnsavedChanges(false);
            
            loadItems();
            
        } catch (error) {
            console.error('Error editando item:', error);
            showErrorMessage('Error al actualizar el producto. Inténtalo nuevamente.');
        }
    };

    const handleDeleteItem = async (item: Item) => {
        try {
            setIsDeleting(true);
            setSelectedItem(item);
            
            const pendingMovements = await checkPendingMovements(item.id);
            setHasPendingMovements(pendingMovements);
            
            setShowDeleteModal(true);
        } catch (error) {
            console.error('Error verificando movimientos pendientes:', error);
            setHasPendingMovements(false);
            setShowDeleteModal(true);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleConfirmDeleteStep = () => {
        if (hasPendingMovements) {
            showErrorMessage('No se puede eliminar el producto porque tiene movimientos pendientes');
            return;
        }
        
        setShowDeleteModal(false);
        setShowConfirmDeleteModal(true);
    };

    const handleSoftDeleteItem = (item: Item) => {
        setSelectedItem(item);
        setSoftDeleteReason('');
        setShowSoftDeleteModal(true);
    };

    const handleConfirmSoftDelete = async () => {
        if (!selectedItem || !currentUser) return;

        try {
            setIsDeleting(true);
            
            if (selectedItem.isActive) {
                await softDeleteItemWithHistory(
                    selectedItem.id,
                    currentUser.uid,
                    currentUser.email || currentUser.displayName || 'Usuario desconocido',
                    softDeleteReason || 'Desactivación temporal desde interfaz de administrador'
                );
                showSuccessMessage(`Producto "${selectedItem.name}" desactivado exitosamente`);
            } else {
                await reactivateItemWithHistory(
                    selectedItem.id,
                    currentUser.uid,
                    currentUser.email || currentUser.displayName || 'Usuario desconocido'
                );
                showSuccessMessage(`Producto "${selectedItem.name}" reactivado exitosamente`);
            }
            
            setShowSoftDeleteModal(false);
            setSelectedItem(null);
            setSoftDeleteReason('');
            
            loadItems();
        } catch (error) {
            console.error('Error changing item status:', error);
            showErrorMessage(error instanceof Error ? error.message : 'Error al cambiar el estado del producto');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleShowHistory = async (item: Item) => {
        try {
            console.log('Obteniendo historial para producto:', item.id);
            
            const history = await getItemHistory(item.id);
            console.log('Historial obtenido:', history);
            
            setItemHistory(history);
            setSelectedItem(item);
            setShowHistoryModal(true);
        } catch (error) {
            console.error('Error obteniendo historial:', error);
            showErrorMessage('Error al obtener el historial del producto');
        }
    };

    const paginatedItems = getItemsPaginated(filteredItems, currentPage, itemsPerPage);
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

    const getStockBadgeClass = (stock: number) => {
        const status = getStockStatus(stock);
        return `stock-badge stock-${status}`;
    };

    if (loading) {
        return (
            <div className="inventory-container">
                <div className="loading-spinner">Cargando inventario...</div>
            </div>
        );
    }

    return (
        <div className="inventory-container">
            {successMessage && (
                <div className="fixed top-4 right-4 z-50 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-lg">
                    <div className="flex items-center">
                        <span className="mr-2">✅</span>
                        {successMessage}
                    </div>
                </div>
            )}

            {errorMessage && (
                <div className="fixed top-4 right-4 z-50 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg">
                    <div className="flex items-center">
                        <span className="mr-2">❌</span>
                        {errorMessage}
                    </div>
                </div>
            )}

            <div className="inventory-header">
                <div className="header-actions">
                    <button 
                    className="btn btn-secondary back-btn"
                    onClick={() => navigate('/dashboard')}
                    title="Volver al Dashboard"
                    >
                    ← Volver al Dashboard
                    </button>
                </div>
                <div className="header-title">
                    <h1>📦 Gestión de Inventario</h1>
                    <p>Administra tus productos con imágenes y controla el stock</p>
                </div>
                {isAdmin && (
                    <button 
                        className="btn btn-primary"
                        onClick={() => setShowAddModal(true)}
                    >
                        + Registrar Producto
                    </button>
                )}
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">📊</div>
                    <div className="stat-content">
                        <h3>Total Productos</h3>
                        <p className="stat-number">{filteredItems.length}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">✅</div>
                    <div className="stat-content">
                        <h3>Productos Activos</h3>
                        <p className="stat-number">{filteredItems.filter(item => item.isActive).length}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">⚠️</div>
                    <div className="stat-content">
                        <h3>Stock Bajo</h3>
                        <p className="stat-number">{filteredItems.filter(item => item.stock <= 5 && item.stock > 0).length}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">❌</div>
                    <div className="stat-content">
                        <h3>Sin Stock</h3>
                        <p className="stat-number">{filteredItems.filter(item => item.stock === 0).length}</p>
                    </div>
                </div>
            </div>

            <div className="controls-section">
                <div className="search-controls">
                    <div className="search-group">
                        <select 
                            value={searchType} 
                            onChange={(e) => setSearchType(e.target.value as 'name' | 'code' | 'supplier')}
                            className="search-type-select"
                        >
                            <option value="name">Por nombre</option>
                            <option value="code">Por código</option>
                            <option value="supplier">Por proveedor</option>
                        </select>
                        <input
                            type="text"
                            placeholder={`Buscar productos ${
                                searchType === 'name' ? 'por nombre' : 
                                searchType === 'code' ? 'por código' : 
                                'por proveedor'
                            }...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                    </div>
                </div>

                <div className="filter-controls">
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="filter-select"
                    >
                        <option value="">Todas las categorías</option>
                        {categories.map(category => (
                            <option key={category} value={category}>{category}</option>
                        ))}
                    </select>

                    <select
                        value={stockFilter}
                        onChange={(e) => setStockFilter(e.target.value)}
                        className="filter-select"
                    >
                        <option value="">Todos los stocks</option>
                        <option value="available">Disponible</option>
                        <option value="low">Stock bajo</option>
                        <option value="out">Sin stock</option>
                    </select>

                    <select
                        value={priceFilter}
                        onChange={(e) => {
                            setPriceFilter(e.target.value);
                            if (e.target.value !== 'custom') {
                                setMinPrice('');
                                setMaxPrice('');
                            }
                        }}
                        className="filter-select"
                    >
                        <option value="">Todos los precios</option>
                        <option value="low">Económico (≤ $10.000)</option>
                        <option value="medium">Medio ($10.001 - $50.000)</option>
                        <option value="high">Alto ($50.001 - $100.000)</option>
                        <option value="premium">Premium (&gt; $100.000)</option>
                        <option value="custom">Rango personalizado</option>
                    </select>

                    {priceFilter === 'custom' && (
                        <div className="price-range-inputs">
                            <input
                                type="number"
                                placeholder="Precio mín."
                                value={minPrice}
                                onChange={(e) => setMinPrice(e.target.value)}
                                className="price-input"
                                min="0"
                            />
                            <span className="price-separator">-</span>
                            <input
                                type="number"
                                placeholder="Precio máx."
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(e.target.value)}
                                className="price-input"
                                min="0"
                            />
                        </div>
                    )}

                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as 'name' | 'stock' | 'category' | 'id' | 'supplier')}
                        className="filter-select"
                    >
                        <option value="name">Ordenar por nombre</option>
                        <option value="stock">Ordenar por stock</option>
                        <option value="category">Ordenar por categoría</option>
                        <option value="supplier">Ordenar por proveedor</option>
                        <option value="id">Ordenar por ID</option>
                    </select>

                    <button onClick={clearFilters} className="btn btn-secondary">
                        Limpiar filtros
                    </button>
                </div>

                <div className="view-controls">
                    <button 
                        className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
                        onClick={() => setViewMode('table')}
                    >
                        📋 Tabla
                    </button>
                    <button 
                        className={`view-btn ${viewMode === 'cards' ? 'active' : ''}`}
                        onClick={() => setViewMode('cards')}
                    >
                        🃏 Tarjetas
                    </button>
                </div>
            </div>

            {viewMode === 'table' && (
                <div className="table-container">
                    <table className="inventory-table">
                        <thead>
                            <tr>
                                <th>Imagen</th>
                                <th>Código</th>
                                <th>Nombre</th>
                                <th>Categoría</th>
                                <th>Stock</th>
                                <th>Precio Compra</th>
                                <th>Precio Venta</th>
                                <th>Proveedor</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedItems.map(item => (
                                <tr key={item.id} className={!item.isActive ? 'inactive-row' : ''}>
                                    <td>
                                        <ProductImage
                                            imageUrl={item.imageUrl}
                                            category={item.category}
                                            alt={item.imageAlt || item.name}
                                            size="small"
                                        />
                                    </td>
                                    <td><code>{item.code}</code></td>
                                    <td>{item.name}</td>
                                    <td>{item.category}</td>
                                    <td>
                                        <span className={getStockBadgeClass(item.stock)}>
                                            {item.stock}
                                        </span>
                                    </td>
                                    <td>{formatCLP(item.price)}</td>
                                    <td>{formatCLP(item.sellPrice)}</td>
                                    <td>{item.supplier}</td>
                                    <td>
                                        <span className={`status-badge ${item.isActive ? 'active' : 'inactive'}`}>
                                            {item.isActive ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button 
                                                className="btn btn-sm btn-info"
                                                onClick={() => handleViewItem(item)}
                                                title="Ver detalles"
                                            >
                                                👁️
                                            </button>
                                            <button 
                                                className="btn btn-sm btn-secondary"
                                                onClick={() => handleShowHistory(item)}
                                                title="Ver historial"
                                            >
                                                📋
                                            </button>
                                            {isAdmin && (
                                                <>
                                                    <button 
                                                        className="btn btn-sm btn-warning"
                                                        onClick={() => handleEditItem(item)}
                                                        title="Editar producto"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button 
                                                        className={`btn btn-sm ${item.isActive ? 'btn-secondary' : 'btn-success'}`}
                                                        onClick={() => handleSoftDeleteItem(item)}
                                                        title={item.isActive ? "Desactivar producto" : "Reactivar producto"}
                                                    >
                                                        {item.isActive ? '📴' : '🔄'}
                                                    </button>
                                                    <button 
                                                        className="btn btn-sm btn-danger"
                                                        onClick={() => handleDeleteItem(item)}
                                                        title="Eliminar producto definitivamente"
                                                        disabled={isDeleting}
                                                    >
                                                        🗑️
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {viewMode === 'cards' && (
                <div className="cards-container">
                    {paginatedItems.map(item => (
                        <div key={item.id} className={`product-card ${!item.isActive ? 'inactive-card' : ''}`}>
                            <div className="card-image">
                                <ProductImage
                                    imageUrl={item.imageUrl}
                                    category={item.category}
                                    alt={item.imageAlt || item.name}
                                    size="large"
                                />
                            </div>
                            <div className="card-header">
                                <h3>{item.name}</h3>
                                <span className={`status-badge ${item.isActive ? 'active' : 'inactive'}`}>
                                    {item.isActive ? 'Activo' : 'Inactivo'}
                                </span>
                            </div>
                            <div className="card-body">
                                <p><strong>Código:</strong> <code>{item.code}</code></p>
                                <p><strong>Categoría:</strong> {item.category}</p>
                                <p><strong>Stock:</strong> 
                                    <span className={getStockBadgeClass(item.stock)}>
                                        {item.stock}
                                    </span>
                                </p>
                                <p><strong>Precio:</strong> {formatCLP(item.price)} | {formatCLP(item.sellPrice)}</p>
                                <p><strong>Proveedor:</strong> {item.supplier}</p>
                                {item.description && (
                                    <p><strong>Descripción:</strong> {item.description.substring(0, 100)}...</p>
                                )}
                            </div>
                            <div className="card-actions">
                                <button 
                                    className="btn btn-sm btn-info"
                                    onClick={() => handleViewItem(item)}
                                >
                                    👁️ Ver
                                </button>
                                <button 
                                    className="btn btn-sm btn-secondary"
                                    onClick={() => handleShowHistory(item)}
                                >
                                    📋 Historial
                                </button>
                                {isAdmin && (
                                    <>
                                        <button 
                                            className="btn btn-sm btn-warning"
                                            onClick={() => handleEditItem(item)}
                                        >
                                            ✏️ Editar
                                        </button>
                                        <button 
                                            className={`btn btn-sm ${item.isActive ? 'btn-secondary' : 'btn-success'}`}
                                            onClick={() => handleSoftDeleteItem(item)}
                                        >
                                            {item.isActive ? '📴 Desactivar' : '🔄 Reactivar'}
                                        </button>
                                        <button 
                                            className="btn btn-sm btn-danger"
                                            onClick={() => handleDeleteItem(item)}
                                            disabled={isDeleting}
                                        >
                                            🗑️ Eliminar
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {totalPages > 1 && (
                <div className="pagination">
                    <button 
                        className="btn btn-secondary"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(currentPage - 1)}
                    >
                        ← Anterior
                    </button>
                    <span className="pagination-info">
                        Página {currentPage} de {totalPages} ({filteredItems.length} productos)
                    </span>
                    <button 
                        className="btn btn-secondary"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(currentPage + 1)}
                    >
                        Siguiente →
                    </button>
                </div>
            )}

            {filteredItems.length === 0 && (
                <div className="no-results">
                    <div className="no-results-icon">📦</div>
                    <h3>No se encontraron productos</h3>
                    <p>No hay productos que coincidan con los filtros aplicados.</p>
                    <button onClick={clearFilters} className="btn btn-primary">
                        Limpiar filtros
                    </button>
                </div>
            )}

            {showAddModal && isAdmin && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h2>📦 Registrar Nuevo Producto</h2>
                            <button 
                                className="close-btn"
                                onClick={() => setShowAddModal(false)}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="modal-body">
                            {formErrors.length > 0 && (
                                <div className="error-messages">
                                    {formErrors.map((error, index) => (
                                        <p key={index} className="error-message">{error}</p>
                                    ))}
                                </div>
                            )}
                            <form className="product-form">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Nombre del producto</label>
                                        <input
                                            type="text"
                                            value={newItem.name}
                                            onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                                            placeholder="Ej: Camisa azul"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Código</label>
                                        <input
                                            type="text"
                                            value={newItem.code}
                                            onChange={(e) => setNewItem({...newItem, code: e.target.value})}
                                            placeholder="Ej: CAM001"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Categoría</label>
                                        <input
                                            type="text"
                                            value={newItem.category}
                                            onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                                            placeholder="Ej: Ropa"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Proveedor</label>
                                        <input
                                            type="text"
                                            value={newItem.supplier}
                                            onChange={(e) => setNewItem({...newItem, supplier: e.target.value})}
                                            placeholder="Ej: Proveedor ABC"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Precio de compra (CLP)</label>
                                        <input
                                            type="number"
                                            value={newItem.price}
                                            onChange={(e) => setNewItem({...newItem, price: e.target.value})}
                                            placeholder="12000"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Precio de venta (CLP)</label>
                                        <input
                                            type="number"
                                            value={newItem.sellPrice}
                                            onChange={(e) => setNewItem({...newItem, sellPrice: e.target.value})}
                                            placeholder="20000"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Stock inicial</label>
                                        <input
                                            type="number"
                                            value={newItem.stock}
                                            onChange={(e) => setNewItem({...newItem, stock: e.target.value})}
                                            placeholder="0"
                                            required
                                        />
                                    </div>
                                </div>
                                
                                <div className="form-group">
                                    <label className="optional">URL de la imagen</label>
                                    <div className="image-input-group">
                                        <input
                                            type="url"
                                            value={newItem.imageUrl}
                                            onChange={(e) => setNewItem({...newItem, imageUrl: e.target.value})}
                                            placeholder="https://ejemplo.com/imagen.jpg"
                                        />
                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => handleGenerateImage(newItem.name, newItem.category)}
                                            disabled={!newItem.name && !newItem.category}
                                        >
                                            🎲 Generar
                                        </button>
                                    </div>
                                </div>
                                
                                {newItem.imageUrl && (
                                    <div className="form-group">
                                        <label className="optional">Vista previa de la imagen</label>
                                        <div className="image-preview">
                                            <ProductImage
                                                imageUrl={newItem.imageUrl}
                                                category={newItem.category}
                                                alt={newItem.name}
                                                size="medium"
                                            />
                                        </div>
                                    </div>
                                )}
                                
                                <div className="form-group">
                                    <label className="optional">Descripción</label>
                                    <textarea
                                        value={newItem.description}
                                        onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                                        placeholder="Descripción del producto..."
                                        rows={3}
                                    />
                                </div>
                            </form>
                        </div>
                        <div className="modal-footer">
                            <button 
                                className="btn btn-secondary"
                                onClick={() => setShowAddModal(false)}
                            >
                                Cancelar
                            </button>
                            <button 
                                className="btn btn-primary"
                                onClick={handleAddItem}
                            >
                                Guardar Producto
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showViewModal && selectedItem && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h2>👁️ Detalles del Producto</h2>
                            <button 
                                className="close-btn"
                                onClick={() => setShowViewModal(false)}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="product-details">
                                <div className="detail-row">
                                    <div className="detail-group full-width">
                                        <ProductImage
                                            imageUrl={selectedItem.imageUrl}
                                            category={selectedItem.category}
                                            alt={selectedItem.imageAlt || selectedItem.name}
                                            size="large"
                                            className="product-image-large"
                                        />
                                    </div>
                                </div>
                                <div className="detail-row">
                                    <div className="detail-group">
                                        <label>Nombre:</label>
                                        <p>{selectedItem.name}</p>
                                    </div>
                                    <div className="detail-group">
                                        <label>Código:</label>
                                        <p><code>{selectedItem.code}</code></p>
                                    </div>
                                </div>
                                <div className="detail-row">
                                    <div className="detail-group">
                                        <label>Categoría:</label>
                                        <p>{selectedItem.category}</p>
                                    </div>
                                    <div className="detail-group">
                                        <label>Proveedor:</label>
                                        <p>{selectedItem.supplier}</p>
                                    </div>
                                </div>
                                <div className="detail-row">
                                    <div className="detail-group">
                                        <label>Precio de Compra:</label>
                                        <p className="price-text">{formatCLP(selectedItem.price)}</p>
                                    </div>
                                    <div className="detail-group">
                                        <label>Precio de Venta:</label>
                                        <p className="price-text">{formatCLP(selectedItem.sellPrice)}</p>
                                    </div>
                                    <div className="detail-group">
                                        <label>Stock:</label>
                                        <p>
                                            <span className={getStockBadgeClass(selectedItem.stock)}>
                                                {selectedItem.stock} unidades
                                            </span>
                                        </p>
                                    </div>
                                </div>
                                <div className="detail-row">
                                    <div className="detail-group">
                                        <label>Estado:</label>
                                        <p>
                                            <span className={`status-badge ${selectedItem.isActive ? 'active' : 'inactive'}`}>
                                                {selectedItem.isActive ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                                {selectedItem.description && (
                                    <div className="detail-row">
                                        <div className="detail-group full-width">
                                            <label>Descripción:</label>
                                            <p>{selectedItem.description}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button 
                                className="btn btn-secondary"
                                onClick={() => setShowViewModal(false)}
                            >
                                Cerrar
                            </button>
                            {isAdmin && (
                                <button 
                                    className="btn btn-warning"
                                    onClick={() => {
                                        setShowViewModal(false);
                                        handleEditItem(selectedItem);
                                    }}
                                >
                                    ✏️ Editar
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showEditModal && selectedItem && isAdmin && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h2>✏️ Editar Producto</h2>
                            <button 
                                className="close-btn"
                                onClick={handleCancelEdit}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="modal-body">
                            {formErrors.length > 0 && (
                                <div className="error-messages">
                                    {formErrors.map((error, index) => (
                                        <p key={index} className="error-message">{error}</p>
                                    ))}
                                </div>
                            )}
                            <form className="product-form">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Nombre del producto</label>
                                        <input
                                            type="text"
                                            value={editItem.name}
                                            onChange={(e) => handleEditItemChange('name', e.target.value)}
                                            placeholder="Ej: Camisa azul"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Código (no editable)</label>
                                        <input
                                            type="text"
                                            value={editItem.code}
                                            readOnly
                                            className="form-input readonly-input"
                                            title="El código no se puede modificar después de crear el producto"
                                        />
                                        <small className="form-help">
                                            🔒 El código no se puede modificar después de crear el producto
                                        </small>
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Categoría</label>
                                        <input
                                            type="text"
                                            value={editItem.category}
                                            onChange={(e) => handleEditItemChange('category', e.target.value)}
                                            placeholder="Ej: Ropa"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Proveedor</label>
                                        <input
                                            type="text"
                                            value={editItem.supplier}
                                            onChange={(e) => handleEditItemChange('supplier', e.target.value)}
                                            placeholder="Ej: Proveedor ABC"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Precio de compra (CLP)</label>
                                        <input
                                            type="number"
                                            value={editItem.price}
                                            onChange={(e) => handleEditItemChange('price', e.target.value)}
                                            placeholder="12000"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Precio de venta (CLP)</label>
                                        <input
                                            type="number"
                                            value={editItem.sellPrice}
                                            onChange={(e) => handleEditItemChange('sellPrice', e.target.value)}
                                            placeholder="20000"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Stock</label>
                                        <input
                                            type="number"
                                            value={editItem.stock}
                                            onChange={(e) => handleEditItemChange('stock', e.target.value)}
                                            placeholder="0"
                                            required
                                        />
                                    </div>
                                </div>
                                
                                <div className="form-group">
                                    <label className="optional">URL de la imagen</label>
                                    <div className="image-input-group">
                                        <input
                                            type="url"
                                            value={editItem.imageUrl}
                                            onChange={(e) => handleEditItemChange('imageUrl', e.target.value)}
                                            placeholder="https://ejemplo.com/imagen.jpg"
                                        />
                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => handleGenerateImageEdit(editItem.name, editItem.category)}
                                            disabled={!editItem.name && !editItem.category}
                                        >
                                            🎲 Generar
                                        </button>
                                    </div>
                                </div>
                                
                                {editItem.imageUrl && (
                                    <div className="form-group">
                                        <label className="optional">Vista previa de la imagen</label>
                                        <div className="image-preview">
                                            <ProductImage
                                                imageUrl={editItem.imageUrl}
                                                category={editItem.category}
                                                alt={editItem.name}
                                                size="medium"
                                            />
                                        </div>
                                    </div>
                                )}
                                
                                <div className="form-group">
                                    <label className="optional">Descripción</label>
                                    <textarea
                                        value={editItem.description}
                                        onChange={(e) => handleEditItemChange('description', e.target.value)}
                                        placeholder="Descripción del producto..."
                                        rows={3}
                                    />
                                </div>
                            </form>
                        </div>
                        <div className="modal-footer">
                            <button 
                                className="btn btn-secondary"
                                onClick={handleCancelEdit}
                            >
                                Cancelar
                            </button>
                            <button 
                                className="btn btn-primary"
                                onClick={handleConfirmEdit}
                                disabled={!editItem.name || !editItem.category || !editItem.supplier}
                            >
                                Guardar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showConfirmModal && selectedItem && isAdmin && (
                <div className="modal-overlay">
                    <div className="modal modal-small">
                        <div className="modal-header">
                            <h2>📝 Confirmar Cambios</h2>
                            <button 
                                className="close-btn"
                                onClick={() => setShowConfirmModal(false)}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="confirmation-content">
                                <p><strong>¿Estás seguro de que deseas guardar los siguientes cambios?</strong></p>
                                <div className="changes-summary">
                                    <h4>Cambios realizados:</h4>
                                    <ul>
                                        {getChanges().map((change, index) => (
                                            <li key={index}>{change}</li>
                                        ))}
                                    </ul>
                                </div>
                                <p className="warning-text">
                                    Esta acción actualizará el producto en la base de datos.
                                </p>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button 
                                className="btn btn-secondary"
                                onClick={() => setShowConfirmModal(false)}
                            >
                                Cancelar
                            </button>
                            <button 
                                className="btn btn-primary"
                                onClick={handleSaveEdit}
                            >
                                ✅ Confirmar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showSoftDeleteModal && selectedItem && isAdmin && (
                <div className="modal-overlay">
                    <div className="modal modal-small">
                        <div className="modal-header">
                            <h2>{selectedItem.isActive ? '📴 Desactivar Producto' : '🔄 Reactivar Producto'}</h2>
                            <button 
                                className="close-btn"
                                onClick={() => setShowSoftDeleteModal(false)}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="delete-confirmation">
                                <div className="warning-icon">{selectedItem.isActive ? '📴' : '🔄'}</div>
                                <p><strong>
                                    {selectedItem.isActive 
                                        ? '¿Estás seguro de que deseas desactivar este producto?' 
                                        : '¿Estás seguro de que deseas reactivar este producto?'}
                                </strong></p>
                                
                                <div className="product-summary">
                                    <ProductImage
                                        imageUrl={selectedItem.imageUrl}
                                        category={selectedItem.category}
                                        alt={selectedItem.imageAlt || selectedItem.name}
                                        size="medium"
                                    />
                                    <p><strong>Producto:</strong> {selectedItem.name}</p>
                                    <p><strong>Código:</strong> {selectedItem.code}</p>
                                    <p><strong>Stock:</strong> {selectedItem.stock} unidades</p>
                                    <p><strong>Estado actual:</strong> 
                                        <span className={`status-badge ${selectedItem.isActive ? 'active' : 'inactive'}`}>
                                            {selectedItem.isActive ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </p>
                                </div>

                                {selectedItem.isActive && (
                                    <div className="form-group">
                                        <label>Motivo de desactivación (opcional):</label>
                                        <textarea
                                            value={softDeleteReason}
                                            onChange={(e) => setSoftDeleteReason(e.target.value)}
                                            placeholder="Describe el motivo de la desactivación..."
                                            rows={3}
                                        />
                                    </div>
                                )}
                                
                                <p className="warning-text">
                                    {selectedItem.isActive 
                                        ? '📴 El producto se marcará como inactivo pero conservará toda su información. Podrás reactivarlo cuando lo necesites.'
                                        : '🔄 El producto volverá a estar disponible en el inventario activo.'}
                                </p>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button 
                                className="btn btn-secondary"
                                onClick={() => {
                                    setShowSoftDeleteModal(false);
                                    setSoftDeleteReason('');
                                }}
                            >
                                Cancelar
                            </button>
                            <button 
                                className={`btn ${selectedItem.isActive ? 'btn-warning' : 'btn-success'}`}
                                onClick={handleConfirmSoftDelete}
                                disabled={isDeleting}
                            >
                                {isDeleting 
                                    ? '🔄 Procesando...' 
                                    : selectedItem.isActive 
                                        ? '📴 Desactivar Producto' 
                                        : '🔄 Reactivar Producto'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showDeleteModal && selectedItem && isAdmin && (
                <div className="modal-overlay">
                    <div className="modal modal-small">
                        <div className="modal-header">
                            <h2>🗑️ Confirmar Eliminación</h2>
                            <button 
                                className="close-btn"
                                onClick={() => setShowDeleteModal(false)}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="delete-confirmation">
                                <div className="warning-icon">⚠️</div>
                                <p><strong>¿Estás seguro de que deseas eliminar este producto?</strong></p>
                                
                                <div className="product-summary">
                                    <ProductImage
                                        imageUrl={selectedItem.imageUrl}
                                        category={selectedItem.category}
                                        alt={selectedItem.imageAlt || selectedItem.name}
                                        size="medium"
                                    />
                                    <p><strong>Producto:</strong> {selectedItem.name}</p>
                                    <p><strong>Código:</strong> {selectedItem.code}</p>
                                    <p><strong>Stock:</strong> {selectedItem.stock} unidades</p>
                                    <p><strong>Valor total:</strong> {formatCLP(selectedItem.price * selectedItem.stock)}</p>
                                </div>

                                {hasPendingMovements && (
                                    <div className="error-messages">
                                        <p className="error-message">
                                            ❌ No se puede eliminar el producto porque tiene movimientos pendientes.
                                        </p>
                                    </div>
                                )}

                                <div className="form-group">
                                    <label>Motivo de eliminación (opcional):</label>
                                    <textarea
                                        value={deleteReason}
                                        onChange={(e) => setDeleteReason(e.target.value)}
                                        placeholder="Describe el motivo de la eliminación..."
                                        rows={3}
                                        disabled={hasPendingMovements}
                                    />
                                </div>
                                
                                <p className="warning-text">
                                    ⚠️ Esta acción no se puede deshacer. El producto será eliminado permanentemente,
                                    pero se creará un respaldo automático para casos de emergencia.
                                </p>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button 
                                className="btn btn-secondary"
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setDeleteReason('');
                                    setHasPendingMovements(false);
                                }}
                            >
                                Cancelar
                            </button>
                            <button 
                                className="btn btn-danger"
                                onClick={handleConfirmDeleteStep}
                                disabled={isDeleting || hasPendingMovements}
                            >
                                {isDeleting ? '🔄 Verificando...' : '🗑️ Continuar con Eliminación'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showConfirmDeleteModal && selectedItem && isAdmin && (
                <div className="modal-overlay">
                    <div className="modal modal-small">
                        <div className="modal-header">
                            <h2>🗑️ Confirmar Eliminación Final</h2>
                            <button 
                                className="close-btn"
                                onClick={() => setShowConfirmDeleteModal(false)}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="confirmation-content">
                                <p><strong>¿Estás absolutamente seguro de que deseas eliminar este producto?</strong></p>
                                
                                <div className="changes-summary">
                                    <h4>🗑️ Acción a realizar:</h4>
                                    <ul>
                                        <li>✅ Producto: <strong>{selectedItem.name}</strong></li>
                                        <li>✅ Código: <strong>{selectedItem.code}</strong></li>
                                        <li>✅ Stock actual: <strong>{selectedItem.stock} unidades</strong></li>
                                        <li>✅ Valor total: <strong>{formatCLP(selectedItem.price * selectedItem.stock)}</strong></li>
                                        {deleteReason && <li>✅ Motivo: <strong>{deleteReason}</strong></li>}
                                        <li>🔄 Se creará respaldo automático en la base de datos</li>
                                        <li>📝 Se registrará en el historial de cambios</li>
                                    </ul>
                                </div>
                                
                                <p className="warning-text">
                                    ⚠️ Esta acción eliminará permanentemente el producto del inventario activo.
                                    Solo podrá ser recuperado desde el respaldo por un administrador del sistema.
                                </p>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button 
                                className="btn btn-secondary"
                                onClick={() => setShowConfirmDeleteModal(false)}
                            >
                                Cancelar
                            </button>
                            <button 
                                className="btn btn-danger"
                                onClick={handleConfirmDelete}
                                disabled={isDeleting}
                            >
                                {isDeleting ? '🔄 Eliminando...' : '🗑️ Eliminar Definitivamente'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showHistoryModal && selectedItem && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h2>📋 Historial de Cambios</h2>
                            <button 
                                className="close-btn"
                                onClick={() => setShowHistoryModal(false)}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="history-header">
                                <h3>📦 {selectedItem.name}</h3>
                                <p>Código: <code>{selectedItem.code}</code></p>
                            </div>
                            <div className="history-list">
                                {itemHistory.length === 0 ? (
                                    <div className="no-history">
                                        <p>No hay historial de cambios para este producto.</p>
                                    </div>
                                ) : (
                                    itemHistory.map((entry, index) => (
                                        <div key={index} className="history-item">
                                            <div className="history-header">
                                                <span className="history-date">
                                                    {entry.timestamp.toLocaleDateString('es-CL')} - {entry.timestamp.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                <span className="history-user">
                                                    {entry.userEmail.split('@')[0]}
                                                </span>
                                            </div>
                                            <div className="history-action">
                                                <strong>
                                                    {entry.action === 'create' ? 'Producto creado' : 
                                                    entry.action === 'update' ? 'Producto actualizado' : 
                                                    'Producto eliminado'}
                                                </strong>
                                            </div>
                                            {entry.changes && entry.changes.length > 0 && (
                                                <div className="history-changes">
                                                    <strong>Cambios realizados:</strong>
                                                    <ul>
                                                        {entry.changes.map((change: ChangeEntry, changeIndex: number) => (
                                                            <li key={changeIndex} className={`change-${change.field.toLowerCase().replace(/\s+/g, '-')}`}>
                                                                <span className="change-icon">{getChangeIcon(change.field)}</span>
                                                                <strong>{change.field}:</strong> {change.oldValue} → {change.newValue}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button 
                                className="btn btn-secondary"
                                onClick={() => setShowHistoryModal(false)}
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventory;