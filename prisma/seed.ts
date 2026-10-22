// Dados de exemplo, para a primeira abertura não ser uma tela vazia.
//
// Rodar: npm run db:seed
// É seguro rodar de novo: apaga o que semeou antes.

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const FUSO = "America/Sao_Paulo";

/** O dia de hoje no fuso do app, como "AAAA-MM-DD". */
function hoje(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function somarDias(dia: string, quantidade: number): string {
  const data = new Date(`${dia}T00:00:00.000Z`);
  data.setUTCDate(data.getUTCDate() + quantidade);

  return data.toISOString().slice(0, 10);
}

function diaParaData(dia: string): Date {
  return new Date(`${dia}T00:00:00.000Z`);
}

/**
 * Dia mais "HH:mm" no fuso de São Paulo (UTC-3, sem horário de verão).
 *
 * Usa Date.UTC em vez de montar texto porque hora local 22:00 vira 25:00
 * em UTC, que como texto é data inválida. Date.UTC entende o transborde e
 * joga para 01:00 do dia seguinte, que é o certo.
 */
function instante(dia: string, hora: string): Date {
  const [horas, minutos] = hora.split(":").map(Number);

  return new Date(
    Date.UTC(
      Number(dia.slice(0, 4)),
      Number(dia.slice(5, 7)) - 1,
      Number(dia.slice(8, 10)),
      horas + 3,
      minutos,
    ),
  );
}

async function main() {
  console.log("Limpando os dados de exemplo…");

  await prisma.registroHabito.deleteMany();
  await prisma.habito.deleteMany();
  await prisma.tarefa.deleteMany();
  await prisma.evento.deleteMany();

  const dia = hoje();

  console.log("Criando eventos…");

  await prisma.evento.create({
    data: {
      titulo: "Aula — Compiladores",
      local: "PVA 201",
      inicio: instante(dia, "08:00"),
      fim: instante(dia, "10:00"),
      fusoHorario: FUSO,
      // Toda semana no mesmo dia da semana de hoje.
      rrule: `FREQ=WEEKLY;BYDAY=${["SU", "MO", "TU", "WE", "TH", "FR", "SA"][diaParaData(dia).getUTCDay()]}`,
    },
  });

  await prisma.evento.create({
    data: {
      titulo: "Reunião do laboratório",
      local: "Sala de reuniões",
      inicio: instante(dia, "14:00"),
      fim: instante(dia, "15:30"),
      fusoHorario: FUSO,
    },
  });

  await prisma.evento.create({
    data: {
      titulo: "Treino de maratona",
      inicio: instante(somarDias(dia, 1), "19:00"),
      fim: instante(somarDias(dia, 1), "22:00"),
      fusoHorario: FUSO,
    },
  });

  console.log("Criando tarefas…");

  // Ancorada: tem dia e hora.
  await prisma.tarefa.create({
    data: { titulo: "Entregar lista 4", data: diaParaData(dia), hora: "23:59" },
  });

  // Do dia: tem dia, não tem hora.
  await prisma.tarefa.create({
    data: { titulo: "Revisar os slides do seminário", data: diaParaData(dia) },
  });

  await prisma.tarefa.create({
    data: { titulo: "Responder o e-mail da secretaria", data: diaParaData(dia) },
  });

  await prisma.tarefa.create({
    data: {
      titulo: "Renovar o empréstimo do livro",
      data: diaParaData(dia),
      concluidaEm: new Date(),
    },
  });

  // Atrasadas: venceram e ninguém reagendou.
  await prisma.tarefa.create({
    data: { titulo: "Enviar o formulário da bolsa", data: diaParaData(somarDias(dia, -6)) },
  });

  await prisma.tarefa.create({
    data: { titulo: "Confirmar presença no seminário", data: diaParaData(somarDias(dia, -3)) },
  });

  await prisma.tarefa.create({
    data: {
      titulo: "Devolver o livro da biblioteca",
      data: diaParaData(somarDias(dia, -1)),
      adiadaVezes: 2,
    },
  });

  // Flutuantes: a pilha.
  const naPilha = [
    { titulo: "Trocar a correia da bike", idade: 31 },
    { titulo: "Organizar as fotos do celular", idade: 24 },
    { titulo: "Ler o artigo sobre parsers LR", idade: 18 },
    { titulo: "Atualizar o currículo Lattes", idade: 12 },
    { titulo: "Comprar fone novo", idade: 9 },
    { titulo: "Separar livros para doar", idade: 3 },
  ];

  for (const [posicao, item] of naPilha.entries()) {
    await prisma.tarefa.create({
      data: {
        titulo: item.titulo,
        ordem: posicao,
        criadoEm: diaParaData(somarDias(dia, -item.idade)),
      },
    });
  }

  // Histórico: uma concluída e uma que expirou sem ser feita.
  await prisma.tarefa.create({
    data: {
      titulo: "Enviar o resumo revisado",
      data: diaParaData(somarDias(dia, -20)),
      concluidaEm: diaParaData(somarDias(dia, -20)),
    },
  });

  await prisma.tarefa.create({
    data: {
      titulo: "Assistir a aula gravada",
      data: diaParaData(somarDias(dia, -30)),
      arquivadaEm: diaParaData(somarDias(dia, -23)),
    },
  });

  console.log("Criando hábitos…");

  // Dias fixos: segunda, quarta e sexta.
  const academia = await prisma.habito.create({
    data: { nome: "Academia", diasDaSemana: [1, 3, 5], ordem: 0 },
  });

  // Meta semanal: tanto faz o dia.
  const estudar = await prisma.habito.create({
    data: { nome: "Estudar", metaPorSemana: 5, ordem: 1 },
  });

  const ler = await prisma.habito.create({
    data: { nome: "Ler", metaPorSemana: 7, ordem: 2 },
  });

  console.log("Marcando as últimas semanas…");

  /**
   * Sorteio determinístico entre 0 e 1.
   *
   * Nada de `paraTras % 7`: o resto por 7 tem o mesmo período da semana,
   * então ele acerta sempre o mesmo dia e apaga uma segunda-feira inteira
   * do histórico — o mapa fica com uma listra e dá a impressão de que o
   * app está errado. Um gerador de verdade espalha as faltas.
   */
  function sorteio(semente: number): number {
    const estado = (semente * 1103515245 + 12345) % 2147483648;

    return estado / 2147483648;
  }

  for (let paraTras = 0; paraTras < 84; paraTras = paraTras + 1) {
    const diaMarcado = somarDias(dia, -paraTras);
    const diaDaSemana = diaParaData(diaMarcado).getUTCDay();

    // Academia só nos dias dela, e com algumas faltas espalhadas.
    if ([1, 3, 5].includes(diaDaSemana) && sorteio(paraTras + 1) < 0.8) {
      await prisma.registroHabito.create({
        data: { habitoId: academia.id, data: diaParaData(diaMarcado) },
      });
    }

    if (sorteio(paraTras + 500) < 0.65) {
      await prisma.registroHabito.create({
        data: { habitoId: estudar.id, data: diaParaData(diaMarcado) },
      });
    }

    if (sorteio(paraTras + 900) < 0.45) {
      await prisma.registroHabito.create({
        data: { habitoId: ler.id, data: diaParaData(diaMarcado) },
      });
    }
  }

  console.log("Pronto.");
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
