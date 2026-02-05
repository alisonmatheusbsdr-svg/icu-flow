
# Plano: Navegação do Coordenador e Remoção do Dropdown

## Objetivo

1. Dar acesso visual aos logs de impressão para coordenadores
2. Melhorar navegação entre modo assistencial e gestão
3. Remover o dropdown de unidades (coordenador/diarista sempre vê Visão Geral)

## Alterações

### 1. TeamManagement.tsx - Adicionar Aba "Impressões"

Transformar a página `/equipe` em um hub com abas:
- **Equipe**: gestão de usuários (existente)
- **Impressões**: histórico de impressões (reutilizar `PrintLogsManagement`)

### 2. DashboardHeader.tsx - Simplificar Header

**Remover o dropdown para coordenadores/diaristas:**
- Eles sempre veem a "Visão Geral"
- Mostrar apenas um badge estático "Visão Geral" ao invés do dropdown

**Melhorar navegação:**
- Renomear botão "Equipe" → "Gestão"
- Em `/equipe`: mostrar botão "Acesso Assistencial" para voltar

### 3. Lógica de Exibição do Dropdown

```
Quem vê o dropdown?
├── Admin em "Acesso Assistencial" → SIM (pode querer ver unidade específica)
├── Coordenador/Diarista → NÃO (sempre Visão Geral)
└── Plantonista → NÃO (badge fixo da unidade travada)
```

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/pages/TeamManagement.tsx` | Adicionar Tabs com Equipe + Impressões |
| `src/components/dashboard/DashboardHeader.tsx` | Remover dropdown para coord/diarista, melhorar navegação |

## Resultado Visual do Header

**Antes (Coordenador):**
```
[Logo] [Dropdown: Visão Geral ▼] ... [Equipe] [Perfil] [Sair]
```

**Depois (Coordenador):**
```
[Logo] [Badge: Visão Geral] ... [Gestão] [Perfil] [Sair]
```

**Em /equipe:**
```
[Logo] ... [Acesso Assistencial] [Perfil] [Sair]
```

## Fluxo do Coordenador

```text
DASHBOARD (/dashboard)
├── Vê "Visão Geral" automaticamente (sem dropdown)
├── Botão "Gestão" → vai para /equipe
└── Acesso aos pacientes normalmente

GESTÃO (/equipe)
├── Aba "Equipe" → aprovar/rejeitar usuários
├── Aba "Impressões" → ver histórico de impressões
└── Botão "Acesso Assistencial" → volta para /dashboard
```

## Detalhes Técnicos

### Header - Nova Lógica do Seletor

O dropdown só aparece para Admin em modo assistencial quando ele quiser navegar entre unidades específicas. Para coordenadores e diaristas, mostra-se um badge fixo:

```typescript
// Coordenador/Diarista: sempre Visão Geral, sem dropdown
if (canViewAllUnits && !hasRole('admin')) {
  // Mostra badge "Visão Geral" fixo
}

// Admin em modo assistencial: mantém dropdown para flexibilidade
if (hasRole('admin') && !isOnAdmin) {
  // Mostra dropdown normal
}
```

### TeamManagement - Estrutura com Abas

```typescript
<Tabs defaultValue="users">
  <TabsList>
    <TabsTrigger value="users">
      <Users /> Equipe
    </TabsTrigger>
    <TabsTrigger value="prints">
      <Printer /> Impressões
    </TabsTrigger>
  </TabsList>
  
  <TabsContent value="users">
    <TeamUserManagement />
  </TabsContent>
  
  <TabsContent value="prints">
    <PrintLogsManagement />
  </TabsContent>
</Tabs>
```

## Segurança

- RLS já permite coordenador ler `print_logs` (implementado anteriormente)
- Nenhuma migração necessária
