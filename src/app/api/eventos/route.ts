// Lista e cria eventos.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FUSO, hoje, instanteDe, somarDias } from "@/lib/datas";
import { expandirEventos } from "@/lib/servidor";

export async function GET(requisicao: Request) {
  const parametros = new URL(requisicao.url).searchParams;
  const de = parametros.get("de") ?? hoje();
  const ate = parametros.get("ate") ?? somarDias(de, 30);

  const linhas = await prisma.evento.findMany({
    where: { deletadoEm: null },
  });

  return NextResponse.json(expandirEventos(linhas, de, ate));
}

export async function POST(requisicao: Request) {
  const corpo = await requisicao.json();
  const titulo = String(corpo.titulo ?? "").trim();

  if (titulo === "") {
    return NextResponse.json({ erro: "título é obrigatório" }, { status: 400 });
  }

  const dia = String(corpo.dia ?? hoje());
  const horaInicio = String(corpo.horaInicio ?? "09:00");
  const horaFim = String(corpo.horaFim ?? "10:00");
  const fusoHorario = String(corpo.fusoHorario ?? FUSO);

  const inicio = instanteDe(dia, horaInicio, fusoHorario);
  let fim = instanteDe(dia, horaFim, fusoHorario);

  // Evento que termina depois da meia-noite: o fim cai no dia seguinte.
  if (fim <= inicio) {
    fim = instanteDe(somarDias(dia, 1), horaFim, fusoHorario);
  }

  const criado = await prisma.evento.create({
    data: {
      titulo,
      nota: corpo.nota ? String(corpo.nota) : null,
      local: corpo.local ? String(corpo.local) : null,
      cor: corpo.cor ? String(corpo.cor) : "verde",
      inicio,
      fim,
      fusoHorario,
      // Ex.: "FREQ=WEEKLY;BYDAY=TU". Nulo = evento único.
      rrule: corpo.rrule ? String(corpo.rrule) : null,
    },
  });

  return NextResponse.json({ id: criado.id }, { status: 201 });
}
