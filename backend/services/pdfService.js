const PDFDocument = require('pdfkit');

class PDFService {
  generateReportsPDF(reports, filters) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
          bufferPages: true
        });

        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // Helper function to wrap text
        const wrapText = (text, width, font, size) => {
          const words = text.split(' ');
          const lines = [];
          let currentLine = '';
          
          for (let word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const testWidth = doc.widthOfString(testLine, { 
              font: font || 'Helvetica', 
              fontSize: size || 9 
            });
            
            if (testWidth > width - 10) {
              if (currentLine) {
                lines.push(currentLine);
                currentLine = word;
              } else {
                // If a single word is too long, split it
                if (doc.widthOfString(word, { font: font || 'Helvetica', fontSize: size || 9 }) > width - 10) {
                  let chars = word.split('');
                  let charLine = '';
                  for (let char of chars) {
                    const testCharLine = charLine + char;
                    if (doc.widthOfString(testCharLine, { font: font || 'Helvetica', fontSize: size || 9 }) > width - 10) {
                      lines.push(charLine);
                      charLine = char;
                    } else {
                      charLine = testCharLine;
                    }
                  }
                  if (charLine) {
                    lines.push(charLine);
                  }
                } else {
                  lines.push(word);
                }
              }
            } else {
              currentLine = testLine;
            }
          }
          if (currentLine) {
            lines.push(currentLine);
          }
          return lines;
        };

        // Render header function
        const renderHeader = () => {
          doc
            .fillColor('#020c4c')
            .fontSize(20)
            .font('Helvetica-Bold')
            .text('Staff Daily Reports', { align: 'center' });
          
          doc.moveDown(0.5);

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
        };

        // Render table headers
        const renderTableHeaders = (y) => {
          const colWidths = [40, 90, 120, 200, 60];
          const headers = ['#', 'Date', 'Staff', 'Work Done', 'Status'];

          // Draw header background
          doc
            .fillColor('#020c4c')
            .rect(50, y - 5, doc.page.width - 100, 30)
            .fill();

          // Draw header text
          doc.fillColor('#ffffff');
          let xPos = 50;
          headers.forEach((header, i) => {
            doc
              .fontSize(10)
              .font('Helvetica-Bold')
              .text(header, xPos + 5, y + 2, {
                width: colWidths[i] - 5,
                align: 'left'
              });
            xPos += colWidths[i];
          });

          return y + 30;
        };

        // Render a report row
        const renderReportRow = (report, index, startY) => {
          const colWidths = [40, 90, 120, 200, 60];
          let currentY = startY;
          
          // Prepare data
          const rowData = {
            index: (index + 1).toString(),
            date: new Date(report.date).toLocaleDateString(),
            staff: `${report.userId.firstName} ${report.userId.lastName}`,
            workDone: report.workDone || '',
            status: '✅'
          };

          // Calculate needed height for work done text
          const workDoneLines = wrapText(rowData.workDone, colWidths[3], 'Helvetica', 9);
          const rowHeight = Math.max(20, Math.min(workDoneLines.length * 12 + 10, 150));

          // Check if we need a new page
          if (currentY + rowHeight > doc.page.height - 80) {
            doc.addPage();
            currentY = 50;
            // Redraw headers on new page
            renderTableHeaders(currentY);
            currentY += 35;
          }

          // Row background
          if (index % 2 === 0) {
            doc
              .fillColor('#f9fafb')
              .rect(50, currentY - 2, doc.page.width - 100, rowHeight + 4)
              .fill();
          }

          // Draw cell borders
          doc
            .strokeColor('#e5e7eb')
            .lineWidth(0.5)
            .rect(50, currentY - 2, doc.page.width - 100, rowHeight + 4)
            .stroke();

          let xPos = 50;
          doc.fillColor('#000000');
          doc.fontSize(9);
          doc.font('Helvetica');

          // Index
          doc.text(rowData.index, xPos + 5, currentY + 2, {
            width: colWidths[0] - 5,
            align: 'left'
          });
          xPos += colWidths[0];

          // Date
          doc.text(rowData.date, xPos + 5, currentY + 2, {
            width: colWidths[1] - 5,
            align: 'left'
          });
          xPos += colWidths[1];

          // Staff
          doc.text(rowData.staff, xPos + 5, currentY + 2, {
            width: colWidths[2] - 5,
            align: 'left'
          });
          xPos += colWidths[2];

          // Work Done - Multi-line
          let textY = currentY + 2;
          workDoneLines.forEach((line, i) => {
            // Check if we need a new page for very long text
            if (textY > doc.page.height - 80) {
              doc.addPage();
              const newY = renderTableHeaders(50);
              textY = newY + 5;
              // Redraw row background on new page
              if (index % 2 === 0) {
                doc
                  .fillColor('#f9fafb')
                  .rect(50, textY - 2, doc.page.width - 100, 20)
                  .fill();
              }
            }
            
            doc.text(line, xPos + 5, textY, {
              width: colWidths[3] - 5,
              align: 'left',
              ellipsis: true
            });
            textY += 12;
          });
          
          // If work done is empty
          if (workDoneLines.length === 0) {
            doc.text('No work done reported', xPos + 5, currentY + 2, {
              width: colWidths[3] - 5,
              align: 'left',
              color: '#999999'
            });
          }

          xPos += colWidths[3];

          // Status
          doc.text(rowData.status, xPos + 5, currentY + 2, {
            width: colWidths[4] - 5,
            align: 'left'
          });

          return currentY + rowHeight + 8;
        };

        // Render the document
        renderHeader();
        let startY = renderTableHeaders(doc.y);
        startY += 5; // Small padding

        // Render each report
        let currentY = startY;
        reports.forEach((report, index) => {
          currentY = renderReportRow(report, index, currentY);
        });

        // Footer
        doc
          .fontSize(10)
          .fillColor('#666666')
          .text(`Total Reports: ${reports.length}`, 50, doc.page.height - 40, {
            align: 'center'
          });
        
        doc.text(`Generated on: ${new Date().toLocaleString()}`, {
          align: 'center'
        });

        doc.end();
      } catch (error) {
        console.error('PDF Generation Error:', error);
        reject(error);
      }
    });
  }
}

module.exports = new PDFService();