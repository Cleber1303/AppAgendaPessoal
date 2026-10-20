# Agenda

Agenda pessoal: tarefas, eventos e hábitos. Uso próprio, um usuário só.

Next.js 16 + Prisma 7 + PostgreSQL, no mesmo arranjo da Gincana.

---

## Como subir

### 1. Banco

Crie um projeto no [Neon](https://neon.com) (plano grátis basta — agenda
pessoal de 10 anos cabe em poucos MB) e copie a connection string.

```bash
cp .env.example .env
# cole a connection string em DATABASE_URL
```

### 2. Dependências e tabelas

```bash
npm install
npx prisma db push     # cria as tabelas a partir do schema
npm run db:seed        # dados de exemplo, opcional
```

`db push` em vez de `migrate` enquanto o schema está mudando toda semana.
Quando estabilizar, troque por `npx prisma migrate dev` para ter histórico.

No Prisma 7 a URL do banco não fica no `schema.prisma`: o CLI lê de
`prisma.config.ts` e o app se conecta pelo adaptador `@prisma/adapter-pg`
em `src/lib/prisma.ts`. Não há binário de engine para baixar.

O cliente é gerado em `src/generated/prisma`, que está no `.gitignore` —
`npm run build` roda `prisma generate` antes do `next build`, então a
Vercel recria sozinha.

### 3. Rodar

```bash
npm run dev            # http://localhost:3000
```

### 4. Publicar

Importe o repositório na [Vercel](https://vercel.com), ponha a mesma
`DATABASE_URL` nas variáveis de ambiente e pronto. O `build` já roda
`prisma generate` antes do `next build`.

No celular: abra o endereço no Safari/Chrome e use "Adicionar à Tela de
Início". O `manifest.json` já está lá, então abre sem barra de navegador.

---

## As quatro tabelas

| Tabela | O que é |
|---|---|
| `Evento` | Ocupa tempo, pode conflitar, pode repetir |
| `Tarefa` | Tem estado (feita / não feita), não ocupa tempo |
| `Habito` | Definição: nome, mais meta semanal **ou** dias fixos |
| `RegistroHabito` | Uma linha por dia marcado |

### O tipo da tarefa não é um campo

É consequência de ter ou não data e hora:

| `data` | `hora` | Resulta em |
|---|---|---|
| `null` | — | **Flutuante** — vai para a pilha, nunca atrasa |
| preenchida | `null` | **Do dia** — aparece na lista, não ocupa horário |
| preenchida | preenchida | **Ancorada** — entra na linha do tempo |

Um campo `tipo` guardado poderia discordar de `data` e `hora`. Derivado,
não pode. A regra vive em `tipoDaTarefa()`, em `src/lib/servidor.ts`, e em
nenhum outro lugar.

### Hábito não cobra

Dia sem marcação não gera linha em `RegistroHabito`, e por isso não gera
pendência, não vira atrasado e não aparece em lugar nenhum. É a diferença
entre histórico e cobrança — e o motivo de hábito não ser tarefa
recorrente.

Hábito tem meta semanal **ou** dias fixos, nunca os dois: a API zera
`metaPorSemana` quando `diasDaSemana` vem preenchido. Com dias fixos, o
mapa ganha um terceiro estado (`nao-era-dia`), que é o que separa falha de
dia que nunca foi cobrado.

### Nada é apagado

- `concluidaEm` preenchido = feita. A `data` original fica intacta, então
  o histórico sabe que foi concluída com atraso.
- `arquivadaEm` preenchido = venceu, ficou 7 dias em Atrasadas e saiu de
  circulação. Vai para o histórico marcada como não feita.
- `deletadoEm` preenchido = excluída. Marca em vez de remover, para item
  apagado no celular não ressuscitar na próxima sincronização.

---

## Decisões que não dá para arrumar depois

### A tela nunca fala com a rede

Toda leitura e escrita passa por `src/lib/dados.ts`. As telas são
`"use client"` e chamam só esse módulo.

Parece volta desnecessária hoje, e é o que vai permitir o app funcionar
sem internet: quando a hora chegar, `dados.ts` passa a ler de um banco
local no navegador (IndexedDB) e a rede só reabastece esse banco em
segundo plano. **As telas não mudam uma linha.**

Se as telas falassem com a rede direto — ou se as páginas fossem
renderizadas no servidor — essa mudança seria reescrever o app. É por isso
que isso veio antes da primeira tela.

Três coisas já estão no lugar por causa disso:

- **UUID gerado fora do banco** — criar tarefa offline não pode esperar id
  do servidor.
- **`deletadoEm` em vez de DELETE** — exclusão precisa sobreviver à
  sincronização.
- **`atualizadoEm` em toda tabela** — resolução de conflito, que sendo
  você o único usuário é só "vence o mais recente".

### Data e hora

- Dia de calendário é **texto**, `"2026-10-19"`, e vai para coluna
  `@db.Date`. Guardar como `DateTime` faria a tarefa aparecer no dia
  errado perto da meia-noite, porque o servidor roda em UTC.
- Hora de tarefa é **texto**, `"14:00"`. Guardar como instante faria o
  horário de verão mover a tarefa de lugar.
- Evento é **instante absoluto** mais o fuso ao lado (`fusoHorario`). É o
  fuso guardado que mantém a reunião às 9h quando o horário de verão muda.
- Tudo isso vive em `src/lib/datas.ts`. Nenhuma tela faz conta de fuso.

### Recorrência

`Evento.rrule` guarda a regra no padrão iCalendar (RFC 5545), tipo
`"FREQ=WEEKLY;BYDAY=TU"`, expandida pela biblioteca `rrule`. Uma linha no
banco, não 52.

Formato próprio aqui daria bug em seis meses e impediria o export `.ics`.

Mover ou cancelar uma ocorrência cria uma **exceção**: uma linha filha com
`eventoPaiId` e `dataOriginal`, que substitui aquela data sem quebrar a
série. O banco e a API já fazem isso; a interface de "só esta semana /
toda a série" ainda não existe.

### A faxina roda na abertura

A regra dos 7 dias é executada por `POST /api/manutencao`, chamada pela
tela Hoje quando o app abre. Não precisa de cron: você abre o app todo
dia, e se não abrir, a regra roda na próxima vez — o resultado é o mesmo.

---

## O que ainda não existe

- **Autenticação.** Qualquer um com o endereço lê e escreve. Antes de
  publicar num domínio público, ponha um provider OAuth com allowlist de
  um e-mail só.
- **Funcionar sem internet.** A arquitetura está pronta, a implementação
  não. `dados.ts` é o arquivo a mexer.
- **Notificações.** A web não sabe agendar notificação local — a API que
  faria isso foi descontinuada. Saída mais barata: exportar `.ics` e
  deixar o calendário do celular avisar.
- **Export `.ics` / `.json`.** É o que te protege se a hospedagem cair,
  e vale fazer antes do resto.
- **Busca global.** Só o histórico tem busca, e ela filtra no cliente.
- **Contador de atrasadas visível.** Virou uma aba na barra de baixo, sem
  número. Um selo com a contagem seria o próximo passo.
- **Compromisso de dia inteiro ou de vários dias.**
- **Arrastar para reordenar a pilha.** A coluna `ordem` existe e o botão
  "Ordem manual" ordena por ela; falta o arrastar.
- **Editar evento e hábito.** Dá para criar e excluir, não para editar.
- **Testes.**

---

## Estrutura

```
prisma.config.ts         onde o CLI do Prisma acha a URL do banco
prisma/
  schema.prisma          as quatro tabelas, comentadas
  seed.ts                dados de exemplo
src/lib/
  datas.ts               fuso, dias, "HH:mm" — nenhuma tela faz essa conta
  tipos.ts               o que trafega entre API e tela, e as constantes
  servidor.ts            recorrência, estado dos hábitos, tradução do banco
  dados.ts               ÚNICO ponto de rede do app
  usarDados.ts           o hook que as telas usam
  prisma.ts              a conexão
src/app/
  page.tsx               Hoje — e qualquer dia da semana corrente
  semana/ pilha/ atrasadas/ historico/
  habitos/               lista
  habitos/[id]/          histórico mês a mês de um hábito
  novo/                  criar tarefa, evento ou hábito
  tarefa/[id]/           detalhe e adiamento
  api/                   dia, semana, tarefas, eventos, habitos, manutencao
src/components/
  BarraInferior.tsx
  Avisos.tsx             carregando, falhou, vazio, ícones
src/generated/prisma/    cliente gerado — não versionado
```

## Manutenção

Rode de vez em quando, principalmente antes de publicar:

```bash
npm audit            # vulnerabilidades conhecidas nas dependências
npm outdated         # o que está atrás da versão atual
```

Next e React tiveram um RCE crítico (CVE-2025-66478 / CVE-2025-55182) na
linha 15.x. Este projeto já nasce em versão corrigida, mas num app que
fica exposto na internet esse `npm audit` é o que te avisa do próximo.

## Comandos

```bash
npm run dev          # desenvolvimento
npm run build        # prisma generate + next build
npm run db:push      # aplica o schema no banco
npm run db:studio    # interface para olhar/editar os dados
npm run db:seed      # dados de exemplo
```