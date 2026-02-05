import { useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { PrintPatientSheet } from './PrintPatientSheet';
import { usePrintLog } from '@/hooks/usePrintLog';
import type { PatientWithDetails, Profile } from '@/types/database';
import './print-styles.css';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: PatientWithDetails;
  bedNumber: number;
  evolutionSummary: string | null;
  authorProfiles: Record<string, Profile>;
  unitId?: string;
  unitName?: string;
}

export function PrintPreviewModal({
  isOpen,
  onClose,
  patient,
  bedNumber,
  evolutionSummary,
  authorProfiles,
  unitId,
  unitName
}: PrintPreviewModalProps) {
  const printContainerRef = useRef<HTMLDivElement>(null);
  const { logPrint, userName } = usePrintLog();

  const handlePrint = async () => {
    // Log the print action
    await logPrint({
      printType: 'single_patient',
      unitId,
      unitName,
      patientIds: [patient.id],
      bedNumbers: [bedNumber]
    });

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = printContainerRef.current?.innerHTML || '';
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Impressão - Leito ${bedNumber}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 8mm;
          }
          
          body {
            margin: 0;
            padding: 0;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 9pt;
            line-height: 1.25;
            color: black;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .print-patient-sheet {
            width: 100%;
            max-height: 100vh;
            overflow: hidden;
            background: white;
          }

          .print-header {
            background: #1e3a5f !important;
            color: white !important;
            padding: 6px 12px;
            font-size: 11pt;
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-radius: 4px 4px 0 0;
          }

          .print-header-info {
            display: flex;
            gap: 16px;
            align-items: center;
          }

          .print-header-timestamp {
            font-size: 8pt;
            font-weight: normal;
            opacity: 0.9;
          }

          .print-therapeutic-plan {
            background: #fff3cd !important;
            border: 1px solid #ffc107;
            padding: 6px 10px;
            margin: 4px 0;
            font-size: 9pt;
            border-radius: 4px;
          }

          .print-therapeutic-plan-label {
            font-weight: bold;
            margin-right: 8px;
            color: #856404;
          }

          .print-clinical-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin: 6px 0;
          }

          .print-clinical-section {
            border: 1px solid #dee2e6;
            padding: 6px;
            border-radius: 4px;
            background: #f8f9fa !important;
            min-height: 60px;
          }

          .print-section-title {
            font-weight: bold;
            font-size: 8pt;
            text-transform: uppercase;
            color: #495057;
            border-bottom: 1px solid #dee2e6;
            padding-bottom: 3px;
            margin-bottom: 4px;
          }

          .print-section-content {
            font-size: 8pt;
            line-height: 1.3;
          }

          .print-section-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1px 0;
          }

          .print-day-badge {
            background: #6c757d !important;
            color: white !important;
            font-size: 7pt;
            padding: 1px 4px;
            border-radius: 3px;
            font-weight: bold;
          }

          .print-secondary-grid {
            display: grid;
            grid-template-columns: 2fr 1fr 1fr;
            gap: 8px;
            margin: 6px 0;
          }

          .print-precautions {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin: 6px 0;
            padding: 6px;
            background: #f8f9fa !important;
            border: 1px solid #dee2e6;
            border-radius: 4px;
          }

          .print-precaution-badge {
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 8pt;
            font-weight: bold;
          }

          .print-precaution-sepse { background: #dc3545 !important; color: white !important; }
          .print-precaution-choque { background: #dc3545 !important; color: white !important; }
          .print-precaution-lpp { background: #ffc107 !important; color: black !important; }
          .print-precaution-default { background: #6c757d !important; color: white !important; }

          .print-tasks {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin: 6px 0;
            padding: 6px;
            background: #f8f9fa !important;
            border: 1px solid #dee2e6;
            border-radius: 4px;
          }

          .print-task {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 8pt;
          }

          .print-task-checkbox {
            width: 10px;
            height: 10px;
            border: 1px solid #495057;
            display: inline-block;
          }

          .print-task-checkbox.completed {
            background: #495057 !important;
          }

          .print-evolutions {
            margin-top: 6px;
            border: 1px solid #dee2e6;
            border-radius: 4px;
            overflow: hidden;
          }

          .print-evolution-summary {
            background: #e7f3ff !important;
            padding: 6px 10px;
            border-bottom: 1px solid #dee2e6;
          }

          .print-evolution-summary-label {
            font-weight: bold;
            font-size: 8pt;
            color: #0056b3;
            margin-bottom: 2px;
          }

          .print-evolution-summary-content {
            font-size: 8pt;
            line-height: 1.3;
            color: #333;
          }

          .print-evolution-entry {
            padding: 6px 10px;
            border-bottom: 1px solid #eee;
          }

          .print-evolution-entry:last-child {
            border-bottom: none;
          }

          .print-evolution-header {
            font-size: 7pt;
            color: #666;
            margin-bottom: 2px;
          }

          .print-evolution-content {
            font-size: 8pt;
            line-height: 1.3;
            max-height: 4.5em;
            overflow: hidden;
          }

          .print-dva-dose { font-size: 7pt; color: #666; }
          .print-resp-detail { font-size: 7pt; color: #666; }
          .print-no-data { font-size: 8pt; color: #999; font-style: italic; }
          
          .print-footer {
            position: fixed;
            bottom: 4mm;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 6pt;
            color: #999;
            border-top: 0.5px solid #eee;
            padding-top: 2px;
          }
        </style>
      </head>
      <body>
        ${printContent}
      </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for content to load then print
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] w-[1100px] h-[85vh] p-0 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50 pr-12">
          <h2 className="text-lg font-semibold">Preview de Impressão - Leito {bedNumber}</h2>
          <div className="flex items-center gap-2">
            <Button onClick={handlePrint} className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
          </div>
        </div>

        {/* Preview Container - Simulates A4 Landscape */}
        <div className="flex-1 overflow-auto bg-muted/30 p-6">
          <div 
            ref={printContainerRef}
            className="mx-auto bg-white shadow-lg print-preview-container"
            style={{ 
              width: '297mm', 
              minHeight: '210mm',
              maxWidth: '100%',
              transform: 'scale(0.85)',
              transformOrigin: 'top center'
            }}
          >
            <PrintPatientSheet
              patient={patient}
              bedNumber={bedNumber}
              evolutionSummary={evolutionSummary}
              authorProfiles={authorProfiles}
              printedBy={userName}
            />
          </div>
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t bg-muted/30 text-center text-sm text-muted-foreground">
          O documento será impresso em formato A4 paisagem
        </div>
      </DialogContent>
    </Dialog>
  );
}
