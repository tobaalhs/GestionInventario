import { Supplier, ValidationResult } from '../interfaces/Purchase';
import { SupplierFormData, SupplierSearchResult } from '../interfaces/FormTypes';

/**
 * Validar RUT chileno
 */
export const validateSupplierRut = (rut: string): boolean => {
  if (!rut || typeof rut !== 'string') {
    return false;
  }

  // Limpiar RUT (remover puntos, guiones y espacios)
  const cleanRut = rut.replace(/[.\-\s]/g, '').toUpperCase();
  
  // Verificar que tenga al menos 8 caracteres (7 dígitos + 1 verificador)
  if (cleanRut.length < 8 || cleanRut.length > 9) {
    return false;
  }

  // Separar número y dígito verificador
  const rutNumber = cleanRut.slice(0, -1);
  const verifierDigit = cleanRut.slice(-1);

  // Verificar que el número solo contenga dígitos
  if (!/^\d+$/.test(rutNumber)) {
    return false;
  }

  // Verificar que el dígito verificador sea válido
  if (!/^[0-9K]$/.test(verifierDigit)) {
    return false;
  }

  // Calcular dígito verificador
  const calculatedVerifier = calculateRutVerifier(rutNumber);
  
  return calculatedVerifier === verifierDigit;
};

/**
 * Calcular dígito verificador del RUT
 */
const calculateRutVerifier = (rutNumber: string): string => {
  let sum = 0;
  let multiplier = 2;

  // Recorrer el RUT de derecha a izquierda
  for (let i = rutNumber.length - 1; i >= 0; i--) {
    sum += parseInt(rutNumber[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = sum % 11;
  const verifier = 11 - remainder;

  if (verifier === 11) return '0';
  if (verifier === 10) return 'K';
  return verifier.toString();
};

/**
 * Formatear RUT chileno
 */
export const formatSupplierRut = (rut: string): string => {
  if (!rut || typeof rut !== 'string') {
    return '';
  }

  // Limpiar RUT
  const cleanRut = rut.replace(/[.\-\s]/g, '').toUpperCase();
  
  if (cleanRut.length < 7) {
    return cleanRut;
  }

  // Separar número y dígito verificador
  const rutNumber = cleanRut.slice(0, -1);
  const verifierDigit = cleanRut.slice(-1);

  // Formatear con puntos
  let formattedNumber = '';
  let counter = 0;
  
  for (let i = rutNumber.length - 1; i >= 0; i--) {
    if (counter === 3) {
      formattedNumber = '.' + formattedNumber;
      counter = 0;
    }
    formattedNumber = rutNumber[i] + formattedNumber;
    counter++;
  }

  return `${formattedNumber}-${verifierDigit}`;
};

/**
 * Validar datos completos del proveedor
 */
export const validateSupplierData = (supplier: SupplierFormData): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validar RUT
  if (!supplier.rut || supplier.rut.trim() === '') {
    errors.push('El RUT es obligatorio');
  } else {
    if (!validateSupplierRut(supplier.rut)) {
      errors.push('El RUT no tiene un formato válido');
    }
  }

  // Validar nombre
  if (!supplier.name || supplier.name.trim() === '') {
    errors.push('El nombre del proveedor es obligatorio');
  } else {
    if (supplier.name.trim().length < 2) {
      errors.push('El nombre debe tener al menos 2 caracteres');
    }
    if (supplier.name.length > 100) {
      errors.push('El nombre no puede exceder 100 caracteres');
    }
  }

  // Validar contacto
  if (!supplier.contact || supplier.contact.trim() === '') {
    errors.push('La persona de contacto es obligatoria');
  } else {
    if (supplier.contact.trim().length < 2) {
      errors.push('El nombre del contacto debe tener al menos 2 caracteres');
    }
    if (supplier.contact.length > 100) {
      errors.push('El nombre del contacto no puede exceder 100 caracteres');
    }
  }

  // Validar email (opcional)
  if (supplier.email && supplier.email.trim() !== '') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(supplier.email.trim())) {
      errors.push('El email no tiene un formato válido');
    }
    if (supplier.email.length > 100) {
      errors.push('El email no puede exceder 100 caracteres');
    }
  }

  // Validar teléfono (opcional)
  if (supplier.phone && supplier.phone.trim() !== '') {
    const phoneRegex = /^(\+56)?[0-9\s\-()]{8,15}$/;
    if (!phoneRegex.test(supplier.phone.trim())) {
      warnings.push('El formato del teléfono puede no ser válido para Chile');
    }
  }

  // Validar dirección (opcional)
  if (supplier.address && supplier.address.length > 200) {
    warnings.push('La dirección es muy larga, considere abreviarla');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Formatear datos de contacto del proveedor
 */
export const formatSupplierContact = (contact: string): string => {
  if (!contact || typeof contact !== 'string') {
    return '';
  }

  // Capitalizar primera letra de cada palabra
  return contact
    .trim()
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Formatear nombre del proveedor
 */
export const formatSupplierName = (name: string): string => {
  if (!name || typeof name !== 'string') {
    return '';
  }

  // Mantener siglas en mayúsculas, capitalizar palabras normales
  return name
    .trim()
    .split(' ')
    .map(word => {
      // Si es una sigla (todas mayúsculas o termina en punto)
      if (word.toUpperCase() === word || word.endsWith('.')) {
        return word.toUpperCase();
      }
      // Capitalizar palabra normal
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

/**
 * Limpiar y formatear número de teléfono
 */
export const formatPhoneNumber = (phone: string): string => {
  if (!phone || typeof phone !== 'string') {
    return '';
  }

  // Remover caracteres no numéricos excepto +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // Si no tiene código de país, agregarlo
  if (!cleaned.startsWith('+56') && cleaned.length === 9) {
    cleaned = '+56' + cleaned;
  }

  // Formatear número chileno
  if (cleaned.startsWith('+56')) {
    const number = cleaned.substring(3);
    if (number.length === 9) {
      return `+56 ${number.substring(0, 1)} ${number.substring(1, 5)} ${number.substring(5)}`;
    }
  }

  return phone; // Retornar original si no se puede formatear
};

/**
 * Extraer iniciales del proveedor
 */
export const getSupplierInitials = (supplierName: string): string => {
  if (!supplierName || typeof supplierName !== 'string') {
    return 'PR';
  }

  const words = supplierName.trim().split(' ');
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }

  return words
    .slice(0, 2)
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase();
};

/**
 * Generar código de proveedor sugerido
 */
export const generateSupplierCode = (supplierName: string): string => {
  if (!supplierName || typeof supplierName !== 'string') {
    return 'PROV';
  }

  // Extraer primeras letras de las primeras 3 palabras
  const words = supplierName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z\s]/g, '') // Remover caracteres especiales
    .split(' ')
    .filter(word => word.length > 0);

  let code = '';
  for (let i = 0; i < Math.min(3, words.length); i++) {
    code += words[i].charAt(0);
  }

  // Completar con números si es muy corto
  while (code.length < 3) {
    code += '0';
  }

  return code;
};

/**
 * Validar email específicamente
 */
export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  if (!email || email.trim() === '') {
    return { isValid: true }; // Email es opcional
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email.trim())) {
    return { 
      isValid: false, 
      error: 'El email no tiene un formato válido' 
    };
  }

  if (email.length > 100) {
    return { 
      isValid: false, 
      error: 'El email no puede exceder 100 caracteres' 
    };
  }

  return { isValid: true };
};

/**
 * Validar teléfono específicamente
 */
export const validatePhoneNumber = (phone: string): { isValid: boolean; error?: string } => {
  if (!phone || phone.trim() === '') {
    return { isValid: true }; // Teléfono es opcional
  }

  // Limpiar número
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Verificar longitud mínima
  if (cleaned.length < 8) {
    return { 
      isValid: false, 
      error: 'El teléfono debe tener al menos 8 dígitos' 
    };
  }

  // Verificar longitud máxima
  if (cleaned.length > 15) {
    return { 
      isValid: false, 
      error: 'El teléfono no puede exceder 15 dígitos' 
    };
  }

  return { isValid: true };
};

/**
 * Crear objeto proveedor desde formulario
 */
export const createSupplierFromForm = (formData: SupplierFormData): Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'> => {
  return {
    rut: formatSupplierRut(formData.rut),
    name: formatSupplierName(formData.name),
    contact: formatSupplierContact(formData.contact),
    email: formData.email?.trim() || undefined,
    phone: formData.phone ? formatPhoneNumber(formData.phone) : undefined,
    address: formData.address?.trim() || undefined,
    isActive: true,
    totalPurchases: 0
  };
};

/**
 * Filtrar proveedores por término de búsqueda
 */
export const filterSuppliersBySearchTerm = (
  suppliers: SupplierSearchResult[], 
  searchTerm: string
): SupplierSearchResult[] => {
  if (!searchTerm || searchTerm.trim() === '') {
    return suppliers;
  }

  const term = searchTerm.toLowerCase().trim();

  return suppliers.filter(supplier => 
    supplier.rut.toLowerCase().includes(term) ||
    supplier.name.toLowerCase().includes(term) ||
    supplier.contact.toLowerCase().includes(term) ||
    supplier.email?.toLowerCase().includes(term)
  );
};

/**
 * Ordenar proveedores por diferentes criterios
 */
export const sortSuppliers = (
  suppliers: SupplierSearchResult[],
  sortBy: 'name' | 'rut' | 'contact' | 'totalPurchases' | 'lastPurchaseDate',
  order: 'asc' | 'desc' = 'asc'
): SupplierSearchResult[] => {
  const sorted = [...suppliers].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'rut':
        comparison = a.rut.localeCompare(b.rut);
        break;
      case 'contact':
        comparison = a.contact.localeCompare(b.contact);
        break;
      case 'totalPurchases':
        comparison = a.totalPurchases - b.totalPurchases;
        break;
      case 'lastPurchaseDate':
        const dateA = a.lastPurchaseDate?.getTime() || 0;
        const dateB = b.lastPurchaseDate?.getTime() || 0;
        comparison = dateA - dateB;
        break;
    }

    return order === 'desc' ? -comparison : comparison;
  });

  return sorted;
};

/**
 * Obtener proveedores activos únicamente
 */
export const getActiveSuppliers = (suppliers: SupplierSearchResult[]): SupplierSearchResult[] => {
  return suppliers.filter(supplier => supplier.isActive);
};

/**
 * Obtener proveedores con compras recientes
 */
export const getSuppliersWithRecentPurchases = (
  suppliers: SupplierSearchResult[], 
  monthsBack: number = 6
): SupplierSearchResult[] => {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - monthsBack);

  return suppliers.filter(supplier => 
    supplier.lastPurchaseDate && 
    supplier.lastPurchaseDate >= cutoffDate
  );
};

/**
 * Calcular estadísticas de proveedores
 */
export const calculateSupplierStatistics = (suppliers: SupplierSearchResult[]) => {
  const activeSuppliers = suppliers.filter(s => s.isActive).length;
  const totalSuppliers = suppliers.length;
  const totalPurchases = suppliers.reduce((sum, s) => sum + s.totalPurchases, 0);
  const averagePurchasesPerSupplier = totalSuppliers > 0 ? totalPurchases / totalSuppliers : 0;

  // Top 5 proveedores por compras
  const topSuppliers = [...suppliers]
    .sort((a, b) => b.totalPurchases - a.totalPurchases)
    .slice(0, 5);

  // Proveedores con compras recientes (últimos 3 meses)
  const recentSuppliers = getSuppliersWithRecentPurchases(suppliers, 3);

  return {
    totalSuppliers,
    activeSuppliers,
    inactiveSuppliers: totalSuppliers - activeSuppliers,
    totalPurchases,
    averagePurchasesPerSupplier,
    topSuppliers,
    recentSuppliersCount: recentSuppliers.length,
    suppliersWithoutPurchases: suppliers.filter(s => s.totalPurchases === 0).length
  };
};

/**
 * Generar datos de formulario vacío
 */
export const getEmptySupplierForm = (): SupplierFormData => {
  return {
    isNewSupplier: true,
    rut: '',
    name: '',
    contact: '',
    email: '',
    phone: '',
    address: ''
  };
};

/**
 * Verificar si un proveedor tiene datos completos
 */
export const isSupplierComplete = (supplier: SupplierFormData): boolean => {
  return !!(
    supplier.rut &&
    supplier.name &&
    supplier.contact &&
    validateSupplierRut(supplier.rut)
  );
};

/**
 * Limpiar datos del proveedor
 */
export const cleanSupplierData = (supplier: SupplierFormData): SupplierFormData => {
  return {
    ...supplier,
    rut: formatSupplierRut(supplier.rut),
    name: formatSupplierName(supplier.name),
    contact: formatSupplierContact(supplier.contact),
    email: supplier.email?.trim() || '',
    phone: supplier.phone ? formatPhoneNumber(supplier.phone) : '',
    address: supplier.address?.trim() || ''
  };
};

/**
 * Comparar dos proveedores para detectar cambios
 */
export const hasSupplierChanged = (
  current: SupplierFormData, 
  original: SupplierFormData
): boolean => {
  const cleanCurrent = cleanSupplierData(current);
  const cleanOriginal = cleanSupplierData(original);

  return JSON.stringify(cleanCurrent) !== JSON.stringify(cleanOriginal);
};

/**
 * Obtener sugerencias de autocompletado
 */
export const getSupplierSuggestions = (
  suppliers: SupplierSearchResult[],
  searchTerm: string,
  maxSuggestions: number = 5
): SupplierSearchResult[] => {
  if (!searchTerm || searchTerm.trim().length < 2) {
    return suppliers.slice(0, maxSuggestions);
  }

  const filtered = filterSuppliersBySearchTerm(suppliers, searchTerm);
  return filtered.slice(0, maxSuggestions);
};

/**
 * Validar que el RUT sea único en una lista
 */
export const isRutUniqueInList = (
  rut: string, 
  suppliers: SupplierSearchResult[], 
  excludeId?: string
): boolean => {
  const formattedRut = formatSupplierRut(rut);
  
  return !suppliers.some(supplier => 
    supplier.rut === formattedRut && 
    supplier.id !== excludeId
  );
};

/**
 * Obtener mensaje de estado del proveedor
 */
export const getSupplierStatusMessage = (supplier: SupplierSearchResult): string => {
  if (!supplier.isActive) {
    return 'Proveedor inactivo';
  }

  if (supplier.totalPurchases === 0) {
    return 'Sin compras registradas';
  }

  if (!supplier.lastPurchaseDate) {
    return 'Fecha de última compra desconocida';
  }

  const daysSinceLastPurchase = Math.floor(
    (new Date().getTime() - supplier.lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceLastPurchase <= 30) {
    return 'Proveedor activo';
  } else if (daysSinceLastPurchase <= 90) {
    return 'Compra reciente';
  } else {
    return `Última compra hace ${daysSinceLastPurchase} días`;
  }
};