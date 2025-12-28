import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PatientWithDetails } from '@/types/database';

interface PatientClinicalDataProps {
  patient: PatientWithDetails;
  onUpdate: () => void;
}

export function PatientClinicalData({ patient, onUpdate }: PatientClinicalDataProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-lg">Dados Clínicos</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><strong>HD:</strong> {patient.main_diagnosis || 'Não informado'}</div>
          <div><strong>Comorbidades:</strong> {patient.comorbidities || 'Nenhuma'}</div>
          <div><strong>Status:</strong> {patient.respiratory_status === 'tot' ? 'Ventilação Mecânica (TOT)' : 'Ar Ambiente'}</div>
          {patient.is_palliative && <div className="text-status-pal font-medium">Cuidados Paliativos</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Dispositivos Invasivos</CardTitle></CardHeader>
        <CardContent>
          {patient.invasive_devices && patient.invasive_devices.length > 0 ? (
            <ul className="space-y-1">
              {patient.invasive_devices.map(d => (
                <li key={d.id} className="text-sm">{d.device_type} - {Math.ceil((new Date().getTime() - new Date(d.insertion_date).getTime()) / (1000 * 60 * 60 * 24))} dias</li>
              ))}
            </ul>
          ) : <p className="text-muted-foreground text-sm">Nenhum dispositivo</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Drogas Vasoativas</CardTitle></CardHeader>
        <CardContent>
          {patient.vasoactive_drugs && patient.vasoactive_drugs.length > 0 ? (
            <ul className="space-y-1">
              {patient.vasoactive_drugs.map(d => (
                <li key={d.id} className="text-sm">{d.drug_name} - {d.dose_ml_h} ml/h</li>
              ))}
            </ul>
          ) : <p className="text-muted-foreground text-sm">Nenhuma DVA</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Antibióticos</CardTitle></CardHeader>
        <CardContent>
          {patient.antibiotics && patient.antibiotics.length > 0 ? (
            <ul className="space-y-1">
              {patient.antibiotics.map(a => (
                <li key={a.id} className="text-sm">{a.antibiotic_name} - D{Math.ceil((new Date().getTime() - new Date(a.start_date).getTime()) / (1000 * 60 * 60 * 24))}</li>
              ))}
            </ul>
          ) : <p className="text-muted-foreground text-sm">Nenhum antibiótico</p>}
        </CardContent>
      </Card>
    </div>
  );
}