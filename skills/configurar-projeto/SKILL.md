---
description: Configura o projeto para usar o workflow dev-innspire — cria estrutura de pastas, instala Playwright, copia playwright.config.ts e valida que o MCP do ClickUp está acessível. Execute uma vez antes de rodar qualquer skill de task.
---

# Skill — /dev-innspire:configurar-projeto

Prepara o projeto para usar o workflow dev-innspire. Execute **uma única vez** na raiz do projeto.

## Uso

```text
/dev-innspire:configurar-projeto
```

---

## Execução

### 1 · Detectar raiz do projeto

Confirme que está na raiz do projeto (deve existir `package.json` ou `.git`):

```bash
ls package.json .git 2>/dev/null | head -2
```

Se nenhum dos dois existir, informe o usuário e encerre.

### 2 · Criar estrutura de pastas

```bash
mkdir -p .tasks
mkdir -p tests/e2e
```

Crie `.tasks/.gitignore` se não existir:

```text
*
!.gitignore
!_project-context.md
```

### 3 · Copiar playwright.config.ts

Se `playwright.config.ts` **não existir** na raiz do projeto, copie do plugin:

```bash
cp "$PLUGIN_DIR/playwright.config.ts" ./playwright.config.ts
```

Se já existir, exiba:

```text
⚠ playwright.config.ts já existe — mantido sem alteração.
```

### 4 · Instalar Playwright

Execute o script de instalação do plugin:

```bash
bash "$PLUGIN_DIR/scripts/playwright-install.sh"
```

O script é idempotente — seguro de rodar múltiplas vezes.

### 5 · Validar MCP do ClickUp

Tente uma chamada simples ao MCP:

```text
mcp__claude_ai_ClickUp__clickup_get_workspace_hierarchy()
```

- Se retornar dados → MCP conectado.
- Se retornar erro de autenticação → instruir o usuário:
  ```text
  ⚠ MCP do ClickUp não está conectado.
  Acesse: Customize → Connectors → ClickUp → Conectar
  ```

### 6 · Exibir resultado

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ PROJETO CONFIGURADO — dev-innspire pronto

   Estrutura criada:
     ✓ .tasks/
     ✓ .tasks/.gitignore
     ✓ tests/e2e/
     ✓ playwright.config.ts        [copiado / já existia]
     ✓ Playwright instalado
     ✓ MCP ClickUp conectado       [ok / atenção: ver aviso acima]

   Próximo passo:
     /dev-innspire:executar-tarefa-clickup <TASK_ID>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
