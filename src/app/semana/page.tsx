"use client";

import { useState } from "react";
import { Carregando, Falhou } from "@/components/Avisos";
import { carregarSemana } from "@/lib/dados";
import {
  hoje,
  mesEAno,
  numeroDoDia,
  rotuloCurto,
  semanaDe,
  somarDias,
} from "@/lib/datas";
import type { EstadoDoHabito } from "@/lib/tipos";
import { usarDados } from "@/lib/usarDados";

export default function TelaSemana() {
  const [referencia, setReferencia] = useState(hoje());
  const { dados, carregando, erro, recarregar } = usarDados(
    () => carregarSemana(referencia),
    [referencia],
  );

  const dias = semanaDe(referencia);
  const intervalo = `${Number(numeroDoDia(dias[0]))} – ${Number(numeroDoDia(dias[6]))}`;

  return (
    <>
      <header className="flex items-center justify-between border-b border-borda bg-papel px-5 pt-4 pb-3.5">
        <div>
          <div className="font-mono text-[11px] tracking-[0.1em] text-tinta-fraca uppercase">
            {mesEAno(dias[0]).toLowerCase()}
          </div>
          <h1 className="mt-1 text-[22px] font-semibold tracking-tight">{intervalo}</h1>
        </div>

        <div className="-mr-2 flex gap-0.5">
          <button
            type="button"
            aria-label="Semana anterior"
            onClick={() => setReferencia(somarDias(referencia, -7))}
            className="flex size-11 items-center justify-center border-0 bg-transparent text-tinta-fraca transition-transform duration-150 active:scale-75"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Próxima semana"
            onClick={() => setReferencia(somarDias(referencia, 7))}
            className="flex size-11 items-center justify-center border-0 bg-transparent text-tinta-fraca transition-transform duration-150 active:scale-75"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </header>

      {carregando && dados === null && <Carregando />}
      {erro !== null && dados === null && <Falhou mensagem={erro} aoTentarDeNovo={recarregar} />}

      {dados !== null && (
        <main
          className={`px-4 pt-1.5 transition-opacity duration-200 ${
            carregando ? "pointer-events-none opacity-40" : "opacity-100"
          }`}
        >
          {dados.map((faixa, posicao) => {
            const eHoje = faixa.dia === hoje();

            return (
              <div
                key={faixa.dia}
                style={{ animationDelay: `${posicao * 24}ms` }}
                className={`entra mb-px flex gap-3 rounded-[10px] px-2 py-2.5 ${
                  eHoje ? "bg-verde-claro" : ""
                }`}
              >
                <div className="w-9 shrink-0 pt-px text-center">
                  <div className="font-mono text-[9px] tracking-[0.06em] text-tinta-fraca uppercase">
                    {rotuloCurto(faixa.dia)}
                  </div>
                  <div
                    className={`mt-px font-mono text-[17px] ${eHoje ? "text-verde" : "text-tinta"}`}
                  >
                    {numeroDoDia(faixa.dia)}
                  </div>
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  {faixa.eventos.map((evento) => (
                    <div
                      key={evento.id}
                      className="flex items-center gap-2 rounded-[7px] border border-borda bg-papel px-2.5 py-1"
                    >
                      <span className="shrink-0 font-mono text-[10px] text-tinta-fraca">
                        {evento.horaInicio}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[12.5px]">
                        {evento.titulo}
                      </span>
                    </div>
                  ))}

                  {faixa.eventos.length === 0 && (
                    <div className="py-1 text-[12.5px] text-tinta-apagada">Sem compromissos</div>
                  )}

                  <div className="mt-px flex items-center gap-2.5">
                    <div className="flex shrink-0 gap-1">
                      {faixa.habitos.map((habito) => (
                        <PontoDeHabito key={habito.id} estado={habito.estado} />
                      ))}
                    </div>
                    <span className="font-mono text-[10px] text-tinta-fraca">
                      {rotuloDeTarefas(faixa.totalTarefas)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </main>
      )}
    </>
  );
}

function rotuloDeTarefas(total: number): string {
  if (total === 0) {
    return "sem tarefas";
  }

  if (total === 1) {
    return "1 tarefa";
  }

  return `${total} tarefas`;
}

function PontoDeHabito({ estado }: { estado: EstadoDoHabito }) {
  if (estado === "feito") {
    return <span className="block size-2.5 rounded-full bg-verde" />;
  }

  if (estado === "falhou") {
    return <span className="block size-2.5 rounded-full border border-[#d2d4ce]" />;
  }

  return <span className="block size-2.5 rounded-full border border-[#ebebe6]" />;
}
