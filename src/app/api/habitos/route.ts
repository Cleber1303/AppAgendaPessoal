// Lista e cria hábitos.
//
// A lista traz o mapa de 12 semanas, que é o que a tela de Hábitos
// desenha, e inclui os pausados — se eles sumissem daqui, não haveria
// como retomá-los.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dataParaDia, diaParaData, hoje, somarDias, type DiaTexto } from "@/lib/datas";
import {
  estadoDoHabito,
  habitoParaTela,
  pausasParaTela,
  serieDoHabito,
} from "@/lib/servidor";

const SEMANAS_NO_MAPA = 12;

export async function GET() {
  const habitos = await prisma.habito.findMany({
    where: { deletadoEm: null },
    orderBy: [{ ativo: "desc" }, { ordem: "asc" }],
    include: { pausas: true },
  });

  const totalDeDias = SEMANAS_NO_MAPA * 7;
  const primeiroDia = somarDias(hoje(), -(totalDeDias - 1));

  const registros = await prisma.registroHabito.findMany({
    where: { data: { gte: diaParaData(primeiroDia) } },
  });

  const marcadosPorHabito = new Map<string, Set<DiaTexto>>();

  for (const registro of registros) {
    const conjunto = marcadosPorHabito.get(registro.habitoId) ?? new Set<DiaTexto>();
    conjunto.add(dataParaDia(registro.data));
    marcadosPorHabito.set(registro.habitoId, conjunto);
  }

  // A sequência olha para trás sem limite, então precisa de todos os
  // registros, não só os das 12 semanas do mapa.
  const totaisPorHabito = await prisma.registroHabito.groupBy({
    by: ["habitoId"],
    _count: { _all: true },
  });

  const todosOsRegistros = await prisma.registroHabito.findMany({
    select: { habitoId: true, data: true },
  });

  const sempreMarcados = new Map<string, Set<DiaTexto>>();

  for (const registro of todosOsRegistros) {
    const conjunto = sempreMarcados.get(registro.habitoId) ?? new Set<DiaTexto>();
    conjunto.add(dataParaDia(registro.data));
    sempreMarcados.set(registro.habitoId, conjunto);
  }

  const resposta = habitos.map((habito) => {
    const marcados = marcadosPorHabito.get(habito.id) ?? new Set<DiaTexto>();
    const pausas = pausasParaTela(habito.pausas);
    const mapa: { dia: DiaTexto; estado: string }[] = [];

    for (let posicao = 0; posicao < totalDeDias; posicao = posicao + 1) {
      const dia = somarDias(primeiroDia, posicao);
      mapa.push({ dia, estado: estadoDoHabito(habito, dia, marcados, pausas) });
    }

    const mesAtual = hoje().slice(0, 7);
    const feitosNoMes = [...marcados].filter((dia) => dia.slice(0, 7) === mesAtual).length;

    return {
      ...habitoParaTela(habito),
      mapa,
      pausas,
      serie: serieDoHabito(habito, sempreMarcados.get(habito.id) ?? new Set(), pausas),
      feitosNoMes,
      programadosNoMes: mapa.filter(
        (entrada) =>
          entrada.dia.slice(0, 7) === mesAtual &&
          entrada.estado !== "nao-era-dia" &&
          entrada.estado !== "pausado" &&
          entrada.dia <= hoje(),
      ).length,
      totalDeSempre:
        totaisPorHabito.find((total) => total.habitoId === habito.id)?._count._all ?? 0,
    };
  });

  return NextResponse.json(resposta);
}

export async function POST(requisicao: Request) {
  const corpo = await requisicao.json();
  const nome = String(corpo.nome ?? "").trim();

  if (nome === "") {
    return NextResponse.json({ erro: "nome é obrigatório" }, { status: 400 });
  }

  const diasDaSemana: number[] = Array.isArray(corpo.diasDaSemana)
    ? corpo.diasDaSemana.map(Number).filter((dia: number) => dia >= 0 && dia <= 6)
    : [];

  // Um hábito tem meta semanal OU dias fixos, nunca os dois. Deixar os
  // dois preenchidos faria o contador discordar de si mesmo.
  const metaPorSemana =
    diasDaSemana.length > 0 || corpo.metaPorSemana === undefined || corpo.metaPorSemana === null
      ? null
      : Number(corpo.metaPorSemana);

  // Vai para o fim da lista. `ordem` é Int de 32 bits, então nada de
  // timestamp aqui.
  const maiorOrdem = await prisma.habito.aggregate({
    _max: { ordem: true },
    where: { deletadoEm: null },
  });

  const criado = await prisma.habito.create({
    data: {
      nome,
      icone: corpo.icone ? String(corpo.icone) : null,
      metaPorSemana,
      diasDaSemana,
      ordem: (maiorOrdem._max.ordem ?? 0) + 1,
    },
  });

  return NextResponse.json(habitoParaTela(criado), { status: 201 });
}
