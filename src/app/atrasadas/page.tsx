"use client";

// Atrasadas: venceram e não foram reagendadas.
//
// A lista se esvazia sozinha. Sete dias aqui e a tarefa vai para o
// histórico marcada como não feita — sai da cobrança sem sair do app.

import Link from "next/link";
import { Carregando, Falhou, IconeHistorico, IconeSeta, Vazio } from "@/components/Avisos";
import { carregarAtrasadas } from "@/lib/dados";
import { diaBarraMes } from "@/lib/datas";
import type { TarefaAtrasada } from "@/lib/tipos";
import { usarDados } from "@/lib/usarDados";

export default function TelaAtrasadas() {
  const { dados, carregando, erro, recarregar } = usarDados(() => carregarAtrasadas());

  return (
    <>
      <header className="border-b border-borda bg-papel px-5 pt-4 pb-3.5">
        <div className="flex items-start justify-between">
          <h1 className="m-0 text-2xl font-semibold tracking-tight">Atrasadas</h1>
          <Link
            href="/historico"
            aria-label="Histórico"
            className="-mt-1 -mr-2 flex size-11 shrink-0 items-center justify-center text-tinta-apagada no-underline"
          >
            <IconeHistorico />
          </Link>
        </div>
      </header>

      {carregando && dados === null && <Carregando />}
      {erro !== null && dados === null && <Falhou mensagem={erro} aoTentarDeNovo={recarregar} />}

      {dados !== null && (
        <main className="px-5 pt-3">
          {dados.length === 0 && <Vazio texto="Nada atrasado." />}

          {dados.map((tarefa, posicao) => (
            <LinhaAtrasada key={tarefa.id} tarefa={tarefa} posicao={posicao} />
          ))}

          <div className="h-6" />
        </main>
      )}
    </>
  );
}

function LinhaAtrasada({
  tarefa,
  posicao,
}: {
  tarefa: TarefaAtrasada;
  posicao: number;
}) {
  const perto = tarefa.diasParaExpirar <= 2;

  let aviso = `sai em ${tarefa.diasParaExpirar} dias`;

  if (tarefa.diasParaExpirar === 1) {
    aviso = "sai amanhã";
  } else if (tarefa.diasParaExpirar === 0) {
    aviso = "sai hoje";
  }

  return (
    <Link
      href={`/tarefa/${tarefa.id}`}
      style={{ animationDelay: `${Math.min(posicao, 8) * 28}ms` }}
      className={`entra mb-2 flex min-h-16 items-center gap-3 rounded-[11px] border bg-papel px-3.5 py-2.5 text-tinta no-underline transition-transform duration-150 active:scale-[0.99] ${
        perto ? "border-ambar-borda" : "border-borda"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14.5px]">{tarefa.titulo}</div>
        <div className="mt-1 flex items-center gap-2">
          <span className="font-mono text-[11px] text-tinta-fraca">
            venceu {tarefa.data === null ? "" : diaBarraMes(tarefa.data)}
          </span>
          <span className={`font-mono text-[11px] ${perto ? "text-ambar" : "text-tinta-apagada"}`}>
            {aviso}
          </span>
        </div>
      </div>
      <span className="shrink-0 text-tinta-apagada">
        <IconeSeta />
      </span>
    </Link>
  );
}
