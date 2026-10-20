// Marca ou desmarca um hábito num dia.
//
// A existência da linha é a marcação. Não existe linha "não fiz": dia sem
// registro simplesmente não gera pendência, e é isso que impede o app de
// virar uma máquina de cobrança.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { diaParaData, hoje } from "@/lib/datas";

type Contexto = { params: Promise<{ id: string }> };

export async function POST(requisicao: Request, contexto: Contexto) {
  const { id } = await contexto.params;
  const corpo = await requisicao.json().catch(() => ({}));
  const dia = String(corpo.data ?? hoje());
  const data = diaParaData(dia);

  const existente = await prisma.registroHabito.findUnique({
    where: { habitoId_data: { habitoId: id, data } },
  });

  if (existente !== null) {
    await prisma.registroHabito.delete({ where: { id: existente.id } });

    return NextResponse.json({ dia, marcado: false });
  }

  await prisma.registroHabito.create({
    data: { habitoId: id, data },
  });

  return NextResponse.json({ dia, marcado: true });
}
