import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Stethoscope, UserPlus, LogIn, ClipboardList } from 'lucide-react';
import { SinapseLogo } from '@/components/SinapseLogo';
import { Checkbox } from '@/components/ui/checkbox';
import { TermsAndPrivacyDialog } from '@/components/terms/TermsAndPrivacyDialog';
import type { AppRole } from '@/types/database';
import { Footer } from '@/components/Footer';

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, signUp, user, hasRole, rolesLoaded } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  
  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Signup form
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState('');
  const [signupNome, setSignupNome] = useState('');
  const [signupCrmNumber, setSignupCrmNumber] = useState('');
  const [signupCrmUf, setSignupCrmUf] = useState('PE');
  const [signupRole, setSignupRole] = useState<AppRole>('plantonista');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const UF_OPTIONS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

  const handleRoleChange = (role: AppRole) => {
    setSignupRole(role);
    if (role === 'nir') {
      setSignupCrmNumber('');
    }
  };

  // Redirect if already logged in
  if (user && rolesLoaded) {
    if (hasRole('admin')) {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error('Preencha todos os campos');
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsLoading(false);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Email ou senha incorretos');
      } else {
        toast.error('Erro ao fazer login: ' + error.message);
      }
    }
    // Navigation is handled by the redirect logic above after auth state changes
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const requiresCrm = signupRole !== 'nir';
    
    if (!signupEmail || !signupPassword || !signupNome) {
      toast.error('Preencha todos os campos');
      return;
    }
    
    if (requiresCrm && !signupCrmNumber.trim()) {
      toast.error('CRM é obrigatório para equipe assistencial');
      return;
    }

    if (signupPassword !== signupPasswordConfirm) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (signupPassword.length < 8) {
      toast.error('A senha deve ter pelo menos 8 caracteres');
      return;
    }
    if (!/[A-Z]/.test(signupPassword)) {
      toast.error('A senha deve conter pelo menos uma letra maiúscula');
      return;
    }
    if (!/[a-z]/.test(signupPassword)) {
      toast.error('A senha deve conter pelo menos uma letra minúscula');
      return;
    }
    if (!/[0-9]/.test(signupPassword)) {
      toast.error('A senha deve conter pelo menos um número');
      return;
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(signupPassword)) {
      toast.error('A senha deve conter pelo menos um caractere especial');
      return;
    }

    if (!acceptedTerms) {
      toast.error('Você precisa aceitar os Termos de Uso e Política de Privacidade');
      return;
    }

    const crmValue = requiresCrm ? `CRM-${signupCrmUf} ${signupCrmNumber.trim()}` : 'N/A';

    setIsLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, signupNome, crmValue, signupRole);
    setIsLoading(false);

    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('Este email já está cadastrado');
      } else {
        toast.error('Erro ao criar conta: ' + error.message);
      }
    } else {
      toast.success('Conta criada! Aguarde aprovação do administrador.');
      // Navigation will be handled by redirect logic after auth state changes
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo/Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <SinapseLogo size="lg" />
            <h1 className="text-2xl font-bold text-foreground">Sinapse | UTI</h1>
          </div>
          <p className="text-muted-foreground">Sistema de Passagem de Plantão</p>
        </div>

        <Card className="shadow-lg">
          <Tabs defaultValue="login">
            <CardHeader className="pb-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" className="gap-2">
                  <LogIn className="h-4 w-4" />
                  Entrar
                </TabsTrigger>
                <TabsTrigger value="signup" className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Cadastrar
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent>
              {/* Login Tab */}
              <TabsContent value="login" className="space-y-4 mt-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Entrando...' : 'Entrar'}
                  </Button>
                </form>
              </TabsContent>

              {/* Signup Tab */}
              <TabsContent value="signup" className="space-y-4 mt-4">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-nome">Nome Completo</Label>
                    <Input
                      id="signup-nome"
                      type="text"
                      placeholder="João Silva"
                      value={signupNome}
                      onChange={(e) => setSignupNome(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-role">Papel</Label>
                    <Select value={signupRole} onValueChange={handleRoleChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione seu papel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="plantonista">
                          <div className="flex items-center gap-2">
                            <Stethoscope className="h-4 w-4" />
                            Plantonista
                          </div>
                        </SelectItem>
                        <SelectItem value="diarista">
                          <div className="flex items-center gap-2">
                            <Stethoscope className="h-4 w-4" />
                            Diarista
                          </div>
                        </SelectItem>
                        <SelectItem value="nir">
                          <div className="flex items-center gap-2">
                            <ClipboardList className="h-4 w-4" />
                            NIR (Regulação)
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {signupRole !== 'nir' && (
                    <div className="space-y-2">
                      <Label>CRM</Label>
                      <div className="flex gap-2">
                        <Select value={signupCrmUf} onValueChange={setSignupCrmUf}>
                          <SelectTrigger className="w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {UF_OPTIONS.map(uf => (
                              <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          id="signup-crm"
                          type="text"
                          placeholder="123456"
                          value={signupCrmNumber}
                          onChange={(e) => setSignupCrmNumber(e.target.value)}
                          disabled={isLoading}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Mín. 8 caracteres, maiúscula, número e especial"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password-confirm">Confirmar Senha</Label>
                    <Input
                      id="signup-password-confirm"
                      type="password"
                      placeholder="Repita a senha"
                      value={signupPasswordConfirm}
                      onChange={(e) => setSignupPasswordConfirm(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="accept-terms"
                      checked={acceptedTerms}
                      onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                      disabled={isLoading}
                    />
                    <label htmlFor="accept-terms" className="text-sm leading-tight cursor-pointer">
                      Li e aceito os{' '}
                      <TermsAndPrivacyDialog
                        trigger={
                          <button type="button" className="text-primary underline hover:text-primary/80">
                            Termos de Uso e Política de Privacidade
                          </button>
                        }
                      />
                    </label>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Criando conta...' : 'Criar conta'}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Após o cadastro, um administrador precisará aprovar seu acesso.
                  </p>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
      <Footer />
    </div>
  );
}