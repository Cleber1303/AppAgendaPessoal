// Editar, pausar, retomar e excluir um hábito.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { diaParaData, hoje } from "@/lib/datas";
import { habitoParaTela } from "@/lib/servidor";

type Contexto = { params: Promise<{ id: string }> };

/**
 * Abre ou fecha um período de pausa.
 *
 * Pausar grava o início; retomar fecha a pausa aberta no dia anterior,
 * para o dia em que você voltou já contar como dia normal.
 */
async function ajustarPausa(habitoId: string, ativo: boolean) {
  const pausaAberta = await prisma.pausaDoHabito.findFirst({
    where: { habitoId, fim: null },
    orderBy: { inicio: "desc" },
  });

  if (!ativo) {
    // Já estava pausado: nada a fazer, para não criar pausas empilhadas.
    if (pausaAberta !== null) {
      return;
    }

    await prisma.pausaDoHabito.create({
      data: { habitoId, inicio: diaParaData(hoje()) },
    });

    return;
  }

  if (pausaAberta === null) {
    return;
  }

  const ontem = new Date(diaParaData(hoje()));
  ontem.setUTCDate(ontem.getUTCDate() - 1);

  // Pausa que começou hoje e já foi retomada hoje não deixa rastro.
  if (ontem < pausaAberta.inicio) {
    await prisma.pausaDoHabito.delete({ where: { id: pausaAberta.id } });

    return;
  }

  await prisma.pausaDoHabito.update({
    where: { id: pausaAberta.id },
    data: { fim: ontem },
  });
}

export async function PATCH(requisicao: Request, contexto: Contexto) {
  const { id } = await contexto.params;
  const corpo = await requisicao.json();

  const existente = await prisma.habito.findUnique({ where: { id } });

  if (existente === null || existente.deletadoEm !== null) {
    return NextResponse.json({ erro: "hábito não encontrado" }, { status: 404 });
  }

  const diasDaSemana: number[] | undefined = Array.isArray(corpo.diasDaSemana)
    ? corpo.diasDaSemana.map(Number).filter((dia: number) => dia >= 0 && dia <= 6)
    : undefined;

  // A regra de sempre: meta semanal OU dias fixos, nunca os dois.
  const mudancaDeModo =
    diasDaSemana === undefined
      ? {}
      : diasDaSemana.length > 0
        ? { diasDaSemana, metaPorSemana: null }
        : { diasDaSemana: [], metaPorSemana: Number(corpo.metaPorSemana ?? 7) };

  if (corpo.ativo !== undefined && Boolean(corpo.ativo) !== existente.ativo) {
    await ajustarPausa(id, Boolean(corpo.ativo));
  }

  const atualizado = await prisma.habito.update({
    where: { id },
    data: {
      ...(corpo.nome !== undefined ? { nome: String(corpo.nome).trim() } : {}),
      ...(corpo.ativo !== undefined ? { ativo: Boolean(corpo.ativo) } : {}),
      ...mudancaDeModo,
    },
  });

  return NextResponse.json(habitoParaTela(atualizado));
}

export async function DELETE(_requisicao: Request, contexto: Contexto) {
  const { id } = await contexto.params;

  const existente = await prisma.habito.findUnique({ where: { id } });

  if (existente === null || existente.deletadoEm !== null) {
    return NextResponse.json({ erro: "hábito não encontrado" }, { status: 404 });
  }

  // Marca em vez de remover, como no resto do app. Aqui pesa mais do que
  // nas tarefas: apagar de verdade levaria junto todo o RegistroHabito
  // por cascata — meses de histórico que não voltam.
  await prisma.habito.update({
    where: { id },
    data: { deletadoEm: new Date() },
  });

  return NextResponse.json({ ok: true });
}
