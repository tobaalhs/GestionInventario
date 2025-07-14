import React, { useState, useEffect, useRef } from 'react';
import { validateRut, formatRut } from '../auth/Login';
import { getCustomerByRut } from '../../services/customerService';
import { Customer, CustomerFormData } from '../../interfaces/Customer';

interface CustomerSelectorProps {
  selectedCustomer: CustomerFormData;
  onCustomerSelect: (customer: CustomerFormData) => void;
}

const CustomerSelector: React.FC<CustomerSelectorProps> = ({
  selectedCustomer,
  onCustomerSelect
}) => {
  // Estados principales
  const [searchRut, setSearchRut] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);

  // Estados para nuevo cliente
  const [newCustomerData, setNewCustomerData] = useState({
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
      handleSearchCustomer(formatted);
    } else {
      setShowResults(false);
    }
  };

  // Buscar cliente por RUT
  const handleSearchCustomer = async (rut: string) => {
    if (!validateRut(rut)) {
      setErrors(['RUT inválido']);
      return;
    }

    setLoading(true);
    try {
      console.log('Buscando cliente con RUT:', rut);
      
      // Buscar en base de datos real
      const existingCustomer = await getCustomerByRut(rut);
      
      if (existingCustomer) {
        console.log('Cliente encontrado en BD:', existingCustomer);
        
        if (existingCustomer.isActive) {
          // Cliente activo encontrado 
          console.log('Cliente activo encontrado, seleccionando automáticamente...');
          handleSelectCustomer(existingCustomer);
        } else {
          // Cliente inactivo encontrado - Mostrar opción de reactivar
          setShowResults(false);
          setShowNewCustomerForm(true);
          setNewCustomerData({
            rut: rut,
            name: existingCustomer.name,
            contact: existingCustomer.contact,
            email: existingCustomer.email || '',
            phone: existingCustomer.phone || '',
            address: existingCustomer.address || ''
          });
          setErrors([`Se encontró un cliente inactivo con este RUT: "${existingCustomer.name}". Se reactivará automáticamente.`]);
        }
      } else {
        console.log('No se encontró cliente, mostrar formulario nuevo');
        // No se encontró cliente - Mostrar formulario para nuevo
        setShowResults(false);
        setShowNewCustomerForm(true);
        setNewCustomerData({
          rut: rut,
          name: '',
          contact: '',
          email: '',
          phone: '',
          address: ''
        });
      }
    } catch (error) {
      console.error('Error buscando cliente:', error);
      setErrors(['Error al buscar cliente']);
    } finally {
      setLoading(false);
    }
  };

  // Seleccionar cliente existente 
  const handleSelectCustomer = (customer: Customer) => {
    console.log('Seleccionando cliente:', customer);
    
    const customerData: CustomerFormData = {
      id: customer.id, 
      isNewCustomer: false, 
      rut: customer.rut,
      name: customer.name,
      contact: customer.contact,
      email: customer.email,
      phone: customer.phone,
      address: customer.address
    };

    console.log('Datos del cliente a enviar:', customerData);
    
    onCustomerSelect(customerData);
    setShowResults(false);
    setShowNewCustomerForm(false);
    setSearchRut(customer.rut);
    setErrors([]);
  };

  // Mostrar formulario de nuevo cliente
  const handleShowNewCustomerForm = () => {
    setShowNewCustomerForm(true);
    setNewCustomerData({
      ...newCustomerData,
      rut: searchRut
    });
    setShowResults(false);
  };

  // Validar formulario de nuevo cliente
  const validateNewCustomerForm = (): boolean => {
    const validationErrors: string[] = [];

    if (!validateRut(newCustomerData.rut)) {
      validationErrors.push('RUT del cliente inválido');
    }

    if (!newCustomerData.name.trim()) {
      validationErrors.push('El nombre del cliente es obligatorio');
    }

    if (!newCustomerData.contact.trim()) {
      validationErrors.push('La información de contacto es obligatoria');
    }

    // Validar email si se proporciona
    if (newCustomerData.email && newCustomerData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newCustomerData.email)) {
        validationErrors.push('El email no tiene un formato válido');
      }
    }

    setErrors(validationErrors);
    return validationErrors.length === 0;
  };

  // Agregar nuevo cliente
  const handleAddNewCustomer = () => {
    if (!validateNewCustomerForm()) return;

    const customerData: CustomerFormData = {
      id: undefined, 
      isNewCustomer: true, 
      rut: newCustomerData.rut,
      name: newCustomerData.name,
      contact: newCustomerData.contact,
      email: newCustomerData.email,
      phone: newCustomerData.phone,
      address: newCustomerData.address
    };

    console.log('Nuevo cliente a crear:', customerData);

    onCustomerSelect(customerData);
    setShowNewCustomerForm(false);
    setSearchRut(newCustomerData.rut);
    setErrors([]);
  };

  // Limpiar formulario
  const handleClearForm = () => {
    setSearchRut('');
    setNewCustomerData({
      rut: '',
      name: '',
      contact: '',
      email: '',
      phone: '',
      address: ''
    });
    setShowNewCustomerForm(false);
    setShowResults(false);
    setErrors([]);
    onCustomerSelect({
      isNewCustomer: false,
      rut: '',
      name: '',
      contact: '',
      email: '',
      phone: '',
      address: ''
    });
  };

  return (
    <div className="customer-selector">
      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && selectedCustomer.rut && (
        <div style={{ backgroundColor: '#f0f0f0', padding: '10px', marginBottom: '10px', fontSize: '12px' }}>
          <strong>Debug Cliente:</strong> ID: {selectedCustomer.id || 'SIN ID'} | 
          Nuevo: {selectedCustomer.isNewCustomer ? 'SÍ' : 'NO'} | 
          RUT: {selectedCustomer.rut}
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
          <label htmlFor="customerRut">RUT del Cliente</label>
          <div className="search-input-container">
            <input
              type="text"
              id="customerRut"
              placeholder="12.345.678-9"
              value={searchRut}
              onChange={handleRutChange}
              className="form-input"
            />
            {loading && <div className="search-loading">🔍</div>}
          </div>
          <small className="form-help">
            Ingresa el RUT del cliente para buscar en la base de datos
          </small>
        </div>
      </div>

      {/* Cliente seleccionado */}
      {selectedCustomer.rut && !showNewCustomerForm && (
        <div className="selected-customer">
          <h4>👤 Cliente {selectedCustomer.isNewCustomer ? 'Nuevo' : 'Seleccionado'}</h4>
          <div className="customer-details">
            <div className="detail-row">
              <span><strong>RUT:</strong> {selectedCustomer.rut}</span>
              <span><strong>Nombre:</strong> {selectedCustomer.name}</span>
            </div>
            <div className="detail-row">
              <span><strong>Contacto:</strong> {selectedCustomer.contact}</span>
              {selectedCustomer.email && (
                <span><strong>Email:</strong> {selectedCustomer.email}</span>
              )}
            </div>
            {selectedCustomer.phone && (
              <div className="detail-row">
                <span><strong>Teléfono:</strong> {selectedCustomer.phone}</span>
              </div>
            )}
            {selectedCustomer.address && (
              <div className="detail-row">
                <span><strong>Dirección:</strong> {selectedCustomer.address}</span>
              </div>
            )}
            {selectedCustomer.isNewCustomer && (
              <div className="new-customer-notice">
                ℹ️ Este cliente se registrará automáticamente al confirmar la venta
              </div>
            )}
            {!selectedCustomer.isNewCustomer && selectedCustomer.id && (
              <div className="existing-customer-notice" style={{ backgroundColor: '#d1fae5', padding: '8px', borderRadius: '4px', color: '#065f46' }}>
                ✅ Cliente existente (ID: {selectedCustomer.id})
              </div>
            )}
          </div>
          <button
            onClick={handleClearForm}
            className="btn btn-secondary btn-sm"
          >
            Cambiar cliente
          </button>
        </div>
      )}

      {/* Formulario de nuevo cliente */}
      {showNewCustomerForm && (
        <div className="new-customer-form">
          <h4>📝 Registrar Nuevo Cliente</h4>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="newCustomerRut">RUT</label>
              <input
                type="text"
                id="newCustomerRut"
                value={newCustomerData.rut}
                onChange={(e) => {
                  const formatted = formatRut(e.target.value);
                  setNewCustomerData({...newCustomerData, rut: formatted});
                }}
                className="form-input"
                placeholder="12.345.678-9"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="newCustomerName">Nombre Completo</label>
              <input
                type="text"
                id="newCustomerName"
                value={newCustomerData.name}
                onChange={(e) => setNewCustomerData({...newCustomerData, name: e.target.value})}
                className="form-input"
                placeholder="Ej: Juan Pérez González"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="newCustomerContact">Información de Contacto</label>
              <input
                type="text"
                id="newCustomerContact"
                value={newCustomerData.contact}
                onChange={(e) => setNewCustomerData({...newCustomerData, contact: e.target.value})}
                className="form-input"
                placeholder="Ej: Teléfono, Email, etc."
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="newCustomerPhone" className="optional">Teléfono</label>
              <input
                type="tel"
                id="newCustomerPhone"
                value={newCustomerData.phone}
                onChange={(e) => setNewCustomerData({...newCustomerData, phone: e.target.value})}
                className="form-input"
                placeholder="+56912345678"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="newCustomerEmail" className="optional">Email</label>
              <input
                type="email"
                id="newCustomerEmail"
                value={newCustomerData.email}
                onChange={(e) => setNewCustomerData({...newCustomerData, email: e.target.value})}
                className="form-input"
                placeholder="cliente@email.com"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="newCustomerAddress" className="optional">Dirección</label>
              <input
                type="text"
                id="newCustomerAddress"
                value={newCustomerData.address}
                onChange={(e) => setNewCustomerData({...newCustomerData, address: e.target.value})}
                className="form-input"
                placeholder="Dirección del cliente"
              />
            </div>
          </div>

          <div className="form-actions">
            <button
              onClick={() => setShowNewCustomerForm(false)}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
            <button
              onClick={handleAddNewCustomer}
              className="btn btn-primary"
            >
              ✅ Usar este cliente
            </button>
          </div>
        </div>
      )}

      {/* Botón para registro manual */}
      {!showNewCustomerForm && !selectedCustomer.rut && (
        <div className="manual-register-section">
          <p>¿No encuentras el cliente?</p>
          <button
            onClick={handleShowNewCustomerForm}
            className="btn btn-outline"
          >
            + Registrar nuevo cliente
          </button>
        </div>
      )}
    </div>
  );
};

export default CustomerSelector;