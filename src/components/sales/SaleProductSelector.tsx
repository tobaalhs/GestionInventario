import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { SaleItemForm } from '../../interfaces/Sale';

interface Item {
  id: string;
  name: string;
  code: string;
  category: string;
  price: number;
  sellPrice: number;
  stock: number;
  supplier?: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
}

interface SaleProductSelectorProps {
  onAddProduct: (product: SaleItemForm) => void;
}

const SaleProductSelector: React.FC<SaleProductSelectorProps> = ({ onAddProduct }) => {
  // Estados principales
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'name' | 'code'>('name');
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  // Estados para producto seleccionado
  const [selectedProduct, setSelectedProduct] = useState<Item | null>(null);
  const [saleQuantity, setSaleQuantity] = useState(1);
  const [salePrice, setSalePrice] = useState(0);

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

  // Función para cargar todos los productos disponibles para venta
  const loadAllItems = async () => {
    try {
      setLoading(true);
      console.log('Cargando productos para venta desde Firestore...');
      
      const querySnapshot = await getDocs(collection(db, 'items'));
      console.log('Documentos encontrados:', querySnapshot.size);
      
      const items: Item[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Filtrar solo productos activos con stock y precio de venta
        if (data.isActive !== false && 
            (data.stock || 0) > 0 && 
            (data.sellPrice || 0) > 0) {
          console.log('Producto disponible para venta:', { 
            id: doc.id, 
            name: data.name, 
            code: data.code, 
            stock: data.stock,
            sellPrice: data.sellPrice
          });
          
          items.push({
            id: doc.id,
            name: data.name || '',
            code: data.code || '',
            category: data.category || 'Sin categoría',
            price: data.price || 0,
            sellPrice: data.sellPrice || data.price || 0,
            stock: data.stock || 0,
            supplier: data.supplier || 'Sin proveedor',
            description: data.description || '',
            imageUrl: data.imageUrl || '',
            isActive: data.isActive !== false
          });
        }
      });
      
      // Ordenar por nombre
      items.sort((a, b) => a.name.localeCompare(b.name));
      
      console.log('Total productos disponibles para venta:', items.length);
      setAllItems(items);
      
      if (items.length === 0) {
        setErrors(['No se encontraron productos disponibles para venta']);
      }
    } catch (error) {
      console.error('Error cargando productos:', error);
      setErrors([`Error al cargar productos: ${error instanceof Error ? error.message : 'Error desconocido'}`]);
    } finally {
      setLoading(false);
    }
  };

  // Función de búsqueda
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setErrors([]);

    if (value.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    console.log('Buscando productos para venta:', value, 'en', allItems.length, 'productos');

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

  // Seleccionar producto para venta
  const handleSelectProduct = (product: Item) => {
    setSelectedProduct(product);
    setSalePrice(product.sellPrice);
    setSaleQuantity(1);
    setSearchTerm(product.name);
    setShowResults(false);
    setErrors([]);
  };

  // Validar datos de venta
  const validateSaleData = (): boolean => {
    const validationErrors: string[] = [];

    if (!selectedProduct) {
      validationErrors.push('Debe seleccionar un producto');
      setErrors(validationErrors);
      return false;
    }

    if (saleQuantity <= 0) {
      validationErrors.push('La cantidad debe ser mayor a 0');
    }

    if (saleQuantity > selectedProduct.stock) {
      validationErrors.push(`Stock insuficiente. Disponible: ${selectedProduct.stock} unidades`);
    }

    if (salePrice <= 0) {
      validationErrors.push('El precio de venta debe ser mayor a 0');
    }

    setErrors(validationErrors);
    return validationErrors.length === 0;
  };

  // Agregar producto a la venta
  const handleAddProductToSale = () => {
    if (!validateSaleData() || !selectedProduct) return;

    const productToAdd: SaleItemForm = {
      id: Date.now().toString(), // ID temporal para el formulario
      productId: selectedProduct.id,
      productCode: selectedProduct.code,
      productName: selectedProduct.name,
      category: selectedProduct.category,
      quantity: saleQuantity,
      unitPrice: salePrice,
      totalPrice: saleQuantity * salePrice,
      availableStock: selectedProduct.stock,
      maxQuantity: selectedProduct.stock
    };

    onAddProduct(productToAdd);
    resetForm();
  };

  // Limpiar formulario
  const resetForm = () => {
    setSearchTerm('');
    setSelectedProduct(null);
    setSaleQuantity(1);
    setSalePrice(0);
    setErrors([]);
    setShowResults(false);
  };

  return (
    <div className="sale-product-selector">
      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ backgroundColor: '#f0f0f0', padding: '10px', marginBottom: '10px', fontSize: '12px' }}>
          <strong>Debug:</strong> {allItems.length} productos disponibles para venta
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
                <h4>Productos disponibles ({searchResults.length}):</h4>
                {searchResults.map(product => (
                  <div
                    key={product.id}
                    className="search-result-item"
                    onClick={() => handleSelectProduct(product)}
                  >
                    <div className="result-info">
                      <strong>{product.name}</strong>
                      <span className="result-code">Código: {product.code}</span>
                      <span className="result-category">Categoría: {product.category}</span>
                      <span className="result-stock">Stock: {product.stock} unidades</span>
                      <span className="result-supplier">Proveedor: {product.supplier}</span>
                    </div>
                    <div className="result-prices">
                      <div className="result-sell-price">
                        <strong>${product.sellPrice.toLocaleString('es-CL')}</strong>
                        <small>Precio venta</small>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="no-results">
                <p>No se encontraron productos disponibles con "{searchTerm}"</p>
                <small>Verifique que el producto tenga stock y precio de venta configurado</small>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Formulario para producto seleccionado */}
      {selectedProduct && (
        <div className="selected-product-form">
          <h4>💰 Producto para Venta</h4>
          <div className="product-info">
            <div className="info-row">
              <span><strong>Nombre:</strong> {selectedProduct.name}</span>
              <span><strong>Código:</strong> {selectedProduct.code}</span>
            </div>
            <div className="info-row">
              <span><strong>Categoría:</strong> {selectedProduct.category}</span>
              <span><strong>Stock disponible:</strong> {selectedProduct.stock} unidades</span>
            </div>
            <div className="info-row">
              <span><strong>Precio de costo:</strong> ${selectedProduct.price.toLocaleString('es-CL')}</span>
              <span><strong>Precio de venta:</strong> ${selectedProduct.sellPrice.toLocaleString('es-CL')}</span>
            </div>
            {selectedProduct.description && (
              <div className="info-row">
                <span><strong>Descripción:</strong> {selectedProduct.description}</span>
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="saleQuantity">Cantidad a vender</label>
              <input
                type="number"
                id="saleQuantity"
                value={saleQuantity}
                onChange={(e) => setSaleQuantity(Number(e.target.value))}
                min="1"
                max={selectedProduct.stock}
                className="form-input"
              />
              <small className="form-help">
                Máximo disponible: {selectedProduct.stock} unidades
              </small>
            </div>
            
            <div className="form-group">
              <label htmlFor="salePrice">Precio de venta unitario</label>
              <input
                type="number"
                id="salePrice"
                value={salePrice}
                onChange={(e) => setSalePrice(Number(e.target.value))}
                min="0"
                step="0.01"
                className="form-input"
              />
              <small className="form-help">
                Precio sugerido: ${selectedProduct.sellPrice.toLocaleString('es-CL')}
              </small>
            </div>
          </div>

          {/* Cálculos y vista previa */}
          <div className="sale-preview">
            <div className="preview-row">
              <span>Subtotal:</span>
              <span><strong>${(saleQuantity * salePrice).toLocaleString('es-CL')}</strong></span>
            </div>
            <div className="preview-row">
              <span>Stock restante:</span>
              <span className={selectedProduct.stock - saleQuantity <= 5 ? 'text-warning' : ''}>
                {selectedProduct.stock - saleQuantity} unidades
                {selectedProduct.stock - saleQuantity <= 5 && (
                  <span className="critical-warning"> ⚠️ Stock crítico</span>
                )}
              </span>
            </div>
            {salePrice !== selectedProduct.sellPrice && (
              <div className="preview-row">
                <span>Diferencia de precio:</span>
                <span className={salePrice > selectedProduct.sellPrice ? 'text-success' : 'text-warning'}>
                  {salePrice > selectedProduct.sellPrice ? '+' : ''}
                  ${(salePrice - selectedProduct.sellPrice).toLocaleString('es-CL')} por unidad
                </span>
              </div>
            )}
          </div>

          <div className="form-actions">
            <button
              onClick={resetForm}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
            <button
              onClick={handleAddProductToSale}
              className="btn btn-primary"
              disabled={saleQuantity <= 0 || saleQuantity > selectedProduct.stock || salePrice <= 0}
            >
              ➕ Agregar a la venta
            </button>
          </div>
        </div>
      )}

      {/* Botón para recargar productos */}
      {allItems.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p>No se pudieron cargar productos disponibles para venta</p>
          <small>Verifique que los productos tengan stock y precio de venta configurado</small>
          <br />
          <button 
            onClick={loadAllItems}
            className="btn btn-primary"
            style={{ marginTop: '10px' }}
          >
            🔄 Recargar productos
          </button>
        </div>
      )}

      {/* Información adicional */}
      {allItems.length > 0 && !selectedProduct && (
        <div className="info-section">
          <h4>ℹ️ Información</h4>
          <p>
            Se encontraron <strong>{allItems.length}</strong> productos disponibles para venta.
            Use el buscador para encontrar el producto que desea vender.
          </p>
          <ul>
            <li>Solo se muestran productos activos con stock disponible</li>
            <li>Los productos deben tener un precio de venta configurado</li>
            <li>Puede ajustar el precio de venta antes de agregar el producto</li>
            <li>Se mostrará una alerta si el stock queda crítico después de la venta</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default SaleProductSelector;