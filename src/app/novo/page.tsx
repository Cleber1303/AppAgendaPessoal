"use client";

// Criar item.
//
// Esta tela É o modelo de dados em forma de interface: o tipo da tarefa
// não é um campo que você escolhe, é o resultado de ter ou não dia e hora.
// O quadro verde embaixo mostra em tempo real o que vai ser criado.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { criarEvento, criarHabito, criarTarefa } from "@/lib/dados";
import { dataCompleta, hoje } from "@/lib/datas";

type Aba = "tarefa" | "evento" | "habito";

const nomesDosDias = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export default function TelaNovo() {
  const navegador = useRouter();

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
          // Regra no padrão iCalendar. O dia da semana sai da data escolhida.
          rrule: repeteSemanalmente ? `FREQ=WEEKLY;BYDAY=${siglaDoDia(diaDoEvento)}` : null,
        });
      } else {
        await criarHabito({
          nome: titulo.trim(),
          metaPorSemana: modoDoHabito === "meta" ? meta : null,
          diasDaSemana: modoDoHabito === "dias" ? diasFixos : [],
        });
      }

      navegador.push(aba === "habito" ? "/habitos" : "/");
    } catch (falha: unknown) {
      setErro(falha instanceof Error ? falha.message : "não foi possível salvar");
      setSalvando(false);
    }
  }

  const resultado = descrever(aba, temDia, temHora, dia, hora, repeteSemanalmente);

  return (
    <div className="flex min-h-dvh flex-col bg-papel">
      <header className="flex items-center justify-between border-b border-borda px-4 py-3">
        <Link
          href="/"
          className="flex min-h-11 items-center px-1 text-[14.5px] text-tinta-fraca no-underline"
        >
          Cancelar
        </Link>
        <span className="text-[15px] font-semibold">Novo item</span>
        <button
          type="button"
          onClick={criar}
          disabled={salvando}
          className="min-h-11 rounded-[9px] border-0 bg-verde px-3.5 text-[14.5px] font-semibold text-white disabled:opacity-60"
        >
          Criar
        </button>
      </header>

      <main className="flex-1 px-5 pt-4">
        <label
          htmlFor="titulo"
          className="block font-mono text-[10px] tracking-[0.14em] text-tinta-fraca uppercase"
        >
          {aba === "habito" ? "Nome" : "Título"}
        </label>
        <input
          id="titulo"
          type="text"
          value={titulo}
          onChange={(evento) => setTitulo(evento.target.value)}
          placeholder={aba === "habito" ? "Academia" : "O que você quer anotar?"}
          className="mt-1.5 min-h-12 w-full rounded-[10px] border border-[#d7d8d2] bg-papel px-3 text-base"
        />

        <div className="mt-4 flex gap-1 rounded-[10px] bg-[#f0f0ec] p-[3px]">
          <Aba ativa={aba === "tarefa"} aoClicar={() => setAba("tarefa")}>
            Tarefa
          </Aba>
          <Aba ativa={aba === "evento"} aoClicar={() => setAba("evento")}>
            Evento
          </Aba>
          <Aba ativa={aba === "habito"} aoClicar={() => setAba("habito")}>
            Hábito
          </Aba>
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

            {temDia && (
              <CampoDeData rotulo="Data" valor={dia} aoMudar={setDia} />
            )}
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
              <label htmlFor="local" className="flex-1 text-[15px] text-tinta-fraca">
                Local
              </label>
              <input
                id="local"
                type="text"
                value={local}
                onChange={(evento) => setLocal(evento.target.value)}
                placeholder="opcional"
                className="w-40 rounded-lg bg-[#f0f0ec] px-2.5 py-2 text-right text-sm"
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
              <Aba ativa={modoDoHabito === "meta"} aoClicar={() => setModoDoHabito("meta")}>
                Meta semanal
              </Aba>
              <Aba ativa={modoDoHabito === "dias"} aoClicar={() => setModoDoHabito("dias")}>
                Dias fixos
              </Aba>
            </div>

            {modoDoHabito === "meta" ? (
              <div className="flex min-h-14 items-center gap-3 border-b border-borda-leve">
                <label htmlFor="meta" className="flex-1 text-[15px] text-tinta-fraca">
                  Vezes por semana
                </label>
                <input
                  id="meta"
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
                      className={`min-h-11 flex-1 rounded-lg font-mono text-[11px] ${
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

        <div className="mt-5 mb-6 rounded-xl bg-verde-claro px-4 py-3.5">
          <div className="font-mono text-[9.5px] tracking-[0.14em] text-verde uppercase">
            Resulta em
          </div>
          <div className="mt-1.5 text-[17px] font-semibold text-verde-escuro">
            {resultado.tipo}
          </div>
          <p className="mt-1.5 mb-0 text-[13px] leading-relaxed text-[#3A4A44]">
            {resultado.texto}
          </p>
        </div>
      </main>
    </div>
  );
}

/** O texto do quadro verde. A regra do modelo, escrita em português. */
function descrever(
  aba: Aba,
  temDia: boolean,
  temHora: boolean,
  dia: string,
  hora: string,
  repete: boolean,
): { tipo: string; texto: string } {
  if (aba === "evento") {
    if (repete) {
      return {
        tipo: "Evento recorrente",
        texto:
          "Ocupa horário e conflita com outros. A recorrência vira uma regra; mover uma semana específica cria uma exceção, não quebra a série.",
      };
    }

    return {
      tipo: "Evento único",
      texto: "Ocupa horário na linha do tempo e pode conflitar com outro evento.",
    };
  }

  if (aba === "habito") {
    return {
      tipo: "Hábito",
      texto:
        "Nunca fica pendente nem atrasado. Dia sem marcação simplesmente não gera registro — a meta é referência, não cobrança.",
    };
  }

  if (!temDia) {
    return {
      tipo: "Tarefa flutuante",
      texto:
        "Vai para a pilha. Não aparece em nenhum dia, nunca fica atrasada — você puxa quando decidir fazer.",
    };
  }

  if (!temHora) {
    return {
      tipo: "Tarefa do dia",
      texto: `Aparece na lista de ${dataCompleta(dia)} sem ocupar horário. Não conflita com nada na linha do tempo.`,
    };
  }

  return {
    tipo: "Tarefa ancorada",
    texto: `Entra na linha do tempo às ${hora}, junto dos eventos, mas continua sendo tarefa: tem caixa para marcar.`,
  };
}

/** "TU" — a sigla que a regra de recorrência usa. */
function siglaDoDia(dia: string): string {
  const siglas = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

  return siglas[new Date(`${dia}T00:00:00.000Z`).getUTCDay()];
}

function nomeLongoDoDia(dia: string): string {
  const nomes = [
    "domingo",
    "segunda",
    "terça",
    "quarta",
    "quinta",
    "sexta",
    "sábado",
  ];

  return nomes[new Date(`${dia}T00:00:00.000Z`).getUTCDay()];
}

function Aba({
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
      className={`min-h-10 flex-1 rounded-lg text-[13.5px] ${
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
        className={`flex h-8 w-13 shrink-0 items-center rounded-full border-0 p-[3px] disabled:cursor-not-allowed disabled:opacity-40 ${
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
  const identificador = `campo-${rotulo.toLowerCase()}`;

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
  const identificador = `campo-${rotulo.toLowerCase()}`;

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
