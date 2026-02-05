import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Printer, FileText, Building2 } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PrintLog {
  id: string;
  user_id: string;
  user_name: string;
  print_type: string;
  unit_id: string | null;
  unit_name: string | null;
  patient_count: number;
  patient_ids: string[];
  bed_numbers: number[];
  created_at: string;
}

interface Unit {
  id: string;
  name: string;
}

export function PrintLogsManagement() {
  const [logs, setLogs] = useState<PrintLog[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<string>('7');
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('');

  useEffect(() => {
    fetchUnits();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [periodFilter, unitFilter, userFilter]);

  const fetchUnits = async () => {
    const { data } = await supabase
      .from('units')
      .select('id, name')
      .order('name');
    
    if (data) setUnits(data);
  };

  const fetchLogs = async () => {
    setIsLoading(true);
    
    const daysAgo = parseInt(periodFilter);
    const startDate = subDays(new Date(), daysAgo).toISOString();
    
    let query = supabase
      .from('print_logs')
      .select('*')
      .gte('created_at', startDate)
      .order('created_at', { ascending: false });
    
    if (unitFilter !== 'all') {
      query = query.eq('unit_id', unitFilter);
    }
    
    if (userFilter.trim()) {
      query = query.ilike('user_name', `%${userFilter.trim()}%`);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Erro ao buscar logs:', error);
    } else {
      setLogs(data || []);
    }
    
    setIsLoading(false);
  };

  const getPrintTypeLabel = (type: string) => {
    switch (type) {
      case 'single_patient':
        return 'Paciente Individual';
      case 'unit_batch':
        return 'UTI Completa';
      default:
        return type;
    }
  };

  const getPrintTypeBadge = (type: string) => {
    switch (type) {
      case 'single_patient':
        return <Badge variant="outline" className="gap-1"><FileText className="h-3 w-3" />Individual</Badge>;
      case 'unit_batch':
        return <Badge className="gap-1 bg-primary"><Building2 className="h-3 w-3" />UTI Completa</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const getTotalPrints = () => logs.reduce((acc, log) => acc + log.patient_count, 0);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Impressões
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.length}</div>
            <p className="text-xs text-muted-foreground">
              Últimos {periodFilter} dias
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fichas Impressas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getTotalPrints()}</div>
            <p className="text-xs text-muted-foreground">
              Total de fichas de pacientes
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Usuários Únicos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(logs.map(l => l.user_id)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              Que imprimiram no período
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Histórico de Impressões
          </CardTitle>
          <CardDescription>
            Registros de todas as impressões realizadas no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="w-40">
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                Período
              </label>
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="15">Últimos 15 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="60">Últimos 60 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-48">
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                Unidade
              </label>
              <Select value={unitFilter} onValueChange={setUnitFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as unidades</SelectItem>
                  {units.map(unit => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-64">
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                Buscar por usuário
              </label>
              <Input
                placeholder="Nome do usuário..."
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma impressão encontrada no período selecionado
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead className="text-center">Qtd. Fichas</TableHead>
                    <TableHead>Leitos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>{log.user_name}</TableCell>
                      <TableCell>{getPrintTypeBadge(log.print_type)}</TableCell>
                      <TableCell>
                        {log.unit_name || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{log.patient_count}</Badge>
                      </TableCell>
                      <TableCell>
                        {log.bed_numbers && log.bed_numbers.length > 0 
                          ? log.bed_numbers.slice(0, 5).map(b => `L${b}`).join(', ') + 
                            (log.bed_numbers.length > 5 ? ` +${log.bed_numbers.length - 5}` : '')
                          : <span className="text-muted-foreground">-</span>
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
