# Reference — criar-testes (Fase 6/9)

Referência de padrões Playwright para geração do arquivo spec.

---

## Estrutura do arquivo de testes

```typescript
// tests/e2e/CU-<TASK_ID>.spec.ts

import { test, expect } from '@playwright/test';

// Helper de autenticação — investigar mecanismo real da app antes de usar
async function authenticate(page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('infoLogin', JSON.stringify({
      token: 'token-de-teste',
      // demais campos exigidos — verificar o serviço de autenticação
    }));
  });
}

test.describe('<Critério de Aceite Principal>', () => {

  test.beforeEach(async ({ page }) => {
    await authenticate(page);
    await page.goto('/rota-da-feature'); // confirmar no arquivo de routing
  });

  test('deve <comportamento esperado>', async ({ page }) => {
    // arrange — preparar estado
    // act — executar ação
    // assert — verificar resultado
    await expect(page).toHaveURL('/rota-esperada');
    await expect(page.getByTestId('elemento')).toBeVisible();
  });

});
```

---

## Hierarquia de seletores — ordem obrigatória

```typescript
// 1° — data-testid (mais robusto)
page.getByTestId('submit-button')

// 2° — getByRole (semântico)
page.getByRole('button', { name: 'Salvar' })
page.getByRole('textbox', { name: 'Email' })

// 3° — getByLabel (inputs de formulário)
page.getByLabel('Senha')

// 4° — getByText (texto único na página)
page.getByText('Sucesso!')

// ❌ — CSS/XPath (último recurso — evitar)
page.locator('.minha-classe')
```

---

## Assertions obrigatórias por tipo

```typescript
// Navegação
await expect(page).toHaveURL('/dashboard');
await expect(page).toHaveURL(/\/task\/\d+/);

// Visibilidade
await expect(locator).toBeVisible();
await expect(locator).not.toBeVisible();

// Texto
await expect(locator).toHaveText('Salvo com sucesso');
await expect(locator).toContainText('erro');

// Formulários
await expect(locator).toHaveValue('valor esperado');
await expect(locator).toBeEnabled();
await expect(locator).toBeDisabled();

// Listas
await expect(locator).toHaveCount(3);
```

---

## Screenshots — quando e como

```typescript
// Antes de ação crítica
await page.screenshot({ path: 'antes-submissao.png' });

// Após resultado esperado
await page.screenshot({ path: 'confirmacao-criada.png' });
```

**Nomenclatura:** `<acao>-<resultado>.png` — minúsculas, hífens, sem espaços.

Capturar em: submissão de formulário, exibição de confirmação, estado de erro, navegação pós-ação.

---

## Simulação de falha de rede

```typescript
test('deve exibir erro quando API falhar', async ({ page }) => {
  await page.route('**/api/tasks', route => route.abort());
  await page.goto('/tasks');
  await expect(page.getByTestId('error-message')).toBeVisible();
  await expect(page.getByTestId('error-message')).toContainText('Erro ao carregar');
});
```

---

## Cobertura mínima obrigatória

| Tipo | Quantidade mínima |
| ---- | ----------------- |
| Happy path | 1 por critério de aceite |
| Campo inválido | 1 por campo com validação |
| Falha de rede | 1 para o endpoint principal |
| Regressão | 1 por fluxo relacionado alterado |

---

## playwright.config.ts — verificar antes de criar

1. Buscar `playwright.config.ts` na raiz com `Glob`.
2. Se existir: respeitar a configuração e adaptar caminhos.
3. Se não existir: criar com `testDir: './tests/e2e'`, `baseURL: 'http://localhost:3000'`, browser Chromium headless.
