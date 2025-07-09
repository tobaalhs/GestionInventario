/**
 * Datos del formulario principal de compra
 */
export interface PurchaseFormData {
  selectedProducts: PurchaseItemForm[];
  supplier: SupplierFormData;
  purchaseDate: string; // String en formato YYYY-MM-DD
  expirationDate: string; // String en formato YYYY-MM-DD
  comments: string;
  batchCode?: string; // Código de lote opcional
}

/**
 * Datos de un item en el formulario de compra
 */
export interface PurchaseItemForm {
  id?: string; // ID temporal para el formulario
  productId?: string; // ID del producto en BD (vacío si es nuevo)
  isNewProduct: boolean; // Indica si es un producto nuevo
  productCode: string; // Código del producto
  productName: string; // Nombre del producto
  category: string; // Categoría del producto
  quantity: number; // Cantidad a comprar
  unitPrice: number; // Precio unitario de compra
  totalPrice?: number; // Calculado automáticamente
  
  // Campos adicionales para productos nuevos
  sellPrice?: number; // Precio de venta sugerido
  description?: string; // Descripción del producto
  imageUrl?: string; // URL de imagen del producto
  supplier?: string; // Proveedor principal del producto
  
  // Campos específicos del lote
  expirationDate?: string; // Fecha de vencimiento específica
  batchCode?: string; // Código del lote específico
  
  // Validación y UI
  hasErrors?: boolean; // Si el item tiene errores de validación
  isEditing?: boolean; // Si está siendo editado
}

/**
 * Datos del proveedor en el formulario
 */
export interface SupplierFormData {
  id?: string; // ID del proveedor en BD (vacío si es nuevo)
  isNewSupplier: boolean; // Indica si es un proveedor nuevo
  rut: string; // RUT del proveedor
  name: string; // Nombre o razón social
  contact: string; // Persona de contacto
  email?: string; // Email opcional
  phone?: string; // Teléfono opcional
  address?: string; // Dirección opcional
  
  // Campos adicionales para nuevos proveedores
  businessType?: SupplierBusinessType; // Tipo de negocio
  paymentTerms?: string; // Términos de pago
  website?: string; // Sitio web
  notes?: string; // Notas adicionales
  
  // Validación y UI
  hasErrors?: boolean; // Si tiene errores de validación
  isLoading?: boolean; // Si está cargando datos
}

/**
 * Tipos de negocio del proveedor
 */
export enum SupplierBusinessType {
  MANUFACTURER = 'manufacturer', // Fabricante
  DISTRIBUTOR = 'distributor', // Distribuidor
  WHOLESALER = 'wholesaler', // Mayorista
  RETAILER = 'retailer', // Minorista
  SERVICE = 'service', // Servicio
  OTHER = 'other' // Otro
}

/**
 * Estado del formulario de compra
 */
export interface PurchaseFormState {
  // Datos del formulario
  formData: PurchaseFormData;
  
  // Estados de UI
  isSubmitting: boolean;
  isValid: boolean;
  hasUnsavedChanges: boolean;
  currentStep: FormStep;
  
  // Validación
  errors: FormErrors;
  warnings: FormWarnings;
  
  // Cálculos
  totalAmount: number;
  totalQuantity: number;
  totalItems: number;
  
  // Configuración
  showConfirmation: boolean;
  generatedCode: string;
}

/**
 * Pasos del formulario
 */
export enum FormStep {
  PRODUCTS = 'products', // Selección de productos
  SUPPLIER = 'supplier', // Selección de proveedor
  DETAILS = 'details', // Detalles de la compra
  REVIEW = 'review', // Revisión final
  CONFIRMATION = 'confirmation' // Confirmación
}

/**
 * Errores del formulario
 */
export interface FormErrors {
  general: string[]; // Errores generales
  products: ProductErrors[]; // Errores por producto
  supplier: SupplierErrors; // Errores del proveedor
  purchase: PurchaseErrors; // Errores de la compra
}

/**
 * Errores de productos
 */
export interface ProductErrors {
  productId?: string; // ID temporal del producto
  productCode: string[]; // Errores del código
  productName: string[]; // Errores del nombre
  category: string[]; // Errores de categoría
  quantity: string[]; // Errores de cantidad
  unitPrice: string[]; // Errores de precio
  sellPrice: string[]; // Errores de precio de venta
  description: string[]; // Errores de descripción
  expirationDate: string[]; // Errores de fecha de vencimiento
}

/**
 * Errores del proveedor
 */
export interface SupplierErrors {
  rut: string[]; // Errores del RUT
  name: string[]; // Errores del nombre
  contact: string[]; // Errores del contacto
  email: string[]; // Errores del email
  phone: string[]; // Errores del teléfono
  address: string[]; // Errores de dirección
}

/**
 * Errores de la compra
 */
export interface PurchaseErrors {
  purchaseDate: string[]; // Errores de fecha de compra
  expirationDate: string[]; // Errores de fecha de vencimiento
  comments: string[]; // Errores de comentarios
  totalAmount: string[]; // Errores del monto total
}

/**
 * Advertencias del formulario
 */
export interface FormWarnings {
  general: string[]; // Advertencias generales
  products: string[]; // Advertencias de productos
  supplier: string[]; // Advertencias del proveedor
  financial: string[]; // Advertencias financieras
}

/**
 * Configuración de validación
 */
export interface ValidationConfig {
  // Productos
  minQuantity: number; // Cantidad mínima por producto
  maxQuantity: number; // Cantidad máxima por producto
  minUnitPrice: number; // Precio mínimo por unidad
  maxUnitPrice: number; // Precio máximo por unidad
  requireCategory: boolean; // Si la categoría es obligatoria
  
  // Proveedor
  validateRut: boolean; // Si validar formato de RUT
  requireEmail: boolean; // Si el email es obligatorio
  requirePhone: boolean; // Si el teléfono es obligatorio
  
  // Compra
  maxDaysInFuture: number; // Máximo días en el futuro para fecha de compra
  requireExpirationDate: boolean; // Si la fecha de vencimiento es obligatoria
  maxItemsPerPurchase: number; // Máximo items por compra
  maxTotalAmount: number; // Monto máximo total
  
  // Otros
  allowDuplicateCodes: boolean; // Si permitir códigos duplicados
  autoCalculateSellPrice: boolean; // Si auto-calcular precio de venta
  sellPriceMargin: number; // Margen para precio de venta (%)
}

/**
 * Opciones de búsqueda de productos
 */
export interface ProductSearchOptions {
  searchTerm: string; // Término de búsqueda
  searchType: ProductSearchType; // Tipo de búsqueda
  activeOnly: boolean; // Solo productos activos
  excludeIds: string[]; // IDs a excluir de resultados
  maxResults: number; // Máximo número de resultados
}

/**
 * Tipos de búsqueda de productos
 */
export enum ProductSearchType {
  NAME = 'name', // Por nombre
  CODE = 'code', // Por código
  CATEGORY = 'category', // Por categoría
  SUPPLIER = 'supplier', // Por proveedor
  ALL = 'all' // Búsqueda en todos los campos
}

/**
 * Resultado de búsqueda de productos
 */
export interface ProductSearchResult {
  id: string;
  code: string;
  name: string;
  category: string;
  price: number;
  sellPrice: number;
  stock: number;
  supplier: string;
  isActive: boolean;
  imageUrl?: string;
  lastPurchaseDate?: Date;
  lastPurchasePrice?: number;
}

/**
 * Opciones de búsqueda de proveedores
 */
export interface SupplierSearchOptions {
  searchTerm: string; // Término de búsqueda (RUT, nombre, etc.)
  activeOnly: boolean; // Solo proveedores activos
  hasRecentPurchases: boolean; // Con compras recientes
  maxResults: number; // Máximo número de resultados
}

/**
 * Resultado de búsqueda de proveedores
 */
export interface SupplierSearchResult {
  id: string;
  rut: string;
  name: string;
  contact: string;
  email?: string;
  phone?: string;
  isActive: boolean;
  totalPurchases: number;
  lastPurchaseDate?: Date;
  averageDeliveryTime?: number; // Días promedio de entrega
}

/**
 * Datos para preview de compra
 */
export interface PurchasePreview {
  code: string; // Código generado
  totalItems: number; // Total de items
  totalQuantity: number; // Cantidad total
  totalAmount: number; // Monto total
  supplier: SupplierFormData; // Datos del proveedor
  newProductsCount: number; // Cantidad de productos nuevos
  existingProductsCount: number; // Cantidad de productos existentes
  estimatedImpact: InventoryImpact; // Impacto estimado en inventario
  warnings: string[]; // Advertencias importantes
}

/**
 * Impacto estimado en inventario
 */
export interface InventoryImpact {
  totalValueIncrease: number; // Incremento en valor total
  affectedCategories: string[]; // Categorías afectadas
  newCategories: string[]; // Nuevas categorías
  stockIncreaseByCategory: CategoryImpact[]; // Incremento por categoría
}

/**
 * Impacto por categoría
 */
export interface CategoryImpact {
  category: string;
  itemsAdded: number;
  quantityAdded: number;
  valueAdded: number;
  percentageIncrease: number;
}

/**
 * Configuración de autocompletado
 */
export interface AutocompleteConfig {
  enabled: boolean; // Si está habilitado
  minCharacters: number; // Mínimo caracteres para activar
  maxSuggestions: number; // Máximo sugerencias
  debounceMs: number; // Milisegundos de debounce
  cacheResults: boolean; // Si cachear resultados
  showRecentItems: boolean; // Mostrar items recientes
}

/**
 * Sugerencias de autocompletado
 */
export interface AutocompleteSuggestion {
  id: string;
  label: string; // Texto a mostrar
  value: string; // Valor a usar
  description?: string; // Descripción adicional
  category?: string; // Categoría de la sugerencia
  metadata?: Record<string, any>; // Metadatos adicionales
}

/**
 * Configuración de formato de campos
 */
export interface FieldFormatConfig {
  // Números
  decimalPlaces: number; // Decimales para precios
  thousandSeparator: string; // Separador de miles
  decimalSeparator: string; // Separador decimal
  
  // Fechas
  dateFormat: string; // Formato de fecha (DD/MM/YYYY)
  timeFormat: string; // Formato de hora (HH:mm)
  
  // Texto
  capitalizeNames: boolean; // Capitalizar nombres automáticamente
  trimWhitespace: boolean; // Eliminar espacios automáticamente
  
  // RUT
  rutFormat: string; // Formato de RUT (XX.XXX.XXX-X)
  validateRutDigit: boolean; // Validar dígito verificador
}

/**
 * Estado de un campo individual
 */
export interface FieldState {
  value: any; // Valor actual
  initialValue: any; // Valor inicial
  isValid: boolean; // Si es válido
  isTouched: boolean; // Si fue tocado por el usuario
  isModified: boolean; // Si fue modificado
  errors: string[]; // Errores del campo
  warnings: string[]; // Advertencias del campo
}

/**
 * Metadatos del formulario
 */
export interface FormMetadata {
  version: string; // Versión del formulario
  createdAt: Date; // Fecha de creación
  lastModified: Date; // Última modificación
  modifiedBy: string; // Usuario que modificó
  autoSaveEnabled: boolean; // Si auto-guardado está habilitado
  lastAutoSave?: Date; // Última vez que se auto-guardó
}

/**
 * Configuración de auto-guardado
 */
export interface AutoSaveConfig {
  enabled: boolean; // Si está habilitado
  intervalMs: number; // Intervalo en milisegundos
  onFieldChange: boolean; // Guardar en cada cambio de campo
  onFormValid: boolean; // Guardar solo cuando el formulario es válido
  maxRetries: number; // Máximo reintentos en caso de error
}