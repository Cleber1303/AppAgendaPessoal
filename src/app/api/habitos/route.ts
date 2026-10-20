// Lista e cria hábitos.
//
// A lista traz o mapa de 12 semanas, que é o que a tela de Hábitos desenha.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dataParaDia, diaParaData, hoje, somarDias, type DiaTexto } from "@/lib/datas";
import { estadoDoHabito, habitoParaTela, serieDoHabito } from "@/lib/servidor";

const SEMANAS_NO_MAPA = 12;

export async function GET() {
  const habitos = await prisma.habito.findMany({
    where: { deletadoEm: null, ativo: true },
    orderBy: { ordem: "asc" },
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

  const resposta = habitos.map((habito) => {
    const marcados = marcadosPorHabito.get(habito.id) ?? new Set<DiaTexto>();
    const mapa: { dia: DiaTexto; estado: string }[] = [];

    for (let posicao = 0; posicao < totalDeDias; posicao = posicao + 1) {
      const dia = somarDias(primeiroDia, posicao);
      mapa.push({ dia, estado: estadoDoHabito(habito, dia, marcados) });
    }

    const feitosNoMes = [...marcados].filter((dia) => dia.slice(0, 7) === hoje().slice(0, 7)).length;

    return {
      ...habitoParaTela(habito),
      mapa,
      serie: serieDoHabito(habito, marcados),
      feitosNoMes,
      programadosNoMes: mapa.filter(
        (entrada) =>
          entrada.dia.slice(0, 7) === hoje().slice(0, 7) &&
          entrada.estado !== "nao-era-dia" &&
          entrada.dia <= hoje(),
      ).length,
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

  const criado = await prisma.habito.create({
    data: {
      nome,
      icone: corpo.icone ? String(corpo.icone) : null,
      metaPorSemana,
      diasDaSemana,
      ordem: Date.now() % 100000,
    },
  });

  return NextResponse.json(habitoParaTela(criado), { status: 201 });
}
