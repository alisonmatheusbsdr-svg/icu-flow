
# Plano: Footer com Copyright e Link para sinapsehealthcare.com

## O que sera feito

Criar um componente Footer reutilizavel com o copyright da Sinapse Health Care, onde o nome da empresa sera um link clicavel para `https://sinapsehealthcare.com`, abrindo em nova aba. Adicionar esse footer em todas as paginas principais.

## Visual

```text
© 2026 Sinapse Health Care. Todos os direitos reservados.
```

"Sinapse Health Care" sera um link clicavel (com underline sutil no hover) apontando para sinapsehealthcare.com.

## Alteracoes

### 1. Criar: `src/components/Footer.tsx`

Componente simples com:
- Texto de copyright com ano dinamico
- Link `<a href="https://sinapsehealthcare.com" target="_blank" rel="noopener noreferrer">` no nome da empresa
- Estilo discreto com Tailwind (`text-xs text-muted-foreground`)

### 2. Adicionar Footer nas paginas

| Arquivo | Local |
|---------|-------|
| `src/pages/Dashboard.tsx` | Apos o `</main>` |
| `src/pages/Admin.tsx` | Apos o `</main>` |
| `src/pages/TeamManagement.tsx` | Apos o `</main>` |
| `src/pages/PatientDetails.tsx` | Apos o `</main>` |
| `src/pages/Auth.tsx` | Parte inferior da tela de login |

Nenhuma migracao de banco necessaria.
