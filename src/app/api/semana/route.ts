// As sete faixas da tela "Semana".

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dataParaDia, diaParaData, hoje, semanaDe } from "@/lib/datas";
import { expandirEventos, tarefaParaTela } from "@/lib/servidor";
import type { DiaDaSemana } from "@/lib/tipos";

export async function GET(requisicao: Request) {
  const parametros = new URL(requisicao.url).searchParams;
  const referencia = parametros.get("data") ?? hoje();

  const dias = semanaDe(referencia);
  const primeiroDia = dias[0];
  const ultimoDia = dias[6];

  const [linhasDeEvento, tarefas] = await Promise.all([
    prisma.evento.findMany({
      where: { deletadoEm: null },
    }),
    prisma.tarefa.findMany({
      where: {
        deletadoEm: null,
        arquivadaEm: null,
        data: {
          gte: diaParaData(primeiroDia),
          lte: diaParaData(ultimoDia),
        },
      },
      orderBy: [{ hora: "asc" }, { criadoEm: "asc" }],
    }),
  ]);

  const eventos = expandirEventos(linhasDeEvento, primeiroDia, ultimoDia);

  const resposta: DiaDaSemana[] = dias.map((dia) => ({
    dia,
    eventos: eventos.filter((evento) => evento.dia === dia),
    tarefas: tarefas
      .filter((tarefa) => tarefa.data !== null && dataParaDia(tarefa.data) === dia)
      .map(tarefaParaTela),
  }));

  return NextResponse.json(resposta);
}
