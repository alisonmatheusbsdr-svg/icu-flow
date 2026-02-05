import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, RefreshCw, Building2, BedDouble } from 'lucide-react';
import { ActiveSessionsCard } from './ActiveSessionsCard';

interface Unit {
  id: string;
  name: string;
  bed_count: number;
  created_at: string;
  occupiedBeds: number;
}

export function UnitManagement() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBedCount, setNewBedCount] = useState('10');
  
  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [editName, setEditName] = useState('');
  const [editBedCount, setEditBedCount] = useState('');

  const fetchUnits = async () => {
    setIsLoading(true);
    try {
      // Fetch units
      const { data: unitsData, error: unitsError } = await supabase
        .from('units')
        .select('*')
        .order('name');

      if (unitsError) throw unitsError;

      // Fetch beds with occupation status
      const { data: bedsData, error: bedsError } = await supabase
        .from('beds')
        .select('unit_id, is_occupied');

      if (bedsError) throw bedsError;

      // Calculate occupancy for each unit
      const unitsWithOccupancy = unitsData?.map(unit => {
        const unitBeds = bedsData?.filter(b => b.unit_id === unit.id) || [];
        const occupiedBeds = unitBeds.filter(b => b.is_occupied).length;
        return {
          ...unit,
          occupiedBeds,
        };
      }) || [];

      setUnits(unitsWithOccupancy);
    } catch (error) {
      console.error('Error fetching units:', error);
      toast.error('Erro ao carregar unidades');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  const createUnit = async () => {
    if (!newName.trim()) {
      toast.error('Nome da unidade é obrigatório');
      return;
    }

    const bedCount = parseInt(newBedCount);
    if (isNaN(bedCount) || bedCount < 1 || bedCount > 100) {
      toast.error('Quantidade de leitos deve ser entre 1 e 100');
      return;
    }

    setIsSubmitting(true);
    try {
      // Create unit
      const { data: unitData, error: unitError } = await supabase
        .from('units')
        .insert({ name: newName.trim(), bed_count: bedCount })
        .select()
        .single();

      if (unitError) throw unitError;

      // Create beds for the unit
      const beds = Array.from({ length: bedCount }, (_, i) => ({
        unit_id: unitData.id,
        bed_number: i + 1,
        is_occupied: false,
      }));

      const { error: bedsError } = await supabase.from('beds').insert(beds);

      if (bedsError) throw bedsError;

      toast.success('Unidade criada com sucesso');
      setCreateOpen(false);
      setNewName('');
      setNewBedCount('10');
      fetchUnits();
    } catch (error) {
      console.error('Error creating unit:', error);
      toast.error('Erro ao criar unidade');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (unit: Unit) => {
    setEditingUnit(unit);
    setEditName(unit.name);
    setEditBedCount(unit.bed_count.toString());
    setEditOpen(true);
  };

  const updateUnit = async () => {
    if (!editingUnit) return;

    if (!editName.trim()) {
      toast.error('Nome da unidade é obrigatório');
      return;
    }

    const newBedCount = parseInt(editBedCount);
    if (isNaN(newBedCount) || newBedCount < 1 || newBedCount > 100) {
      toast.error('Quantidade de leitos deve ser entre 1 e 100');
      return;
    }

    // Can't reduce below occupied beds
    if (newBedCount < editingUnit.occupiedBeds) {
      toast.error(`Não é possível reduzir para menos de ${editingUnit.occupiedBeds} leitos (ocupados)`);
      return;
    }

    setIsSubmitting(true);
    try {
      // Update unit name and bed_count
      const { error: unitError } = await supabase
        .from('units')
        .update({ name: editName.trim(), bed_count: newBedCount })
        .eq('id', editingUnit.id);

      if (unitError) throw unitError;

      // Handle bed count changes
      const currentBedCount = editingUnit.bed_count;
      
      if (newBedCount > currentBedCount) {
        // Add more beds
        const newBeds = Array.from({ length: newBedCount - currentBedCount }, (_, i) => ({
          unit_id: editingUnit.id,
          bed_number: currentBedCount + i + 1,
          is_occupied: false,
        }));

        const { error: bedsError } = await supabase.from('beds').insert(newBeds);
        if (bedsError) throw bedsError;
      } else if (newBedCount < currentBedCount) {
        // Remove unoccupied beds from the end
        const { data: beds } = await supabase
          .from('beds')
          .select('id, bed_number, is_occupied')
          .eq('unit_id', editingUnit.id)
          .eq('is_occupied', false)
          .order('bed_number', { ascending: false })
          .limit(currentBedCount - newBedCount);

        if (beds && beds.length > 0) {
          const { error: deleteError } = await supabase
            .from('beds')
            .delete()
            .in('id', beds.map(b => b.id));

          if (deleteError) throw deleteError;
        }
      }

      toast.success('Unidade atualizada com sucesso');
      setEditOpen(false);
      setEditingUnit(null);
      fetchUnits();
    } catch (error) {
      console.error('Error updating unit:', error);
      toast.error('Erro ao atualizar unidade');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteUnit = async (unit: Unit) => {
    if (unit.occupiedBeds > 0) {
      toast.error('Não é possível excluir unidade com pacientes internados');
      return;
    }

    setIsSubmitting(true);
    try {
      // Delete beds first
      const { error: bedsError } = await supabase
        .from('beds')
        .delete()
        .eq('unit_id', unit.id);

      if (bedsError) throw bedsError;

      // Delete user_units associations
      const { error: userUnitsError } = await supabase
        .from('user_units')
        .delete()
        .eq('unit_id', unit.id);

      if (userUnitsError) throw userUnitsError;

      // Delete unit
      const { error: unitError } = await supabase
        .from('units')
        .delete()
        .eq('id', unit.id);

      if (unitError) throw unitError;

      toast.success('Unidade excluída com sucesso');
      fetchUnits();
    } catch (error) {
      console.error('Error deleting unit:', error);
      toast.error('Erro ao excluir unidade');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalBeds = units.reduce((acc, u) => acc + u.bed_count, 0);
  const totalOccupied = units.reduce((acc, u) => acc + u.occupiedBeds, 0);
  const occupancyPercent = totalBeds > 0 ? Math.round((totalOccupied / totalBeds) * 100) : 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Sessions */}
      <ActiveSessionsCard />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unidades</p>
                <p className="text-2xl font-bold">{units.length}</p>
              </div>
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Leitos</p>
                <p className="text-2xl font-bold">{totalBeds}</p>
              </div>
              <BedDouble className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Ocupação Geral</p>
                <span className="text-lg font-bold">{totalOccupied}/{totalBeds}</span>
              </div>
              <Progress value={occupancyPercent} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1 text-right">{occupancyPercent}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Units Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Gerenciar Unidades</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchUnits}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Unidade
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Nova Unidade</DialogTitle>
                  <DialogDescription>
                    Adicione uma nova unidade de internação com seus leitos.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome da Unidade</Label>
                    <Input
                      id="name"
                      placeholder="Ex: UTI Geral"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      maxLength={50}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bedCount">Quantidade de Leitos</Label>
                    <Input
                      id="bedCount"
                      type="number"
                      min="1"
                      max="100"
                      value={newBedCount}
                      onChange={(e) => setNewBedCount(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={createUnit} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Criar Unidade
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {units.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">Nenhuma unidade cadastrada</p>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Unidade
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Leitos</TableHead>
                  <TableHead>Ocupação</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {units.map((unit) => {
                  const occupancy = unit.bed_count > 0 
                    ? Math.round((unit.occupiedBeds / unit.bed_count) * 100) 
                    : 0;
                  
                  return (
                    <TableRow key={unit.id}>
                      <TableCell className="font-medium">{unit.name}</TableCell>
                      <TableCell>{unit.bed_count}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={occupancy} className="w-20 h-2" />
                          <span className="text-sm text-muted-foreground">
                            {unit.occupiedBeds}/{unit.bed_count}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {occupancy === 0 && (
                          <Badge variant="outline" className="text-muted-foreground">Vazia</Badge>
                        )}
                        {occupancy > 0 && occupancy < 80 && (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                            Normal
                          </Badge>
                        )}
                        {occupancy >= 80 && occupancy < 100 && (
                          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                            Alta
                          </Badge>
                        )}
                        {occupancy === 100 && (
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                            Lotada
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(unit)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                disabled={unit.occupiedBeds > 0}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Unidade</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir a unidade "{unit.name}"? 
                                  Esta ação não pode ser desfeita. Todos os leitos serão removidos.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteUnit(unit)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Unidade</DialogTitle>
            <DialogDescription>
              Altere os dados da unidade. 
              {editingUnit && editingUnit.occupiedBeds > 0 && (
                <span className="text-yellow-500 block mt-1">
                  Atenção: {editingUnit.occupiedBeds} leito(s) ocupado(s)
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Nome da Unidade</Label>
              <Input
                id="editName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editBedCount">Quantidade de Leitos</Label>
              <Input
                id="editBedCount"
                type="number"
                min={editingUnit?.occupiedBeds || 1}
                max="100"
                value={editBedCount}
                onChange={(e) => setEditBedCount(e.target.value)}
              />
              {editingUnit && editingUnit.occupiedBeds > 0 && (
                <p className="text-xs text-muted-foreground">
                  Mínimo: {editingUnit.occupiedBeds} (leitos ocupados)
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={updateUnit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
