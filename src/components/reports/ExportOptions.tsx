import React, { useState, useEffect } from 'react';
import {
  ExportConfig,
  ExportFormat,
  ExportDataType,
  DeliveryMethod,
  ColumnType
} from '../../interfaces/ExportConfig';
import { validateExportConfig, generateFileName } from '../../services/exportService';
import { estimateExportSize, getFormatIcon, getDataTypeIcon } from '../../utils/exportUtils';
import { ExportColumn } from '../../interfaces/ExportConfig'; 

interface ExportOptionsProps {
  config?: Partial<ExportConfig>;
  dataCount?: number;
  onConfigChange: (config: Partial<ExportConfig>) => void;
  onExport: () => void;
  onCancel: () => void;
  loading?: boolean;
  showPreview?: boolean;
}



const ExportOptions: React.FC<ExportOptionsProps> = ({
  config = {},
  dataCount = 0,
  onConfigChange,
  onExport,
  onCancel,
  loading = false,
  showPreview = true
}) => {
  const [localConfig, setLocalConfig] = useState<Partial<ExportConfig>>(config);
  const [validation, setValidation] = useState<{ isValid: boolean; errors: string[]; warnings: string[] }>({ 
    isValid: true, 
    errors: [], 
    warnings: [] 
  });
  const [estimation, setEstimation] = useState<{ size: number; time: number }>({ size: 0, time: 0 });
  const [previewName, setPreviewName] = useState('');
  const [activeTab, setActiveTab] = useState<'basic' | 'format' | 'security' | 'delivery' | 'branding'>('basic');

  // Actualizar configuración local cuando cambie la prop
  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  // Validar configuración cuando cambie
  useEffect(() => {
    if (localConfig.format && localConfig.dataType) {
      const fullConfig = localConfig as ExportConfig;
      const result = validateExportConfig(fullConfig);
      setValidation(result);
    }
  }, [localConfig]);

  // Estimar tamaño y tiempo cuando cambien parámetros relevantes
  useEffect(() => {
    if (localConfig.format && dataCount > 0) {
      const estimation = estimateExportSize(localConfig.format, localConfig.columns?.length || 5, dataCount);
      setEstimation(estimation);
    }
  }, [localConfig.format, localConfig.columns, dataCount]);

  // Generar preview del nombre del archivo
  useEffect(() => {
    if (localConfig.fileName && localConfig.format) {
      const preview = generateFileName(localConfig as ExportConfig, localConfig.includeTimestamp !== false);
      setPreviewName(preview);
    }
  }, [localConfig.fileName, localConfig.format, localConfig.includeTimestamp]);

  const handleConfigChange = (key: string, value: any) => {
    const newConfig = { ...localConfig, [key]: value };
    setLocalConfig(newConfig);
    onConfigChange(newConfig);
  };

  const handleNestedConfigChange = (section: string, key: string, value: any) => {
    const newConfig = {
      ...localConfig,
      [section]: {
        ...((localConfig as any)[section] || {}),
        [key]: value
      }
    };
    setLocalConfig(newConfig);
    onConfigChange(newConfig);
  };

  const renderBasicOptions = () => (
    <div className="options-section">
      <div className="form-row">
        <div className="form-group">
          <label>Tipo de datos:</label>
          <select
            value={localConfig.dataType || ''}
            onChange={(e) => handleConfigChange('dataType', e.target.value as ExportDataType)}
            className="form-control"
            required
          >
            <option value="">Seleccionar tipo...</option>
            <option value={ExportDataType.MOVEMENT_HISTORY}>
              {getDataTypeIcon(ExportDataType.MOVEMENT_HISTORY)} Historial de Movimientos
            </option>
            <option value={ExportDataType.TRANSACTION_REPORTS}>
              {getDataTypeIcon(ExportDataType.TRANSACTION_REPORTS)} Reportes de Transacciones
            </option>
            <option value={ExportDataType.SALES_REPORTS}>
              {getDataTypeIcon(ExportDataType.SALES_REPORTS)} Reportes de Ventas
            </option>
            <option value={ExportDataType.PURCHASE_REPORTS}>
              {getDataTypeIcon(ExportDataType.PURCHASE_REPORTS)} Reportes de Compras
            </option>
            <option value={ExportDataType.INVENTORY_STATUS}>
              {getDataTypeIcon(ExportDataType.INVENTORY_STATUS)} Estado del Inventario
            </option>
          </select>
        </div>

        <div className="form-group">
          <label>Formato de exportación:</label>
          <select
            value={localConfig.format || ''}
            onChange={(e) => handleConfigChange('format', e.target.value as ExportFormat)}
            className="form-control"
            required
          >
            <option value="">Seleccionar formato...</option>
            <option value={ExportFormat.EXCEL}>
              {getFormatIcon(ExportFormat.EXCEL)} Excel (.xlsx)
            </option>
            <option value={ExportFormat.PDF}>
              {getFormatIcon(ExportFormat.PDF)} PDF
            </option>
            <option value={ExportFormat.CSV}>
              {getFormatIcon(ExportFormat.CSV)} CSV
            </option>
            <option value={ExportFormat.JSON}>
              {getFormatIcon(ExportFormat.JSON)} JSON
            </option>
            <option value={ExportFormat.XML}>
              {getFormatIcon(ExportFormat.XML)} XML
            </option>
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Nombre del archivo:</label>
          <input
            type="text"
            value={localConfig.fileName || ''}
            onChange={(e) => handleConfigChange('fileName', e.target.value)}
            placeholder="nombre_exportacion"
            className="form-control"
            required
          />
          {previewName && (
            <small className="form-hint">Vista previa: <code>{previewName}</code></small>
          )}
        </div>

        <div className="form-group">
          <label>Descripción (opcional):</label>
          <textarea
            value={localConfig.description || ''}
            onChange={(e) => handleConfigChange('description', e.target.value)}
            placeholder="Descripción de la exportación..."
            className="form-control"
            rows={3}
          />
        </div>
      </div>

      <div className="options-grid">
        <label className="option-card">
          <input
            type="checkbox"
            checked={localConfig.includeTimestamp !== false}
            onChange={(e) => handleConfigChange('includeTimestamp', e.target.checked)}
          />
          <div className="option-content">
            <div className="option-icon">🕒</div>
            <div>
              <h4>Incluir timestamp</h4>
              <p>Agregar fecha y hora al nombre del archivo</p>
            </div>
          </div>
        </label>

        <label className="option-card">
          <input
            type="checkbox"
            checked={localConfig.formatSettings?.excel?.includeHeader !== false || 
         localConfig.formatSettings?.csv?.includeHeader !== false || 
         localConfig.formatSettings?.pdf?.includeHeader !== false}
            onChange={(e) => handleNestedConfigChange('formatSettings', 'includeHeaders', e.target.checked)}
          />
          <div className="option-content">
            <div className="option-icon">📋</div>
            <div>
              <h4>Incluir encabezados</h4>
              <p>Mostrar nombres de columnas</p>
            </div>
          </div>
        </label>

        <label className="option-card">
          <input
            type="checkbox"
            checked={false}
            onChange={(e) => handleNestedConfigChange('formatSettings', 'includeStatistics', e.target.checked)}
          />
          <div className="option-content">
            <div className="option-icon">📊</div>
            <div>
              <h4>Incluir estadísticas</h4>
              <p>Agregar resumen y totales</p>
            </div>
          </div>
        </label>

        <label className="option-card">
          <input
            type="checkbox"
            checked={localConfig.formatSettings?.excel?.includeCharts || 
         localConfig.formatSettings?.pdf?.includeCharts || false}
            onChange={(e) => handleNestedConfigChange('formatSettings', 'includeCharts', e.target.checked)}
          />
          <div className="option-content">
            <div className="option-icon">📈</div>
            <div>
              <h4>Incluir gráficos</h4>
              <p>Generar visualizaciones (PDF/Excel)</p>
            </div>
          </div>
        </label>
      </div>
    </div>
  );

  const renderFormatOptions = () => {
    if (!localConfig.format) {
      return (
        <div className="empty-state">
          <div className="empty-icon">📄</div>
          <h3>Selecciona un formato</h3>
          <p>Primero elige el formato de exportación en la pestaña básica</p>
        </div>
      );
    }

    switch (localConfig.format) {
      case ExportFormat.PDF:
        return renderPDFOptions();
      case ExportFormat.EXCEL:
        return renderExcelOptions();
      case ExportFormat.CSV:
        return renderCSVOptions();
      case ExportFormat.JSON:
        return renderJSONOptions();
      default:
        return <div className="no-options">No hay opciones específicas para este formato</div>;
    }
  };

  const renderPDFOptions = () => (
    <div className="options-section">
      <div className="form-row">
        <div className="form-group">
          <label>Tamaño de página:</label>
          <select
            value={localConfig.formatSettings?.pdf?.pageSize || 'A4'}
            onChange={(e) => handleNestedConfigChange('formatSettings', 'pdf', { 
              ...localConfig.formatSettings?.pdf, 
              pageSize: e.target.value 
            })}
            className="form-control"
          >
            <option value="A4">A4</option>
            <option value="A3">A3</option>
            <option value="Letter">Letter</option>
            <option value="Legal">Legal</option>
          </select>
        </div>

        <div className="form-group">
          <label>Orientación:</label>
          <select
            value={localConfig.formatSettings?.pdf?.orientation || 'portrait'}
            onChange={(e) => handleNestedConfigChange('formatSettings', 'pdf', { 
              ...localConfig.formatSettings?.pdf, 
              orientation: e.target.value 
            })}
            className="form-control"
          >
            <option value="portrait">Vertical</option>
            <option value="landscape">Horizontal</option>
          </select>
        </div>

        <div className="form-group">
          <label>Calidad:</label>
          <select
            value={localConfig.formatSettings?.pdf?.quality || 'high'}
            onChange={(e) => handleNestedConfigChange('formatSettings', 'pdf', { 
              ...localConfig.formatSettings?.pdf, 
              quality: e.target.value 
            })}
            className="form-control"
          >
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
          </select>
        </div>
      </div>

      <div className="options-grid">
        <label className="option-card">
          <input
            type="checkbox"
            checked={localConfig.formatSettings?.pdf?.includeHeader !== false}
            onChange={(e) => handleNestedConfigChange('formatSettings', 'pdf', { 
              ...localConfig.formatSettings?.pdf, 
              includeHeader: e.target.checked 
            })}
          />
          <div className="option-content">
            <div className="option-icon">📄</div>
            <div>
              <h4>Encabezado</h4>
              <p>Incluir encabezado en cada página</p>
            </div>
          </div>
        </label>

        <label className="option-card">
          <input
            type="checkbox"
            checked={localConfig.formatSettings?.pdf?.includeFooter !== false}
            onChange={(e) => handleNestedConfigChange('formatSettings', 'pdf', { 
              ...localConfig.formatSettings?.pdf, 
              includeFooter: e.target.checked 
            })}
          />
          <div className="option-content">
            <div className="option-icon">📄</div>
            <div>
              <h4>Pie de página</h4>
              <p>Incluir pie de página</p>
            </div>
          </div>
        </label>

        <label className="option-card">
          <input
            type="checkbox"
            checked={localConfig.formatSettings?.pdf?.includePageNumbers !== false}
            onChange={(e) => handleNestedConfigChange('formatSettings', 'pdf', { 
              ...localConfig.formatSettings?.pdf, 
              includePageNumbers: e.target.checked 
            })}
          />
          <div className="option-content">
            <div className="option-icon">🔢</div>
            <div>
              <h4>Numeración</h4>
              <p>Numerar páginas</p>
            </div>
          </div>
        </label>

        <label className="option-card">
          <input
            type="checkbox"
            checked={localConfig.formatSettings?.pdf?.compression !== false}
            onChange={(e) => handleNestedConfigChange('formatSettings', 'pdf', { 
              ...localConfig.formatSettings?.pdf, 
              compression: e.target.checked 
            })}
          />
          <div className="option-content">
            <div className="option-icon">🗜️</div>
            <div>
              <h4>Compresión</h4>
              <p>Reducir tamaño del archivo</p>
            </div>
          </div>
        </label>
      </div>
    </div>
  );

  const renderExcelOptions = () => (
    <div className="options-section">
      <div className="form-row">
        <div className="form-group">
          <label>Nombre de la hoja:</label>
          <input
            type="text"
            value={localConfig.formatSettings?.excel?.worksheetName || 'Datos'}
            onChange={(e) => handleNestedConfigChange('formatSettings', 'excel', { 
              ...localConfig.formatSettings?.excel, 
              worksheetName: e.target.value 
            })}
            className="form-control"
            maxLength={31}
          />
          <small className="form-hint">Máximo 31 caracteres</small>
        </div>

        <div className="form-group">
          <label>Fila de congelación:</label>
          <input
            type="number"
            value={localConfig.formatSettings?.excel?.freezeRow || 1}
            onChange={(e) => handleNestedConfigChange('formatSettings', 'excel', { 
              ...localConfig.formatSettings?.excel, 
              freezeRow: parseInt(e.target.value) 
            })}
            className="form-control"
            min="0"
            max="10"
          />
        </div>
      </div>

      <div className="options-grid">
        <label className="option-card">
          <input
            type="checkbox"
            checked={localConfig.formatSettings?.excel?.includeFilters !== false}
            onChange={(e) => handleNestedConfigChange('formatSettings', 'excel', { 
              ...localConfig.formatSettings?.excel, 
              includeFilters: e.target.checked 
            })}
          />
          <div className="option-content">
            <div className="option-icon">🔍</div>
            <div>
              <h4>Filtros automáticos</h4>
              <p>Agregar filtros a las columnas</p>
            </div>
          </div>
        </label>

        <label className="option-card">
          <input
            type="checkbox"
            checked={localConfig.formatSettings?.excel?.freezePanes !== false}
            onChange={(e) => handleNestedConfigChange('formatSettings', 'excel', { 
              ...localConfig.formatSettings?.excel, 
              freezePanes: e.target.checked 
            })}
          />
          <div className="option-content">
            <div className="option-icon">❄️</div>
            <div>
              <h4>Congelar paneles</h4>
              <p>Mantener encabezados fijos</p>
            </div>
          </div>
        </label>

        <label className="option-card">
          <input
            type="checkbox"
            checked={localConfig.formatSettings?.excel?.columnWidthAuto !== false}
            onChange={(e) => handleNestedConfigChange('formatSettings', 'excel', { 
              ...localConfig.formatSettings?.excel, 
              columnWidthAuto: e.target.checked 
            })}
          />
          <div className="option-content">
            <div className="option-icon">📏</div>
            <div>
              <h4>Ajuste automático</h4>
              <p>Ajustar ancho de columnas</p>
            </div>
          </div>
        </label>

        <label className="option-card">
          <input
            type="checkbox"
            checked={localConfig.formatSettings?.excel?.compression !== false}
            onChange={(e) => handleNestedConfigChange('formatSettings', 'excel', { 
              ...localConfig.formatSettings?.excel, 
              compression: e.target.checked 
            })}
          />
          <div className="option-content">
            <div className="option-icon">🗜️</div>
            <div>
              <h4>Compresión</h4>
              <p>Reducir tamaño del archivo</p>
            </div>
          </div>
        </label>
      </div>
    </div>
  );

  const renderCSVOptions = () => (
    <div className="options-section">
      <div className="form-row">
        <div className="form-group">
          <label>Delimitador:</label>
          <select
            value={localConfig.formatSettings?.csv?.delimiter || ','}
            onChange={(e) => handleNestedConfigChange('formatSettings', 'csv', { 
              ...localConfig.formatSettings?.csv, 
              delimiter: e.target.value 
            })}
            className="form-control"
          >
            <option value=",">Coma (,)</option>
            <option value=";">Punto y coma (;)</option>
            <option value="\t">Tabulación</option>
            <option value="|">Pipe (|)</option>
          </select>
        </div>

        <div className="form-group">
          <label>Codificación:</label>
          <select
            value={localConfig.formatSettings?.csv?.encoding || 'UTF-8'}
            onChange={(e) => handleNestedConfigChange('formatSettings', 'csv', { 
              ...localConfig.formatSettings?.csv, 
              encoding: e.target.value 
            })}
            className="form-control"
          >
            <option value="UTF-8">UTF-8</option>
            <option value="ISO-8859-1">ISO-8859-1</option>
            <option value="Windows-1252">Windows-1252</option>
          </select>
        </div>

        <div className="form-group">
          <label>Cualificador de texto:</label>
          <select
            value={localConfig.formatSettings?.csv?.textQualifier || '"'}
            onChange={(e) => handleNestedConfigChange('formatSettings', 'csv', { 
              ...localConfig.formatSettings?.csv, 
              textQualifier: e.target.value 
            })}
            className="form-control"
          >
            <option value='"'>Comillas dobles (")</option>
            <option value="'">Comillas simples (')</option>
            <option value="">Ninguno</option>
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Formato de fecha:</label>
          <input
            type="text"
            value={localConfig.formatSettings?.csv?.dateFormat || 'DD/MM/YYYY'}
            onChange={(e) => handleNestedConfigChange('formatSettings', 'csv', { 
              ...localConfig.formatSettings?.csv, 
              dateFormat: e.target.value 
            })}
            className="form-control"
            placeholder="DD/MM/YYYY"
          />
        </div>

        <div className="form-group">
          <label>Formato booleano:</label>
          <select
            value={localConfig.formatSettings?.csv?.booleanFormat || 'true/false'}
            onChange={(e) => handleNestedConfigChange('formatSettings', 'csv', { 
              ...localConfig.formatSettings?.csv, 
              booleanFormat: e.target.value 
            })}
            className="form-control"
          >
            <option value="true/false">true/false</option>
            <option value="1/0">1/0</option>
            <option value="yes/no">yes/no</option>
          </select>
        </div>

        <div className="form-group">
          <label>Valor nulo:</label>
          <input
            type="text"
            value={localConfig.formatSettings?.csv?.nullValue || ''}
            onChange={(e) => handleNestedConfigChange('formatSettings', 'csv', { 
              ...localConfig.formatSettings?.csv, 
              nullValue: e.target.value 
            })}
            className="form-control"
            placeholder="(vacío)"
          />
        </div>
      </div>
    </div>
  );

  const renderJSONOptions = () => (
    <div className="options-section">
      <div className="options-grid">
        <label className="option-card">
          <input
            type="checkbox"
            checked={localConfig.formatSettings?.json?.prettyPrint !== false}
            onChange={(e) => handleNestedConfigChange('formatSettings', 'json', { 
              ...localConfig.formatSettings?.json, 
              prettyPrint: e.target.checked 
            })}
          />
          <div className="option-content">
            <div className="option-icon">✨</div>
            <div>
              <h4>Formato legible</h4>
              <p>Indentar el JSON para mejor legibilidad</p>
            </div>
          </div>
        </label>

        <label className="option-card">
          <input
            type="checkbox"
            checked={localConfig.formatSettings?.json?.includeMetadata !== false}
            onChange={(e) => handleNestedConfigChange('formatSettings', 'json', { 
              ...localConfig.formatSettings?.json, 
              includeMetadata: e.target.checked 
            })}
          />
          <div className="option-content">
            <div className="option-icon">📋</div>
            <div>
              <h4>Incluir metadatos</h4>
              <p>Agregar información de exportación</p>
            </div>
          </div>
        </label>

        <label className="option-card">
          <input
            type="checkbox"
            checked={localConfig.formatSettings?.json?.includeNulls !== false}
            onChange={(e) => handleNestedConfigChange('formatSettings', 'json', { 
              ...localConfig.formatSettings?.json, 
              includeNulls: e.target.checked 
            })}
          />
          <div className="option-content">
            <div className="option-icon">∅</div>
            <div>
              <h4>Incluir valores nulos</h4>
              <p>Mantener campos con valores null</p>
            </div>
          </div>
        </label>

        <label className="option-card">
          <input
            type="checkbox"
            checked={localConfig.formatSettings?.json?.compression !== false}
            onChange={(e) => handleNestedConfigChange('formatSettings', 'json', { 
              ...localConfig.formatSettings?.json, 
              compression: e.target.checked 
            })}
          />
          <div className="option-content">
            <div className="option-icon">🗜️</div>
            <div>
              <h4>Compresión</h4>
              <p>Reducir tamaño del archivo</p>
            </div>
          </div>
        </label>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Formato de fecha:</label>
          <select
            value={localConfig.formatSettings?.json?.dateFormat || 'iso'}
            onChange={(e) => handleNestedConfigChange('formatSettings', 'json', { 
              ...localConfig.formatSettings?.json, 
              dateFormat: e.target.value 
            })}
            className="form-control"
          >
            <option value="iso">ISO 8601</option>
            <option value="unix">Unix timestamp</option>
            <option value="custom">Personalizado</option>
          </select>
        </div>

        {localConfig.formatSettings?.json?.dateFormat === 'custom' && (
          <div className="form-group">
            <label>Formato personalizado:</label>
            <input
              type="text"
              value={localConfig.formatSettings?.json?.customDateFormat || 'YYYY-MM-DD'}
              onChange={(e) => handleNestedConfigChange('formatSettings', 'json', { 
                ...localConfig.formatSettings?.json, 
                customDateFormat: e.target.value 
              })}
              className="form-control"
              placeholder="YYYY-MM-DD HH:mm:ss"
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderSecurityOptions = () => (
    <div className="options-section">
      <div className="security-section">
        <h4>🔒 Protección del archivo</h4>
        <div className="options-grid">
          <label className="option-card">
            <input
              type="checkbox"
              checked={localConfig.security?.passwordProtect || false}
              onChange={(e) => handleNestedConfigChange('security', 'passwordProtect', e.target.checked)}
            />
            <div className="option-content">
              <div className="option-icon">🔐</div>
              <div>
                <h4>Proteger con contraseña</h4>
                <p>Requiere contraseña para abrir el archivo</p>
              </div>
            </div>
          </label>

          <label className="option-card">
            <input
              type="checkbox"
              checked={localConfig.security?.encrypt || false}
              onChange={(e) => handleNestedConfigChange('security', 'encrypt', e.target.checked)}
            />
            <div className="option-content">
              <div className="option-icon">🛡️</div>
              <div>
                <h4>Encriptar archivo</h4>
                <p>Encriptación AES-256</p>
              </div>
            </div>
          </label>
        </div>

        {localConfig.security?.passwordProtect && (
          <div className="form-group">
            <label>Contraseña:</label>
            <input
              type="password"
              value={localConfig.security?.password || ''}
              onChange={(e) => handleNestedConfigChange('security', 'password', e.target.value)}
              placeholder="Ingresa una contraseña segura"
              className="form-control"
              required
            />
          </div>
        )}
      </div>

      <div className="security-section">
        <h4>💧 Marca de agua</h4>
        <label className="option-card">
          <input
            type="checkbox"
            checked={localConfig.security?.watermark?.enabled || false}
            onChange={(e) => handleNestedConfigChange('security', 'watermark', { 
              ...localConfig.security?.watermark, 
              enabled: e.target.checked 
            })}
          />
          <div className="option-content">
            <div className="option-icon">💧</div>
            <div>
              <h4>Activar marca de agua</h4>
              <p>Agregar marca de agua al documento</p>
            </div>
          </div>
        </label>

        {localConfig.security?.watermark?.enabled && (
          <div className="form-row">
            <div className="form-group">
              <label>Texto de marca de agua:</label>
              <input
                type="text"
                value={localConfig.security?.watermark?.text || 'CONFIDENCIAL'}
                onChange={(e) => handleNestedConfigChange('security', 'watermark', { 
                  ...localConfig.security?.watermark, 
                  text: e.target.value 
                })}
                className="form-control"
                placeholder="CONFIDENCIAL"
              />
            </div>

            <div className="form-group">
              <label>Posición:</label>
              <select
                value={localConfig.security?.watermark?.position || 'center'}
                onChange={(e) => handleNestedConfigChange('security', 'watermark', { 
                  ...localConfig.security?.watermark, 
                  position: e.target.value 
                })}
                className="form-control"
              >
                <option value="center">Centro</option>
                <option value="top-left">Superior izquierda</option>
                <option value="top-right">Superior derecha</option>
                <option value="bottom-left">Inferior izquierda</option>
                <option value="bottom-right">Inferior derecha</option>
              </select>
            </div>

            <div className="form-group">
              <label>Opacidad (%):</label>
              <input
                type="range"
                min="10"
                max="100"
                value={(localConfig.security?.watermark?.opacity || 0.3) * 100}
                onChange={(e) => handleNestedConfigChange('security', 'watermark', { 
                  ...localConfig.security?.watermark, 
                  opacity: parseInt(e.target.value) / 100 
                })}
                className="form-range"
              />
              <span className="range-value">{Math.round((localConfig.security?.watermark?.opacity || 0.3) * 100)}%</span>
            </div>
          </div>
        )}
      </div>

      <div className="security-section">
        <h4>⏰ Expiración</h4>
        <div className="form-row">
          <div className="form-group">
            <label>Expira después de (horas):</label>
            <input
              type="number"
              value={localConfig.security?.expiresAfter || 24}
              onChange={(e) => handleNestedConfigChange('security', 'expiresAfter', parseInt(e.target.value))}
              className="form-control"
              min="1"
              max="8760"
            />
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={localConfig.security?.deleteAfterExpiry || false}
                onChange={(e) => handleNestedConfigChange('security', 'deleteAfterExpiry', e.target.checked)}
              />
              Eliminar después de expirar
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDeliveryOptions = () => (
    <div className="options-section">
      <div className="form-group">
        <label>Método de entrega:</label>
        <select
          value={localConfig.delivery?.method || DeliveryMethod.DOWNLOAD}
          onChange={(e) => handleNestedConfigChange('delivery', 'method', e.target.value as DeliveryMethod)}
          className="form-control"
        >
          <option value={DeliveryMethod.DOWNLOAD}>📥 Descarga directa</option>
          <option value={DeliveryMethod.EMAIL}>📧 Envío por email</option>
          <option value={DeliveryMethod.CLOUD_STORAGE}>☁️ Almacenamiento en la nube</option>
          <option value={DeliveryMethod.MULTIPLE}>🔄 Múltiples métodos</option>
        </select>
      </div>

      {(localConfig.delivery?.method === DeliveryMethod.EMAIL || localConfig.delivery?.method === DeliveryMethod.MULTIPLE) && (
        <div className="delivery-section">
          <h4>📧 Configuración de email</h4>
          <div className="form-group">
            <label>Destinatarios:</label>
            <textarea
              value={localConfig.delivery?.email?.recipients?.join(', ') || ''}
              onChange={(e) => handleNestedConfigChange('delivery', 'email', { 
                ...localConfig.delivery?.email, 
                recipients: e.target.value.split(',').map(email => email.trim()).filter(email => email)
              })}
              placeholder="admin@empresa.com, gerente@empresa.com"
              className="form-control"
              rows={3}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Asunto:</label>
              <input
                type="text"
                value={localConfig.delivery?.email?.subject || 'Exportación de datos'}
                onChange={(e) => handleNestedConfigChange('delivery', 'email', { 
                  ...localConfig.delivery?.email, 
                  subject: e.target.value 
                })}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label>Prioridad:</label>
              <select
                value={localConfig.delivery?.email?.priority || 'normal'}
                onChange={(e) => handleNestedConfigChange('delivery', 'email', { 
                  ...localConfig.delivery?.email, 
                  priority: e.target.value 
                })}
                className="form-control"
              >
                <option value="low">Baja</option>
                <option value="normal">Normal</option>
                <option value="high">Alta</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Mensaje:</label>
            <textarea
              value={localConfig.delivery?.email?.body || 'Adjunto encontrarás la exportación solicitada.'}
              onChange={(e) => handleNestedConfigChange('delivery', 'email', { 
                ...localConfig.delivery?.email, 
                body: e.target.value 
              })}
              className="form-control"
              rows={4}
            />
          </div>

          <div className="options-grid">
            <label className="option-card">
              <input
                type="checkbox"
                checked={localConfig.delivery?.email?.compressAttachment !== false}
                onChange={(e) => handleNestedConfigChange('delivery', 'email', { 
                  ...localConfig.delivery?.email, 
                  compressAttachment: e.target.checked 
                })}
              />
              <div className="option-content">
                <div className="option-icon">🗜️</div>
                <div>
                  <h4>Comprimir adjunto</h4>
                  <p>Reducir tamaño del archivo</p>
                </div>
              </div>
            </label>

            <label className="option-card">
              <input
                type="checkbox"
                checked={localConfig.delivery?.email?.deliveryConfirmation !== false}
                onChange={(e) => handleNestedConfigChange('delivery', 'email', { 
                  ...localConfig.delivery?.email, 
                  deliveryConfirmation: e.target.checked 
                })}
              />
              <div className="option-content">
                <div className="option-icon">✅</div>
                <div>
                  <h4>Confirmación de entrega</h4>
                  <p>Solicitar confirmación de lectura</p>
                </div>
              </div>
            </label>
          </div>
        </div>
      )}

      {(localConfig.delivery?.method === DeliveryMethod.DOWNLOAD || localConfig.delivery?.method === DeliveryMethod.MULTIPLE) && (
        <div className="delivery-section">
          <h4>📥 Configuración de descarga</h4>
          <div className="form-row">
            <div className="form-group">
              <label>Enlace expira en (horas):</label>
              <input
                type="number"
                value={localConfig.delivery?.download?.linkExpiresAfter || 24}
                onChange={(e) => handleNestedConfigChange('delivery', 'download', { 
                  ...localConfig.delivery?.download, 
                  linkExpiresAfter: parseInt(e.target.value) 
                })}
                className="form-control"
                min="1"
                max="168"
              />
            </div>

            <div className="form-group">
              <label>Máximo de descargas:</label>
              <input
                type="number"
                value={localConfig.delivery?.download?.maxDownloads || 10}
                onChange={(e) => handleNestedConfigChange('delivery', 'download', { 
                  ...localConfig.delivery?.download, 
                  maxDownloads: parseInt(e.target.value) 
                })}
                className="form-control"
                min="1"
                max="100"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderBrandingOptions = () => (
    <div className="options-section">
      <div className="form-row">
        <div className="form-group">
          <label>Nombre de la empresa:</label>
          <input
            type="text"
            value={localConfig.branding?.companyName || ''}
            onChange={(e) => handleNestedConfigChange('branding', 'companyName', e.target.value)}
            placeholder="Mi Empresa S.A."
            className="form-control"
          />
        </div>

        <div className="form-group">
          <label>Color primario:</label>
          <div className="color-input-group">
            <input
              type="color"
              value={localConfig.branding?.primaryColor || '#6366f1'}
              onChange={(e) => handleNestedConfigChange('branding', 'primaryColor', e.target.value)}
              className="color-input"
            />
            <input
              type="text"
              value={localConfig.branding?.primaryColor || '#6366f1'}
              onChange={(e) => handleNestedConfigChange('branding', 'primaryColor', e.target.value)}
              className="form-control"
              placeholder="#6366f1"
            />
          </div>
        </div>
      </div>

      <div className="options-grid">
        <label className="option-card">
          <input
            type="checkbox"
            checked={localConfig.branding?.includeLogo !== false}
            onChange={(e) => handleNestedConfigChange('branding', 'includeLogo', e.target.checked)}
          />
          <div className="option-content">
            <div className="option-icon">🖼️</div>
            <div>
              <h4>Incluir logo</h4>
              <p>Mostrar logo de la empresa</p>
            </div>
          </div>
        </label>

        <label className="option-card">
          <input
            type="checkbox"
            checked={localConfig.branding?.includeTimestamp !== false}
            onChange={(e) => handleNestedConfigChange('branding', 'includeTimestamp', e.target.checked)}
          />
          <div className="option-content">
            <div className="option-icon">🕒</div>
            <div>
              <h4>Incluir timestamp</h4>
              <p>Mostrar fecha de generación</p>
            </div>
          </div>
        </label>

        <label className="option-card">
          <input
            type="checkbox"
            checked={localConfig.branding?.includePageInfo !== false}
            onChange={(e) => handleNestedConfigChange('branding', 'includePageInfo', e.target.checked)}
          />
          <div className="option-content">
            <div className="option-icon">📄</div>
            <div>
              <h4>Info de página</h4>
              <p>Número de página y total</p>
            </div>
          </div>
        </label>

        <label className="option-card">
          <input
            type="checkbox"
            checked={localConfig.branding?.includeDisclaimer !== false}
            onChange={(e) => handleNestedConfigChange('branding', 'includeDisclaimer', e.target.checked)}
          />
          <div className="option-content">
            <div className="option-icon">⚠️</div>
            <div>
              <h4>Aviso legal</h4>
              <p>Incluir disclaimer corporativo</p>
            </div>
          </div>
        </label>
      </div>

      {localConfig.branding?.includeDisclaimer && (
        <div className="form-group">
          <label>Texto del disclaimer:</label>
          <textarea
            value={localConfig.branding?.disclaimerText || 'Este documento contiene información confidencial.'}
            onChange={(e) => handleNestedConfigChange('branding', 'disclaimerText', e.target.value)}
            className="form-control"
            rows={3}
            placeholder="Este documento contiene información confidencial y es propiedad de..."
          />
        </div>
      )}
    </div>
  );

  const renderPreview = () => {
    if (!showPreview || !localConfig.format) return null;

    return (
      <div className="preview-section">
        <h4>👀 Vista Previa</h4>
        <div className="preview-card">
          <div className="preview-header">
            <div className="file-icon">
              {getFormatIcon(localConfig.format)}
            </div>
            <div className="file-info">
              <h5>{previewName}</h5>
              <p>
                {dataCount.toLocaleString()} registros • 
                {estimation.size > 0 && ` ~${(estimation.size / 1024).toFixed(1)} KB •`}
                {estimation.time > 0 && ` ~${estimation.time}s`}
              </p>
            </div>
          </div>

          <div className="preview-features">
            {(localConfig.formatSettings?.excel?.includeHeader || localConfig.formatSettings?.csv?.includeHeader || localConfig.formatSettings?.pdf?.includeHeader) && <span>📋 Encabezados</span>}
{/* Comentar temporalmente: includeStatistics no existe */}
{(localConfig.formatSettings?.excel?.includeCharts || localConfig.formatSettings?.pdf?.includeCharts) && <span>📈 Gráficos</span>}
            {localConfig.security?.passwordProtect && <span className="feature-badge">🔒 Protegido</span>}
            {localConfig.security?.watermark?.enabled && <span className="feature-badge">💧 Marca de agua</span>}
          </div>

          {validation.warnings.length > 0 && (
            <div className="preview-warnings">
              <h6>⚠️ Advertencias:</h6>
              <ul>
                {validation.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="export-options">
      <div className="options-header">
        <h3>⚙️ Opciones de Exportación</h3>
        {showPreview && renderPreview()}
      </div>

      <div className="options-tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'basic' ? 'active' : ''}`}
          onClick={() => setActiveTab('basic')}
        >
          📋 Básico
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'format' ? 'active' : ''}`}
          onClick={() => setActiveTab('format')}
        >
          📄 Formato
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          🔒 Seguridad
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'delivery' ? 'active' : ''}`}
          onClick={() => setActiveTab('delivery')}
        >
          📤 Entrega
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'branding' ? 'active' : ''}`}
          onClick={() => setActiveTab('branding')}
        >
          🎨 Branding
        </button>
      </div>

      <div className="options-content">
        {activeTab === 'basic' && renderBasicOptions()}
        {activeTab === 'format' && renderFormatOptions()}
        {activeTab === 'security' && renderSecurityOptions()}
        {activeTab === 'delivery' && renderDeliveryOptions()}
        {activeTab === 'branding' && renderBrandingOptions()}
      </div>

      {validation.errors.length > 0 && (
        <div className="validation-errors">
          <h4>❌ Errores de configuración:</h4>
          <ul>
            {validation.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="options-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={loading}
        >
          Cancelar
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onExport}
          disabled={loading || !validation.isValid || !localConfig.format || !localConfig.dataType}
        >
          {loading ? '🔄 Exportando...' : '📊 Exportar'}
        </button>
      </div>

      <style>{`
        .export-options {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
          border: 1px solid #e5e7eb;
        }

        .options-header {
          padding: 20px;
          border-bottom: 1px solid #e5e7eb;
          background: #f8fafc;
        }

        .options-header h3 {
          margin: 0 0 16px 0;
          color: #1f2937;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .options-tabs {
          display: flex;
          background: #f1f5f9;
          border-bottom: 1px solid #e2e8f0;
          overflow-x: auto;
        }

        .tab-btn {
          padding: 12px 20px;
          border: none;
          background: transparent;
          color: #64748b;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
          border-bottom: 2px solid transparent;
        }

        .tab-btn:hover {
          background: #e2e8f0;
          color: #475569;
        }

        .tab-btn.active {
          background: white;
          color: #1e293b;
          border-bottom-color: #6366f1;
        }

        .options-content {
          padding: 20px;
          min-height: 400px;
        }

        .options-section {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-group label {
          margin-bottom: 6px;
          font-weight: 500;
          color: #374151;
          font-size: 0.875rem;
        }

        .form-control {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.875rem;
          background: white;
          transition: border-color 0.2s ease;
        }

        .form-control:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .form-hint {
          margin-top: 4px;
          font-size: 0.75rem;
          color: #6b7280;
        }

        .form-hint code {
          background: #f3f4f6;
          padding: 2px 4px;
          border-radius: 3px;
          font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
        }

        .options-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 12px;
        }

        .option-card {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          background: #fafbfc;
        }

        .option-card:hover {
          border-color: #6366f1;
          background: #f8fafc;
        }

        .option-card input[type="checkbox"] {
          margin: 0;
          flex-shrink: 0;
        }

        .option-content {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .option-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .option-content h4 {
          margin: 0 0 4px 0;
          font-size: 0.875rem;
          font-weight: 600;
          color: #1f2937;
        }

        .option-content p {
          margin: 0;
          font-size: 0.75rem;
          color: #6b7280;
        }

        .color-input-group {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .color-input {
          width: 40px;
          height: 40px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          cursor: pointer;
        }

        .form-range {
          width: 100%;
          margin: 8px 0;
        }

        .range-value {
          font-size: 0.875rem;
          color: #6b7280;
          font-weight: 500;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.875rem;
          color: #374151;
          cursor: pointer;
        }

        .security-section,
        .delivery-section {
          padding: 16px;
          background: #f9fafb;
          border-radius: 8px;
          border: 1px solid #f1f5f9;
        }

        .security-section h4,
        .delivery-section h4 {
          margin: 0 0 16px 0;
          color: #374151;
          font-size: 1rem;
          font-weight: 600;
        }

        .preview-section {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
        }

        .preview-section h4 {
          margin: 0 0 12px 0;
          color: #374151;
          font-size: 1rem;
          font-weight: 600;
        }

        .preview-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 16px;
        }

        .preview-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .file-icon {
          font-size: 2rem;
        }

        .file-info h5 {
          margin: 0;
          font-size: 0.875rem;
          font-weight: 600;
          color: #1f2937;
        }

        .file-info p {
          margin: 4px 0 0 0;
          font-size: 0.75rem;
          color: #6b7280;
        }

        .preview-features {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }

        .feature-badge {
          display: inline-flex;
          align-items: center;
          padding: 2px 6px;
          background: #dbeafe;
          color: #1e40af;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .preview-warnings {
          background: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 6px;
          padding: 8px 12px;
        }

        .preview-warnings h6 {
          margin: 0 0 4px 0;
          font-size: 0.75rem;
          font-weight: 600;
          color: #92400e;
        }

        .preview-warnings ul {
          margin: 0;
          padding-left: 16px;
          font-size: 0.75rem;
          color: #92400e;
        }

        .validation-errors {
          background: #fee2e2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 12px 16px;
          margin: 0 20px 20px 20px;
        }

        .validation-errors h4 {
          margin: 0 0 8px 0;
          color: #991b1b;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .validation-errors ul {
          margin: 0;
          padding-left: 16px;
          color: #991b1b;
          font-size: 0.875rem;
        }

        .empty-state {
          text-align: center;
          padding: 48px 24px;
          color: #6b7280;
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: 12px;
        }

        .empty-state h3 {
          margin: 0 0 8px 0;
          color: #374151;
          font-size: 1.125rem;
          font-weight: 600;
        }

        .no-options {
          text-align: center;
          padding: 32px;
          color: #6b7280;
          font-style: italic;
        }

        .options-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          padding: 16px 20px;
          background: #f8fafc;
          border-top: 1px solid #e5e7eb;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 6px;
          border: 1px solid transparent;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
        }

        .btn-primary {
          background: #6366f1;
          color: white;
          border-color: #6366f1;
        }

        .btn-primary:hover:not(:disabled) {
          background: #5856eb;
          border-color: #5856eb;
        }

        .btn-secondary {
          background: #f3f4f6;
          color: #374151;
          border-color: #d1d5db;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #e5e7eb;
          border-color: #9ca3af;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .form-row {
            grid-template-columns: 1fr;
          }

          .options-grid {
            grid-template-columns: 1fr;
          }

          .options-tabs {
            flex-direction: column;
          }

          .tab-btn {
            padding: 8px 16px;
            text-align: left;
          }

          .option-card {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }

          .option-content {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }

          .preview-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }

          .preview-features {
            justify-content: center;
          }

          .options-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default ExportOptions;