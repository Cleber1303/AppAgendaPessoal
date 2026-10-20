// Concluir, adiar, editar e excluir uma tarefa.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { diaParaData } from "@/lib/datas";
import { tarefaParaTela } from "@/lib/servidor";
import { TETO_DA_PILHA } from "@/lib/tipos";

type Contexto = { params: Promise<{ id: string }> };

export async function GET(_requisicao: Request, contexto: Contexto) {
  const { id } = await contexto.params;
  const linha = await prisma.tarefa.findUnique({ where: { id } });

  if (linha === null || linha.deletadoEm !== null) {
    return NextResponse.json({ erro: "tarefa não encontrada" }, { status: 404 });
  }

  return NextResponse.json(tarefaParaTela(linha));
}

export async function PATCH(requisicao: Request, contexto: Contexto) {
  const { id } = await contexto.params;
  const corpo = await requisicao.json();

  const existente = await prisma.tarefa.findUnique({ where: { id } });

  if (existente === null || existente.deletadoEm !== null) {
    return NextResponse.json({ erro: "tarefa não encontrada" }, { status: 404 });
  }

  const acao = String(corpo.acao ?? "editar");

  if (acao === "concluir") {
    // A data original fica intacta de propósito: é o que permite o
    // histórico mostrar quando venceu e quando foi feita.
    const atualizada = await prisma.tarefa.update({
      where: { id },
      data: { concluidaEm: new Date() },
    });

    return NextResponse.json(tarefaParaTela(atualizada));
  }

  if (acao === "reabrir") {
    const atualizada = await prisma.tarefa.update({
      where: { id },
      data: { concluidaEm: null },
    });

    return NextResponse.json(tarefaParaTela(atualizada));
  }

  if (acao === "adiar") {
    const novaData = corpo.data ? diaParaData(String(corpo.data)) : null;
    const novaHora = novaData !== null && corpo.hora ? String(corpo.hora) : null;

    // Tirar a data é empurrar para a pilha, e a pilha tem teto.
    if (novaData === null) {
      const naPilha = await prisma.tarefa.count({
        where: {
          deletadoEm: null,
          arquivadaEm: null,
          concluidaEm: null,
          data: null,
        },
      });

      if (naPilha >= TETO_DA_PILHA) {
        return NextResponse.json(
          {
            erro: `a pilha está cheia (${TETO_DA_PILHA} itens). Tire algo antes de pôr mais.`,
          },
          { status: 409 },
        );
      }
    }

    const atualizada = await prisma.tarefa.update({
      where: { id },
      data: {
        data: novaData,
        hora: novaHora,
        adiadaVezes: existente.adiadaVezes + 1,
        // Volta a circular mesmo que já tivesse expirado.
        arquivadaEm: null,
      },
    });

    return NextResponse.json(tarefaParaTela(atualizada));
  }

  const atualizada = await prisma.tarefa.update({
    where: { id },
    data: {
      ...(corpo.titulo !== undefined ? { titulo: String(corpo.titulo).trim() } : {}),
      ...(corpo.nota !== undefined ? { nota: corpo.nota ? String(corpo.nota) : null } : {}),
      ...(corpo.ordem !== undefined ? { ordem: Number(corpo.ordem) } : {}),
    },
  });

  return NextResponse.json(tarefaParaTela(atualizada));
}

export async function DELETE(_requisicao: Request, contexto: Contexto) {
  const { id } = await contexto.params;

  // Marca em vez de remover: item apagado no celular não pode ressuscitar
  // na próxima sincronização do desktop.
  await prisma.tarefa.update({
    where: { id },
    data: { deletadoEm: new Date() },
  });

  return NextResponse.json({ ok: true });
}
