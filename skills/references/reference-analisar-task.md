# Reference — analisar-task (Fase 2/9)

Referência para análise de completude de requisitos antes do desenvolvimento.

---

## Checklist completo de completude

| # | Critério | Sinal de alerta se... |
| - | -------- | --------------------- |
| 1 | Definition of Done claro e específico | Está vago ("melhorar X") ou ausente |
| 2 | Comportamento esperado descrito | Descreve só o que fazer, não o que deve acontecer |
| 3 | Se feature visual: mockup ou descrição UI/UX | Nenhuma referência visual e é uma feature de tela |
| 4 | Regras de negócio explícitas | Validações, permissões ou limites não estão definidos |
| 5 | Casos de borda mencionados | Nenhuma menção a entradas inválidas ou estados vazios |
| 6 | Partes do sistema afetadas identificadas | Não está claro quais módulos, APIs ou telas são impactadas |
| 7 | Sem ambiguidade interpretável diferentemente | Dois desenvolvedores leriam de formas diferentes |

---

## Como classificar gaps

**Gap bloqueante** — impede desenvolvimento seguro:
- Critério de aceite ausente ou completamente vago
- Regras de negócio indefinidas (quem pode fazer o quê)
- Comportamento esperado não descrito

**Gap informativo** — pode prosseguir com ressalva registrada:
- Casos de borda mencionados genericamente ("tratar erros")
- Feature visual sem mockup mas com descrição textual suficiente

---

## Fluxo quando task está incompleta

1. Listar cada gap de forma específica e direta — sem generalizar.
2. Oferecer as duas opções ao usuário:
   - **A** — Responder na conversa agora
   - **B** — Atualizar a task no ClickUp e rodar novamente
3. Se escolher **A**: incorporar as respostas, salvar em `fase2-analise.md` e continuar.
4. Se escolher **B**: encerrar e aguardar novo comando.
5. **Nunca prosseguir com gaps bloqueantes não resolvidos.**

---

## O que salvar em fase2-analise.md

```text
## Resultado da análise
✅ Critério 1: Definition of Done — <descrição do que foi confirmado>
✅ Critério 2: Comportamento esperado — <descrição>
✅ Critério 3: UI/UX — <mockup referenciado ou descrição aceita>
✅ Critério 4: Regras de negócio — <regras identificadas>
✅ Critério 5: Casos de borda — <casos mencionados>
✅ Critério 6: Partes do sistema — <módulos identificados>
✅ Critério 7: Sem ambiguidade — confirmado

## Complementações recebidas do usuário (se houver)
<resposta direta do usuário para gaps que foram perguntados>

## Observações para fases seguintes
<pontos de atenção relevantes para o planejamento técnico>
```
