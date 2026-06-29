# Reference — documentar (Fase 8/9)

Referência para geração dos documentos técnico e de QA.

---

## Fontes de informação por seção

### Documentação Técnica

| Seção | Onde buscar |
| ----- | ----------- |
| Resumo | `fase1-task.md` (contexto) + `fase4-dev.md` (o que foi feito) |
| Arquivos alterados | `fase4-dev.md` — lista de CRIADO/MODIFICADO |
| Decisões técnicas | `fase3-plano.md` — riscos e escolhas feitas |
| Dependências novas | `fase4-dev.md` + diff de `package.json`, `requirements.txt` etc |
| Pontos para code review | `fase3-plano.md` (riscos) + `fase4-dev.md` (mudanças complexas) |
| Instruções de deploy | `fase4-dev.md` — migrations, env vars, configurações novas |

### Documentação QA

| Seção | Onde buscar |
| ----- | ----------- |
| Resultado dos testes | `fase7-resultado.md` |
| Cenários cobertos | `fase5-plano-teste.md` — lista de cenários aprovados |
| Casos de borda testados | `fase5-plano-teste.md` — seção de edge cases |
| Cenários não cobertos | `fase5-plano-teste.md` — seção "Fora de escopo" |
| Evidências/screenshots | Arquivos `.png` gerados durante a Fase 7 |

---

## Template — Documentação Técnica

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DOCUMENTAÇÃO TÉCNICA
Task: <ID> — <título> | Data: <data>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RESUMO
<O que foi implementado e por quê — 3 a 5 linhas.
Deve responder: qual problema resolve, como resolve, o que mudou no sistema.>

ARQUIVOS ALTERADOS
  • src/app/tasks/task-card.component.ts — CRIADO
    Componente de exibição de cards de task com inputs title, status e assignee.
  • src/app/tasks/tasks.module.ts — MODIFICADO
    Declarado e exportado o novo TaskCardComponent.

DECISÕES TÉCNICAS
  • Optado por componente standalone em vez de módulo dedicado — reduz boilerplate
    para um componente de apresentação simples sem lógica de negócio.

DEPENDÊNCIAS / CONFIGURAÇÕES NOVAS
  • nenhuma (ou lista de libs, env vars, migrations)

PONTOS DE ATENÇÃO PARA CODE REVIEW
  • Verificar se o selector css do componente não conflita com estilos globais.

INSTRUÇÕES DE DEPLOY
  • nenhum passo adicional (ou lista de ações: migrations, variáveis, configurações)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Template — Documentação QA

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DOCUMENTAÇÃO QA
Task: <ID> — <título> | Arquivo: tests/e2e/CU-<ID>.spec.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RESULTADO DOS TESTES
  Status:  ✅ Aprovado
  Total:   8 testes | Passou: 8 | Falhou: 0 | Tempo: 12s

CENÁRIOS COBERTOS
  ✅ Exibe card com título, status e responsável — valida renderização básica
  ✅ Card sem responsável exibe placeholder — valida estado opcional
  ✅ Click no card navega para detalhe da task — valida interação principal

CASOS DE BORDA TESTADOS
  • Título com 200 caracteres — truncamento correto com ellipsis
  • Task sem prazo — campo prazo não renderiza

CENÁRIOS NÃO COBERTOS
  • Drag-and-drop de cards — requer fixture de múltiplos cards com estado de board

AMBIENTE DE TESTE
  Browser:    Chromium headless
  Playwright: 1.x.x

EVIDÊNCIAS
  Screenshots: antes-click-card.png, card-detalhe-aberto.png
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Processo de aprovação

1. Exibir os dois documentos completos no terminal.
2. Aguardar feedback explícito do usuário.
3. Se pedir ajuste: identificar exatamente o que mudar, corrigir e exibir novamente.
4. Só salvar `fase8-docs.md` após aprovação confirmada.
