"use client";

// A tela "Hoje": o que você abre de manhã e revisa à noite.
//
// Apesar do nome, ela mostra qualquer dia da semana corrente — tocar num
// número da tira de cima troca o dia, e a estrutura é a mesma. É também
// por aqui que se marca um hábito que você esqueceu ontem.

import Link from "next/link";
import { useEffect, useState } from "react";
import { Carregando, Falhou, IconeHistorico, IconeMais } from "@/components/Avisos";
import {
  alternarHabito,
  carregarDia,
  concluirTarefa,
  reabrirTarefa,
  rodarManutencao,
} from "@/lib/dados";
import {
  diaEMes,
  hoje,
  numeroDoDia,
  rotuloCurto,
  rotuloLongo,
  semanaDe,
  type DiaTexto,
} from "@/lib/datas";
import type { EstadoDoHabito, HabitoNoDia, Tarefa } from "@/lib/tipos";
import { usarDados } from "@/lib/usarDados";

export default function TelaHoje() {
  const [diaSelecionado, setDiaSelecionado] = useState<DiaTexto>(hoje());
  const { dados, carregando, erro, recarregar } = usarDados(
    () => carregarDia(diaSelecionado),
    [diaSelecionado],
  );

  // A faxina das atrasadas vencidas roda na abertura. É por isso que o app
  // não precisa de um relógio no servidor para essa regra funcionar.
  useEffect(() => {
    rodarManutencao().catch(() => {
      // Falhar aqui não atrapalha a tela: na próxima abertura tenta de novo.
    });
  }, []);

  const ehHoje = diaSelecionado === hoje();

  // Dia no futuro não se marca: o dia ainda não aconteceu.
  const podeMarcarHabito = diaSelecionado <= hoje();

  return (
    <>
      <header className="border-b border-borda bg-papel px-5 pt-4 pb-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <div className="font-mono text-[11px] tracking-[0.1em] text-tinta-fraca uppercase">
              {rotuloLongo(diaSelecionado)}
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              {diaEMes(diaSelecionado)}
            </h1>
          </div>

          <div className="-mt-1 -mr-2 flex shrink-0 items-center">
            {!ehHoje && (
              <button
                type="button"
                onClick={() => setDiaSelecionado(hoje())}
                className="min-h-11 rounded-lg border border-borda bg-papel px-3 text-[13px] font-medium text-verde"
              >
                Hoje
              </button>
            )}
            <Link
              href="/historico"
              aria-label="Histórico"
              className="flex size-11 items-center justify-center text-tinta-apagada no-underline"
            >
              <IconeHistorico />
            </Link>
          </div>
        </div>

        <TiraDaSemana
          diaSelecionado={diaSelecionado}
          aoEscolher={setDiaSelecionado}
        />
      </header>

      {carregando && dados === null && <Carregando />}
      {erro !== null && dados === null && <Falhou mensagem={erro} aoTentarDeNovo={recarregar} />}

      {dados !== null && (
        <main className="px-5">
          {(dados.eventos.length > 0 || dados.ancoradas.length > 0) && (
            <>
              <Secao>Agenda</Secao>
              {dados.eventos.map((evento) => (
                <div key={evento.id} className="flex gap-2.5">
                  <div className="w-11 shrink-0 pt-px text-right">
                    <div className="font-mono text-xs">{evento.horaInicio}</div>
                    <div className="font-mono text-[10px] text-tinta-fraca">
                      {evento.duracao}
                    </div>
                  </div>
                  <div className="flex w-3 shrink-0 flex-col items-center pt-1.5">
                    <div className="size-2.5 shrink-0 rounded-full bg-verde" />
                    <div className="mt-1 w-px flex-1 bg-borda" />
                  </div>
                  <div className="mb-2 flex-1 rounded-[10px] border border-borda bg-papel px-3 py-2">
                    <div className="text-sm font-medium">{evento.titulo}</div>
                    {evento.local !== null && (
                      <div className="mt-px text-xs text-tinta-fraca">{evento.local}</div>
                    )}
                  </div>
                </div>
              ))}

              {dados.ancoradas.map((tarefa) => (
                <TarefaAncorada key={tarefa.id} tarefa={tarefa} aoMudar={recarregar} />
              ))}
            </>
          )}

          {dados.doDia.length > 0 && (
            <>
              <Secao>Dia todo</Secao>
              {dados.doDia.map((tarefa) => (
                <LinhaDeTarefa key={tarefa.id} tarefa={tarefa} aoMudar={recarregar} />
              ))}
            </>
          )}

          {dados.habitos.length > 0 && (
            <>
              <Secao>Hábitos</Secao>
              {dados.habitos.map((habito) => (
                <LinhaDeHabito
                  key={habito.id}
                  habito={habito}
                  diaSelecionado={diaSelecionado}
                  podeMarcar={podeMarcarHabito}
                  aoMudar={recarregar}
                />
              ))}
            </>
          )}

          {dados.eventos.length === 0 &&
            dados.ancoradas.length === 0 &&
            dados.doDia.length === 0 &&
            dados.habitos.length === 0 && (
              <p className="mt-10 mb-6 text-center text-sm text-tinta-apagada">
                {ehHoje ? "Nada marcado para hoje." : "Nada marcado para este dia."}
              </p>
            )}

          <div className="h-6" />
        </main>
      )}

      <BotaoNovo />
    </>
  );
}

function Secao({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 mb-2 font-mono text-[10px] tracking-[0.14em] text-tinta-fraca uppercase">
      {children}
    </div>
  );
}

/**
 * A tira dos sete dias.
 *
 * O dia escolhido fica verde; hoje, quando não é o escolhido, fica só
 * marcado em verde no texto — você precisa saber onde está sem confundir
 * com o que está vendo.
 */
function TiraDaSemana({
  diaSelecionado,
  aoEscolher,
}: {
  diaSelecionado: DiaTexto;
  aoEscolher: (dia: DiaTexto) => void;
}) {
  return (
    <div className="mt-3.5 flex gap-1">
      {semanaDe(diaSelecionado).map((dia) => {
        const escolhido = dia === diaSelecionado;
        const ehHoje = dia === hoje();

        let corDoRotulo = "text-tinta-fraca";
        let corDoNumero = "text-tinta";

        if (escolhido) {
          corDoRotulo = "text-verde-claro";
          corDoNumero = "font-medium text-white";
        } else if (ehHoje) {
          corDoNumero = "font-semibold text-verde";
        }

        return (
          <button
            key={dia}
            type="button"
            onClick={() => aoEscolher(dia)}
            aria-pressed={escolhido}
            aria-label={`${rotuloCurto(dia)} ${numeroDoDia(dia)}`}
            className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-[9px] border-0 py-1.5 ${
              escolhido ? "bg-verde" : "bg-transparent"
            }`}
          >
            <span
              className={`font-mono text-[9px] tracking-[0.06em] uppercase ${corDoRotulo}`}
            >
              {rotuloCurto(dia)}
            </span>
            <span className={`font-mono text-sm ${corDoNumero}`}>{numeroDoDia(dia)}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Tarefa com hora: divide a linha do tempo com os eventos, mas não é um. */
function TarefaAncorada({ tarefa, aoMudar }: { tarefa: Tarefa; aoMudar: () => void }) {
  const [salvando, setSalvando] = useState(false);
  const feita = tarefa.concluidaEm !== null;

  async function alternar() {
    setSalvando(true);

    try {
      if (feita) {
        await reabrirTarefa(tarefa.id);
      } else {
        await concluirTarefa(tarefa.id);
      }

      aoMudar();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex gap-2.5">
      <div className="w-11 shrink-0 pt-px text-right">
        <div className="font-mono text-xs">{tarefa.hora}</div>
      </div>
      <div className="flex w-3 shrink-0 flex-col items-center pt-1.5">
        <div className="size-2.5 shrink-0 rounded-full border-[1.5px] border-verde bg-fundo" />
      </div>
      <div className="mb-2 flex flex-1 items-center gap-2.5 rounded-[10px] border border-dashed border-[#c9cbc4] bg-papel px-3 py-2">
        <input
          type="checkbox"
          checked={feita}
          disabled={salvando}
          onChange={alternar}
          aria-label={tarefa.titulo}
          className="size-4 shrink-0 accent-verde"
        />
        <Link
          href={`/tarefa/${tarefa.id}`}
          className={`flex-1 truncate text-sm no-underline ${
            feita ? "text-tinta-apagada line-through" : "text-tinta"
          }`}
        >
          {tarefa.titulo}
        </Link>
      </div>
    </div>
  );
}

/** Tarefa do dia, sem hora. Fica riscada até o dia virar. */
function LinhaDeTarefa({ tarefa, aoMudar }: { tarefa: Tarefa; aoMudar: () => void }) {
  const [salvando, setSalvando] = useState(false);
  const feita = tarefa.concluidaEm !== null;

  async function alternar() {
    setSalvando(true);

    try {
      if (feita) {
        await reabrirTarefa(tarefa.id);
      } else {
        await concluirTarefa(tarefa.id);
      }

      aoMudar();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex min-h-11 items-center gap-3 border-b border-borda-leve">
      <input
        type="checkbox"
        checked={feita}
        disabled={salvando}
        onChange={alternar}
        aria-label={tarefa.titulo}
        className="size-4 shrink-0 accent-verde"
      />
      <Link
        href={`/tarefa/${tarefa.id}`}
        className={`flex-1 truncate text-[15px] no-underline ${
          feita ? "text-tinta-apagada line-through" : "text-tinta"
        }`}
      >
        {tarefa.titulo}
      </Link>
    </div>
  );
}

/**
 * Hábito em forma de fileira de bolinhas.
 *
 * Sem caixa de "concluído" de propósito: hábito não tem pendência. A
 * bolinha do dia que você está vendo é o único alvo de toque — e é assim
 * que se marca um dia que passou.
 */
function LinhaDeHabito({
  habito,
  diaSelecionado,
  podeMarcar,
  aoMudar,
}: {
  habito: HabitoNoDia;
  diaSelecionado: DiaTexto;
  podeMarcar: boolean;
  aoMudar: () => void;
}) {
  const [salvando, setSalvando] = useState(false);
  const temDiasFixos = habito.diasDaSemana.length > 0;

  async function marcar() {
    setSalvando(true);

    try {
      await alternarHabito(habito.id, diaSelecionado);
      aoMudar();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex min-h-10 items-center gap-2.5">
      <Link
        href={`/habitos/${habito.id}`}
        className="min-w-0 flex-1 text-tinta no-underline"
      >
        <div className="text-sm">{habito.nome}</div>
        {temDiasFixos && (
          <div className="mt-px font-mono text-[10px] text-tinta-apagada">
            {habito.diasDaSemana
              .map((indice) => ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"][indice])
              .join(" · ")}
          </div>
        )}
      </Link>

      <div className="flex shrink-0 gap-1.5">
        {habito.semana.map((entrada) => {
          const eAtual = entrada.dia === diaSelecionado;

          if (eAtual && podeMarcar) {
            return (
              <button
                key={entrada.dia}
                type="button"
                onClick={marcar}
                disabled={salvando}
                aria-label={`Marcar ${habito.nome} em ${entrada.dia}`}
                aria-pressed={entrada.estado === "feito"}
                className={`size-3.5 rounded-full border-2 border-verde ${
                  entrada.estado === "feito" ? "bg-verde" : "bg-transparent"
                }`}
              />
            );
          }

          return <Bolinha key={entrada.dia} estado={entrada.estado} destacada={eAtual} />;
        })}
      </div>

      <span className="w-7 shrink-0 text-right font-mono text-[11px] text-tinta-fraca">
        {habito.feitosNaSemana}/{habito.alvoNaSemana}
      </span>
    </div>
  );
}

function Bolinha({ estado, destacada }: { estado: EstadoDoHabito; destacada: boolean }) {
  if (estado === "feito") {
    return (
      <span
        className={`block size-3.5 rounded-full bg-verde ${
          destacada ? "ring-2 ring-verde ring-offset-1" : ""
        }`}
      />
    );
  }

  if (estado === "falhou") {
    return <span className="block size-3.5 rounded-full border-[1.5px] border-[#d2d4ce]" />;
  }

  // "nao-era-dia" e "futuro" ficam quase invisíveis: não são cobrança.
  return <span className="block size-3.5 rounded-full border border-[#ebebe6]" />;
}

function BotaoNovo() {
  return (
    <Link
      href="/novo"
      aria-label="Novo item"
      className="pointer-events-none fixed bottom-24 left-1/2 flex w-full max-w-md -translate-x-1/2 justify-end pr-5 no-underline"
    >
      <span className="pointer-events-auto flex size-14 items-center justify-center rounded-full bg-verde text-white shadow-[0_5px_14px_rgba(20,22,25,0.2)]">
        <IconeMais />
      </span>
    </Link>
  );
}