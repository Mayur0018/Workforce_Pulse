'use client';
import { useCallback } from 'react';

export function useExport() {
  const exportDashboardPDF = useCallback(async (elementId = 'dashboard-export-root') => {
    const { default: html2canvas } = await import('html2canvas');
    const { jsPDF } = await import('jspdf');

    const element = document.getElementById(elementId);
    if (!element) { alert('Nothing to export'); return; }

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#070b18',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height / canvas.width) * pdfWidth;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`workforce-pulse-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  }, []);

  return { exportDashboardPDF };
}
