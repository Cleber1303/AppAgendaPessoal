"use client";

// O botão "+" e o pop-up de criar item.
//
// Mora no layout, então existe em qualquer tela — criar uma tarefa não
// deveria te tirar de onde você está.
//
// É um <dialog> de verdade, não uma div com position: fixed. O elemento
// nativo entrega Esc para fechar, travamento de foco dentro do pop-up e
// o resto da página inerte para leitores de tela. Refazer isso à mão dá
// muito trabalho e sai pior.

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { avisarAtualizacao } from "@/lib/atualizacao";
import { criarEvento, criarHabito, criarTarefa } from "@/lib/dados";
import { hoje } from "@/lib/datas";

type Aba = "tarefa" | "evento" | "habito";

const nomesDosDias = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export function NovoItem() {
  const caminho = usePathname();
  const dialogo = useRef<HTMLDialogElement>(null);
  const [fechando, setFechando] = useState(false);

  const [aba, setAba] = useState<Aba>("tarefa");
  const [titulo, setTitulo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Tarefa
  const [temDia, setTemDia] = useState(true);
  const [temHora, setTemHora] = useState(false);
  const [dia, setDia] = useState(hoje());
  const [hora, setHora] = useState("14:00");

  // Evento
  const [diaDoEvento, setDiaDoEvento] = useState(hoje());
  const [horaInicio, setHoraInicio] = useState("14:00");
  const [horaFim, setHoraFim] = useState("15:30");
  const [local, setLocal] = useState("");
  const [repeteSemanalmente, setRepeteSemanalmente] = useState(false);

  // Hábito
  const [modoDoHabito, setModoDoHabito] = useState<"meta" | "dias">("meta");
  const [meta, setMeta] = useState(4);
  const [diasFixos, setDiasFixos] = useState<number[]>([]);

  // A tela de detalhe da tarefa já é um formulário; um "+" flutuando por
  // cima dela só atrapalha.
  const escondido = caminho.startsWith("/tarefa");

  useEffect(() => {
    const elemento = dialogo.current;

    if (elemento === null) {
      return;
    }

    // O botão de voltar do celular fecha o <dialog> sem passar pelo nosso
    // fechar(), então o estado de animação precisa ser zerado aqui.
    function aoFechar() {
      setFechando(false);
    }

    elemento.addEventListener("close", aoFechar);

    return () => {
      elemento.removeEventListener("close", aoFechar);
    };
  }, []);

  function abrir() {
    limpar();
    dialogo.current?.showModal();
  }

  function fechar() {
    setFechando(true);

    // Espera a animação de saída antes de tirar o elemento da tela.
    window.setTimeout(() => {
      dialogo.current?.close();
      setFechando(false);
    }, 150);
  }

  function limpar() {
    setAba("tarefa");
    setTitulo("");
    setErro(null);
    setTemDia(true);
    setTemHora(false);
    setDia(hoje());
    setHora("14:00");
    setDiaDoEvento(hoje());
    setHoraInicio("14:00");
    setHoraFim("15:30");
    setLocal("");
    setRepeteSemanalmente(false);
    setModoDoHabito("meta");
    setMeta(4);
    setDiasFixos([]);
  }

  function alternarDia() {
    const novoValor = !temDia;

    setTemDia(novoValor);

    // Hora sem dia não existe no modelo: desligar o dia desliga a hora.
    if (!novoValor) {
      setTemHora(false);
    }
  }

  function alternarDiaFixo(indice: number) {
    setDiasFixos((anteriores) =>
      anteriores.includes(indice)
        ? anteriores.filter((cada) => cada !== indice)
        : [...anteriores, indice].sort(),
    );
  }

  async function criar() {
    if (titulo.trim() === "") {
      setErro(aba === "habito" ? "Dê um nome ao hábito." : "Escreva um título.");

      return;
    }

    if (aba === "habito" && modoDoHabito === "dias" && diasFixos.length === 0) {
      setErro("Escolha pelo menos um dia.");

      return;
    }

    setSalvando(true);
    setErro(null);

    try {
      if (aba === "tarefa") {
        await criarTarefa({
          titulo: titulo.trim(),
          data: temDia ? dia : null,
          hora: temDia && temHora ? hora : null,
        });
      } else if (aba === "evento") {
        await criarEvento({
          titulo: titulo.trim(),
          dia: diaDoEvento,
          horaInicio,
          horaFim,
          local: local.trim() === "" ? null : local.trim(),
          rrule: repeteSemanalmente ? `FREQ=WEEKLY;BYDAY=${siglaDoDia(diaDoEvento)}` : null,
        });
      } else {
        await criarHabito({
          nome: titulo.trim(),
          metaPorSemana: modoDoHabito === "meta" ? meta : null,
          diasDaSemana: modoDoHabito === "dias" ? diasFixos : [],
        });
      }

      avisarAtualizacao();
      setSalvando(false);
      fechar();
    } catch (falha: unknown) {
      setErro(falha instanceof Error ? falha.message : "não foi possível salvar");
      setSalvando(false);
    }
  }

  if (escondido) {
    return null;
  }

  return (
    <>
      <div className="pointer-events-none fixed bottom-24 left-1/2 flex w-full max-w-md -translate-x-1/2 justify-end pr-5">
        <button
          type="button"
          onClick={abrir}
          aria-label="Novo item"
          className="pointer-events-auto flex size-14 items-center justify-center rounded-full border-0 bg-verde text-white shadow-[0_5px_14px_rgba(20,22,25,0.2)] transition-transform duration-150 active:scale-90"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      <dialog
        ref={dialogo}
        aria-label="Novo item"
        onClick={(evento) => {
          // Clique no próprio <dialog> é clique no fundo: o conteúdo está
          // numa div interna, então o alvo só é o dialog fora dela.
          if (evento.target === dialogo.current) {
            fechar();
          }
        }}
        onCancel={(evento) => {
          // Esc: impede o fechamento imediato para a animação acontecer.
          evento.preventDefault();
          fechar();
        }}
        className={`pop-up ${fechando ? "saindo" : ""}`}
      >
        <div className="pop-up-cartao flex max-h-full w-[min(92vw,26rem)] flex-col overflow-hidden rounded-2xl bg-papel shadow-[0_20px_60px_rgba(20,22,25,0.28)]">
          <header className="flex shrink-0 items-center justify-between border-b border-borda px-4 py-3">
            <button
              type="button"
              onClick={fechar}
              className="flex min-h-11 items-center border-0 bg-transparent px-1 text-[14.5px] text-tinta-fraca"
            >
              Cancelar
            </button>
            <span className="text-[15px] font-semibold">Novo item</span>
            <button
              type="button"
              onClick={criar}
              disabled={salvando}
              className="min-h-11 rounded-[9px] border-0 bg-verde px-3.5 text-[14.5px] font-semibold text-white transition-transform duration-150 active:scale-95 disabled:opacity-60"
            >
              Criar
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-5">
            <label
              htmlFor="titulo-novo"
              className="block font-mono text-[10px] tracking-[0.14em] text-tinta-fraca uppercase"
            >
              {aba === "habito" ? "Nome" : "Título"}
            </label>
            <input
              id="titulo-novo"
              type="text"
              value={titulo}
              onChange={(evento) => setTitulo(evento.target.value)}
              placeholder={aba === "habito" ? "Academia" : "O que você quer anotar?"}
              className="mt-1.5 min-h-12 w-full rounded-[10px] border border-[#d7d8d2] bg-papel px-3 text-base"
            />

            <div className="mt-4 flex gap-1 rounded-[10px] bg-[#f0f0ec] p-[3px]">
              <AbaBotao ativa={aba === "tarefa"} aoClicar={() => setAba("tarefa")}>
                Tarefa
              </AbaBotao>
              <AbaBotao ativa={aba === "evento"} aoClicar={() => setAba("evento")}>
                Evento
              </AbaBotao>
              <AbaBotao ativa={aba === "habito"} aoClicar={() => setAba("habito")}>
                Hábito
              </AbaBotao>
            </div>

            {aba === "tarefa" && (
              <>
                <Interruptor
                  titulo="Tem dia"
                  auxiliar="Sem dia, vai para a pilha"
                  ligado={temDia}
                  aoAlternar={alternarDia}
                />
                <Interruptor
                  titulo="Tem hora"
                  auxiliar={temDia ? "Ancora na linha do tempo" : "Precisa de um dia antes"}
                  ligado={temHora}
                  desabilitado={!temDia}
                  aoAlternar={() => setTemHora(!temHora)}
                />

                {temDia && <CampoDeData rotulo="Data" valor={dia} aoMudar={setDia} />}
                {temDia && temHora && (
                  <CampoDeHora rotulo="Hora" valor={hora} aoMudar={setHora} />
                )}
              </>
            )}

            {aba === "evento" && (
              <>
                <CampoDeData rotulo="Dia" valor={diaDoEvento} aoMudar={setDiaDoEvento} />
                <CampoDeHora rotulo="Início" valor={horaInicio} aoMudar={setHoraInicio} />
                <CampoDeHora rotulo="Fim" valor={horaFim} aoMudar={setHoraFim} />

                <div className="flex min-h-14 items-center gap-3 border-b border-borda-leve">
                  <label htmlFor="local-novo" className="flex-1 text-[15px] text-tinta-fraca">
                    Local
                  </label>
                  <input
                    id="local-novo"
                    type="text"
                    value={local}
                    onChange={(evento) => setLocal(evento.target.value)}
                    placeholder="opcional"
                    className="w-36 rounded-lg bg-[#f0f0ec] px-2.5 py-2 text-right text-sm"
                  />
                </div>

                <Interruptor
                  titulo="Repete toda semana"
                  auxiliar={`Toda ${nomeLongoDoDia(diaDoEvento)}`}
                  ligado={repeteSemanalmente}
                  aoAlternar={() => setRepeteSemanalmente(!repeteSemanalmente)}
                />
              </>
            )}

            {aba === "habito" && (
              <>
                <div className="mt-3 flex gap-1 rounded-lg bg-[#f0f0ec] p-[3px]">
                  <AbaBotao
                    ativa={modoDoHabito === "meta"}
                    aoClicar={() => setModoDoHabito("meta")}
                  >
                    Meta semanal
                  </AbaBotao>
                  <AbaBotao
                    ativa={modoDoHabito === "dias"}
                    aoClicar={() => setModoDoHabito("dias")}
                  >
                    Dias fixos
                  </AbaBotao>
                </div>

                {modoDoHabito === "meta" ? (
                  <div className="flex min-h-14 items-center gap-3 border-b border-borda-leve">
                    <label htmlFor="meta-nova" className="flex-1 text-[15px] text-tinta-fraca">
                      Vezes por semana
                    </label>
                    <input
                      id="meta-nova"
                      type="number"
                      min={1}
                      max={7}
                      value={meta}
                      onChange={(evento) => setMeta(Number(evento.target.value))}
                      className="w-16 rounded-lg bg-[#f0f0ec] px-2 py-2 text-center font-mono text-sm"
                    />
                  </div>
                ) : (
                  <div className="mt-3 flex gap-1">
                    {nomesDosDias.map((nome, indice) => {
                      const marcado = diasFixos.includes(indice);

                      return (
                        <button
                          key={nome}
                          type="button"
                          onClick={() => alternarDiaFixo(indice)}
                          aria-pressed={marcado}
                          className={`min-h-11 flex-1 rounded-lg font-mono text-[11px] transition-colors duration-200 active:scale-95 ${
                            marcado
                              ? "border border-verde bg-verde-claro font-medium text-verde-escuro"
                              : "border border-borda bg-papel text-tinta-fraca"
                          }`}
                        >
                          {nome}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {erro !== null && (
              <p className="mt-3 mb-0 rounded-lg bg-ambar-claro px-3 py-2 text-[13px] text-ambar">
                {erro}
              </p>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}

/** "TU" — a sigla que a regra de recorrência usa. */
function siglaDoDia(dia: string): string {
  const siglas = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

  return siglas[new Date(`${dia}T00:00:00.000Z`).getUTCDay()];
}

function nomeLongoDoDia(dia: string): string {
  const nomes = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

  return nomes[new Date(`${dia}T00:00:00.000Z`).getUTCDay()];
}

function AbaBotao({
  ativa,
  aoClicar,
  children,
}: {
  ativa: boolean;
  aoClicar: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      aria-pressed={ativa}
      className={`min-h-10 flex-1 rounded-lg text-[13.5px] transition-colors duration-200 ${
        ativa
          ? "border border-[#d7d8d2] bg-papel font-semibold text-tinta"
          : "border border-transparent bg-transparent text-tinta-fraca"
      }`}
    >
      {children}
    </button>
  );
}

function Interruptor({
  titulo,
  auxiliar,
  ligado,
  desabilitado = false,
  aoAlternar,
}: {
  titulo: string;
  auxiliar: string;
  ligado: boolean;
  desabilitado?: boolean;
  aoAlternar: () => void;
}) {
  return (
    <div className="flex min-h-14 items-center gap-3 border-b border-borda-leve">
      <div className="min-w-0 flex-1">
        <div className={`text-[15px] ${desabilitado ? "text-tinta-apagada" : "text-tinta"}`}>
          {titulo}
        </div>
        <div className="mt-px text-xs text-tinta-fraca">{auxiliar}</div>
      </div>
      <button
        type="button"
        onClick={aoAlternar}
        disabled={desabilitado}
        aria-pressed={ligado}
        aria-label={titulo}
        className={`flex h-8 w-13 shrink-0 items-center rounded-full border-0 p-[3px] transition-colors duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-40 ${
          ligado ? "justify-end bg-verde" : "justify-start bg-[#d7d8d2]"
        }`}
      >
        <span className="block size-6.5 rounded-full bg-white shadow-[0_1px_3px_rgba(20,22,25,0.25)]" />
      </button>
    </div>
  );
}

function CampoDeData({
  rotulo,
  valor,
  aoMudar,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
}) {
  const identificador = `campo-novo-${rotulo.toLowerCase()}`;

  return (
    <div className="flex min-h-14 items-center gap-3 border-b border-borda-leve">
      <label htmlFor={identificador} className="flex-1 text-[15px] text-tinta-fraca">
        {rotulo}
      </label>
      <input
        id={identificador}
        type="date"
        value={valor}
        onChange={(evento) => aoMudar(evento.target.value)}
        className="rounded-lg bg-[#f0f0ec] px-2.5 py-2 font-mono text-sm"
      />
    </div>
  );
}

function CampoDeHora({
  rotulo,
  valor,
  aoMudar,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
}) {
  const identificador = `campo-novo-${rotulo.toLowerCase()}`;

  return (
    <div className="flex min-h-14 items-center gap-3 border-b border-borda-leve">
      <label htmlFor={identificador} className="flex-1 text-[15px] text-tinta-fraca">
        {rotulo}
      </label>
      <input
        id={identificador}
        type="time"
        value={valor}
        onChange={(evento) => aoMudar(evento.target.value)}
        className="rounded-lg bg-[#f0f0ec] px-2.5 py-2 font-mono text-sm"
      />
    </div>
  );
}
