const pdf = require('html-pdf');

class PDFService {
  generateReportsPDF(reports, filters) {
    return new Promise((resolve, reject) => {
      try {
        // Build HTML content
        let htmlContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                  font-family: Arial, sans-serif; 
                  padding: 30px; 
                  background: white;
                }
                .header {
                  text-align: center;
                  margin-bottom: 20px;
                  padding-bottom: 20px;
                  border-bottom: 2px solid #020c4c;
                }
                .header h1 {
                  color: #020c4c;
                  font-size: 24px;
                  margin-bottom: 8px;
                }
                .header .subtitle {
                  color: #666;
                  font-size: 14px;
                }
                .header .staff-info {
                  color: #666;
                  font-size: 13px;
                  margin-top: 5px;
                  font-weight: bold;
                }
                table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-top: 20px;
                  font-size: 11px;
                }
                th {
                  background-color: #020c4c;
                  color: white;
                  padding: 10px 8px;
                  text-align: left;
                  font-weight: bold;
                  border: 1px solid #020c4c;
                }
                td {
                  padding: 8px;
                  border: 1px solid #ddd;
                  vertical-align: top;
                  line-height: 1.4;
                }
                tr:nth-child(even) td {
                  background-color: #f9fafb;
                }
                .index-col { width: 5%; text-align: center; }
                .date-col { width: 12%; }
                .staff-col { width: 15%; }
                .workdone-col { width: 62%; }
                .status-col { width: 6%; text-align: center; }
                .workdone-text {
                  white-space: pre-wrap;
                  word-wrap: break-word;
                  max-width: 100%;
                }
                .status-icon {
                  color: green;
                  font-size: 16px;
                }
                .footer {
                  text-align: center;
                  margin-top: 30px;
                  padding-top: 20px;
                  border-top: 1px solid #ddd;
                  color: #666;
                  font-size: 11px;
                }
                .no-reports {
                  text-align: center;
                  padding: 50px;
                  color: #999;
                }
                @media print {
                  tr:nth-child(even) td { background-color: #f9fafb; }
                  .no-reports { display: none; }
                }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>Staff Daily Reports</h1>
                <div class="subtitle">
                  From: ${new Date(filters.startDate).toLocaleDateString()} 
                  To: ${new Date(filters.endDate).toLocaleDateString()}
                </div>
        `;

        if (filters.userId && filters.userId !== 'all') {
          const staffName = reports.length > 0 ? 
            `${reports[0].userId.firstName} ${reports[0].userId.lastName}` : 
            'Selected Staff';
          htmlContent += `<div class="staff-info">Staff: ${staffName}</div>`;
        }

        htmlContent += `
                <div class="subtitle" style="margin-top:5px;">
                  Total Reports: ${reports.length}
                </div>
              </div>
        `;

        if (reports.length === 0) {
          htmlContent += `
            <div class="no-reports">
              <p>No reports found for the selected date range</p>
            </div>
          `;
        } else {
          htmlContent += `
            <table>
              <thead>
                <tr>
                  <th class="index-col">#</th>
                  <th class="date-col">Date</th>
                  <th class="staff-col">Staff</th>
                  <th class="workdone-col">Work Done</th>
                  <th class="status-col">Status</th>
                </tr>
              </thead>
              <tbody>
          `;

          reports.forEach((report, index) => {
            // Clean and format work done
            let workDone = report.workDone || '';
            // Replace newlines with <br> for HTML display
            workDone = workDone.replace(/\n/g, '<br>');
            // Handle bullet points
            workDone = workDone.replace(/•/g, '•');
            
            htmlContent += `
              <tr>
                <td class="index-col">${index + 1}</td>
                <td class="date-col">${new Date(report.date).toLocaleDateString()}</td>
                <td class="staff-col">
                  ${report.userId.firstName} ${report.userId.lastName}
                </td>
                <td class="workdone-col">
                  <div class="workdone-text">${workDone}</div>
                </td>
                <td class="status-col">
                  <span class="status-icon">✓</span>
                </td>
              </tr>
            `;
          });

          htmlContent += `
              </tbody>
            </table>
          `;
        }

        htmlContent += `
              <div class="footer">
                <p>Generated on: ${new Date().toLocaleString()}</p>
                <p>© ${new Date().getFullYear()} Mostech Solutions</p>
              </div>
            </body>
          </html>
        `;

        const options = {
          format: 'A4',
          orientation: 'portrait',
          border: {
            top: '20px',
            right: '20px',
            bottom: '20px',
            left: '20px'
          },
          paginationOffset: 1,
          header: {
            height: '0mm'
          },
          footer: {
            height: '0mm'
          },
          zoomFactor: 1,
          phantomPath: null,
          quality: '100'
        };

        pdf.create(htmlContent, options).toBuffer((err, buffer) => {
          if (err) {
            console.error('PDF Creation Error:', err);
            reject(err);
          } else {
            resolve(buffer);
          }
        });
      } catch (error) {
        console.error('PDF Generation Error:', error);
        reject(error);
      }
    });
  }
}

module.exports = new PDFService();