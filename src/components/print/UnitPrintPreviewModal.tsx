import { useState, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { PrintPatientSheet } from './PrintPatientSheet';
import type { PatientWithDetails, Profile } from '@/types/database';

interface PatientPrintData {
  patient: PatientWithDetails;
  bedNumber: number;
  evolutionSummary: string | null;
  authorProfiles: Record<string, Profile>;
}

interface UnitPrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  unitName: string;
  patients: PatientPrintData[];
  isLoading?: boolean;
  loadingStatus?: string;
}

export function UnitPrintPreviewModal({
  isOpen,
  onClose,
  unitName,
  patients,
  isLoading = false,
  loadingStatus = 'Carregando...'
}: UnitPrintPreviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const printContainerRef = useRef<HTMLDivElement>(null);
  const allPatientsRef = useRef<HTMLDivElement>(null);

  const currentPatient = patients[currentIndex];
  const totalPatients = patients.length;

  const handlePrevious = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => Math.min(totalPatients - 1, prev + 1));
  };

  const handlePrintAll = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = allPatientsRef.current?.innerHTML || '';
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Impressão - ${unitName}</title>
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
            page-break-after: always;
          }

          .print-patient-sheet:last-child {
            page-break-after: avoid;
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
        </style>
      </head>
      <body>
        ${printContent}
      </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handlePrintCurrent = () => {
    if (!currentPatient) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = printContainerRef.current?.innerHTML || '';
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Impressão - Leito ${currentPatient.bedNumber}</title>
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

          .print-header-info { display: flex; gap: 16px; align-items: center; }
          .print-header-timestamp { font-size: 8pt; font-weight: normal; opacity: 0.9; }
          .print-therapeutic-plan { background: #fff3cd !important; border: 1px solid #ffc107; padding: 6px 10px; margin: 4px 0; font-size: 9pt; border-radius: 4px; }
          .print-therapeutic-plan-label { font-weight: bold; margin-right: 8px; color: #856404; }
          .print-clinical-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 6px 0; }
          .print-clinical-section { border: 1px solid #dee2e6; padding: 6px; border-radius: 4px; background: #f8f9fa !important; min-height: 60px; }
          .print-section-title { font-weight: bold; font-size: 8pt; text-transform: uppercase; color: #495057; border-bottom: 1px solid #dee2e6; padding-bottom: 3px; margin-bottom: 4px; }
          .print-section-content { font-size: 8pt; line-height: 1.3; }
          .print-section-item { display: flex; justify-content: space-between; align-items: center; padding: 1px 0; }
          .print-day-badge { background: #6c757d !important; color: white !important; font-size: 7pt; padding: 1px 4px; border-radius: 3px; font-weight: bold; }
          .print-secondary-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 8px; margin: 6px 0; }
          .print-precautions { display: flex; gap: 8px; flex-wrap: wrap; margin: 6px 0; padding: 6px; background: #f8f9fa !important; border: 1px solid #dee2e6; border-radius: 4px; }
          .print-precaution-badge { padding: 2px 8px; border-radius: 4px; font-size: 8pt; font-weight: bold; }
          .print-precaution-sepse { background: #dc3545 !important; color: white !important; }
          .print-precaution-choque { background: #dc3545 !important; color: white !important; }
          .print-precaution-lpp { background: #ffc107 !important; color: black !important; }
          .print-precaution-default { background: #6c757d !important; color: white !important; }
          .print-tasks { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0; padding: 6px; background: #f8f9fa !important; border: 1px solid #dee2e6; border-radius: 4px; }
          .print-task { display: flex; align-items: center; gap: 4px; font-size: 8pt; }
          .print-task-checkbox { width: 10px; height: 10px; border: 1px solid #495057; display: inline-block; }
          .print-task-checkbox.completed { background: #495057 !important; }
          .print-evolutions { margin-top: 6px; border: 1px solid #dee2e6; border-radius: 4px; overflow: hidden; }
          .print-evolution-summary { background: #e7f3ff !important; padding: 6px 10px; border-bottom: 1px solid #dee2e6; }
          .print-evolution-summary-label { font-weight: bold; font-size: 8pt; color: #0056b3; margin-bottom: 2px; }
          .print-evolution-summary-content { font-size: 8pt; line-height: 1.3; color: #333; }
          .print-evolution-entry { padding: 6px 10px; border-bottom: 1px solid #eee; }
          .print-evolution-entry:last-child { border-bottom: none; }
          .print-evolution-header { font-size: 7pt; color: #666; margin-bottom: 2px; }
          .print-evolution-content { font-size: 8pt; line-height: 1.3; max-height: 4.5em; overflow: hidden; }
          .print-dva-dose { font-size: 7pt; color: #666; }
          .print-resp-detail { font-size: 7pt; color: #666; }
          .print-no-data { font-size: 8pt; color: #999; font-style: italic; }
        </style>
      </head>
      <body>
        ${printContent}
      </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] w-[1100px] h-[85vh] p-0 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
          <h2 className="text-lg font-semibold">Preview de Impressão - {unitName}</h2>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={handlePrintCurrent} 
              disabled={isLoading || !currentPatient}
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Imprimir Atual
            </Button>
            <Button 
              onClick={handlePrintAll} 
              disabled={isLoading || patients.length === 0}
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Imprimir Todos ({totalPatients})
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">{loadingStatus}</p>
          </div>
        ) : patients.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Nenhum paciente para imprimir</p>
          </div>
        ) : (
          <>
            {/* Navigation */}
            <div className="flex items-center justify-between px-4 py-2 border-b bg-background">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Leito {currentPatient?.bedNumber}
                </span>
                <span className="text-sm font-medium">
                  {currentIndex + 1} de {totalPatients}
                </span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                disabled={currentIndex === totalPatients - 1}
                className="flex items-center gap-1"
              >
                Próximo
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Patient Thumbnails */}
            <div className="flex gap-2 px-4 py-2 overflow-x-auto border-b bg-muted/30">
              {patients.map((p, idx) => (
                <button
                  key={p.patient.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded text-sm transition-colors ${
                    idx === currentIndex 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-background border hover:bg-muted'
                  }`}
                >
                  L{p.bedNumber}
                </button>
              ))}
            </div>

            {/* Preview Container */}
            <div className="flex-1 overflow-auto bg-muted/30 p-6">
              {currentPatient && (
                <div 
                  ref={printContainerRef}
                  className="mx-auto bg-white shadow-lg"
                  style={{ 
                    width: '297mm', 
                    minHeight: '210mm',
                    maxWidth: '100%',
                    transform: 'scale(0.85)',
                    transformOrigin: 'top center'
                  }}
                >
                  <PrintPatientSheet
                    patient={currentPatient.patient}
                    bedNumber={currentPatient.bedNumber}
                    evolutionSummary={currentPatient.evolutionSummary}
                    authorProfiles={currentPatient.authorProfiles}
                  />
                </div>
              )}
            </div>

            {/* Hidden container with all patients for batch print */}
            <div ref={allPatientsRef} className="hidden">
              {patients.map((p) => (
                <PrintPatientSheet
                  key={p.patient.id}
                  patient={p.patient}
                  bedNumber={p.bedNumber}
                  evolutionSummary={p.evolutionSummary}
                  authorProfiles={p.authorProfiles}
                />
              ))}
            </div>
          </>
        )}

        {/* Footer hint */}
        <div className="px-4 py-2 border-t bg-muted/30 text-center text-sm text-muted-foreground">
          O documento será impresso em formato A4 paisagem
        </div>
      </DialogContent>
    </Dialog>
  );
}
