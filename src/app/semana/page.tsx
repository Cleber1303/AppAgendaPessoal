"use client";

// A visão da semana.
//
// Cada dia é uma caixa fechada que mostra só o resumo. Tocar abre o dia
// inteiro — eventos e tarefas, com e sem horário. Sete dias abertos
// de uma vez não cabem na tela do celular, e o que você quer de relance é
// "onde tem coisa", não o conteúdo de tudo.
//
// Hoje já começa aberto: é o dia que você veio ver.

import { useState } from "react";
import { CaixaDeMarcar } from "@/components/CaixaDeMarcar";
import { usarEdicao } from "@/components/Edicao";
import { Carregando, Falhou } from "@/components/Avisos";
import { carregarSemana, concluirTarefa, reabrirTarefa } from "@/lib/dados";
import {
  hoje,
  mesEAno,
  numeroDoDia,
  rotuloCurto,
  semanaDe,
  somarDias,
  type DiaTexto,
} from "@/lib/datas";
import type { DiaDaSemana, Tarefa } from "@/lib/tipos";
import { usarDados } from "@/lib/usarDados";

export default function TelaSemana() {
  const [referencia, setReferencia] = useState<DiaTexto>(hoje());
  const [abertos, setAbertos] = useState<Set<DiaTexto>>(new Set([hoje()]));

  const { dados, carregando, erro, recarregar, definirDados } = usarDados(
    () => carregarSemana(referencia),
    [referencia],
  );

  const dias = semanaDe(referencia);
  const intervalo = `${Number(numeroDoDia(dias[0]))} – ${Number(numeroDoDia(dias[6]))}`;

  function alternarAbertura(dia: DiaTexto) {
    setAbertos((anteriores) => {
      const proximos = new Set(anteriores);

      if (proximos.has(dia)) {
        proximos.delete(dia);
      } else {
        proximos.add(dia);
      }

      return proximos;
    });
  }

  function alternarTarefa(id: string, feita: boolean) {
    const marca = feita ? new Date().toISOString() : null;

    definirDados((anterior) =>
      anterior === null
        ? anterior
        : anterior.map((faixa) => ({
            ...faixa,
            tarefas: faixa.tarefas.map((tarefa) =>
              tarefa.id === id ? { ...tarefa, concluidaEm: marca } : tarefa,
            ),
          })),
    );

    const requisicao = feita ? concluirTarefa(id) : reabrirTarefa(id);

    requisicao.catch(() => {
      recarregar();
    });
  }

  function irParaSemana(deslocamento: number) {
    const nova = somarDias(referencia, deslocamento);

    setReferencia(nova);

    // Ao mudar de semana, abre o primeiro dia que tem alguma coisa — ou
    // hoje, se ele estiver nessa semana. Sete caixas fechadas e nenhuma
    // pista do que tem dentro seria pior que o que havia antes.
    setAbertos(new Set(semanaDe(nova).includes(hoje()) ? [hoje()] : []));
  }

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
            onClick={() => irParaSemana(-7)}
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
            onClick={() => irParaSemana(7)}
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
          className={`px-4 pt-2 pb-6 transition-opacity duration-200 ${
            carregando ? "pointer-events-none opacity-40" : "opacity-100"
          }`}
        >
          {dados.map((faixa, posicao) => (
            <CaixaDoDia
              key={faixa.dia}
              faixa={faixa}
              posicao={posicao}
              aberta={abertos.has(faixa.dia)}
              aoAlternarAbertura={() => alternarAbertura(faixa.dia)}
              aoAlternarTarefa={alternarTarefa}
            />
          ))}
        </main>
      )}
    </>
  );
}

function CaixaDoDia({
  faixa,
  posicao,
  aberta,
  aoAlternarAbertura,
  aoAlternarTarefa,
}: {
  faixa: DiaDaSemana;
  posicao: number;
  aberta: boolean;
  aoAlternarAbertura: () => void;
  aoAlternarTarefa: (id: string, feita: boolean) => void;
}) {
  const { abrirEvento } = usarEdicao();
  const ehHoje = faixa.dia === hoje();
  const pendentes = faixa.tarefas.filter((tarefa) => tarefa.concluidaEm === null).length;
  const vazio = faixa.eventos.length === 0 && faixa.tarefas.length === 0;

  const ancoradas = faixa.tarefas.filter((tarefa) => tarefa.hora !== null);
  const semHora = faixa.tarefas.filter((tarefa) => tarefa.hora === null);

  return (
    <div
      style={{ animationDelay: `${posicao * 24}ms` }}
      className={`entra mb-1.5 overflow-hidden rounded-xl border transition-colors duration-200 ${
        ehHoje ? "border-verde bg-verde-claro" : "border-borda bg-papel"
      }`}
    >
      <button
        type="button"
        onClick={aoAlternarAbertura}
        aria-expanded={aberta}
        className="flex w-full items-center gap-3 border-0 bg-transparent px-3 py-2.5 text-left"
      >
        <div className="w-9 shrink-0 text-center">
          <div className="font-mono text-[9px] tracking-[0.06em] text-tinta-fraca uppercase">
            {rotuloCurto(faixa.dia)}
          </div>
          <div className={`mt-px font-mono text-[17px] ${ehHoje ? "text-verde" : "text-tinta"}`}>
            {numeroDoDia(faixa.dia)}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] text-tinta">{resumo(faixa, pendentes)}</div>
        </div>

        <span
          className={`shrink-0 text-tinta-apagada transition-transform duration-200 ease-out ${
            aberta ? "rotate-90" : ""
          }`}
          aria-hidden="true"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </span>
      </button>

      {aberta && (
        <div className="entra border-t border-borda-leve px-3 pt-2.5 pb-3">
          {vazio && <p className="m-0 text-[13px] text-tinta-apagada">Nada neste dia.</p>}

          {faixa.eventos.map((evento) => (
            <button
              key={evento.id}
              type="button"
              onClick={() => abrirEvento(evento.serieId, evento.dia)}
              className="mb-1.5 flex w-full items-center gap-2.5 rounded-lg border border-borda bg-papel px-2.5 py-1.5 text-left text-tinta transition-transform duration-150 active:scale-[0.99]"
            >
              <span className="shrink-0 font-mono text-[11px] text-tinta-fraca">
                {evento.horaInicio}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px]">{evento.titulo}</span>
            </button>
          ))}

          {ancoradas.map((tarefa) => (
            <LinhaDeTarefa key={tarefa.id} tarefa={tarefa} aoAlternar={aoAlternarTarefa} />
          ))}

          {semHora.length > 0 && (
            <>
              {(faixa.eventos.length > 0 || ancoradas.length > 0) && (
                <div className="mt-2.5 mb-1 font-mono text-[9px] tracking-[0.14em] text-tinta-apagada uppercase">
                  Dia todo
                </div>
              )}
              {semHora.map((tarefa) => (
                <LinhaDeTarefa key={tarefa.id} tarefa={tarefa} aoAlternar={aoAlternarTarefa} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** A linha única que aparece com o dia fechado. */
function resumo(faixa: DiaDaSemana, pendentes: number): string {
  const partes: string[] = [];

  if (faixa.eventos.length === 1) {
    partes.push("1 evento");
  } else if (faixa.eventos.length > 1) {
    partes.push(`${faixa.eventos.length} eventos`);
  }

  if (pendentes === 1) {
    partes.push("1 tarefa");
  } else if (pendentes > 1) {
    partes.push(`${pendentes} tarefas`);
  }

  if (partes.length === 0) {
    const tudoFeito = faixa.tarefas.length > 0;

    return tudoFeito ? "Tudo feito" : "Livre";
  }

  return partes.join(" · ");
}

function LinhaDeTarefa({
  tarefa,
  aoAlternar,
}: {
  tarefa: Tarefa;
  aoAlternar: (id: string, feita: boolean) => void;
}) {
  const { abrirTarefa } = usarEdicao();
  const feita = tarefa.concluidaEm !== null;

  return (
    <div className="flex min-h-10 items-center gap-2.5">
      <CaixaDeMarcar
        marcada={feita}
        rotulo={tarefa.titulo}
        aoAlternar={() => aoAlternar(tarefa.id, !feita)}
      />

      {tarefa.hora !== null && (
        <span className="shrink-0 font-mono text-[11px] text-tinta-fraca">{tarefa.hora}</span>
      )}

      <button
        type="button"
        onClick={() => abrirTarefa(tarefa.id)}
        className={`min-w-0 flex-1 truncate border-0 bg-transparent text-left text-[13.5px] transition-colors duration-200 ${
          feita ? "text-tinta-apagada line-through" : "text-tinta"
        }`}
      >
        {tarefa.titulo}
      </button>
    </div>
  );
}

