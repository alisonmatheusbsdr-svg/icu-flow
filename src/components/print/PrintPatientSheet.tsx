import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { PatientWithDetails, Profile, Evolution } from '@/types/database';

interface PrintPatientSheetProps {
  patient: PatientWithDetails;
  bedNumber: number;
  evolutionSummary?: string | null;
  authorProfiles?: Record<string, Profile>;
  printedBy?: string;
}

// Helper to calculate days since a date
const getDays = (dateStr: string): number => {
  return differenceInDays(new Date(), new Date(dateStr)) + 1;
};

// Truncate text to max characters
const truncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
};

// Get precaution badge class
const getPrecautionClass = (type: string): string => {
  const lowerType = type.toLowerCase();
  if (lowerType.includes('sepse')) return 'print-precaution-sepse';
  if (lowerType.includes('choque')) return 'print-precaution-choque';
  if (lowerType.includes('lpp')) return 'print-precaution-lpp';
  return 'print-precaution-default';
};

// Diet type labels
const DIET_LABELS: Record<string, string> = {
  'zero': 'Dieta Zero',
  'oral': 'Via Oral',
  'sne': 'SNE',
  'sng': 'SNG',
  'npt': 'NPT',
  'gtt': 'GTT',
};

export function PrintPatientSheet({ 
  patient, 
  bedNumber, 
  evolutionSummary,
  authorProfiles = {},
  printedBy
}: PrintPatientSheetProps) {
  const daysAdmitted = getDays(patient.admission_date);
  const currentPlan = patient.therapeutic_plans?.[0]?.content || null;
  const evolutions = patient.evolutions || [];
  const latestEvolutions = evolutions.slice(0, 2);
  const evolutionLabels = ['ÚLTIMA', 'PENÚLTIMA'];

  // Get respiratory support details
  const respSupport = patient.respiratory_support;
  const getRespDisplay = () => {
    if (!respSupport) return null;
    const modality = respSupport.modality;
    const details: string[] = [];
    
    if (respSupport.intubation_date) {
      details.push(`D${getDays(respSupport.intubation_date)}`);
    }
    if (respSupport.ventilator_mode) details.push(respSupport.ventilator_mode);
    if (respSupport.peep) details.push(`PEEP ${respSupport.peep}`);
    if (respSupport.fio2) details.push(`FiO2 ${respSupport.fio2}%`);
    if (respSupport.flow_rate) details.push(`${respSupport.flow_rate}L/min`);
    
    return { modality, details: details.join(' | ') };
  };

  const respDisplay = getRespDisplay();

  return (
    <div className="print-patient-sheet">
      {/* Header */}
      <div className="print-header">
        <div className="print-header-info">
          <span>LEITO {bedNumber}</span>
          <span>|</span>
          <span>{patient.initials}</span>
          <span>|</span>
          <span>{patient.age}a</span>
          <span>|</span>
          <span>D{daysAdmitted}</span>
          {patient.main_diagnosis && (
            <>
              <span>|</span>
              <span>HD: {truncate(patient.main_diagnosis, 50)}</span>
            </>
          )}
        </div>
        <div className="print-header-timestamp">
          {format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}
        </div>
      </div>

      {/* Therapeutic Plan */}
      {currentPlan && (
        <div className="print-therapeutic-plan">
          <span className="print-therapeutic-plan-label">PLANO:</span>
          {truncate(currentPlan, 250)}
        </div>
      )}

      {/* Clinical Data Grid - First Row (4 columns) */}
      <div className="print-clinical-grid">
        {/* Devices */}
        <div className="print-clinical-section">
          <div className="print-section-title">Dispositivos</div>
          <div className="print-section-content">
            {patient.invasive_devices && patient.invasive_devices.length > 0 ? (
              patient.invasive_devices.map(device => (
                <div key={device.id} className="print-section-item">
                  <span>{device.device_type}</span>
                  <span className="print-day-badge">D{getDays(device.insertion_date)}</span>
                </div>
              ))
            ) : (
              <span className="print-no-data">Nenhum</span>
            )}
          </div>
        </div>

        {/* Venous Access */}
        <div className="print-clinical-section">
          <div className="print-section-title">Acessos Venosos</div>
          <div className="print-section-content">
            {patient.venous_access && patient.venous_access.length > 0 ? (
              patient.venous_access.map(access => (
                <div key={access.id} className="print-section-item">
                  <span>{access.access_type} {access.insertion_site && `(${access.insertion_site})`}</span>
                  <span className="print-day-badge">D{getDays(access.insertion_date)}</span>
                </div>
              ))
            ) : (
              <span className="print-no-data">Nenhum</span>
            )}
          </div>
        </div>

        {/* Vasoactive Drugs */}
        <div className="print-clinical-section">
          <div className="print-section-title">DVA</div>
          <div className="print-section-content">
            {patient.vasoactive_drugs && patient.vasoactive_drugs.length > 0 ? (
              patient.vasoactive_drugs.map(drug => (
                <div key={drug.id} className="print-section-item">
                  <span>{drug.drug_name}</span>
                  <span className="print-dva-dose">{drug.dose_ml_h} ml/h</span>
                </div>
              ))
            ) : (
              <span className="print-no-data">Nenhuma</span>
            )}
          </div>
        </div>

        {/* Respiratory Support */}
        <div className="print-clinical-section">
          <div className="print-section-title">Suporte Respiratório</div>
          <div className="print-section-content">
            {respDisplay ? (
              <div>
                <div><strong>{respDisplay.modality}</strong></div>
                {respDisplay.details && (
                  <div className="print-resp-detail">{respDisplay.details}</div>
                )}
              </div>
            ) : (
              <span className="print-no-data">Ar ambiente</span>
            )}
          </div>
        </div>
      </div>

      {/* Clinical Data Grid - Second Row (3 columns) */}
      <div className="print-secondary-grid">
        {/* Antibiotics */}
        <div className="print-clinical-section">
          <div className="print-section-title">Antibióticos</div>
          <div className="print-section-content" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {patient.antibiotics && patient.antibiotics.length > 0 ? (
              patient.antibiotics.map(atb => (
                <div key={atb.id} className="print-section-item" style={{ minWidth: '120px' }}>
                  <span>{atb.antibiotic_name}</span>
                  <span className="print-day-badge">D{getDays(atb.start_date)}</span>
                </div>
              ))
            ) : (
              <span className="print-no-data">Nenhum</span>
            )}
          </div>
        </div>

        {/* Prophylaxis */}
        <div className="print-clinical-section">
          <div className="print-section-title">Profilaxias</div>
          <div className="print-section-content">
            {patient.prophylaxis && patient.prophylaxis.length > 0 ? (
              patient.prophylaxis.map(p => (
                <div key={p.id}>{p.prophylaxis_type}</div>
              ))
            ) : (
              <span className="print-no-data">Nenhuma</span>
            )}
          </div>
        </div>

        {/* Diet */}
        <div className="print-clinical-section">
          <div className="print-section-title">Dieta</div>
          <div className="print-section-content">
            {patient.diet_type ? (
              <span>{DIET_LABELS[patient.diet_type] || patient.diet_type}</span>
            ) : (
              <span className="print-no-data">Não definida</span>
            )}
          </div>
        </div>
      </div>

      {/* Precautions */}
      {patient.patient_precautions && patient.patient_precautions.length > 0 && (
        <div className="print-precautions">
          <strong style={{ marginRight: '8px', fontSize: '8pt' }}>PRECAUÇÕES:</strong>
          {patient.patient_precautions.map(p => (
            <span 
              key={p.id} 
              className={`print-precaution-badge ${getPrecautionClass(p.precaution_type)}`}
            >
              {p.precaution_type}
              {p.risk_level && ` (${p.risk_level})`}
            </span>
          ))}
        </div>
      )}

      {/* Tasks/Pendencies */}
      {patient.patient_tasks && patient.patient_tasks.length > 0 && (
        <div className="print-tasks">
          <strong style={{ marginRight: '8px', fontSize: '8pt' }}>PENDÊNCIAS:</strong>
          {patient.patient_tasks.map(task => (
            <div key={task.id} className="print-task">
              <span className={`print-task-checkbox ${task.is_completed ? 'completed' : ''}`}></span>
              <span style={{ textDecoration: task.is_completed ? 'line-through' : 'none', color: task.is_completed ? '#999' : 'inherit' }}>
                {truncate(task.content, 50)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Evolutions */}
      <div className="print-evolutions">
        {/* AI Summary */}
        {evolutionSummary && (
          <div className="print-evolution-summary">
            <div className="print-evolution-summary-label">📋 RESUMO (IA):</div>
            <div className="print-evolution-summary-content">{evolutionSummary}</div>
          </div>
        )}

        {/* Latest evolutions */}
        {latestEvolutions.length > 0 ? (
          latestEvolutions.map((evo, idx) => {
            const authorName = authorProfiles[evo.created_by]?.nome || 'Autor desconhecido';
            return (
              <div key={evo.id} className="print-evolution-entry">
                <div className="print-evolution-header">
                  📝 {evolutionLabels[idx] || `EVO ${idx + 1}`} ({format(new Date(evo.created_at), "dd/MM HH:mm", { locale: ptBR })} - {authorName})
                </div>
                <div className="print-evolution-content">
                  {truncate(evo.content, 420)}
                </div>
              </div>
            );
          })
        ) : (
          <div className="print-evolution-entry">
            <span className="print-no-data">Sem evoluções registradas</span>
          </div>
        )}
      </div>

      {/* Critical Exams Section */}
      {patient.patient_exams && patient.patient_exams.filter(e => e.is_critical).length > 0 && (
        <div className="print-exams">
          <strong>⚠️ EXAMES CRÍTICOS:</strong>
          <div className="print-exams-list">
            {patient.patient_exams
              .filter(e => e.is_critical)
              .slice(0, 4)
              .map(exam => (
                <div key={exam.id} className="print-exam-item">
                  <span className="print-exam-name">{exam.exam_name}</span>
                  <span className="print-exam-date">
                    {format(new Date(exam.exam_date), "dd/MM", { locale: ptBR })}
                  </span>
                  <span className="print-exam-content">{truncate(exam.content || '', 80)}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Print Footer with user name */}
      {printedBy && (
        <div className="print-footer">
          Impresso por: {printedBy} | {format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}
        </div>
      )}
    </div>
  );
}
