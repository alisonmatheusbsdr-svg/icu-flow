import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { User, Lock, Loader2 } from 'lucide-react';

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
  const { profile, updateProfile, updatePassword } = useAuth();
  
  const [nome, setNome] = useState('');
  const [crm, setCrm] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  // Sync form with profile data when dialog opens
  useEffect(() => {
    if (open && profile) {
      setNome(profile.nome || '');
      setCrm(profile.crm || '');
    }
  }, [open, profile]);

  // Reset password fields when dialog closes
  useEffect(() => {
    if (!open) {
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [open]);

  const handleSaveProfile = async () => {
    if (nome.trim().length < 3) {
      toast.error('O nome deve ter pelo menos 3 caracteres');
      return;
    }
    if (!crm.trim()) {
      toast.error('O CRM é obrigatório');
      return;
    }

    setIsProfileLoading(true);
    const { error } = await updateProfile({ nome: nome.trim(), crm: crm.trim() });
    setIsProfileLoading(false);

    if (error) {
      toast.error('Erro ao atualizar perfil: ' + error.message);
    } else {
      toast.success('Perfil atualizado com sucesso!');
      onOpenChange(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setIsPasswordLoading(true);
    const { error } = await updatePassword(newPassword);
    setIsPasswordLoading(false);

    if (error) {
      toast.error('Erro ao alterar senha: ' + error.message);
    } else {
      toast.success('Senha alterada com sucesso!');
      setNewPassword('');
      setConfirmPassword('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Meu Perfil</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="dados" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dados" className="gap-2">
              <User className="h-4 w-4" />
              Dados Pessoais
            </TabsTrigger>
            <TabsTrigger value="senha" className="gap-2">
              <Lock className="h-4 w-4" />
              Alterar Senha
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="profile-nome">Nome Completo</Label>
              <Input
                id="profile-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Dr. João Silva"
                disabled={isProfileLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-crm">CRM</Label>
              <Input
                id="profile-crm"
                value={crm}
                onChange={(e) => setCrm(e.target.value)}
                placeholder="CRM-PE 123456"
                disabled={isProfileLoading}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isProfileLoading}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveProfile}
                disabled={isProfileLoading}
              >
                {isProfileLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="senha" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova Senha</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                disabled={isPasswordLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Senha</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                disabled={isPasswordLoading}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isPasswordLoading}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleChangePassword}
                disabled={isPasswordLoading}
              >
                {isPasswordLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Alterar Senha
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
