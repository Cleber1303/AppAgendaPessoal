// Ler, editar e excluir um evento.
//
// O `id` aqui é sempre o da SÉRIE, não o de uma ocorrência expandida: a
// tela manda o dia em separado quando precisa mexer num dia só.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  diaDeInstante,
  diaParaData,
  duracaoLegivel,
  horaDeInstante,
  instanteDe,
  somarDias,
} from "@/lib/datas";

type Contexto = { params: Promise<{ id: string }> };

export async function GET(_requisicao: Request, contexto: Contexto) {
  const { id } = await contexto.params;
  const evento = await prisma.evento.findUnique({ where: { id } });

  if (evento === null || evento.deletadoEm !== null) {
    return NextResponse.json({ erro: "evento não encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    id: evento.id,
    titulo: evento.titulo,
    nota: evento.nota,
    local: evento.local,
    cor: evento.cor,
    dia: diaDeInstante(evento.inicio),
    horaInicio: horaDeInstante(evento.inicio, evento.fusoHorario),
    horaFim: horaDeInstante(evento.fim, evento.fusoHorario),
    duracao: duracaoLegivel(evento.inicio, evento.fim),
    fusoHorario: evento.fusoHorario,
    rrule: evento.rrule,
  });
}

export async function PATCH(requisicao: Request, contexto: Contexto) {
  const { id } = await contexto.params;
  const corpo = await requisicao.json();

  const existente = await prisma.evento.findUnique({ where: { id } });

  if (existente === null || existente.deletadoEm !== null) {
    return NextResponse.json({ erro: "evento não encontrado" }, { status: 404 });
  }

  const fusoHorario = String(corpo.fusoHorario ?? existente.fusoHorario);
  const dia = corpo.dia === undefined ? diaDeInstante(existente.inicio) : String(corpo.dia);

  const horaInicio =
    corpo.horaInicio === undefined
      ? horaDeInstante(existente.inicio, fusoHorario)
      : String(corpo.horaInicio);

  const horaFim =
    corpo.horaFim === undefined
      ? horaDeInstante(existente.fim, fusoHorario)
      : String(corpo.horaFim);

  const inicio = instanteDe(dia, horaInicio, fusoHorario);
  let fim = instanteDe(dia, horaFim, fusoHorario);

  // Evento que termina depois da meia-noite: o fim cai no dia seguinte.
  if (fim <= inicio) {
    fim = instanteDe(somarDias(dia, 1), horaFim, fusoHorario);
  }

  const atualizado = await prisma.evento.update({
    where: { id },
    data: {
      ...(corpo.titulo !== undefined ? { titulo: String(corpo.titulo).trim() } : {}),
      ...(corpo.local !== undefined
        ? { local: corpo.local ? String(corpo.local) : null }
        : {}),
      ...(corpo.nota !== undefined ? { nota: corpo.nota ? String(corpo.nota) : null } : {}),
      ...(corpo.rrule !== undefined ? { rrule: corpo.rrule ? String(corpo.rrule) : null } : {}),
      inicio,
      fim,
      fusoHorario,
    },
  });

  return NextResponse.json({ id: atualizado.id });
}

export async function DELETE(requisicao: Request, contexto: Contexto) {
  const { id } = await contexto.params;
  const parametros = new URL(requisicao.url).searchParams;
  const escopo = parametros.get("escopo") ?? "serie";
  const dia = parametros.get("dia");

  const existente = await prisma.evento.findUnique({ where: { id } });

  if (existente === null || existente.deletadoEm !== null) {
    return NextResponse.json({ erro: "evento não encontrado" }, { status: 404 });
  }

  // Apagar só uma ocorrência não toca na série: grava uma exceção
  // cancelada para aquela data, e a regra continua valendo no resto.
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
