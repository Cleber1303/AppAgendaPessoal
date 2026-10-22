"use client";

// O seletor de repetição do evento.
//
// Fechado, é uma linha só: "Repetição — Não repete". A maior parte dos
// eventos não repete, e quem não vai usar não deveria pagar com espaço de
// tela. Aberto, mostra os três modos e a grade de dias do modo escolhido.

import {
  descreverRepeticao,
  mesesQuePula,
  type Repeticao,
} from "@/lib/repeticao";

const nomesDaSemana = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const diasDoMes = Array.from({ length: 31 }, (_, indice) => indice + 1);

export function SeletorDeRepeticao({
  repeticao,
  diaDoEvento,
  aberto,
  aoAlternarAbertura,
  aoMudar,
}: {
  repeticao: Repeticao;
  /** "AAAA-MM-DD" — usado para pré-marcar o dia do próprio evento. */
  diaDoEvento: string;
  aberto: boolean;
  aoAlternarAbertura: () => void;
  aoMudar: (repeticao: Repeticao) => void;
}) {
  const data = new Date(`${diaDoEvento}T00:00:00.000Z`);
  const diaDaSemanaDoEvento = data.getUTCDay();
  const diaDoMesDoEvento = data.getUTCDate();

  function escolherModo(tipo: Repeticao["tipo"]) {
    if (tipo === "nao") {
      aoMudar({ tipo: "nao" });

      return;
    }

    // Ao entrar num modo, já vem marcado o dia do próprio evento: é o
    // palpite certo quase sempre, e evita abrir numa grade vazia.
    if (tipo === "semanal") {
      aoMudar({ tipo: "semanal", dias: [diaDaSemanaDoEvento] });

      return;
    }

    aoMudar({ tipo: "mensal", dias: [diaDoMesDoEvento] });
  }

  function alternarDia(dia: number) {
    if (repeticao.tipo === "nao") {
      return;
    }

    const marcado = repeticao.dias.includes(dia);
    const dias = marcado
      ? repeticao.dias.filter((cada) => cada !== dia)
      : [...repeticao.dias, dia];

    aoMudar({ ...repeticao, dias: dias.sort((um, outro) => um - outro) });
  }

  const aviso = mesesQuePula(repeticao);

  return (
    <div className="border-b border-borda-leve">
      <button
        type="button"
        onClick={aoAlternarAbertura}
        aria-expanded={aberto}
        className="flex min-h-14 w-full items-center gap-3 border-0 bg-transparent text-left"
      >
        <span className="flex-1 text-[15px] text-tinta-fraca">Repetição</span>
        <span
          className={`text-sm ${
            repeticao.tipo === "nao" ? "text-tinta-apagada" : "text-verde"
          }`}
        >
          {descreverRepeticao(repeticao)}
        </span>
        <span
          className={`shrink-0 text-tinta-apagada transition-transform duration-200 ease-out ${
            aberto ? "rotate-90" : ""
          }`}
          aria-hidden="true"
        >
          <svg
            width="15"
            height="15"
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

      {aberto && (
        <div className="entra pb-3">
          <div className="flex gap-1 rounded-[10px] bg-[#f0f0ec] p-[3px]">
            <BotaoDeModo
              ativo={repeticao.tipo === "nao"}
              aoClicar={() => escolherModo("nao")}
            >
              Não repete
            </BotaoDeModo>
            <BotaoDeModo
              ativo={repeticao.tipo === "semanal"}
              aoClicar={() => escolherModo("semanal")}
            >
              Semanal
            </BotaoDeModo>
            <BotaoDeModo
              ativo={repeticao.tipo === "mensal"}
              aoClicar={() => escolherModo("mensal")}
            >
              Mensal
            </BotaoDeModo>
          </div>

          {repeticao.tipo === "semanal" && (
            <div className="mt-2.5 flex gap-1">
              {nomesDaSemana.map((nome, indice) => (
                <BotaoDeDia
                  key={nome}
                  marcado={repeticao.dias.includes(indice)}
                  aoClicar={() => alternarDia(indice)}
                  rotulo={`Toda ${nome}`}
                >
                  {nome}
                </BotaoDeDia>
              ))}
            </div>
          )}

          {repeticao.tipo === "mensal" && (
            <div className="mt-2.5 grid grid-cols-7 gap-1">
              {diasDoMes.map((dia) => (
                <BotaoDeDia
                  key={dia}
                  marcado={repeticao.dias.includes(dia)}
                  aoClicar={() => alternarDia(dia)}
                  rotulo={`Todo dia ${dia}`}
                  quadrado
                >
                  {dia}
                </BotaoDeDia>
              ))}
            </div>
          )}

          {aviso !== null && (
            <p className="mt-2.5 mb-0 text-[12px] leading-relaxed text-ambar">{aviso}</p>
          )}
        </div>
      )}
    </div>
  );
}

function BotaoDeModo({
  ativo,
  aoClicar,
  children,
}: {
  ativo: boolean;
  aoClicar: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      aria-pressed={ativo}
      className={`min-h-9 flex-1 rounded-lg text-[12.5px] transition-colors duration-200 ${
        ativo
          ? "border border-[#d7d8d2] bg-papel font-semibold text-tinta"
          : "border border-transparent bg-transparent text-tinta-fraca"
      }`}
    >
      {children}
    </button>
  );
}

function BotaoDeDia({
  marcado,
  aoClicar,
  rotulo,
  quadrado = false,
  children,
}: {
  marcado: boolean;
  aoClicar: () => void;
  rotulo: string;
  quadrado?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      aria-pressed={marcado}
      aria-label={rotulo}
      className={`rounded-lg font-mono text-[11px] transition-colors duration-200 active:scale-90 ${
        quadrado ? "aspect-square" : "min-h-11 flex-1"
      } ${
        marcado
          ? "border border-verde bg-verde-claro font-medium text-verde-escuro"
          : "border border-borda bg-papel text-tinta-fraca"
      }`}
    >
      {children}
    </button>
  );
}
