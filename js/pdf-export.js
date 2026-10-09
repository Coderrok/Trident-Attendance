/**
 * Professional PDF Report Generator for Construction Attendance & Payroll Audit
 * Uses jsPDF and jsPDF-AutoTable for high-contrast, executive-ready formatting.
 */

class AttendancePDFExporter {
    constructor() {
        this.companyName = 'TRIDENT DESIGN AND CONTRACT';
        this.department = 'Field Project Operations & Attendance Audit Division';
    }

    /**
     * Generates and downloads a multi-page, audit-grade PDF report.
     */
    generateReport({ records, filterInfo, stats }) {
        if (!window.jspdf || !window.jspdf.jsPDF) {
            alert('PDF Generator library is loading. Please check internet connection or retry in 3 seconds.');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        const timeStr = now.toLocaleTimeString('en-US', { hour12: false });

        // --- BRAND HEADER BANNER ---
        // Top safety accent bar (Trident Flame Orange)
        doc.setFillColor(245, 158, 11); // #F59E0B
        doc.rect(0, 0, pageWidth, 5, 'F');

        // Dark Charcoal / Slate Header Bar
        doc.setFillColor(15, 23, 42); // #0F172A
        doc.rect(0, 5, pageWidth, 28, 'F');

        // Company Title & Badge
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(255, 255, 255);
        doc.text(this.companyName, 14, 15);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(203, 213, 225); // Slate-300
        doc.text(`FIELD ATTENDANCE, GPS TRACKING & PAYROLL AUDIT REPORT  |  ${this.department}`, 14, 21);
        doc.text(`Report Generated: ${dateStr} ${timeStr}  |  Evaluator: System Admin (ID: AUDIT-770)`, 14, 27);

        // Security Stamp / QR placeholder text right-aligned
        doc.setFont('courier', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(245, 158, 11);
        doc.text(`AUDIT REF: #TRIDENT-${Date.now().toString(36).toUpperCase()}`, pageWidth - 14, 15, { align: 'right' });
        doc.setTextColor(148, 163, 184);
        doc.setFont('helvetica', 'normal');
        doc.text('MANDATORY GPS VERIFIED', pageWidth - 14, 21, { align: 'right' });
        doc.text('30-DAY COMPLIANCE RECORD', pageWidth - 14, 27, { align: 'right' });

        // --- METADATA & KPI SUMMARY CARDS ---
        const summaryY = 38;

        // Card 1: Total Shifts
        this.drawMetricCard(doc, 14, summaryY, 62, 18, 'TOTAL LOGGED SHIFTS', `${stats.totalShifts || records.length} Shifts`, [30, 41, 59]);

        // Card 2: Total Working Hours
        this.drawMetricCard(doc, 80, summaryY, 62, 18, 'TOTAL MAN-HOURS', `${stats.totalHours || '0.0'} Hours`, [30, 41, 59]);

        // Card 3: Geofence Compliance
        const compRate = `${stats.complianceRate || 100}%`;
        this.drawMetricCard(doc, 146, summaryY, 62, 18, 'GEOFENCE COMPLIANCE', compRate, [16, 185, 129]); // Safety green

        // Card 4: Punctuality / Late Count
        const lateInfo = `${stats.lateCount || 0} Late Punches`;
        this.drawMetricCard(doc, 212, summaryY, 71, 18, 'PUNCTUALITY / LATE FLAGS', lateInfo, stats.lateCount > 0 ? [239, 68, 68] : [16, 185, 129]);

        // Filter Context Line
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        const filterSummary = `FILTER APPLIED: Range: [${filterInfo.dateRangeLabel || 'All'}]  |  Site: [${filterInfo.siteLabel || 'All Sites'}]  |  Staff: [${filterInfo.staffLabel || 'All Staff'}]  |  Status: [${filterInfo.statusLabel || 'All'}]`;
        doc.text(filterSummary, 14, 61);

        // --- ATTENDANCE TABLE PREPARATION ---
        const tableColumns = [
            { header: 'Date', dataKey: 'date' },
            { header: 'Staff Name & ID', dataKey: 'staff' },
            { header: 'Site Location', dataKey: 'site' },
            { header: 'Check-In (Time & GPS)', dataKey: 'checkIn' },
            { header: 'Check-Out (Time & GPS)', dataKey: 'checkOut' },
            { header: 'Total Hrs', dataKey: 'duration' },
            { header: 'Geofence Status', dataKey: 'geofence' },
            { header: 'Payroll Status', dataKey: 'status' }
        ];

        const tableRows = records.map(record => {
            const inCoords = record.checkIn ? `${record.checkIn.timeFormatted}\nGPS: ${record.checkIn.latitude.toFixed(4)}, ${record.checkIn.longitude.toFixed(4)} (±${record.checkIn.accuracy || 5}m)` : '--';
            const outCoords = record.checkOut ? `${record.checkOut.timeFormatted}\nGPS: ${record.checkOut.latitude.toFixed(4)}, ${record.checkOut.longitude.toFixed(4)}` : 'In Progress';
            
            const geofenceText = record.checkIn && record.checkIn.geofenceVerified
                ? `VERIFIED ON-SITE\n(${record.checkIn.geofenceDistanceMeters || 15}m from pin)`
                : `FLAGGED OFF-SITE\n(${record.checkIn ? record.checkIn.geofenceDistanceMeters : 0}m out)`;

            return {
                date: record.date,
                staff: `${record.staffName}\n(${record.staffId}) - ${record.role}`,
                site: `${record.siteName}\n[${record.siteCode || ''}]`,
                checkIn: inCoords,
                checkOut: outCoords,
                duration: `${record.totalDurationFormatted || 'In Progress'}\n(${record.totalHoursDecimal ? record.totalHoursDecimal + 'h' : 'Active'})`,
                geofence: geofenceText,
                status: record.status
            };
        });

        // --- DRAW AUTOTABLE ---
        doc.autoTable({
            startY: 65,
            columns: tableColumns,
            body: tableRows,
            theme: 'grid',
            headStyles: {
                fillColor: [30, 41, 59], // Dark Slate
                textColor: [255, 255, 255],
                fontSize: 8.5,
                fontStyle: 'bold',
                halign: 'left',
                valign: 'middle',
                cellPadding: 3
            },
            bodyStyles: {
                fontSize: 7.5,
                textColor: [30, 41, 59],
                cellPadding: 2.5,
                valign: 'middle'
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252] // Slate-50
            },
            columnStyles: {
                0: { cellWidth: 20 }, // Date
                1: { cellWidth: 42 }, // Staff
                2: { cellWidth: 38 }, // Site
                3: { cellWidth: 42, font: 'courier' }, // Check In
                4: { cellWidth: 40, font: 'courier' }, // Check Out
                5: { cellWidth: 22, halign: 'center', fontStyle: 'bold' }, // Duration
                6: { cellWidth: 35 }, // Geofence
                7: { cellWidth: 28, fontStyle: 'bold' }  // Status
            },
            didParseCell: (data) => {
                if (data.section === 'body') {
                    if (data.column.dataKey === 'status') {
                        const val = data.cell.raw;
                        if (val.includes('Late')) {
                            data.cell.styles.textColor = [220, 38, 38]; // Red
                        } else if (val.includes('Overtime')) {
                            data.cell.styles.textColor = [194, 65, 12]; // Orange
                        } else if (val.includes('Present')) {
                            data.cell.styles.textColor = [16, 185, 129]; // Green
                        }
                    }
                    if (data.column.dataKey === 'geofence') {
                        const raw = data.cell.raw;
                        if (raw.includes('FLAGGED')) {
                            data.cell.styles.textColor = [220, 38, 38];
                            data.cell.styles.fontStyle = 'bold';
                        } else {
                            data.cell.styles.textColor = [5, 150, 105];
                        }
                    }
                }
            },
            didDrawPage: (data) => {
                const footerY = pageHeight - 12;

                doc.setDrawColor(226, 232, 240);
                doc.setLineWidth(0.5);
                doc.line(14, footerY - 4, pageWidth - 14, footerY - 4);

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7.5);
                doc.setTextColor(148, 163, 184);
                doc.text('Trident Design and Contract | Automated Field GPS Punch & Biometric Compliance Log | Confidential', 14, footerY);

                const pageNumber = `Page ${doc.internal.getNumberOfPages()}`;
                doc.text(pageNumber, pageWidth - 14, footerY, { align: 'right' });
            },
            margin: { left: 14, right: 14, bottom: 25 }
        });

        // --- SIGN-OFF SECTION ON LAST PAGE ---
        const finalY = doc.lastAutoTable.finalY + 8;
        if (finalY < pageHeight - 35) {
            this.drawSignOffBox(doc, finalY, pageWidth);
        } else {
            doc.addPage();
            this.drawSignOffBox(doc, 20, pageWidth);
        }

        // Save PDF to client disk
        const filename = `Trident_Attendance_Audit_${dateStr.replace(/\s+/g, '_')}.pdf`;
        doc.save(filename);
        return filename;
    }

    drawMetricCard(doc, x, y, width, height, title, value, accentColor) {
        // Card Background
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(x, y, width, height, 2, 2, 'F');

        // Left accent stripe
        doc.setFillColor(...accentColor);
        doc.roundedRect(x, y, 2.5, height, 1, 1, 'F');

        // Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(title, x + 6, y + 5.5);

        // Value
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text(value, x + 6, y + 13);
    }

    drawSignOffBox(doc, startY, pageWidth) {
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(14, startY, pageWidth - 28, 22, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);
        doc.text('SUPERVISOR AUDIT VERIFICATION & PAYROLL APPROVAL', 18, startY + 6);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text('I hereby certify that the GPS coordinates, timestamp punches, and total man-hours logged in this field audit are accurate and comply with OSHA site safety standards.', 18, startY + 11);

        doc.text('Project Foreman Signature: ____________________________________', 18, startY + 18);
        doc.text('HR & Payroll Approver: ____________________________________', 140, startY + 18);
        doc.text('Audit Date: ___________________', 235, startY + 18);
    }

    /**
     * CSV Exporter utility for quick spreadsheet integration
     */
    exportToCSV(records) {
        const headers = ['Record ID', 'Date', 'Staff Name', 'Staff ID', 'Role', 'Site Name', 'Site Code', 'Check-In Time', 'Check-In Lat', 'Check-In Lng', 'Check-In GPS Accuracy(m)', 'Check-In Geofence Distance(m)', 'Check-In Verified', 'Check-Out Time', 'Check-Out Lat', 'Check-Out Lng', 'Total Duration', 'Total Hours Decimal', 'Status', 'Geofence Flag', 'Notes'];

        const rows = records.map(r => [
            `"${r.id}"`,
            `"${r.date}"`,
            `"${r.staffName}"`,
            `"${r.staffId}"`,
            `"${r.role}"`,
            `"${r.siteName}"`,
            `"${r.siteCode}"`,
            `"${r.checkIn ? r.checkIn.timeFormatted : ''}"`,
            `"${r.checkIn ? r.checkIn.latitude : ''}"`,
            `"${r.checkIn ? r.checkIn.longitude : ''}"`,
            `"${r.checkIn ? r.checkIn.accuracy : ''}"`,
            `"${r.checkIn ? r.checkIn.geofenceDistanceMeters : ''}"`,
            `"${r.checkIn ? (r.checkIn.geofenceVerified ? 'YES' : 'NO') : ''}"`,
            `"${r.checkOut ? r.checkOut.timeFormatted : ''}"`,
            `"${r.checkOut ? r.checkOut.latitude : ''}"`,
            `"${r.checkOut ? r.checkOut.longitude : ''}"`,
            `"${r.totalDurationFormatted || ''}"`,
            `"${r.totalHoursDecimal || 0}"`,
            `"${r.status || ''}"`,
            `"${r.geofenceFlag || ''}"`,
            `"${r.notes ? r.notes.replace(/"/g, '""') : ''}"`
        ]);

        const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Construction_Attendance_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

window.pdfExporter = new AttendancePDFExporter();
