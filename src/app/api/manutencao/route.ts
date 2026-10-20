// A faxina: tarefa que venceu há mais de 7 dias e nunca foi reagendada sai
// da lista de atrasadas e vai para o histórico, marcada como não feita.
//
// Nada é apagado. `arquivadaEm` só tira de circulação — a tarefa continua
// pesquisável no histórico para sempre.
//
// Chamada pelo app na abertura (é por isso que não precisa de cron), e
// também disponível por POST caso você queira agendar depois.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { diaParaData, hoje, somarDias } from "@/lib/datas";
import { DIAS_ATE_EXPIRAR } from "@/lib/tipos";

export async function POST() {
  const limite = somarDias(hoje(), -DIAS_ATE_EXPIRAR);

  const resultado = await prisma.tarefa.updateMany({
    where: {
      deletadoEm: null,
      arquivadaEm: null,
      concluidaEm: null,
      data: { lt: diaParaData(limite) },
    },
    data: { arquivadaEm: new Date() },
  });

  return NextResponse.json({ arquivadas: resultado.count });
}
