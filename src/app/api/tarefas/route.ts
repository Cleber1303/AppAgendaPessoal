// Lista e cria tarefas.
//
// O parâmetro `escopo` escolhe a consulta: pilha, atrasadas ou historico.
// Uma rota em vez de três porque as três leem a mesma tabela e só mudam o
// filtro.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { diaDeInstante, diaParaData, diferencaEmDias, hoje } from "@/lib/datas";
import { diasDeAtraso, tarefaParaTela } from "@/lib/servidor";
import {
  DIAS_ATE_EXPIRAR,
  TETO_DA_PILHA,
  type ItemDaPilha,
  type ItemDoHistorico,
  type TarefaAtrasada,
} from "@/lib/tipos";

export async function GET(requisicao: Request) {
  const parametros = new URL(requisicao.url).searchParams;
  const escopo = parametros.get("escopo") ?? "pilha";

  if (escopo === "pilha") {
    const linhas = await prisma.tarefa.findMany({
      where: {
        deletadoEm: null,
        arquivadaEm: null,
        concluidaEm: null,
        data: null,
      },
      orderBy: [{ ordem: "asc" }, { criadoEm: "asc" }],
    });

    const itens: ItemDaPilha[] = linhas.map((linha) => ({
      ...tarefaParaTela(linha),
      idadeEmDias: diferencaEmDias(diaDeInstante(linha.criadoEm), hoje()),
    }));

    return NextResponse.json(itens);
  }

  if (escopo === "atrasadas") {
    const linhas = await prisma.tarefa.findMany({
      where: {
        deletadoEm: null,
        arquivadaEm: null,
        concluidaEm: null,
        data: { lt: diaParaData(hoje()) },
      },
      orderBy: { data: "asc" },
    });

    const itens: TarefaAtrasada[] = linhas.map((linha) => {
      const diasAtrasada = linha.data === null ? 0 : diasDeAtraso(linha.data);

      return {
        ...tarefaParaTela(linha),
        diasAtrasada,
        diasParaExpirar: Math.max(0, DIAS_ATE_EXPIRAR - diasAtrasada),
      };
    });

    return NextResponse.json(itens);
  }

  if (escopo === "historico") {
    const busca = parametros.get("busca");

    const linhas = await prisma.tarefa.findMany({
      where: {
        deletadoEm: null,
        OR: [{ concluidaEm: { not: null } }, { arquivadaEm: { not: null } }],
        ...(busca ? { titulo: { contains: busca, mode: "insensitive" } } : {}),
      },
      orderBy: [{ concluidaEm: "desc" }, { arquivadaEm: "desc" }],
      take: 300,
    });

    const itens: ItemDoHistorico[] = linhas.map((linha) => {
      const encerramento = linha.concluidaEm ?? linha.arquivadaEm ?? linha.criadoEm;

      return {
        ...tarefaParaTela(linha),
        feita: linha.concluidaEm !== null,
        encerradaEm: diaDeInstante(encerramento),
      };
    });

    return NextResponse.json(itens);
  }

  return NextResponse.json({ erro: "escopo desconhecido" }, { status: 400 });
}

export async function POST(requisicao: Request) {
  const corpo = await requisicao.json();
  const titulo = String(corpo.titulo ?? "").trim();

  if (titulo === "") {
    return NextResponse.json({ erro: "título é obrigatório" }, { status: 400 });
  }

  const data = corpo.data ? diaParaData(String(corpo.data)) : null;
  const hora = data !== null && corpo.hora ? String(corpo.hora) : null;

  // A pilha tem teto. Sem isso ela apodrece invisível, como em todo app de
  // tarefas que já testamos.
  if (data === null) {
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

  // Entra no topo da pilha: uma posição acima da menor que existe hoje.
  //
  // Usar um timestamp aqui estouraria a coluna, que é Int de 32 bits —
  // Date.now() passa de 1,7 trilhão e o Postgres recusa.
  const menorOrdem = await prisma.tarefa.aggregate({
    _min: { ordem: true },
    where: { deletadoEm: null, arquivadaEm: null, concluidaEm: null },
  });

  const criada = await prisma.tarefa.create({
    data: {
      titulo,
      nota: corpo.nota ? String(corpo.nota) : null,
      data,
      hora,
      ordem: (menorOrdem._min.ordem ?? 0) - 1,
    },
  });

  return NextResponse.json(tarefaParaTela(criada), { status: 201 });
}