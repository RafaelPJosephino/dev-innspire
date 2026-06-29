# Reference — planejar-teste-task (Fase 5/9)

Referência para planejamento estratégico de testes E2E Playwright.

---

## Análise do código antes de planejar

Ler os arquivos gerados na Fase 4 para identificar:

| O que identificar | Onde encontrar |
| ----------------- | -------------- |
| Elementos de UI testáveis | Templates HTML — buscar por `data-testid`, `id`, roles semânticos |
| Rotas da feature | Arquivos de routing (`*.routing.ts`, `app.routes.ts`, `router.ts`) |
| Chamadas de API | Services, hooks de fetch, stores |
| Estados possíveis | Loading, sucesso, erro, vazio, sem permissão |
| Validações de formulário | Validators, schemas de validação |

---

## Categorias de cenários

**Happy Path** — fluxo principal com dados válidos:
- Um cenário por critério de aceite
- Cobre o caminho mais comum do usuário

**Casos de Borda** — entradas válidas mas atípicas:
- Campos com valor mínimo/máximo
- Lista com 0 itens, 1 item, muitos itens
- Caracteres especiais em inputs de texto

**Fluxos de Erro** — entradas inválidas e falhas:
- Campos obrigatórios vazios
- Formato inválido (email sem @, data inválida)
- Falha de rede simulada com `page.route()`
- Usuário sem permissão

**Regressão** — fluxos existentes que podem ter sido afetados:
- Funcionalidades do mesmo módulo
- Fluxos que compartilham componentes alterados

---

## Hierarquia de seletores para o plano

Definir seletores já no plano — não deixar para a hora de escrever o teste:

| Prioridade | Seletor | Quando usar |
| ---------- | ------- | ----------- |
| 1° | `data-testid="nome"` | Preferido — não quebra com mudanças de UI |
| 2° | `getByRole('button', { name: 'Salvar' })` | Quando data-testid não existe |
| 3° | `getByLabel('Email')` | Para inputs de formulário |
| 4° | `getByText('Texto único')` | Texto que aparece uma só vez na página |
| ❌ | CSS / XPath | Último recurso — evitar |

Se o código implementado não tem `data-testid`, registrar no plano que precisam ser adicionados antes de gerar os testes.

---

## Dados de teste — o que especificar

Para cada cenário, definir:
- **Usuário:** papel/permissão necessária para executar o fluxo
- **Estado inicial:** o que precisa existir antes do teste (registro criado, lista populada)
- **Input válido:** valores que devem funcionar
- **Input inválido:** valores que devem ser rejeitados
- **Mock de API:** se algum endpoint precisa ser interceptado

---

## O que salvar em fase5-plano-teste.md

```text
## Arquivo alvo
tests/e2e/CU-<TASK_ID>.spec.ts

## Cenários

### Happy Path
1. <nome do cenário>
   - Pré-condição: <estado inicial>
   - Passos: <ações>
   - Seletores: <data-testid identificados>
   - Asserção: <o que verificar>

### Casos de Borda
...

### Fluxos de Erro
...

### Regressão
...

## Fora de escopo
- <cenário> — <motivo>

## Total: N cenários
```
