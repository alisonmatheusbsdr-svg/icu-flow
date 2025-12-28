import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AdmitPatientForm } from './AdmitPatientForm';
import { Wind, Syringe, Pill, Heart, Plus } from 'lucide-react';
import type { Bed, Patient } from '@/types/database';

interface BedCardProps {
  bed: Bed;
  patient?: Patient | null;
  onUpdate: () => void;
}

export function BedCard({ bed, patient, onUpdate }: BedCardProps) {
  const navigate = useNavigate();
  const [isAdmitOpen, setIsAdmitOpen] = useState(false);

  const daysInternado = patient 
    ? Math.ceil((new Date().getTime() - new Date(patient.admission_date).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  if (!patient) {
    return (
      <Dialog open={isAdmitOpen} onOpenChange={setIsAdmitOpen}>
        <DialogTrigger asChild>
          <Card className="bed-empty cursor-pointer hover:border-success/50 transition-colors">
            <CardContent className="p-4 flex flex-col items-center justify-center min-h-[140px]">
              <div className="text-lg font-semibold text-muted-foreground mb-2">Leito {bed.bed_number}</div>
              <div className="p-2 rounded-full bg-success/10">
                <Plus className="h-5 w-5 text-success" />
              </div>
              <span className="text-sm text-muted-foreground mt-2">Vago</span>
            </CardContent>
          </Card>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Admitir Paciente - Leito {bed.bed_number}</DialogTitle>
          </DialogHeader>
          <AdmitPatientForm bedId={bed.id} onSuccess={() => { setIsAdmitOpen(false); onUpdate(); }} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Card 
      className="bed-occupied cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`/patient/${patient.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <span className="text-sm text-muted-foreground">Leito {bed.bed_number}</span>
          <span className="text-xs text-muted-foreground">{daysInternado}d</span>
        </div>
        
        <div className="text-xl font-bold text-foreground mb-1">{patient.initials}</div>
        <div className="text-sm text-muted-foreground mb-3">{patient.age} anos</div>
        
        <div className="flex flex-wrap gap-1">
          {patient.respiratory_status === 'tot' ? (
            <Badge className="badge-tot text-xs gap-1"><Wind className="h-3 w-3" />TOT</Badge>
          ) : (
            <Badge className="badge-aa text-xs gap-1"><Wind className="h-3 w-3" />AA</Badge>
          )}
          {patient.is_palliative && (
            <Badge className="badge-pal text-xs gap-1"><Heart className="h-3 w-3" />PAL</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}