# Agenda

Agenda pessoal: tarefas, eventos e hábitos. Uso próprio, um usuário só.

Next.js 16, Prisma 7 e PostgreSQL.

## Subir o projeto

Crie um projeto no [Neon](https://neon.com) e copie a connection string. O plano
grátis dá conta: uma agenda de dez anos ocupa poucos MB.

```bash
cp .env.example .env    # cole a connection string em DATABASE_URL
npm install
npx prisma db push      # cria as tabelas a partir do schema
npm run db:seed         # dados de exemplo, opcional
npm run dev             # http://localhost:3000
```

Use `db push` enquanto o schema muda. Quando estabilizar, troque por
`npx prisma migrate dev` para ter histórico de migração.

No Prisma 7 a URL do banco não fica no `schema.prisma`: o CLI lê de
`prisma.config.ts` e o app conecta pelo adaptador `@prisma/adapter-pg`, em
`src/lib/prisma.ts`. Não há engine para baixar.

O cliente é gerado em `src/generated/prisma`, que está no `.gitignore`.
`npm run build` roda `prisma generate` antes do `next build`, então a Vercel
recria sozinha.

Para publicar: importe o repositório na Vercel e ponha a mesma `DATABASE_URL`
nas variáveis de ambiente. No celular, abra o endereço e use "Adicionar à Tela
de Início"; o `manifest.json` já está no projeto.

## Tabelas

| Tabela | O que guarda |
| --- | --- |
| `Evento` | ocupa tempo, pode conflitar, pode repetir |
| `Tarefa` | tem estado de feita ou não feita, não ocupa tempo |
| `Habito` | nome, mais meta semanal ou dias fixos |
| `RegistroHabito` | uma linha por dia marcado |
| `PausaDoHabito` | um período parado |

### O tipo da tarefa é derivado

Não existe campo `tipo`. Ele sai de ter ou não data e hora:

| `data` | `hora` | Tipo |
| --- | --- | --- |
| nula | — | flutuante: vai para a pilha e nunca atrasa |
| preenchida | nula | do dia: aparece na lista, não ocupa horário |
| preenchida | preenchida | ancorada: entra na linha do tempo |

Um campo guardado poderia discordar de `data` e `hora`. A regra fica em
`tipoDaTarefa()`, em `src/lib/servidor.ts`.

### Hábito não gera pendência

Dia sem marcação não cria linha em `RegistroHabito`, então não vira atrasado nem
aparece em lugar nenhum. É a diferença entre hábito e tarefa recorrente.

Hábito tem meta semanal ou dias fixos, nunca os dois: a API zera `metaPorSemana`
quando `diasDaSemana` vem preenchido. Com dias fixos, o mapa do mês ganha um
terceiro estado, `nao-era-dia`, que separa falha de dia que nunca foi cobrado.

### Nada é apagado de verdade

- `concluidaEm` preenchido significa feita. A `data` original fica intacta, então
  o histórico sabe que foi concluída com atraso.
- `arquivadaEm` preenchido significa que venceu, ficou sete dias em Atrasadas e
  saiu de circulação.
- `deletadoEm` preenchido significa excluída. Marcar em vez de remover evita que
  item apagado no celular volte na próxima sincronização.

## Decisões de projeto

**A tela não fala com a rede.** Toda leitura e escrita passa por
`src/lib/dados.ts`. As telas são `"use client"` e chamam só esse módulo. Quando o
app for funcionar sem internet, `dados.ts` passa a ler de um banco local no
navegador e as telas não mudam. Três coisas já estão no lugar por causa disso:
UUID gerado fora do banco, `deletadoEm` em vez de DELETE e `atualizadoEm` em
todas as tabelas.

**Data e hora.** Dia de calendário é texto, `"2026-10-19"`, em coluna `@db.Date`.
Hora de tarefa é texto, `"14:00"`. Guardar como instante faria a tarefa mudar de
dia perto da meia-noite, porque o servidor roda em UTC, e o horário de verão
moveria o horário. Evento é instante absoluto com o fuso ao lado, em
`fusoHorario`, que é o que mantém a reunião às 9h quando o horário de verão muda.
As contas ficam em `src/lib/datas.ts`.

**Recorrência.** `Evento.rrule` guarda a regra no padrão iCalendar (RFC 5545),
por exemplo `"FREQ=WEEKLY;BYDAY=TU"`, expandida pela biblioteca `rrule`. Uma
linha no banco em vez de 52, e permite exportar `.ics` depois. Mover ou cancelar
uma ocorrência cria uma linha filha com `eventoPaiId` e `dataOriginal`, que
substitui aquela data sem quebrar a série.

**A tela responde antes do servidor.** Marcar tarefa, marcar hábito e reordenar a
pilha atualizam a tela na hora e só depois enviam a requisição. Se falhar,
`recarregar()` traz o estado do servidor. Ao trocar de dia, o conteúdo anterior
fica na tela apagado em vez de virar "carregando".

**Pausa de hábito.** Cada período parado vira uma linha em `PausaDoHabito`, e dia
dentro de uma pausa é pulado no cálculo da sequência: não conta como feito nem
como falha. Um campo `ativo` booleano não resolveria, porque a sequência olha
para trás e precisa saber quando você estava parado. Pausa aberta e fechada no
mesmo dia é apagada.

**A tranca é uma senha só.** Sem cadastro de usuário. A senha fica em
`AGENDA_SENHA` e não chega ao navegador; o cookie leva uma validade assinada com
HMAC, então cookie forjado não entra e mudar a data invalida a assinatura. O
`src/middleware.ts` protege as telas e as rotas de API, porque trancar só as
telas deixaria os dados saindo por `/api/tarefas`. Sem `AGENDA_SENHA` definida o
app tranca em produção, para variável esquecida no deploy não virar app aberto.
Não há contagem de tentativas, só meio segundo de atraso a cada erro: use uma
frase, não uma palavra.

**A faxina roda na abertura.** A regra dos sete dias é executada por
`POST /api/manutencao`, chamada pela tela Hoje quando o app abre. Não precisa de
cron: se você não abrir o app, a regra roda na próxima vez.

## Limitações

Falta de interface, com a API já pronta:

- Título de tarefa não se edita. O `PATCH` aceita `titulo`, a tela só exibe.
- Nome e meta do hábito não se editam.
- Busca existe só no histórico, e filtra no cliente.
- Editar evento recorrente muda a série inteira. Apagar uma ocorrência só
  funciona; mover, não.
- `nota` de tarefa e evento, `cor` do evento e `icone` do hábito existem no banco
  e nenhuma tela preenche.
- `deRrule` entende apenas as regras que a própria tela gera. Regra vinda de fora
  é lida como "não repete", e salvar por cima a substitui.

Fragilidades:

- Não há backup. Export `.ics` e `.json` é o item mais importante da lista e é
  pequeno.
- `AGENDA_FUSO` só vale no servidor: `process.env` não chega ao navegador sem o
  prefixo `NEXT_PUBLIC_`. Hoje o padrão no código é o mesmo valor, então mudar a
  variável criaria diferença silenciosa entre servidor e tela.
- `expandirEventos` lê todos os eventos a cada requisição, sem filtro de data,
  porque evento recorrente antigo pode gerar ocorrência hoje. Irrelevante com
  dezenas de eventos.
- Não há teste automatizado nem registro de erro.

Adiado de propósito:

- Funcionar sem internet. A arquitetura está pronta e `dados.ts` é o arquivo a
  mexer. A tranca usa middleware, que roda antes do código, e vai precisar de
  ajuste para não bloquear tela já carregada.
- Notificação local. A API do navegador que fazia isso foi descontinuada; a saída
  mais simples é exportar `.ics` e deixar o calendário do celular avisar.
- Escolher entre "só esta semana" e "toda a série" ao editar evento recorrente.
- Compromisso de dia inteiro ou de vários dias.

## Arquivos

```
prisma.config.ts       onde o CLI do Prisma acha a URL do banco
prisma/schema.prisma   as tabelas, comentadas
prisma/seed.ts         dados de exemplo
src/lib/
  datas.ts             fuso, dias e meses
  tipos.ts             o que trafega entre API e tela, e as constantes
  servidor.ts          recorrência, estado dos hábitos, tradução do banco
  dados.ts             único ponto de rede do app
  usarDados.ts         o hook que as telas usam
  atualizacao.ts       aviso de "algo mudou, recarregue"
  repeticao.ts         regra de repetição e tradução para iCalendar
  sessao.ts            o cookie assinado da senha
  prisma.ts            conexão
src/middleware.ts      a tranca das telas e das rotas
src/app/
  entrar/              tela de senha
  page.tsx             Hoje, e qualquer dia da semana corrente
  semana/              dias retráteis, com eventos e tarefas
  pilha/ atrasadas/ historico/
  habitos/             lista
  habitos/[id]/        calendário do mês: marcar, pausar, apagar
  evento/[id]/         editar e apagar
  tarefa/[id]/         detalhe e adiamento
  api/                 dia, semana, tarefas, eventos, habitos, manutencao
src/components/
  BarraInferior.tsx
  NovoItem.tsx         botão "+" e pop-up de criar
  CaixaDeMarcar.tsx    caixa de marcar
  Avisos.tsx           carregando, falhou, vazio
```

## Comandos

```bash
npm run dev          # desenvolvimento
npm run build        # prisma generate + next build
npm run db:push      # aplica o schema no banco
npm run db:studio    # interface para olhar e editar os dados
npm run db:seed      # dados de exemplo
npm audit            # vulnerabilidade conhecida nas dependências
npm outdated         # o que está atrás da versão atual
```
