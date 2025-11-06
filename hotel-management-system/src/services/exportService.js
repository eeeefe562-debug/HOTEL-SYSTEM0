/**
 * Servicio para exportación de reportes a CSV y PDF
 */

/**
 * Generar archivo CSV
 */
const generateCSV = (data, columns) => {
  if (!data || data.length === 0) {
    return 'No hay datos para exportar';
  }

  // Cabecera
  const headers = columns.map(col => {
    return col.charAt(0).toUpperCase() + col.slice(1).replace(/_/g, ' ');
  });

  let csv = headers.join(',') + '\n';

  // Datos
  data.forEach(row => {
    const values = columns.map(col => {
      let value = row[col];
      
      // Formatear valores
      if (value === null || value === undefined) {
        value = '';
      } else if (typeof value === 'string') {
        // Escapar comillas y comas
        value = `"${value.replace(/"/g, '""')}"`;
      } else if (value instanceof Date) {
        value = value.toISOString().split('T')[0];
      }
      
      return value;
    });
    
    csv += values.join(',') + '\n';
  });

  return csv;
};

/**
 * Generar PDF (requiere biblioteca adicional)
 * Para producción, instalar: npm install pdfkit
 */
const generatePDF = async (reportType, data) => {
  // IMPLEMENTACIÓN BÁSICA
  // En producción, usar pdfkit o similar para generar PDFs profesionales
  
  try {
    // Simulación de PDF (en producción usar pdfkit)
    const pdfContent = `
      ==========================================
      REPORTE: ${reportType.toUpperCase()}
      Fecha: ${new Date().toLocaleDateString('es-BO')}
      ==========================================
      
      ${JSON.stringify(data, null, 2)}
      
      ==========================================
      Generado por Sistema de Gestión Hotelera
      ==========================================
    `;

    return Buffer.from(pdfContent);

    /* EJEMPLO CON PDFKIT (descomentar si instalas pdfkit):
    
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument();
    
    return new Promise((resolve, reject) => {
      const buffers = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      doc.on('error', reject);
      
      // Cabecera
      doc.fontSize(20).text('Reporte de Ingresos', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Fecha: ${new Date().toLocaleDateString('es-BO')}`);
      doc.moveDown();
      
      // Resumen
      if (data.summary) {
        doc.fontSize(14).text('Resumen:', { underline: true });
        doc.fontSize(10);
        doc.text(`Total de transacciones: ${data.summary.total_payments}`);
        doc.text(`Monto total: Bs. ${data.summary.total_amount.toFixed(2)}`);
        doc.moveDown();
      }
      
      // Tabla de datos
      if (data.payments && data.payments.length > 0) {
        doc.fontSize(14).text('Detalle de Pagos:', { underline: true });
        doc.moveDown();
        
        data.payments.forEach((payment, index) => {
          doc.fontSize(9);
          doc.text(`${index + 1}. ${payment.customer_name} - Bs. ${payment.amount}`);
        });
      }
      
      doc.end();
    });
    */
    
  } catch (error) {
    console.error('Error al generar PDF:', error);
    throw error;
  }
};

module.exports = {
  generateCSV,
  generatePDF
};