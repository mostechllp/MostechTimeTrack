const PDFDocument = require('pdfkit');
const fs = require('fs');

class PDFService {
  generateReportsPDF(reports, filters) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });

        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // Header
        doc
          .fillColor('#020c4c')
          .fontSize(20)
          .font('Helvetica-Bold')
          .text('Staff Daily Reports', { align: 'center' });
        
        doc.moveDown(0.5);

        // Date range
        doc
          .fontSize(12)
          .font('Helvetica')
          .fillColor('#666666')
          .text(`From: ${new Date(filters.startDate).toLocaleDateString()} To: ${new Date(filters.endDate).toLocaleDateString()}`, {
            align: 'center'
          });
        
        if (filters.userId && filters.userId !== 'all') {
          const staffName = reports.length > 0 ? 
            `${reports[0].userId.firstName} ${reports[0].userId.lastName}` : 
            'Selected Staff';
          doc.text(`Staff: ${staffName}`, { align: 'center' });
        }

        doc.moveDown(1);

        // Table headers
        const tableTop = doc.y;
        const colWidths = [50, 100, 150, 150, 80]; // Adjust as needed
        const headers = ['#', 'Date', 'Staff', 'Work Done', 'Status'];

        // Draw header background
        doc
          .fillColor('#020c4c')
          .rect(50, tableTop - 5, 495, 30)
          .fill();

        // Draw header text
        doc.fillColor('#ffffff');
        let xPos = 50;
        headers.forEach((header, i) => {
          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .text(header, xPos + 5, tableTop + 2, {
              width: colWidths[i],
              align: 'left'
            });
          xPos += colWidths[i];
        });

        let currentY = tableTop + 30;

        // Table rows
        reports.forEach((report, index) => {
          const rowY = currentY;
          
          // Check if we need a new page
          if (rowY > 700) {
            doc.addPage();
            currentY = 50;
            // Redraw headers on new page
            // ... (simplified, could refactor)
          }

          // Row background (alternating)
          if (index % 2 === 0) {
            doc
              .fillColor('#f9fafb')
              .rect(50, rowY - 2, 495, 25)
              .fill();
          }

          doc.fillColor('#000000');
          doc.fontSize(9);
          doc.font('Helvetica');

          let xPosRow = 50;
          const rowData = [
            (index + 1).toString(),
            new Date(report.date).toLocaleDateString(),
            `${report.userId.firstName} ${report.userId.lastName}`,
            report.workDone.length > 50 ? report.workDone.substring(0, 50) + '...' : report.workDone,
            '✅'
          ];

          rowData.forEach((text, i) => {
            doc.text(text, xPosRow + 5, rowY, {
              width: colWidths[i],
              align: 'left',
              ellipsis: true
            });
            xPosRow += colWidths[i];
          });

          currentY += 25;
        });

        // Footer
        doc.moveDown(2);
        doc
          .fontSize(10)
          .fillColor('#666666')
          .text(`Total Reports: ${reports.length}`, 50, doc.y, {
            align: 'center'
          });
        
        doc.text(`Generated on: ${new Date().toLocaleString()}`, {
          align: 'center'
        });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = new PDFService();