import React, { useState, useEffect, useRef } from 'react';
import { validateRut, formatRut } from '../auth/Login';
import { getSupplierByRut } from '../../services/supplierService';

// Interfaces temporales (hasta crear los servicios)
interface Supplier {
  id: string;
  rut: string;
  name: string;
  contact: string;
  email?: string;
  phone?: string;
  address?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface SupplierFormData {
  id?: string;
  isNewSupplier: boolean;
  rut: string;
  name: string;
  contact: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface SupplierSelectorProps {
  selectedSupplier: SupplierFormData;
  onSupplierSelect: (supplier: SupplierFormData) => void;
}

const SupplierSelector: React.FC<SupplierSelectorProps> = ({
  selectedSupplier,
  onSupplierSelect
}) => {
  // Estados principales
  const [searchRut, setSearchRut] = useState('');
  const [searchResults, setSearchResults] = useState<Supplier[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showNewSupplierForm, setShowNewSupplierForm] = useState(false);

  // Estados para nuevo proveedor
  const [newSupplierData, setNewSupplierData] = useState({
    rut: '',
    name: '',
    contact: '',
    email: '',
    phone: '',
    address: ''
  });

  const [errors, setErrors] = useState<string[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

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

  // Manejar cambio en RUT de búsqueda
  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const filtered = input.replace(/[^0-9kK.-]/g, '');
    const formatted = formatRut(filtered);
    setSearchRut(formatted);
    setErrors([]);

    // Buscar automáticamente si el RUT está completo
    if (formatted.length >= 11) { // Formato mínimo: 12.345.678-9
      handleSearchSupplier(formatted);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  };

  // Buscar proveedor por RUT
  const handleSearchSupplier = async (rut: string) => {
    if (!validateRut(rut)) {
      setErrors(['RUT inválido']);
      return;
    }

    setLoading(true);
    try {
      console.log('Buscando proveedor con RUT:', rut);
      
      // Buscar en base de datos real
      const existingSupplier = await getSupplierByRut(rut);
      
      if (existingSupplier) {
        console.log('Proveedor encontrado en BD:', existingSupplier);
        
        if (existingSupplier.isActive) {
          // Proveedor activo encontrado
          console.log('Proveedor activo encontrado, seleccionando automáticamente...');
          handleSelectSupplier(existingSupplier);
        } else {
          // Proveedor inactivo encontrado
          setSearchResults([]);
          setShowResults(false);
          setShowNewSupplierForm(true);
          setNewSupplierData({
            rut: rut,
            name: existingSupplier.name,
            contact: existingSupplier.contact,
            email: existingSupplier.email || '',
            phone: existingSupplier.phone || '',
            address: existingSupplier.address || ''
          });
          setErrors([`Se encontró un proveedor inactivo con este RUT: "${existingSupplier.name}". Se reactivará automáticamente.`]);
        }
      } else {
        console.log('No se encontró proveedor, mostrar formulario nuevo');
        // No se encontró proveedor
        setSearchResults([]);
        setShowResults(false);
        setShowNewSupplierForm(true);
        setNewSupplierData({
          rut: rut,
          name: '',
          contact: '',
          email: '',
          phone: '',
          address: ''
        });
      }
    } catch (error) {
      console.error('Error buscando proveedor:', error);
      setErrors(['Error al buscar proveedor']);
    } finally {
      setLoading(false);
    }
  };

  // Seleccionar proveedor existente - ESTA ES LA FUNCIÓN CLAVE
  const handleSelectSupplier = (supplier: Supplier) => {
    console.log('Seleccionando proveedor:', supplier);
    
    const supplierData: SupplierFormData = {
      id: supplier.id, 
      isNewSupplier: false, 
      rut: supplier.rut,
      name: supplier.name,
      contact: supplier.contact,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address
    };

    console.log('Datos del proveedor a enviar:', supplierData);
    
    onSupplierSelect(supplierData);
    setShowResults(false);
    setShowNewSupplierForm(false);
    setSearchRut(supplier.rut);
    setErrors([]);
  };

  // Mostrar formulario de nuevo proveedor
  const handleShowNewSupplierForm = () => {
    setShowNewSupplierForm(true);
    setNewSupplierData({
      ...newSupplierData,
      rut: searchRut
    });
    setShowResults(false);
  };

  // Validar formulario de nuevo proveedor
  const validateNewSupplierForm = (): boolean => {
    const validationErrors: string[] = [];

    if (!validateRut(newSupplierData.rut)) {
      validationErrors.push('RUT del proveedor inválido');
    }

    if (!newSupplierData.name.trim()) {
      validationErrors.push('El nombre del proveedor es obligatorio');
    }

    if (!newSupplierData.contact.trim()) {
      validationErrors.push('El contacto es obligatorio');
    }

    // Validar email si se proporciona
    if (newSupplierData.email && newSupplierData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newSupplierData.email)) {
        validationErrors.push('El email no tiene un formato válido');
      }
    }

    setErrors(validationErrors);
    return validationErrors.length === 0;
  };

  // Agregar nuevo proveedor
  const handleAddNewSupplier = () => {
    if (!validateNewSupplierForm()) return;

    const supplierData: SupplierFormData = {
      id: undefined, 
      isNewSupplier: true, 
      rut: newSupplierData.rut,
      name: newSupplierData.name,
      contact: newSupplierData.contact,
      email: newSupplierData.email,
      phone: newSupplierData.phone,
      address: newSupplierData.address
    };

    console.log('Nuevo proveedor a crear:', supplierData);

    onSupplierSelect(supplierData);
    setShowNewSupplierForm(false);
    setSearchRut(newSupplierData.rut);
    setErrors([]);
  };

  // Limpiar formulario
  const handleClearForm = () => {
    setSearchRut('');
    setNewSupplierData({
      rut: '',
      name: '',
      contact: '',
      email: '',
      phone: '',
      address: ''
    });
    setShowNewSupplierForm(false);
    setShowResults(false);
    setErrors([]);
    onSupplierSelect({
      isNewSupplier: false,
      rut: '',
      name: '',
      contact: '',
      email: '',
      phone: '',
      address: ''
    });
  };

  return (
    <div className="supplier-selector">
      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && selectedSupplier.rut && (
        <div style={{ backgroundColor: '#f0f0f0', padding: '10px', marginBottom: '10px', fontSize: '12px' }}>
          <strong>Debug:</strong> ID: {selectedSupplier.id || 'SIN ID'} | 
          Nuevo: {selectedSupplier.isNewSupplier ? 'SÍ' : 'NO'} | 
          RUT: {selectedSupplier.rut}
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

      {/* Búsqueda por RUT */}
      <div className="search-section" ref={searchRef}>
        <div className="form-group">
          <label htmlFor="supplierRut">RUT del Proveedor</label>
          <div className="search-input-container">
            <input
              type="text"
              id="supplierRut"
              placeholder="12.345.678-9"
              value={searchRut}
              onChange={handleRutChange}
              className="form-input"
            />
            {loading && <div className="search-loading">🔍</div>}
          </div>
          <small className="form-help">
            Ingresa el RUT del proveedor para buscar en la base de datos
          </small>
        </div>

        {/* Resultados de búsqueda */}
        {showResults && searchResults.length > 0 && (
          <div className="search-results">
            <h4>Proveedores encontrados:</h4>
            {searchResults.map(supplier => (
              <div
                key={supplier.id}
                className="search-result-item supplier-result"
                onClick={() => handleSelectSupplier(supplier)}
              >
                <div className="supplier-info">
                  <strong>{supplier.name}</strong>
                  <span className="supplier-rut">RUT: {supplier.rut}</span>
                  <span className="supplier-contact">Contacto: {supplier.contact}</span>
                  {supplier.email && (
                    <span className="supplier-email">Email: {supplier.email}</span>
                  )}
                  {supplier.phone && (
                    <span className="supplier-phone">Teléfono: {supplier.phone}</span>
                  )}
                </div>
                <div className="select-indicator">
                  ✓ Seleccionar
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Proveedor seleccionado */}
      {selectedSupplier.rut && !showNewSupplierForm && (
        <div className="selected-supplier">
          <h4>🏢 Proveedor {selectedSupplier.isNewSupplier ? 'Nuevo' : 'Seleccionado'}</h4>
          <div className="supplier-details">
            <div className="detail-row">
              <span><strong>RUT:</strong> {selectedSupplier.rut}</span>
              <span><strong>Nombre:</strong> {selectedSupplier.name}</span>
            </div>
            <div className="detail-row">
              <span><strong>Contacto:</strong> {selectedSupplier.contact}</span>
              {selectedSupplier.email && (
                <span><strong>Email:</strong> {selectedSupplier.email}</span>
              )}
            </div>
            {selectedSupplier.phone && (
              <div className="detail-row">
                <span><strong>Teléfono:</strong> {selectedSupplier.phone}</span>
              </div>
            )}
            {selectedSupplier.address && (
              <div className="detail-row">
                <span><strong>Dirección:</strong> {selectedSupplier.address}</span>
              </div>
            )}
            {selectedSupplier.isNewSupplier && (
              <div className="new-supplier-notice">
                ℹ️ Este proveedor se registrará automáticamente al confirmar la compra
              </div>
            )}
            {!selectedSupplier.isNewSupplier && selectedSupplier.id && (
              <div className="existing-supplier-notice" style={{ backgroundColor: '#d1fae5', padding: '8px', borderRadius: '4px', color: '#065f46' }}>
                ✅ Proveedor existente (ID: {selectedSupplier.id})
              </div>
            )}
          </div>
          <button
            onClick={handleClearForm}
            className="btn btn-secondary btn-sm"
          >
            Cambiar proveedor
          </button>
        </div>
      )}

      {/* Formulario de nuevo proveedor */}
      {showNewSupplierForm && (
        <div className="new-supplier-form">
          <h4>📝 Registrar Nuevo Proveedor</h4>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="newSupplierRut">RUT</label>
              <input
                type="text"
                id="newSupplierRut"
                value={newSupplierData.rut}
                onChange={(e) => {
                  const formatted = formatRut(e.target.value);
                  setNewSupplierData({...newSupplierData, rut: formatted});
                }}
                className="form-input"
                placeholder="12.345.678-9"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="newSupplierName">Nombre/Razón Social</label>
              <input
                type="text"
                id="newSupplierName"
                value={newSupplierData.name}
                onChange={(e) => setNewSupplierData({...newSupplierData, name: e.target.value})}
                className="form-input"
                placeholder="Ej: Proveedor ABC Ltda."
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="newSupplierContact">Persona de Contacto</label>
              <input
                type="text"
                id="newSupplierContact"
                value={newSupplierData.contact}
                onChange={(e) => setNewSupplierData({...newSupplierData, contact: e.target.value})}
                className="form-input"
                placeholder="Ej: Juan Pérez"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="newSupplierPhone" className="optional">Teléfono</label>
              <input
                type="tel"
                id="newSupplierPhone"
                value={newSupplierData.phone}
                onChange={(e) => setNewSupplierData({...newSupplierData, phone: e.target.value})}
                className="form-input"
                placeholder="+56912345678"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="newSupplierEmail" className="optional">Email</label>
              <input
                type="email"
                id="newSupplierEmail"
                value={newSupplierData.email}
                onChange={(e) => setNewSupplierData({...newSupplierData, email: e.target.value})}
                className="form-input"
                placeholder="contacto@proveedor.cl"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="newSupplierAddress" className="optional">Dirección</label>
              <input
                type="text"
                id="newSupplierAddress"
                value={newSupplierData.address}
                onChange={(e) => setNewSupplierData({...newSupplierData, address: e.target.value})}
                className="form-input"
                placeholder="Dirección del proveedor"
              />
            </div>
          </div>

          <div className="form-actions">
            <button
              onClick={() => setShowNewSupplierForm(false)}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
            <button
              onClick={handleAddNewSupplier}
              className="btn btn-primary"
            >
              ✅ Usar este proveedor
            </button>
          </div>
        </div>
      )}

      {/* Botón para registro manual */}
      {!showNewSupplierForm && !selectedSupplier.rut && (
        <div className="manual-register-section">
          <p>¿No encuentras el proveedor?</p>
          <button
            onClick={handleShowNewSupplierForm}
            className="btn btn-outline"
          >
            + Registrar nuevo proveedor
          </button>
        </div>
      )}
    </div>
  );
};

export default SupplierSelector;