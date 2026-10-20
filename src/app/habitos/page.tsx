"use client";

// A tela de hábitos: histórico, não cobrança.
//
// Nenhum hábito fica "pendente" aqui. O que existe é o mapa de 12 semanas
// com três estados — e a distinção entre "falhou" e "não era dia" é o que
// dá sentido ao histórico de quem tem dias fixos.

import Link from "next/link";
import { useState } from "react";
import { Carregando, Falhou, IconeSeta, Vazio } from "@/components/Avisos";
import { carregarHabitos, criarHabito, type HabitoComMapa } from "@/lib/dados";
import { hoje, mesEAno } from "@/lib/datas";
import type { EstadoDoHabito } from "@/lib/tipos";
import { usarDados } from "@/lib/usarDados";

const nomesDosDias = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export default function TelaHabitos() {
  const { dados, carregando, erro, recarregar } = usarDados(() => carregarHabitos());
  const [criando, setCriando] = useState(false);

  return (
    <>
      <header className="border-b border-borda bg-papel px-5 pt-4 pb-3.5">
        <h1 className="m-0 text-2xl font-semibold tracking-tight">Hábitos</h1>
        <p className="mt-1 mb-0 text-[13px] text-tinta-fraca">{mesEAno(hoje())}</p>
      </header>

      {carregando && dados === null && <Carregando />}
      {erro !== null && dados === null && <Falhou mensagem={erro} aoTentarDeNovo={recarregar} />}

      {dados !== null && (
        <main className="px-5 pt-3.5">
          {dados.length === 0 && !criando && <Vazio texto="Nenhum hábito ainda." />}

          {dados.map((habito) => (
            <CartaoDeHabito key={habito.id} habito={habito} />
          ))}

          {criando ? (
            <FormularioDeHabito
              aoSalvar={() => {
                setCriando(false);
                recarregar();
              }}
              aoCancelar={() => setCriando(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setCriando(true)}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#c9cbc4] bg-transparent text-sm text-tinta-fraca"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              Novo hábito
            </button>
          )}

          <Legenda />
        </main>
      )}
    </>
  );
}

function CartaoDeHabito({ habito }: { habito: HabitoComMapa }) {
  const temDiasFixos = habito.diasDaSemana.length > 0;

  const descricaoDaMeta = temDiasFixos
    ? habito.diasDaSemana.map((indice) => nomesDosDias[indice]).join(" · ")
    : habito.metaPorSemana === null
      ? "todo dia"
      : `${habito.metaPorSemana}x/semana`;

  const descricaoDaSerie = temDiasFixos
    ? `série ${habito.serie} ${habito.serie === 1 ? "dia programado" : "dias programados"}`
    : `série ${habito.serie} ${habito.serie === 1 ? "dia" : "dias"}`;

  return (
    <Link
      href={`/habitos/${habito.id}`}
      className="mb-3 block rounded-xl border border-borda bg-papel px-3.5 py-3 text-tinta no-underline"
    >
      <div className="flex items-center gap-2.5">
        <span className="min-w-0 flex-1 text-[15.5px] font-medium">{habito.nome}</span>
        <span className="shrink-0 font-mono text-[11px] text-tinta-fraca">
          {descricaoDaMeta}
        </span>
        <span className="shrink-0 text-tinta-apagada">
          <IconeSeta />
        </span>
      </div>

      <div className="mt-1.5 flex items-center gap-3">
        <span className="font-mono text-[11px] text-verde">{descricaoDaSerie}</span>
        <span className="font-mono text-[11px] text-tinta-fraca">
          este mês {habito.feitosNoMes} de {habito.programadosNoMes}
        </span>
      </div>

      {/* O mapa: 12 colunas de 7 dias, como um ano de GitHub em miniatura. */}
      <div
        className="mt-3 grid gap-[3px]"
        style={{
          gridTemplateRows: "repeat(7, 9px)",
          gridAutoFlow: "column",
          gridAutoColumns: "9px",
        }}
      >
        {habito.mapa.map((entrada) => (
          <Celula key={entrada.dia} estado={entrada.estado} dia={entrada.dia} />
        ))}
      </div>

      <div className="mt-2 font-mono text-[9.5px] tracking-[0.08em] text-tinta-apagada uppercase">
        12 semanas · toque para ver tudo
      </div>
    </Link>
  );
}

function Celula({ estado, dia }: { estado: EstadoDoHabito; dia: string }) {
  const cores: Record<EstadoDoHabito, string> = {
    feito: "#2E6F5E",
    falhou: "#DBDBD4",
    "nao-era-dia": "#F4F4F1",
    futuro: "#F4F4F1",
  };

  return (
    <div
      title={dia}
      className="rounded-[2px]"
      style={{
        background: cores[estado],
        border: estado === "feito" ? "1px solid #2E6F5E" : "1px solid #EBEBE6",
      }}
    />
  );
}

function Legenda() {
  return (
    <div className="mt-3 flex items-center justify-center gap-3.5">
      <span className="flex items-center gap-1.5 text-[10.5px] text-tinta-fraca">
        <span className="block size-2.5 rounded-[2px] bg-verde" />
        feito
      </span>
      <span className="flex items-center gap-1.5 text-[10.5px] text-tinta-fraca">
        <span className="block size-2.5 rounded-[2px] bg-cinza-falhou" />
        falhou
      </span>
      <span className="flex items-center gap-1.5 text-[10.5px] text-tinta-fraca">
        <span className="block size-2.5 rounded-[2px] border border-[#DEDED8] bg-fundo" />
        não era dia
      </span>
    </div>
  );
}

/**
 * Criar hábito.
 *
 * O formulário impede, pela própria forma, que um hábito tenha meta
 * semanal e dias fixos ao mesmo tempo: escolher dias desliga a meta.
 */
function FormularioDeHabito({
  aoSalvar,
  aoCancelar,
}: {
  aoSalvar: () => void;
  aoCancelar: () => void;
}) {
  const [nome, setNome] = useState("");
  const [modo, setModo] = useState<"meta" | "dias">("meta");
  const [meta, setMeta] = useState(4);
  const [dias, setDias] = useState<number[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function alternarDia(indice: number) {
    setDias((anteriores) =>
      anteriores.includes(indice)
        ? anteriores.filter((dia) => dia !== indice)
        : [...anteriores, indice].sort(),
    );
  }

  async function salvar() {
    if (nome.trim() === "") {
      setErro("Dê um nome ao hábito.");

      return;
    }

    if (modo === "dias" && dias.length === 0) {
      setErro("Escolha pelo menos um dia.");

      return;
    }

    setSalvando(true);
    setErro(null);

    try {
      await criarHabito({
        nome: nome.trim(),
        metaPorSemana: modo === "meta" ? meta : null,
        diasDaSemana: modo === "dias" ? dias : [],
      });

      aoSalvar();
    } catch (falha: unknown) {
      setErro(falha instanceof Error ? falha.message : "não foi possível salvar");
      setSalvando(false);
    }
  }

  return (
    <div className="rounded-xl border border-borda bg-papel px-3.5 py-3">
      <label htmlFor="nome-do-habito" className="font-mono text-[10px] tracking-[0.14em] text-tinta-fraca uppercase">
        Nome
      </label>
      <input
        id="nome-do-habito"
        type="text"
        value={nome}
        onChange={(evento) => setNome(evento.target.value)}
        placeholder="Academia"
        className="mt-1.5 min-h-11 w-full rounded-lg border border-[#d7d8d2] bg-papel px-3 text-base"
      />

      <div className="mt-3 flex gap-1 rounded-lg bg-[#f0f0ec] p-[3px]">
        <button
          type="button"
          onClick={() => setModo("meta")}
          aria-pressed={modo === "meta"}
          className={`min-h-9 flex-1 rounded-md text-[12.5px] ${
            modo === "meta"
              ? "border border-[#d7d8d2] bg-papel font-semibold text-tinta"
              : "border border-transparent bg-transparent text-tinta-fraca"
          }`}
        >
          Meta semanal
        </button>
        <button
          type="button"
          onClick={() => setModo("dias")}
          aria-pressed={modo === "dias"}
          className={`min-h-9 flex-1 rounded-md text-[12.5px] ${
            modo === "dias"
              ? "border border-[#d7d8d2] bg-papel font-semibold text-tinta"
              : "border border-transparent bg-transparent text-tinta-fraca"
          }`}
        >
          Dias fixos
        </button>
      </div>

      {modo === "meta" ? (
        <div className="mt-3 flex items-center gap-3">
          <label htmlFor="meta-semanal" className="flex-1 text-sm text-tinta-fraca">
            Vezes por semana
          </label>
          <input
            id="meta-semanal"
            type="number"
            min={1}
            max={7}
            value={meta}
            onChange={(evento) => setMeta(Number(evento.target.value))}
            className="w-16 rounded-lg border border-[#d7d8d2] bg-papel px-2 py-2 text-center font-mono text-base"
          />
        </div>
      ) : (
        <div className="mt-3 flex gap-1">
          {nomesDosDias.map((nomeDoDia, indice) => {
            const marcado = dias.includes(indice);

            return (
              <button
                key={nomeDoDia}
                type="button"
                onClick={() => alternarDia(indice)}
                aria-pressed={marcado}
                className={`min-h-11 flex-1 rounded-lg font-mono text-[11px] ${
                  marcado
                    ? "border border-verde bg-verde-claro font-medium text-verde-escuro"
                    : "border border-borda bg-papel text-tinta-fraca"
                }`}
              >
                {nomeDoDia}
              </button>
            );
          })}
        </div>
      )}

      {erro !== null && <p className="mt-2.5 mb-0 text-[12.5px] text-ambar">{erro}</p>}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={salvar}
          disabled={salvando}
          className="min-h-11 flex-1 rounded-lg border-0 bg-verde text-sm font-semibold text-white disabled:opacity-60"
        >
          Criar
        </button>
        <button
          type="button"
          onClick={aoCancelar}
          className="min-h-11 rounded-lg border border-borda bg-papel px-4 text-sm text-tinta-fraca"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}