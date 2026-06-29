# Reference — executar-testes (Fase 7/9)

Referência de execução, diagnóstico e correção de testes Playwright.

---

## Comandos de execução

```bash
# Instalar Playwright (apenas se não instalado)
bash scripts/playwright-install.sh

# Executar testes da task
bash scripts/run-tests.sh CU-<TASK_ID>

# Alternativa direta via npx
npx playwright install --with-deps chromium
npx playwright test tests/e2e/CU-<TASK_ID>.spec.ts --config=playwright.config.ts
```

---

## Pré-requisito de ambiente

O dev server **precisa estar rodando** antes de executar os testes.
Sempre confirmar com o usuário antes de executar:

```text
⚠️  PRÉ-REQUISITO — o app precisa estar rodando.

Confirme quando estiver no ar:
  [1] ✅ App rodando — iniciar testes
  [2] ❌ Cancelar
```

---

## Política de falhas — 3 categorias

| Categoria | Diagnóstico | Ação |
| --------- | ----------- | ---- |
| **Bug na aplicação** | Assertion falha porque o comportamento está errado | Corrigir código da aplicação e reexecutar |
| **Falha de ambiente** | `net::ERR_CONNECTION_REFUSED`, porta errada, app não subiu | Informar usuário — não tentar corrigir código |
| **Seletor desatualizado** | `element not found`, `locator.click: Target closed` | Verificar se `data-testid` existe no HTML gerado |

---

## Regra absoluta de correção

- **Corrigir:** código da aplicação (`src/`, `app/`, serviços, componentes)
- **Nunca corrigir:** o arquivo de testes `.spec.ts`
- **Nunca:** enfraquecer assertions para fazer o teste passar

---

## Diagnóstico de falhas comuns

| Erro | Causa mais provável | Como investigar |
| ---- | ------------------- | --------------- |
| `locator.click: element not found` | `data-testid` não existe no HTML | Inspecionar template do componente |
| `expect(page).toHaveURL(...)` falha | Redirect não aconteceu após ação | Verificar lógica de navegação pós-ação |
| `TimeoutError: waiting for locator` | Elemento demorou a aparecer | Adicionar `await page.waitForSelector(...)` antes do assert |
| `net::ERR_CONNECTION_REFUSED` | App não está rodando | Confirmar dev server com o usuário |
| `page.screenshot: Target closed` | Página fechou inesperadamente | Verificar erro de JavaScript no console da página |

---

## Formato de diagnóstico de falha

```text
❌ Teste falhou: <nome do teste>

Erro: <mensagem exata do Playwright>
Linha: <arquivo>:<número>

Causa identificada: <o que está errado>
Correção aplicada: <o que foi mudado no código da aplicação>
```

---

## O que salvar em fase7-resultado.md

```text
## Resultado
Status: ✅ Aprovado / ❌ Bloqueado
Total: X | Passou: X | Falhou: X | Tempo: Xs

## Detalhes por teste
✅ <nome do teste>
❌ <nome do teste> — <erro>

## Correções aplicadas (se houver)
- Tentativa 1: <o que foi corrigido>
- Tentativa 2: <o que foi corrigido>

## Ambiente
Dev server: <URL>
Browser: Chromium headless
```
