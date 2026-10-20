// Tudo que a tela "Hoje" precisa, numa resposta só.
//
// Uma chamada em vez de cinco porque a tela abre no celular, muitas vezes
// em rede ruim, e cada ida e volta aparece como atraso.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  dataParaDia,
  diaParaData,
  hoje,
  inicioDaSemana,
  somarDias,
  type DiaTexto,
} from "@/lib/datas";
import { expandirEventos, habitoNoDia, tarefaParaTela } from "@/lib/servidor";
import type { Dia } from "@/lib/tipos";

export async function GET(requisicao: Request) {
  const parametros = new URL(requisicao.url).searchParams;
  const dia: DiaTexto = parametros.get("data") ?? hoje();

  const primeiroDiaDaSemana = inicioDaSemana(dia);
  const ultimoDiaDaSemana = somarDias(primeiroDiaDaSemana, 6);

  const [linhasDeEvento, tarefasDoDia, habitos, registros, atrasadas, naPilha] =
    await Promise.all([
      prisma.evento.findMany({
        where: { deletadoEm: null },
      }),
      prisma.tarefa.findMany({
        where: {
          deletadoEm: null,
          arquivadaEm: null,
          data: diaParaData(dia),
        },
        orderBy: [{ hora: "asc" }, { criadoEm: "asc" }],
      }),
      prisma.habito.findMany({
        where: { deletadoEm: null, ativo: true },
        orderBy: { ordem: "asc" },
      }),
      prisma.registroHabito.findMany({
        where: {
          data: {
            gte: diaParaData(primeiroDiaDaSemana),
            lte: diaParaData(ultimoDiaDaSemana),
          },
        },
      }),
      prisma.tarefa.count({
        where: {
          deletadoEm: null,
          arquivadaEm: null,
          concluidaEm: null,
          data: { lt: diaParaData(hoje()) },
        },
      }),
      prisma.tarefa.count({
        where: {
          deletadoEm: null,
          arquivadaEm: null,
          concluidaEm: null,
          data: null,
        },
      }),
    ]);

  const eventos = expandirEventos(linhasDeEvento, dia, dia);

  const marcadosPorHabito = new Map<string, Set<DiaTexto>>();

  for (const registro of registros) {
    const conjunto = marcadosPorHabito.get(registro.habitoId) ?? new Set<DiaTexto>();
    conjunto.add(dataParaDia(registro.data));
    marcadosPorHabito.set(registro.habitoId, conjunto);
  }

  const tarefas = tarefasDoDia.map(tarefaParaTela);

  const resposta: Dia = {
    dia,
    eventos,
    ancoradas: tarefas.filter((tarefa) => tarefa.tipo === "ancorada"),
    doDia: tarefas.filter((tarefa) => tarefa.tipo === "do-dia"),
    habitos: habitos
      .map((habito) =>
        habitoNoDia(habito, dia, marcadosPorHabito.get(habito.id) ?? new Set()),
      )
      // Hábito de dias fixos só aparece no dia dele.
      .filter((habito) => habito.estado !== "nao-era-dia"),
    totalAtrasadas: atrasadas,
    totalNaPilha: naPilha,
  };

  return NextResponse.json(resposta);
}
