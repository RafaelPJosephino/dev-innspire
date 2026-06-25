# Playwright Testing Reference

Padrões obrigatórios, estrutura de arquivos e boas práticas para os testes E2E gerados na Fase 5.

---

## Estrutura do Arquivo de Testes

```typescript
// tests/e2e/CU-<TASK_ID>.spec.ts

import { test, expect } from '@playwright/test';

test.describe('<Critério de Aceite Principal>', () => {

  test.beforeEach(async ({ page }) => {
    // Setup comum: login, navegação inicial
    await page.goto('/');
  });

  // Happy path
  test('deve <comportamento esperado>', async ({ page }) => {
    // arrange
    // act
    // assert
    await expect(page).toHaveURL('/rota-esperada');
    await expect(page.getByTestId('elemento')).toBeVisible();
  });

  // Edge case
  test('deve <comportamento com dado inválido>', async ({ page }) => {
    // ...
  });

  // Error flow
  test('deve exibir erro quando <condição de falha>', async ({ page }) => {
    // ...
  });

});

test.describe('Regressão — <fluxo existente relacionado>', () => {
  // testes de regressão
});
```

---

## Hierarquia de Seletores

Sempre na ordem abaixo — do mais robusto ao mais frágil:

1. **`data-testid`** (mais robusto — não quebra com mudanças de UI)
   ```typescript
   page.getByTestId('submit-button')
   ```

2. **`getByRole`** (semântico — funciona com acessibilidade)
   ```typescript
   page.getByRole('button', { name: 'Salvar' })
   page.getByRole('textbox', { name: 'Email' })
   ```

3. **`getByLabel`** (para inputs de formulário)
   ```typescript
   page.getByLabel('Senha')
   ```

4. **`getByText`** (somente para texto único na página)
   ```typescript
   page.getByText('Sucesso!')
   ```

5. **CSS/XPath** (último recurso — evitar sempre que possível)

---

## Assertions Obrigatórias

```typescript
// URL
await expect(page).toHaveURL('/dashboard');
await expect(page).toHaveURL(/\/task\/\d+/);

// Visibilidade
await expect(locator).toBeVisible();
await expect(locator).not.toBeVisible();

// Texto
await expect(locator).toHaveText('Salvo com sucesso');
await expect(locator).toContainText('erro');

// Estado de input
await expect(locator).toHaveValue('valor esperado');
await expect(locator).toBeEnabled();
await expect(locator).toBeDisabled();

// Contagem
await expect(locator).toHaveCount(3);
```

---

## Screenshots em Pontos Críticos

Capturar screenshot nos momentos-chave do fluxo:

```typescript
// Antes de uma ação crítica
await page.screenshot({ path: 'antes-submissao.png' });

// Após resultado esperado
await page.screenshot({ path: 'confirmacao-criada.png' });

// Em caso de erro (automático com screenshot: 'only-on-failure' no config)
```

**Nomenclatura:** `<acao>-<resultado>.png` — sem espaços, minúsculas, separado por hífen.

---

## Cobertura Obrigatória por Task

| Cenário | Descrição |
|---|---|
| **Happy path** | Fluxo principal com dados válidos — um test por critério de aceite |
| **Campos inválidos** | Formulários com dados fora do esperado (vazio, formato errado, limite) |
| **Falha de rede** | Simular timeout ou erro de API com `page.route()` |
| **Estado vazio** | Lista sem itens, usuário sem permissão, recurso não encontrado |
| **Regressão** | Fluxos existentes relacionados que não devem quebrar |

---

## Simulação de Erros de Rede

```typescript
test('deve exibir mensagem de erro quando API falhar', async ({ page }) => {
  // Interceptar e forçar falha
  await page.route('**/api/tasks', route => route.abort());

  await page.goto('/tasks');

  await expect(page.getByTestId('error-message')).toBeVisible();
  await expect(page.getByTestId('error-message')).toContainText('Erro ao carregar');
});
```

---

## Scripts de Execução

```bash
# Instalar (idempotente)
bash scripts/playwright-install.sh

# Executar testes de uma task
bash scripts/run-tests.sh CU-<TASK_ID>

# Variáveis de ambiente
BASE_URL=http://localhost:3000  # URL da aplicação
```

**Configuração:** `playwright.config.ts` na raiz do projeto.
- `testDir`: `./tests/e2e`
- `timeout`: 30s
- `workers`: 1 (sequencial para evitar conflitos de estado)
- `browser`: Chromium headless
- `screenshot`: `only-on-failure`
- `trace`: `on-first-retry`

---

## Política de Falhas (Fase 6)

| Situação | Ação |
|---|---|
| Todos passam | Avançar para Fase 7 |
| Falha por bug na aplicação | Corrigir o código da aplicação e reexecutar |
| Falha por seletor desatualizado | Corrigir o seletor no teste e reexecutar |
| Falha após 2 tentativas | Bloquear e exibir diagnóstico para revisão humana |
| Falha por ambiente (porta errada, app não rodando) | Informar o usuário — não é bug de código |

**Regra absoluta:** O teste é a especificação — nunca enfraquecer uma assertion para fazer o teste passar.
