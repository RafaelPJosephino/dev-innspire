# Reference — executar-tarefa-clickup

Guia de orquestração do workflow completo. Consulte durante a execução para manter consistência entre fases.

---

## Mapa de persistência entre fases

| Fase | Skill | Arquivo gerado | Consome |
| ---- | ----- | -------------- | ------- |
| 1 | `/ler-task` | `fase1-task.md` | — |
| 2 | `/analisar-task` | `fase2-analise.md` | `fase1-task.md` |
| 3 | `/planejar-task` | `fase3-plano.md` | `fase1` + `fase2` |
| 4 | `/desenvolver-task` | `fase4-dev.md` | `fase1` + `fase3` |
| 5 | `/planejar-teste-task` | `fase5-plano-teste.md` | `fase1` + `fase3` + `fase4` |
| 6 | `/criar-testes` | `fase6-testes.md` | `fase1` + `fase4` + `fase5` |
| 7 | `/executar-testes` | `fase7-resultado.md` | `fase6` |
| 8 | `/documentar` | `fase8-docs.md` | `fase1` + `fase3` + `fase4` + `fase5` + `fase7` |
| 9 | `/publicar-clickup` | — (posta no ClickUp) | `fase8` |

---

## Pontos de aprovação obrigatórios

| Fase | Skill | O que aguarda |
| ---- | ----- | ------------- |
| 3 | `/planejar-task` | Aprovação do plano técnico — sem isso, Fase 4 não começa |
| 5 | `/planejar-teste-task` | Aprovação do plano de testes — sem isso, Fase 6 não começa |
| 8 | `/documentar` | Aprovação da documentação — sem isso, Fase 9 não publica |

---

## Pontos de bloqueio automático

| Situação | Fase | Comportamento |
| --------- | ---- | ------------- |
| MCP indisponível ou retornou dados vazios | 1 | Encerrar imediatamente — nunca fabricar dados |
| Task incompleta (critérios faltando) | 2 | Bloquear e listar gaps — aguardar usuário |
| Build com erros | 4 | Corrigir antes de avançar — nunca pular |
| Testes falhando após 2 tentativas | 7 | Bloquear com diagnóstico — encerrar sem documentar |

---

## Estrutura de diretórios gerada

```text
.tasks/
├── .gitignore                    ← ignora tudo exceto _project-context.md
├── _project-context.md           ← cache de detecção do projeto (opcional)
└── <TASK_ID>/
    ├── .gitignore                ← ignora tudo dentro desta pasta
    ├── fase1-task.md
    ├── fase2-analise.md
    ├── fase3-plano.md
    ├── fase4-dev.md
    ├── fase5-plano-teste.md
    ├── fase6-testes.md
    ├── fase7-resultado.md
    └── fase8-docs.md

tests/
└── e2e/
    └── CU-<TASK_ID>.spec.ts
```

---

## Regras invioláveis

1. **Nenhuma fase pode ser pulada** — o contexto de cada fase alimenta as seguintes.
2. **Nenhum código sem plano aprovado** — Fase 3 é obrigatória antes da Fase 4.
3. **Nenhum teste sem plano aprovado** — Fase 5 é obrigatória antes da Fase 6.
4. **Documentação sempre gerada** — Fase 8 é obrigatória, mesmo que não publicada.
5. **Dúvida = parar e perguntar** — nunca assumir o que não está escrito.
