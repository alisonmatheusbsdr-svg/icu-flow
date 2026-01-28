import { Clock, FileCheck, Truck, CheckCircle2, XCircle, Building2 } from 'lucide-react';
import type { RegulationStatus } from '@/types/database';

export const SUPPORT_TYPES = [
  { type: 'NEUROLOGIA', label: 'Neurologia', emoji: '🧠' },
  { type: 'CARDIOLOGIA', label: 'Cardiologia', emoji: '❤️' },
  { type: 'CRONICOS', label: 'Crônicos', emoji: '🏥' },
  { type: 'TORACICA', label: 'Torácica', emoji: '🫁' },
  { type: 'ONCOLOGIA', label: 'Oncologia', emoji: '🎗️' },
  { type: 'NEFROLOGIA', label: 'Nefrologia', emoji: '💧' },
  { type: 'OUTROS', label: 'Outros', emoji: '📋' },
] as const;

export const STATUS_CONFIG = {
  aguardando_regulacao: {
    label: 'Aguardando Regulação',
    shortLabel: 'Aguard. Reg.',
    className: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
    icon: Clock,
    description: 'Aguardando NIR registrar no sistema'
  },
  regulado: {
    label: 'Regulado',
    shortLabel: 'Regulado',
    className: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
    icon: FileCheck,
    description: 'NIR listou na central de regulação'
  },
  aguardando_transferencia: {
    label: 'Aguard. Transferência',
    shortLabel: 'Aguard. Transf.',
    className: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
    icon: Truck,
    description: 'Vaga confirmada, aguardando transporte'
  },
  transferido: {
    label: 'Transferido',
    shortLabel: 'Transferido',
    className: 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-700',
    icon: CheckCircle2,
    description: 'Paciente transferido com sucesso'
  },
  negado_nir: {
    label: 'Negado (NIR)',
    shortLabel: 'Neg. NIR',
    className: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
    icon: XCircle,
    description: 'NIR recusou regular esta solicitação'
  },
  negado_hospital: {
    label: 'Negado (Hospital)',
    shortLabel: 'Neg. Hospital',
    className: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700',
    icon: Building2,
    description: 'Hospital destino recusou a vaga'
  }
} as const;

// Transições que o NIR pode fazer
export const NIR_TRANSITIONS: Record<RegulationStatus, { status: RegulationStatus; label: string; variant?: 'default' | 'destructive' }[]> = {
  aguardando_regulacao: [
    { status: 'regulado', label: 'Marcar Regulado' },
    { status: 'negado_nir', label: 'Negar Regulação', variant: 'destructive' }
  ],
  regulado: [
    { status: 'aguardando_transferencia', label: 'Confirmar Vaga' },
    { status: 'negado_hospital', label: 'Negado pelo Hospital', variant: 'destructive' }
  ],
  aguardando_transferencia: [
    { status: 'transferido', label: 'Marcar Transferido' }
  ],
  transferido: [],
  negado_nir: [],
  negado_hospital: [
    { status: 'regulado', label: 'Re-regular' }
  ]
};

export function getSupportLabel(type: string): string {
  const found = SUPPORT_TYPES.find(s => s.type === type);
  return found ? `${found.emoji} ${found.label}` : type;
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Status que indicam negativa (precisam de justificativa)
export const DENIAL_STATUSES: RegulationStatus[] = ['negado_nir', 'negado_hospital'];

// Status finais (não podem ser alterados)
export const FINAL_STATUSES: RegulationStatus[] = ['transferido', 'negado_nir'];

// Status ativos para contagem
export const ACTIVE_STATUSES: RegulationStatus[] = ['aguardando_regulacao', 'regulado', 'aguardando_transferencia'];
