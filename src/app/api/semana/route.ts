// As sete faixas da tela "Semana".

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dataParaDia, diaParaData, hoje, semanaDe, type DiaTexto } from "@/lib/datas";
import { estadoDoHabito, expandirEventos } from "@/lib/servidor";
import type { DiaDaSemana } from "@/lib/tipos";

export async function GET(requisicao: Request) {
  const parametros = new URL(requisicao.url).searchParams;
  const referencia: DiaTexto = parametros.get("data") ?? hoje();

  const dias = semanaDe(referencia);
  const primeiroDia = dias[0];
  const ultimoDia = dias[6];

  const [linhasDeEvento, tarefas, habitos, registros] = await Promise.all([
    prisma.evento.findMany({
      where: { deletadoEm: null },
    }),
    prisma.tarefa.findMany({
      where: {
        deletadoEm: null,
        arquivadaEm: null,
        concluidaEm: null,
        data: {
          gte: diaParaData(primeiroDia),
          lte: diaParaData(ultimoDia),
        },
      },
      select: { data: true },
    }),
    prisma.habito.findMany({
      where: { deletadoEm: null, ativo: true },
      orderBy: { ordem: "asc" },
    }),
    prisma.registroHabito.findMany({
      where: {
        data: {
          gte: diaParaData(primeiroDia),
          lte: diaParaData(ultimoDia),
        },
      },
    }),
  ]);

  const eventos = expandirEventos(linhasDeEvento, primeiroDia, ultimoDia);

  const marcadosPorHabito = new Map<string, Set<DiaTexto>>();

  for (const registro of registros) {
    const conjunto = marcadosPorHabito.get(registro.habitoId) ?? new Set<DiaTexto>();
    conjunto.add(dataParaDia(registro.data));
    marcadosPorHabito.set(registro.habitoId, conjunto);
  }

  const resposta: DiaDaSemana[] = dias.map((dia) => ({
    dia,
    eventos: eventos.filter((evento) => evento.dia === dia),
    totalTarefas: tarefas.filter(
      (tarefa) => tarefa.data !== null && dataParaDia(tarefa.data) === dia,
    ).length,
    habitos: habitos.map((habito) => ({
      id: habito.id,
      estado: estadoDoHabito(habito, dia, marcadosPorHabito.get(habito.id) ?? new Set()),
    })),
  }));

  return NextResponse.json(resposta);
}
