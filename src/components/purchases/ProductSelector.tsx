import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { validateRequiredFields, isCodeUnique } from '../inventory/inventoryFunctions';

interface Item {
  id: string;
  name: string;
  code: string;
  category: string;
  price: number;
  sellPrice?: number;
  stock: number;
  supplier?: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
}

interface PurchaseItemForm {
  id?: string;
  productId?: string;
  isNewProduct: boolean;
  productCode: string;
  productName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  sellPrice?: number;
  description?: string;
  expirationDate?: string;
}

interface ProductSelectorProps {
  onAddProduct: (product: PurchaseItemForm) => void;
}

const ProductSelector: React.FC<ProductSelectorProps> = ({ onAddProduct }) => {
  // Estados principales
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'name' | 'code'>('name');
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  // Estados para nuevo producto
  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [newProductData, setNewProductData] = useState({
    productCode: '',
    productName: '',
    category: '',
    quantity: 1,
    unitPrice: 0,
    sellPrice: 0,
    description: ''
  });

  // Estados para producto existente
  const [selectedProduct, setSelectedProduct] = useState<Item | null>(null);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);
  const [purchasePrice, setPurchasePrice] = useState(0);

  const [errors, setErrors] = useState<string[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  // Cargar productos al montar el componente
  useEffect(() => {
    loadAllItems();
  }, []);

  // Efecto para cerrar resultados al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Función mejorada para cargar todos los productos
  const loadAllItems = async () => {
    try {
      setLoading(true);
      console.log('Cargando productos desde Firestore...');
      
      // Simplificamos la consulta para evitar el problema del índice
      const querySnapshot = await getDocs(collection(db, 'items'));
      console.log('Documentos encontrados:', querySnapshot.size);
      
      const items: Item[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Filtrar solo productos activos en el cliente
        if (data.isActive !== false) {
          console.log('Producto encontrado:', { id: doc.id, name: data.name, code: data.code });
          
          items.push({
            id: doc.id,
            name: data.name || '',
            code: data.code || '',
            category: data.category || 'Sin categoría',
            price: data.price || 0,
            sellPrice: data.sellPrice || 0,
            stock: data.stock || 0,
            supplier: data.supplier || 'Sin proveedor',
            description: data.description || '',
            imageUrl: data.imageUrl || '',
            isActive: data.isActive !== false
          });
        }
      });
      
      // Ordenar en el cliente
      items.sort((a, b) => a.name.localeCompare(b.name));
      
      console.log('Total productos cargados:', items.length);
      setAllItems(items);
      
      if (items.length === 0) {
        setErrors(['No se encontraron productos activos en la base de datos']);
      }
    } catch (error) {
      console.error('Error cargando productos:', error);
      setErrors([`Error al cargar productos: ${error instanceof Error ? error.message : 'Error desconocido'}`]);
    } finally {
      setLoading(false);
    }
  };

  // Función mejorada de búsqueda
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setErrors([]);

    if (value.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    console.log('Buscando:', value, 'en', allItems.length, 'productos');

    try {
      let results: Item[] = [];
      const searchValue = value.toLowerCase().trim();
      
      if (searchType === 'name') {
        results = allItems.filter(item => 
          item.name.toLowerCase().includes(searchValue)
        );
      } else {
        results = allItems.filter(item => 
          item.code.toLowerCase().includes(searchValue)
        );
      }
      
      console.log('Resultados encontrados:', results.length);
      
      setSearchResults(results.slice(0, 10)); // Limitar a 10 resultados
      setShowResults(true);
    } catch (error) {
      console.error('Error en búsqueda:', error);
      setSearchResults([]);
      setErrors(['Error durante la búsqueda']);
    }
  };

  // Seleccionar producto existente
  const handleSelectExistingProduct = (product: Item) => {
    setSelectedProduct(product);
    setPurchasePrice(product.price);
    setSearchTerm(product.name);
    setShowResults(false);
    setShowNewProductForm(false);
    setErrors([]);
  };

  // Mostrar formulario de nuevo producto
  const handleShowNewProductForm = () => {
    setShowNewProductForm(true);
    setSelectedProduct(null);
    setNewProductData({
      ...newProductData,
      productCode: searchType === 'code' ? searchTerm : '',
      productName: searchType === 'name' ? searchTerm : ''
    });
    setShowResults(false);
  };

  // Validar formulario de nuevo producto
  const validateNewProductForm = (): boolean => {
    const validationErrors: string[] = [];

    if (!newProductData.productName.trim()) {
      validationErrors.push('El nombre del producto es obligatorio');
    }

    if (!newProductData.productCode.trim()) {
      validationErrors.push('El código del producto es obligatorio');
    }

    if (!newProductData.category.trim()) {
      validationErrors.push('La categoría es obligatoria');
    }

    if (newProductData.quantity <= 0) {
      validationErrors.push('La cantidad debe ser mayor a 0');
    }

    if (newProductData.unitPrice <= 0) {
      validationErrors.push('El precio de compra debe ser mayor a 0');
    }

    // Verificar si el código ya existe
    const codeExists = allItems.some(item => 
      item.code.toLowerCase() === newProductData.productCode.toLowerCase()
    );
    
    if (codeExists) {
      validationErrors.push('El código del producto ya existe');
    }

    setErrors(validationErrors);
    return validationErrors.length === 0;
  };

  // Agregar producto existente
  const handleAddExistingProduct = () => {
    if (!selectedProduct) return;

    const validationErrors: string[] = [];

    if (purchaseQuantity <= 0) {
      validationErrors.push('La cantidad debe ser mayor a 0');
    }

    if (purchasePrice <= 0) {
      validationErrors.push('El precio de compra debe ser mayor a 0');
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    const productToAdd: PurchaseItemForm = {
      productId: selectedProduct.id,
      isNewProduct: false,
      productCode: selectedProduct.code,
      productName: selectedProduct.name,
      category: selectedProduct.category,
      quantity: purchaseQuantity,
      unitPrice: purchasePrice
    };

    onAddProduct(productToAdd);
    resetForm();
  };

  // Agregar nuevo producto
  const handleAddNewProduct = () => {
    if (!validateNewProductForm()) return;

    const productToAdd: PurchaseItemForm = {
      isNewProduct: true,
      productCode: newProductData.productCode,
      productName: newProductData.productName,
      category: newProductData.category,
      quantity: newProductData.quantity,
      unitPrice: newProductData.unitPrice,
      sellPrice: newProductData.sellPrice || undefined,
      description: newProductData.description || undefined
    };

    onAddProduct(productToAdd);
    resetForm();
  };

  // Limpiar formulario
  const resetForm = () => {
    setSearchTerm('');
    setSelectedProduct(null);
    setShowNewProductForm(false);
    setPurchaseQuantity(1);
    setPurchasePrice(0);
    setNewProductData({
      productCode: '',
      productName: '',
      category: '',
      quantity: 1,
      unitPrice: 0,
      sellPrice: 0,
      description: ''
    });
    setErrors([]);
    setShowResults(false);
  };

  return (
    <div className="product-selector">
      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ backgroundColor: '#f0f0f0', padding: '10px', marginBottom: '10px', fontSize: '12px' }}>
          <strong>Debug:</strong> {allItems.length} productos cargados
          {loading && ' - Cargando...'}
        </div>
      )}

      {/* Errores */}
      {errors.length > 0 && (
        <div className="error-messages">
          {errors.map((error, index) => (
            <p key={index} className="error-message">{error}</p>
          ))}
        </div>
      )}

      {/* Búsqueda de productos */}
      <div className="search-section" ref={searchRef}>
        <div className="search-controls">
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value as 'name' | 'code')}
            className="search-type-select"
          >
            <option value="name">Buscar por nombre</option>
            <option value="code">Buscar por código</option>
          </select>
          
          <div className="search-input-container">
            <input
              type="text"
              placeholder={`Buscar producto ${searchType === 'name' ? 'por nombre' : 'por código'}...`}
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="search-input"
            />
            {loading && <div className="search-loading">🔍</div>}
          </div>
        </div>

        {/* Resultados de búsqueda */}
        {showResults && (
          <div className="search-results">
            {searchResults.length > 0 ? (
              <>
                <h4>Productos encontrados ({searchResults.length}):</h4>
                {searchResults.map(product => (
                  <div
                    key={product.id}
                    className="search-result-item"
                    onClick={() => handleSelectExistingProduct(product)}
                  >
                    <div className="result-info">
                      <strong>{product.name}</strong>
                      <span className="result-code">Código: {product.code}</span>
                      <span className="result-category">Categoría: {product.category}</span>
                      <span className="result-stock">Stock actual: {product.stock}</span>
                      <span className="result-supplier">Proveedor: {product.supplier}</span>
                    </div>
                    <div className="result-price">
                      ${product.price.toLocaleString('es-CL')}
                    </div>
                  </div>
                ))}
                <div className="search-actions">
                  <button
                    onClick={handleShowNewProductForm}
                    className="btn btn-outline"
                  >
                    + Registrar como nuevo producto
                  </button>
                </div>
              </>
            ) : (
              <div className="no-results">
                <p>No se encontraron productos con "{searchTerm}"</p>
                <button
                  onClick={handleShowNewProductForm}
                  className="btn btn-primary"
                >
                  + Registrar nuevo producto
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Formulario para producto existente */}
      {selectedProduct && !showNewProductForm && (
        <div className="selected-product-form">
          <h4>📦 Producto Seleccionado</h4>
          <div className="product-info">
            <div className="info-row">
              <span><strong>Nombre:</strong> {selectedProduct.name}</span>
              <span><strong>Código:</strong> {selectedProduct.code}</span>
            </div>
            <div className="info-row">
              <span><strong>Categoría:</strong> {selectedProduct.category}</span>
              <span><strong>Stock actual:</strong> {selectedProduct.stock}</span>
            </div>
            <div className="info-row">
              <span><strong>Proveedor:</strong> {selectedProduct.supplier}</span>
              <span><strong>Precio actual:</strong> ${selectedProduct.price.toLocaleString('es-CL')}</span>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="purchaseQuantity">Cantidad a comprar</label>
              <input
                type="number"
                id="purchaseQuantity"
                value={purchaseQuantity}
                onChange={(e) => setPurchaseQuantity(Number(e.target.value))}
                min="1"
                className="form-input"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="purchasePrice">Precio de compra unitario</label>
              <input
                type="number"
                id="purchasePrice"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(Number(e.target.value))}
                min="0"
                step="0.01"
                className="form-input"
              />
            </div>
          </div>

          <div className="total-preview">
            <strong>Total: ${(purchaseQuantity * purchasePrice).toLocaleString('es-CL')}</strong>
          </div>

          <div className="form-actions">
            <button
              onClick={resetForm}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
            <button
              onClick={handleAddExistingProduct}
              className="btn btn-primary"
            >
              ➕ Agregar a la compra
            </button>
          </div>
        </div>
      )}

      {/* Formulario para nuevo producto */}
      {showNewProductForm && (
        <div className="new-product-form">
          <h4>📝 Registrar Nuevo Producto</h4>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="newProductName">Nombre del producto</label>
              <input
                type="text"
                id="newProductName"
                value={newProductData.productName}
                onChange={(e) => setNewProductData({...newProductData, productName: e.target.value})}
                className="form-input"
                placeholder="Ej: Camisa azul"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="newProductCode">Código del producto</label>
              <input
                type="text"
                id="newProductCode"
                value={newProductData.productCode}
                onChange={(e) => setNewProductData({...newProductData, productCode: e.target.value})}
                className="form-input"
                placeholder="Ej: CAM001"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="newProductCategory">Categoría</label>
              <input
                type="text"
                id="newProductCategory"
                value={newProductData.category}
                onChange={(e) => setNewProductData({...newProductData, category: e.target.value})}
                className="form-input"
                placeholder="Ej: Ropa"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="newProductQuantity">Cantidad a comprar</label>
              <input
                type="number"
                id="newProductQuantity"
                value={newProductData.quantity}
                onChange={(e) => setNewProductData({...newProductData, quantity: Number(e.target.value)})}
                min="1"
                className="form-input"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="newProductUnitPrice">Precio de compra unitario</label>
              <input
                type="number"
                id="newProductUnitPrice"
                value={newProductData.unitPrice}
                onChange={(e) => setNewProductData({...newProductData, unitPrice: Number(e.target.value)})}
                min="0"
                step="0.01"
                className="form-input"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="newProductSellPrice" className="optional">Precio de venta sugerido</label>
              <input
                type="number"
                id="newProductSellPrice"
                value={newProductData.sellPrice}
                onChange={(e) => setNewProductData({...newProductData, sellPrice: Number(e.target.value)})}
                min="0"
                step="0.01"
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="newProductDescription" className="optional">Descripción</label>
            <textarea
              id="newProductDescription"
              value={newProductData.description}
              onChange={(e) => setNewProductData({...newProductData, description: e.target.value})}
              className="form-input"
              rows={3}
              placeholder="Descripción del producto..."
            />
          </div>

          <div className="total-preview">
            <strong>Total: ${(newProductData.quantity * newProductData.unitPrice).toLocaleString('es-CL')}</strong>
          </div>

          <div className="form-actions">
            <button
              onClick={resetForm}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
            <button
              onClick={handleAddNewProduct}
              className="btn btn-primary"
            >
              ➕ Agregar nuevo producto a la compra
            </button>
          </div>
        </div>
      )}

      {/* Botón para recargar productos */}
      {allItems.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p>No se pudieron cargar los productos</p>
          <button 
            onClick={loadAllItems}
            className="btn btn-primary"
          >
            🔄 Recargar productos
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductSelector;