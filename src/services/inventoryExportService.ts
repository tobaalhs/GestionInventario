import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import * as XLSX from 'xlsx';

export interface InventoryItem {
  id: string;
  name: string;
  code: string;
  category: string;
  price: number;
  sellPrice: number;
  stock: number;
  supplier: string;
  description: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupplierInfo {
  id: string;
  name: string;
  rut: string;
  contact: string;
  email?: string;
  phone?: string;
  address?: string;
  isActive: boolean;
  totalPurchases: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryExportData {
  products: InventoryItem[];
  suppliers: SupplierInfo[];
  summary: InventorySummary;
  categoryBreakdown: CategoryBreakdown[];
  supplierBreakdown: SupplierBreakdown[];
}

export interface InventorySummary {
  totalProducts: number;
  totalProductsByCategory: Record<string, number>;
  totalInventoryValue: number;
  totalStock: number;
  averagePrice: number;
  averageSellPrice: number;
  activeProducts: number;
  inactiveProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
}

export interface CategoryBreakdown {
  category: string;
  productCount: number;
  totalStock: number;
  totalValue: number;
  averagePrice: number;
  percentage: number;
}

export interface SupplierBreakdown {
  supplierId: string;
  supplierName: string;
  productCount: number;
  totalValue: number;
  isActive: boolean;
  lastPurchaseDate?: Date;
}

export interface InventoryExportOptions {
  includeInactiveProducts: boolean;
  includeProductDetails: boolean;
  includeSummary: boolean;
  includeSuppliers: boolean;
  includeCategories: boolean;
  categoryFilter?: string[];
  supplierFilter?: string[];
  stockFilter?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
}

export const getInventoryData = async (options: InventoryExportOptions): Promise<InventoryExportData> => {
  try {
    console.log('📦 Obteniendo datos del inventario...');
    
    let productsQuery = collection(db, 'items');
    let queryConstraints: any[] = [];

    if (!options.includeInactiveProducts) {
      queryConstraints.push(where('isActive', '==', true));
    }

    if (options.categoryFilter && options.categoryFilter.length > 0) {
      queryConstraints.push(where('category', 'in', options.categoryFilter));
    }

    queryConstraints.push(orderBy('name', 'asc'));

    const finalQuery = queryConstraints.length > 0 ? 
      query(productsQuery, ...queryConstraints) : 
      query(productsQuery, orderBy('name', 'asc'));

    const productsSnapshot = await getDocs(finalQuery);
    
    let products: InventoryItem[] = productsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || 'Sin nombre',
        code: data.code || '',
        category: data.category || 'Sin categoría',
        price: data.price || 0,
        sellPrice: data.sellPrice || 0,
        stock: data.stock || 0,
        supplier: data.supplier || 'Sin proveedor',
        description: data.description || '',
        imageUrl: data.imageUrl,
        isActive: data.isActive !== false,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      };
    });

    if (options.stockFilter && options.stockFilter !== 'all') {
      products = products.filter(product => {
        switch (options.stockFilter) {
          case 'in_stock':
            return product.stock > 5;
          case 'low_stock':
            return product.stock > 0 && product.stock <= 5;
          case 'out_of_stock':
            return product.stock === 0;
          default:
            return true;
        }
      });
    }

    let suppliers: SupplierInfo[] = [];
    if (options.includeSuppliers) {
      const suppliersSnapshot = await getDocs(collection(db, 'suppliers'));
      suppliers = suppliersSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || 'Sin nombre',
          rut: data.rut || '',
          contact: data.contact || '',
          email: data.email,
          phone: data.phone,
          address: data.address,
          isActive: data.isActive !== false,
          totalPurchases: data.totalPurchases || 0,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        };
      });

      if (options.supplierFilter && options.supplierFilter.length > 0) {
        suppliers = suppliers.filter(supplier => 
          options.supplierFilter!.includes(supplier.id)
        );
      }
    }

    const summary = calculateInventorySummary(products);
    const categoryBreakdown = calculateCategoryBreakdown(products);
    const supplierBreakdown = calculateSupplierBreakdown(products, suppliers);

    console.log(`✅ Datos del inventario obtenidos: ${products.length} productos`);

    return {
      products,
      suppliers,
      summary,
      categoryBreakdown,
      supplierBreakdown
    };

  } catch (error) {
    console.error('❌ Error obteniendo datos del inventario:', error);
    throw error;
  }
};

const calculateInventorySummary = (products: InventoryItem[]): InventorySummary => {
  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.isActive).length;
  const inactiveProducts = totalProducts - activeProducts;
  
  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
  const totalInventoryValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
  
  const averagePrice = totalProducts > 0 ? 
    products.reduce((sum, p) => sum + p.price, 0) / totalProducts : 0;
  const averageSellPrice = totalProducts > 0 ? 
    products.reduce((sum, p) => sum + p.sellPrice, 0) / totalProducts : 0;

  const lowStockProducts = products.filter(p => p.stock > 0 && p.stock <= 5).length;
  const outOfStockProducts = products.filter(p => p.stock === 0).length;

  const totalProductsByCategory: Record<string, number> = {};
  products.forEach(product => {
    const category = product.category || 'Sin categoría';
    totalProductsByCategory[category] = (totalProductsByCategory[category] || 0) + 1;
  });

  return {
    totalProducts,
    totalProductsByCategory,
    totalInventoryValue,
    totalStock,
    averagePrice,
    averageSellPrice,
    activeProducts,
    inactiveProducts,
    lowStockProducts,
    outOfStockProducts
  };
};

const calculateCategoryBreakdown = (products: InventoryItem[]): CategoryBreakdown[] => {
  const categoryMap = new Map<string, {
    productCount: number;
    totalStock: number;
    totalValue: number;
    totalPrice: number;
  }>();

  products.forEach(product => {
    const category = product.category || 'Sin categoría';
    const existing = categoryMap.get(category) || {
      productCount: 0,
      totalStock: 0,
      totalValue: 0,
      totalPrice: 0
    };

    existing.productCount += 1;
    existing.totalStock += product.stock;
    existing.totalValue += product.price * product.stock;
    existing.totalPrice += product.price;

    categoryMap.set(category, existing);
  });

  const totalValue = Array.from(categoryMap.values()).reduce((sum, cat) => sum + cat.totalValue, 0);

  return Array.from(categoryMap.entries()).map(([category, data]) => ({
    category,
    productCount: data.productCount,
    totalStock: data.totalStock,
    totalValue: data.totalValue,
    averagePrice: data.productCount > 0 ? data.totalPrice / data.productCount : 0,
    percentage: totalValue > 0 ? (data.totalValue / totalValue) * 100 : 0
  })).sort((a, b) => b.totalValue - a.totalValue);
};

const calculateSupplierBreakdown = (products: InventoryItem[], suppliers: SupplierInfo[]): SupplierBreakdown[] => {
  const supplierMap = new Map<string, {
    productCount: number;
    totalValue: number;
  }>();

  products.forEach(product => {
    const supplierName = product.supplier || 'Sin proveedor';
    const existing = supplierMap.get(supplierName) || {
      productCount: 0,
      totalValue: 0
    };

    existing.productCount += 1;
    existing.totalValue += product.price * product.stock;

    supplierMap.set(supplierName, existing);
  });

  return Array.from(supplierMap.entries()).map(([supplierName, data]) => {
    const supplier = suppliers.find(s => s.name === supplierName);
    return {
      supplierId: supplier?.id || '',
      supplierName,
      productCount: data.productCount,
      totalValue: data.totalValue,
      isActive: supplier?.isActive || false,
      lastPurchaseDate: undefined
    };
  }).sort((a, b) => b.totalValue - a.totalValue);
};

export const exportInventoryToExcel = async (
  data: InventoryExportData, 
  options: InventoryExportOptions
): Promise<void> => {
  try {
    console.log('📊 Generando archivo Excel del inventario...');

    const workbook = XLSX.utils.book_new();

    if (options.includeProductDetails) {
      const productsData = data.products.map(product => ({
        'Código': product.code,
        'Nombre': product.name,
        'Categoría': product.category,
        'Proveedor': product.supplier,
        'Precio Compra': product.price,
        'Precio Venta': product.sellPrice,
        'Stock': product.stock,
        'Valor Total': product.price * product.stock,
        'Estado': product.isActive ? 'Activo' : 'Inactivo',
        'Descripción': product.description,
        'Fecha Creación': product.createdAt.toLocaleDateString('es-CL'),
        'Última Actualización': product.updatedAt.toLocaleDateString('es-CL')
      }));

      const productsSheet = XLSX.utils.json_to_sheet(productsData);
      
      const columnWidths = [
        { wch: 15 }, // Código
        { wch: 30 }, // Nombre
        { wch: 20 }, // Categoría
        { wch: 25 }, // Proveedor
        { wch: 15 }, // Precio Compra
        { wch: 15 }, // Precio Venta
        { wch: 10 }, // Stock
        { wch: 15 }, // Valor Total
        { wch: 12 }, // Estado
        { wch: 40 }, // Descripción
        { wch: 15 }, // Fecha Creación
        { wch: 20 }  // Última Actualización
      ];
      productsSheet['!cols'] = columnWidths;

      XLSX.utils.book_append_sheet(workbook, productsSheet, 'Inventario');
    }

    if (options.includeSummary) {
      const summaryData = [
        { 'Métrica': 'Total de Productos', 'Valor': data.summary.totalProducts },
        { 'Métrica': 'Productos Activos', 'Valor': data.summary.activeProducts },
        { 'Métrica': 'Productos Inactivos', 'Valor': data.summary.inactiveProducts },
        { 'Métrica': 'Stock Total', 'Valor': data.summary.totalStock },
        { 'Métrica': 'Valor Total del Inventario', 'Valor': `$${data.summary.totalInventoryValue.toLocaleString('es-CL')}` },
        { 'Métrica': 'Precio Promedio de Compra', 'Valor': `$${data.summary.averagePrice.toLocaleString('es-CL')}` },
        { 'Métrica': 'Precio Promedio de Venta', 'Valor': `$${data.summary.averageSellPrice.toLocaleString('es-CL')}` },
        { 'Métrica': 'Productos con Stock Bajo (≤5)', 'Valor': data.summary.lowStockProducts },
        { 'Métrica': 'Productos Agotados', 'Valor': data.summary.outOfStockProducts }
      ];

      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      summarySheet['!cols'] = [{ wch: 35 }, { wch: 25 }];
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');
    }

    if (options.includeCategories) {
      const categoriesData = data.categoryBreakdown.map(category => ({
        'Categoría': category.category,
        'Número de Productos': category.productCount,
        'Stock Total': category.totalStock,
        'Valor Total': `$${category.totalValue.toLocaleString('es-CL')}`,
        'Precio Promedio': `$${category.averagePrice.toLocaleString('es-CL')}`,
        'Porcentaje del Inventario': `${category.percentage.toFixed(2)}%`
      }));

      const categoriesSheet = XLSX.utils.json_to_sheet(categoriesData);
      categoriesSheet['!cols'] = [
        { wch: 25 }, // Categoría
        { wch: 18 }, // Número de Productos
        { wch: 15 }, // Stock Total
        { wch: 20 }, // Valor Total
        { wch: 18 }, // Precio Promedio
        { wch: 25 }  // Porcentaje
      ];
      XLSX.utils.book_append_sheet(workbook, categoriesSheet, 'Por Categorías');
    }

    if (options.includeSuppliers && data.suppliers.length > 0) {
      const suppliersData = data.suppliers.map(supplier => ({
        'RUT': supplier.rut,
        'Nombre': supplier.name,
        'Contacto': supplier.contact,
        'Email': supplier.email || '',
        'Teléfono': supplier.phone || '',
        'Dirección': supplier.address || '',
        'Estado': supplier.isActive ? 'Activo' : 'Inactivo',
        'Total Compras': supplier.totalPurchases,
        'Fecha Registro': supplier.createdAt.toLocaleDateString('es-CL')
      }));

      const suppliersSheet = XLSX.utils.json_to_sheet(suppliersData);
      suppliersSheet['!cols'] = [
        { wch: 15 }, // RUT
        { wch: 30 }, // Nombre
        { wch: 25 }, // Contacto
        { wch: 30 }, // Email
        { wch: 15 }, // Teléfono
        { wch: 40 }, // Dirección
        { wch: 12 }, // Estado
        { wch: 15 }, // Total Compras
        { wch: 15 }  // Fecha Registro
      ];
      XLSX.utils.book_append_sheet(workbook, suppliersSheet, 'Proveedores');

      const supplierBreakdownData = data.supplierBreakdown.map(supplier => ({
        'Proveedor': supplier.supplierName,
        'Productos': supplier.productCount,
        'Valor Total': `$${supplier.totalValue.toLocaleString('es-CL')}`,
        'Estado': supplier.isActive ? 'Activo' : 'Inactivo'
      }));

      const supplierBreakdownSheet = XLSX.utils.json_to_sheet(supplierBreakdownData);
      supplierBreakdownSheet['!cols'] = [
        { wch: 30 }, // Proveedor
        { wch: 15 }, // Productos
        { wch: 20 }, // Valor Total
        { wch: 12 }  // Estado
      ];
      XLSX.utils.book_append_sheet(workbook, supplierBreakdownSheet, 'Por Proveedores');
    }

    const fileName = `Inventario_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    console.log('✅ Archivo Excel del inventario generado exitosamente');

  } catch (error) {
    console.error('❌ Error generando archivo Excel:', error);
    throw error;
  }
};

export const getAvailableCategories = async (): Promise<string[]> => {
  try {
    const snapshot = await getDocs(collection(db, 'items'));
    const categories = new Set<string>();
    
    snapshot.docs.forEach(doc => {
      const category = doc.data().category;
      if (category) {
        categories.add(category);
      }
    });

    return Array.from(categories).sort();
  } catch (error) {
    console.error('Error obteniendo categorías:', error);
    return [];
  }
};

export const getAvailableSuppliers = async (): Promise<{ id: string; name: string }[]> => {
  try {
    const snapshot = await getDocs(collection(db, 'suppliers'));
    return snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name || 'Sin nombre'
    })).sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error obteniendo proveedores:', error);
    return [];
  }
};