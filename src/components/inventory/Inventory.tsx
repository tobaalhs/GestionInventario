import React, { useState, useEffect } from 'react';
import { 
    Item, 
    getAllItems, 
    searchItemsByName, 
    searchItemsByCode,
    filterByCategory, 
    filterByStockStatus,
    getUniqueCategories,
    getStockStatus,
    getItemsPaginated,
    addItem,
    updateItem,
    deleteItem,
    validateRequiredFields,
    isCodeUnique
} from './inventoryFunctions';
import './Inventory.css';

const Inventory: React.FC = () => {
    // Estados principales
    const [items, setItems] = useState<Item[]>([]);
    const [filteredItems, setFilteredItems] = useState<Item[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20);
    
    // Estados de filtros y búsqueda
    const [searchTerm, setSearchTerm] = useState('');
    const [searchType, setSearchType] = useState<'name' | 'code'>('name');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [stockFilter, setStockFilter] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'stock' | 'category' | 'id'>('name');
    
    // Estados de la interfaz
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<string[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
    
    // Estados del formulario
    const [newItem, setNewItem] = useState({
        name: '',
        code: '',
        category: '',
        price: '',
        sellPrice: '',
        supplier: '',
        stock: '',
        description: ''
    });
    const [editItem, setEditItem] = useState({
        name: '',
        code: '',
        category: '',
        price: '',
        sellPrice: '',
        supplier: '',
        stock: '',
        description: ''
    });
    const [formErrors, setFormErrors] = useState<string[]>([]);

    // Función para formatear dinero chileno
    const formatCLP = (amount: number): string => {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    // Funciones de ordenamiento locales
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

    // Cargar items al montar el componente
    useEffect(() => {
        loadItems();
    }, []);

    // Aplicar filtros cuando cambian
    useEffect(() => {
        applyFilters();
    }, [items, searchTerm, searchType, selectedCategory, stockFilter, sortBy]);

    const loadItems = async () => {
        try {
            setLoading(true);
            const allItems = await getAllItems();
            setItems(allItems);
            setCategories(getUniqueCategories(allItems));
        } catch (error) {
            console.error('Error cargando items:', error);
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...items];

        // Aplicar búsqueda
        if (searchTerm) {
            if (searchType === 'name') {
                filtered = searchItemsByName(filtered, searchTerm);
            } else {
                filtered = searchItemsByCode(filtered, searchTerm);
            }
        }

        // Aplicar filtro por categoría
        if (selectedCategory) {
            filtered = filterByCategory(filtered, selectedCategory);
        }

        // Aplicar filtro por estado de stock
        if (stockFilter) {
            filtered = filterByStockStatus(filtered, stockFilter as 'available' | 'low' | 'out');
        }

        // Aplicar ordenamiento
        switch (sortBy) {
            case 'stock':
                filtered = sortByStock(filtered);
                break;
            case 'category':
                filtered = sortByCategory(filtered);
                break;
            case 'id':
                filtered = sortById(filtered);
                break;
            default:
                filtered = sortByName(filtered);
        }

        setFilteredItems(filtered);
        setCurrentPage(1); // Reset página al filtrar
    };

    const clearFilters = () => {
        setSearchTerm('');
        setSelectedCategory('');
        setStockFilter('');
        setSortBy('name');
    };

    const handleAddItem = async () => {
        // Validar campos
        const itemData = {
            name: newItem.name,
            code: newItem.code,
            category: newItem.category,
            price: parseFloat(newItem.price),
            sellPrice: parseFloat(newItem.sellPrice),
            supplier: newItem.supplier,
            stock: parseInt(newItem.stock),
            description: newItem.description,
            isActive: true // Agregar isActive como true por defecto
        };

        const validation = validateRequiredFields(itemData);
        
        if (!validation.isValid) {
            setFormErrors(validation.errors);
            return;
        }

        // Validar código único
        if (!isCodeUnique(newItem.code, items)) {
            setFormErrors(['El código ya existe']);
            return;
        }

        try {
            await addItem(itemData);
            setShowAddModal(false);
            setNewItem({
                name: '', code: '', category: '', price: '', sellPrice: '',
                supplier: '', stock: '', description: ''
            });
            setFormErrors([]);
            loadItems(); // Recargar items
        } catch (error) {
            console.error('Error agregando item:', error);
            setFormErrors(['Error al guardar el producto']);
        }
    };

    // Función para ver producto
    const handleViewItem = (item: Item) => {
        setSelectedItem(item);
        setShowViewModal(true);
    };

    // Función para editar producto
    const handleEditItem = (item: Item) => {
        setSelectedItem(item);
        setEditItem({
            name: item.name,
            code: item.code,
            category: item.category,
            price: item.price.toString(),
            sellPrice: item.sellPrice.toString(),
            supplier: item.supplier,
            stock: item.stock.toString(),
            description: item.description || ''
        });
        setShowEditModal(true);
    };

    // Función para guardar edición
    const handleSaveEdit = async () => {
        if (!selectedItem) return;

        const itemData = {
            name: editItem.name,
            code: editItem.code,
            category: editItem.category,
            price: parseFloat(editItem.price),
            sellPrice: parseFloat(editItem.sellPrice),
            supplier: editItem.supplier,
            stock: parseInt(editItem.stock),
            description: editItem.description
        };

        const validation = validateRequiredFields(itemData);
        
        if (!validation.isValid) {
            setFormErrors(validation.errors);
            return;
        }

        // Validar código único (excluyendo el item actual)
        if (editItem.code !== selectedItem.code && !isCodeUnique(editItem.code, items)) {
            setFormErrors(['El código ya existe']);
            return;
        }

        try {
            await updateItem(selectedItem.id, itemData);
            setShowEditModal(false);
            setSelectedItem(null);
            setFormErrors([]);
            loadItems(); // Recargar items
        } catch (error) {
            console.error('Error editando item:', error);
            setFormErrors(['Error al actualizar el producto']);
        }
    };

    // Función para eliminar producto
    const handleDeleteItem = (item: Item) => {
        setSelectedItem(item);
        setShowDeleteModal(true);
    };

    // Función para confirmar eliminación
    const handleConfirmDelete = async () => {
        if (!selectedItem) return;

        try {
            await deleteItem(selectedItem.id);
            setShowDeleteModal(false);
            setSelectedItem(null);
            loadItems(); // Recargar items
        } catch (error) {
            console.error('Error eliminando item:', error);
            // Aquí podrías mostrar un mensaje de error
        }
    };

    // Paginación
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
            {/* Header */}
            <div className="inventory-header">
                <div className="header-actions">
                    <button 
                        className="btn btn-secondary back-btn"
                        onClick={() => window.location.href = '/dashboard'}
                        title="Volver al Dashboard"
                    >
                        ← Volver al Dashboard
                    </button>
                </div>
                <div className="header-title">
                    <h1>📦 Gestión de Inventario</h1>
                    <p>Administra tus productos y controla el stock</p>
                </div>
                <button 
                    className="btn btn-primary"
                    onClick={() => setShowAddModal(true)}
                >
                    + Registrar Producto
                </button>
            </div>

            {/* Estadísticas */}
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

            {/* Controles de búsqueda y filtros */}
            <div className="controls-section">
                <div className="search-controls">
                    <div className="search-group">
                        <select 
                            value={searchType} 
                            onChange={(e) => setSearchType(e.target.value as 'name' | 'code')}
                            className="search-type-select"
                        >
                            <option value="name">Por nombre</option>
                            <option value="code">Por código</option>
                        </select>
                        <input
                            type="text"
                            placeholder={`Buscar productos ${searchType === 'name' ? 'por nombre' : 'por código'}...`}
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
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as 'name' | 'stock' | 'category' | 'id')}
                        className="filter-select"
                    >
                        <option value="name">Ordenar por nombre</option>
                        <option value="stock">Ordenar por stock</option>
                        <option value="category">Ordenar por categoría</option>
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

            {/* Vista de tabla */}
            {viewMode === 'table' && (
                <div className="table-container">
                    <table className="inventory-table">
                        <thead>
                            <tr>
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
                                                className="btn btn-sm btn-warning"
                                                onClick={() => handleEditItem(item)}
                                                title="Editar producto"
                                            >
                                                ✏️
                                            </button>
                                            <button 
                                                className="btn btn-sm btn-danger"
                                                onClick={() => handleDeleteItem(item)}
                                                title="Eliminar producto"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Vista de tarjetas */}
            {viewMode === 'cards' && (
                <div className="cards-container">
                    {paginatedItems.map(item => (
                        <div key={item.id} className={`product-card ${!item.isActive ? 'inactive-card' : ''}`}>
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
                            </div>
                            <div className="card-actions">
                                <button 
                                    className="btn btn-sm btn-info"
                                    onClick={() => handleViewItem(item)}
                                >
                                    👁️ Ver
                                </button>
                                <button 
                                    className="btn btn-sm btn-warning"
                                    onClick={() => handleEditItem(item)}
                                >
                                    ✏️ Editar
                                </button>
                                <button 
                                    className="btn btn-sm btn-danger"
                                    onClick={() => handleDeleteItem(item)}
                                >
                                    🗑️ Eliminar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Paginación */}
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

            {/* Sin resultados */}
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

            {/* Modal de agregar producto */}
            {showAddModal && (
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
                                        <label>Nombre del producto *</label>
                                        <input
                                            type="text"
                                            value={newItem.name}
                                            onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                                            placeholder="Ej: Camisa azul"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Código *</label>
                                        <input
                                            type="text"
                                            value={newItem.code}
                                            onChange={(e) => setNewItem({...newItem, code: e.target.value})}
                                            placeholder="Ej: CAM001"
                                        />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Categoría *</label>
                                        <input
                                            type="text"
                                            value={newItem.category}
                                            onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                                            placeholder="Ej: Ropa"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Proveedor *</label>
                                        <input
                                            type="text"
                                            value={newItem.supplier}
                                            onChange={(e) => setNewItem({...newItem, supplier: e.target.value})}
                                            placeholder="Ej: Proveedor ABC"
                                        />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Precio de compra (CLP) *</label>
                                        <input
                                            type="number"
                                            value={newItem.price}
                                            onChange={(e) => setNewItem({...newItem, price: e.target.value})}
                                            placeholder="12000"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Precio de venta (CLP) *</label>
                                        <input
                                            type="number"
                                            value={newItem.sellPrice}
                                            onChange={(e) => setNewItem({...newItem, sellPrice: e.target.value})}
                                            placeholder="20000"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Stock inicial *</label>
                                        <input
                                            type="number"
                                            value={newItem.stock}
                                            onChange={(e) => setNewItem({...newItem, stock: e.target.value})}
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Descripción (opcional)</label>
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

            {/* Modal de ver producto */}
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
                            <button 
                                className="btn btn-warning"
                                onClick={() => {
                                    setShowViewModal(false);
                                    handleEditItem(selectedItem);
                                }}
                            >
                                ✏️ Editar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de editar producto */}
            {showEditModal && selectedItem && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h2>✏️ Editar Producto</h2>
                            <button 
                                className="close-btn"
                                onClick={() => setShowEditModal(false)}
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
                                        <label>Nombre del producto *</label>
                                        <input
                                            type="text"
                                            value={editItem.code}
                                            onChange={(e) => setEditItem({...editItem, code: e.target.value})}
                                            placeholder="Ej: CAM001"
                                        />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Categoría *</label>
                                        <input
                                            type="text"
                                            value={editItem.category}
                                            onChange={(e) => setEditItem({...editItem, category: e.target.value})}
                                            placeholder="Ej: Ropa"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Proveedor *</label>
                                        <input
                                            type="text"
                                            value={editItem.supplier}
                                            onChange={(e) => setEditItem({...editItem, supplier: e.target.value})}
                                            placeholder="Ej: Proveedor ABC"
                                        />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Precio de compra (CLP) *</label>
                                        <input
                                            type="number"
                                            value={editItem.price}
                                            onChange={(e) => setEditItem({...editItem, price: e.target.value})}
                                            placeholder="12000"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Precio de venta (CLP) *</label>
                                        <input
                                            type="number"
                                            value={editItem.sellPrice}
                                            onChange={(e) => setEditItem({...editItem, sellPrice: e.target.value})}
                                            placeholder="20000"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Stock *</label>
                                        <input
                                            type="number"
                                            value={editItem.stock}
                                            onChange={(e) => setEditItem({...editItem, stock: e.target.value})}
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Descripción (opcional)</label>
                                    <textarea
                                        value={editItem.description}
                                        onChange={(e) => setEditItem({...editItem, description: e.target.value})}
                                        placeholder="Descripción del producto..."
                                        rows={3}
                                    />
                                </div>
                            </form>
                        </div>
                        <div className="modal-footer">
                            <button 
                                className="btn btn-secondary"
                                onClick={() => setShowEditModal(false)}
                            >
                                Cancelar
                            </button>
                            <button 
                                className="btn btn-primary"
                                onClick={handleSaveEdit}
                            >
                                Guardar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de confirmar eliminación */}
            {showDeleteModal && selectedItem && (
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
                                <p>¿Estás seguro de que deseas eliminar este producto?</p>
                                <div className="product-summary">
                                    <p><strong>Producto:</strong> {selectedItem.name}</p>
                                    <p><strong>Código:</strong> {selectedItem.code}</p>
                                    <p><strong>Stock:</strong> {selectedItem.stock} unidades</p>
                                </div>
                                <p className="warning-text">
                                    Esta acción no se puede deshacer. El producto será eliminado permanentemente.
                                </p>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button 
                                className="btn btn-secondary"
                                onClick={() => setShowDeleteModal(false)}
                            >
                                Cancelar
                            </button>
                            <button 
                                className="btn btn-danger"
                                onClick={handleConfirmDelete}
                            >
                                🗑️ Eliminar Producto
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventory;