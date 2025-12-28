import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserManagement } from '@/components/admin/UserManagement';
import { UnitManagement } from '@/components/admin/UnitManagement';
import { Users, Building2, Loader2 } from 'lucide-react';

export default function Admin() {
  const navigate = useNavigate();
  const { user, isLoading, hasRole } = useAuth();

  useEffect(() => {
    if (!isLoading && (!user || !hasRole('admin'))) {
      navigate('/dashboard');
    }
  }, [user, isLoading, hasRole, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !hasRole('admin')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Administração</h1>
          <p className="text-muted-foreground">Gerencie usuários e unidades do sistema</p>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="units" className="gap-2">
              <Building2 className="h-4 w-4" />
              Unidades
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="units">
            <UnitManagement />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}