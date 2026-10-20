// Exclui um evento.
//
// O "só esta semana / toda a série" ainda não existe na interface, mas o
// banco já guarda a exceção: `escopo: "ocorrencia"` cria uma linha filha
// cancelada em vez de apagar a série.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { diaParaData } from "@/lib/datas";

type Contexto = { params: Promise<{ id: string }> };

export async function DELETE(requisicao: Request, contexto: Contexto) {
  const { id } = await contexto.params;
  const parametros = new URL(requisicao.url).searchParams;
  const escopo = parametros.get("escopo") ?? "serie";
  const dia = parametros.get("dia");

  const existente = await prisma.evento.findUnique({ where: { id } });

  if (existente === null || existente.deletadoEm !== null) {
    return NextResponse.json({ erro: "evento não encontrado" }, { status: 404 });
  }

  if (escopo === "ocorrencia" && dia !== null) {
    await prisma.evento.create({
      data: {
        titulo: existente.titulo,
        inicio: existente.inicio,
        fim: existente.fim,
        fusoHorario: existente.fusoHorario,
        eventoPaiId: existente.id,
        dataOriginal: diaParaData(dia),
        cancelado: true,
      },
    });

    return NextResponse.json({ ok: true, escopo: "ocorrencia" });
  }

  await prisma.evento.update({
    where: { id },
    data: { deletadoEm: new Date() },
  });

  return NextResponse.json({ ok: true, escopo: "serie" });
}
