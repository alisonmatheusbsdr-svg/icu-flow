
# Plano: Sistema de Rastreabilidade de Impressões

## Objetivo
Implementar um sistema de auditoria que:
1. Registra quem imprime cada documento (paciente, unidade)
2. Permite que Admin e Coordenador visualizem o histórico de impressões
3. Adiciona o nome do usuário que imprimiu no rodapé de cada página

## Arquitetura da Solução

### 1. Nova Tabela: `print_logs`

Criação de uma tabela para armazenar o histórico de impressões:

```sql
CREATE TABLE public.print_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name text NOT NULL,
  print_type text NOT NULL, -- 'single_patient' | 'unit_batch'
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  unit_name text,
  patient_count integer DEFAULT 1,
  patient_ids uuid[] DEFAULT '{}',
  bed_numbers integer[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- RLS: apenas admin e coordenador podem ler
ALTER TABLE public.print_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin e coordenador podem ler print_logs"
ON public.print_logs FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'coordenador')
);

-- Usuários aprovados podem inserir logs das próprias impressões
CREATE POLICY "Usuários aprovados podem registrar impressões"
ON public.print_logs FOR INSERT TO authenticated
WITH CHECK (
  public.is_approved(auth.uid()) AND
  user_id = auth.uid()
);
```

### 2. Modificações nos Componentes de Impressão

#### 2.1 PrintPatientSheet - Adicionar Rodapé

Adicionar prop `printedBy` e renderizar rodapé discreto:

```typescript
interface PrintPatientSheetProps {
  // ... props existentes
  printedBy?: string;  // Nome do usuário que imprimiu
}

// No final do componente:
{printedBy && (
  <div className="print-footer">
    Impresso por: {printedBy} | {format(new Date(), "dd/MM/yyyy HH:mm")}
  </div>
)}
```

#### 2.2 CSS do Rodapé

```css
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
```

### 3. Hook para Registro de Impressões

Criar `src/hooks/usePrintLog.ts`:

```typescript
export function usePrintLog() {
  const { user, profile } = useAuth();
  
  const logPrint = async (params: {
    printType: 'single_patient' | 'unit_batch';
    unitId?: string;
    unitName?: string;
    patientIds?: string[];
    bedNumbers?: number[];
  }) => {
    if (!user || !profile) return;
    
    await supabase.from('print_logs').insert({
      user_id: user.id,
      user_name: profile.nome,
      print_type: params.printType,
      unit_id: params.unitId,
      unit_name: params.unitName,
      patient_count: params.patientIds?.length || 1,
      patient_ids: params.patientIds || [],
      bed_numbers: params.bedNumbers || []
    });
  };
  
  return { logPrint, userName: profile?.nome };
}
```

### 4. Integração nos Modais de Impressão

#### PrintPreviewModal e UnitPrintPreviewModal

- Importar `usePrintLog` e `useAuth`
- Passar `printedBy={profile.nome}` para o PrintPatientSheet
- Chamar `logPrint()` quando o usuário clicar em "Imprimir"

### 5. Tela de Histórico de Impressões (Admin)

Nova aba na página `/admin`:

| Coluna | Descrição |
|--------|-----------|
| Data/Hora | Timestamp da impressão |
| Usuário | Nome de quem imprimiu |
| Tipo | Paciente Individual / UTI Completa |
| Unidade | Nome da unidade (se aplicável) |
| Qtd. Pacientes | Quantidade de fichas impressas |

#### Filtros disponíveis:
- Por período (últimos 7/30 dias)
- Por usuário
- Por unidade

## Arquivos a Modificar/Criar

| Arquivo | Ação |
|---------|------|
| Nova migração SQL | Criar tabela `print_logs` com RLS |
| `src/hooks/usePrintLog.ts` | Criar hook para registro |
| `src/components/print/PrintPatientSheet.tsx` | Adicionar prop e rodapé |
| `src/components/print/PrintPreviewModal.tsx` | Integrar log e passar nome |
| `src/components/print/UnitPrintPreviewModal.tsx` | Integrar log e passar nome |
| `src/components/print/print-styles.css` | Estilos do rodapé |
| `src/pages/Admin.tsx` | Adicionar aba "Impressões" |
| `src/components/admin/PrintLogsManagement.tsx` | Criar componente de histórico |

## Fluxo de Dados

```text
┌─────────────────────┐
│  Usuário clica      │
│  "Imprimir"         │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  logPrint() chamado │──────────────────┐
│  (antes do print)   │                  │
└─────────┬───────────┘                  │
          │                              │
          ▼                              ▼
┌─────────────────────┐     ┌────────────────────────┐
│  Janela de          │     │  INSERT print_logs     │
│  impressão abre     │     │  (user, type, unit...) │
│  (com rodapé)       │     └────────────────────────┘
└─────────────────────┘
```

## Segurança

- **Leitura**: Apenas Admin e Coordenador podem visualizar os logs
- **Inserção**: Apenas usuários aprovados podem registrar suas próprias impressões
- **Dados sensíveis**: Apenas iniciais e leito são armazenados (não dados clínicos)

## Resultado Esperado

1. **Rodapé em cada impressão**: "Impresso por: Dr. João Silva | 05/02/2026 16:30"
2. **Histórico no Admin**: Tabela com todas as impressões filtráveis
3. **Rastreabilidade completa**: Quem imprimiu, quando, qual unidade/paciente
