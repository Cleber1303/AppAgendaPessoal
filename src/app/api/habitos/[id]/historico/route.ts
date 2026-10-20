// O histórico de um hábito num mês qualquer.
//
// A listagem de hábitos traz só as últimas 12 semanas, que é o que cabe no
// mapa. Esta rota serve a tela de detalhe, onde você volta meses atrás.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  dataParaDia,
  diaParaData,
  diasDoMes,
  hoje,
  mesAtual,
  type DiaTexto,
} from "@/lib/datas";
import { estadoDoHabito, habitoParaTela, serieDoHabito } from "@/lib/servidor";

type Contexto = { params: Promise<{ id: string }> };

export async function GET(requisicao: Request, contexto: Contexto) {
  const { id } = await contexto.params;
  const parametros = new URL(requisicao.url).searchParams;
  const mes = parametros.get("mes") ?? mesAtual();

  const habito = await prisma.habito.findUnique({ where: { id } });

  if (habito === null || habito.deletadoEm !== null) {
    return NextResponse.json({ erro: "hábito não encontrado" }, { status: 404 });
  }

  const dias = diasDoMes(mes);

  // A série é contada para trás a partir de hoje, então precisa de todos os
  // registros, não só os do mês que está na tela.
  const [registrosDoMes, todosOsRegistros] = await Promise.all([
    prisma.registroHabito.findMany({
      where: {
        habitoId: id,
        data: { gte: diaParaData(dias[0]), lte: diaParaData(dias[dias.length - 1]) },
      },
    }),
    prisma.registroHabito.findMany({
      where: { habitoId: id },
      select: { data: true },
    }),
  ]);

  const marcadosNoMes = new Set<DiaTexto>(
    registrosDoMes.map((registro) => dataParaDia(registro.data)),
  );

  const marcadosSempre = new Set<DiaTexto>(
    todosOsRegistros.map((registro) => dataParaDia(registro.data)),
  );

  const entradas = dias.map((dia) => ({
    dia,
    estado: estadoDoHabito(habito, dia, marcadosNoMes),
  }));

  // "Programado" conta só o que já passou: um mês em andamento não deve
  // parecer uma falha pelos dias que ainda vão acontecer.
  const programados = entradas.filter(
    (entrada) => entrada.estado !== "nao-era-dia" && entrada.dia <= hoje(),
  ).length;

  return NextResponse.json({
    habito: habitoParaTela(habito),
    mes,
    dias: entradas,
    feitos: marcadosNoMes.size,
    programados,
    serie: serieDoHabito(habito, marcadosSempre),
    totalDeSempre: marcadosSempre.size,
  });
}