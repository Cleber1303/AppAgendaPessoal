"use client";

// O histórico completo de um hábito, mês a mês.
//
// Só leitura: marcar e desmarcar continua sendo na tela Hoje, escolhendo o
// dia na tira de cima. Separar as duas coisas evita que um toque errado
// aqui reescreva o passado.

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Carregando, Falhou, IconeVoltar } from "@/components/Avisos";
import { carregarMesDoHabito } from "@/lib/dados";
import {
  diaDaSemana,
  hoje,
  mesAtual,
  mesEAno,
  numeroDoDia,
  somarMeses,
  type DiaTexto,
  type MesTexto,
} from "@/lib/datas";
import type { EstadoDoHabito } from "@/lib/tipos";
import { usarDados } from "@/lib/usarDados";

const nomesDosDias = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const cabecalhoDaSemana = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

export default function TelaDoHabito() {
  const parametros = useParams<{ id: string }>();
  const identificador = parametros.id;

  const [mes, setMes] = useState<MesTexto>(mesAtual());
  const { dados, carregando, erro, recarregar } = usarDados(
    () => carregarMesDoHabito(identificador, mes),
    [identificador, mes],
  );

  // Não dá para avançar além do mês corrente: não há história no futuro.
  const podeAvancar = mes < mesAtual();

  return (
    <>
      <header className="border-b border-borda bg-papel px-4 pt-3 pb-3.5">
        <Link
          href="/habitos"
          aria-label="Voltar"
          className="-ml-2 flex size-11 items-center justify-center text-tinta-fraca no-underline"
        >
          <IconeVoltar />
        </Link>

        <h1 className="mt-0.5 mb-0 px-1 text-2xl font-semibold tracking-tight">
          {dados === null ? "Hábito" : dados.habito.nome}
        </h1>

        {dados !== null && (
          <p className="mt-1 mb-0 px-1 font-mono text-[11px] text-tinta-fraca">
            {descreverMeta(dados.habito.metaPorSemana, dados.habito.diasDaSemana)}
          </p>
        )}
      </header>

      {carregando && dados === null && <Carregando />}
      {erro !== null && dados === null && <Falhou mensagem={erro} aoTentarDeNovo={recarregar} />}

      {dados !== null && (
        <main
          className={`px-5 pt-3 transition-opacity duration-200 ${
            carregando ? "opacity-40" : "opacity-100"
          }`}
        >
          <div className="flex items-center justify-between">
            <button
              type="button"
              aria-label="Mês anterior"
              onClick={() => setMes(somarMeses(mes, -1))}
              className="-ml-2 flex size-11 items-center justify-center border-0 bg-transparent text-tinta-fraca transition-transform duration-150 active:scale-75"
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

            <span className="text-[15px] font-semibold">{mesEAno(`${mes}-01`)}</span>

            <button
              type="button"
              aria-label="Próximo mês"
              disabled={!podeAvancar}
              onClick={() => setMes(somarMeses(mes, 1))}
              className="-mr-2 flex size-11 items-center justify-center border-0 bg-transparent text-tinta-fraca transition-transform duration-150 active:scale-75 disabled:opacity-25"
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

          <div className="mt-2 flex gap-2">
            <Indicador rotulo="no mês" valor={`${dados.feitos}/${dados.programados}`} />
            <Indicador rotulo="série" valor={`${dados.serie}d`} destaque />
            <Indicador rotulo="total" valor={String(dados.totalDeSempre)} />
          </div>

          <Calendario dias={dados.dias} />

          <Legenda />
        </main>
      )}
    </>
  );
}

function descreverMeta(metaPorSemana: number | null, diasDaSemana: number[]): string {
  if (diasDaSemana.length > 0) {
    return diasDaSemana.map((indice) => nomesDosDias[indice]).join(" · ");
  }

  if (metaPorSemana === null || metaPorSemana >= 7) {
    return "todo dia";
  }

  return `${metaPorSemana}x por semana`;
}

function Indicador({
  rotulo,
  valor,
  destaque = false,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div
      className={`flex-1 rounded-[10px] px-3 py-2 ${
        destaque ? "bg-verde-claro" : "border border-borda bg-papel"
      }`}
    >
      <div className="font-mono text-[9px] tracking-[0.12em] text-tinta-fraca uppercase">
        {rotulo}
      </div>
      <div
        className={`mt-0.5 font-mono text-[17px] ${destaque ? "text-verde-escuro" : "text-tinta"}`}
      >
        {valor}
      </div>
    </div>
  );
}

/**
 * O mês como calendário, segunda a domingo.
 *
 * Os dias antes do primeiro são células vazias, para o dia 1 cair na
 * coluna certa — é o que faz o padrão semanal saltar aos olhos.
 */
function Calendario({ dias }: { dias: { dia: DiaTexto; estado: EstadoDoHabito }[] }) {
  if (dias.length === 0) {
    return null;
  }

  const semanaDoPrimeiro = diaDaSemana(dias[0].dia);
  const vazias = semanaDoPrimeiro === 0 ? 6 : semanaDoPrimeiro - 1;

  return (
    <div className="entra mt-3.5 rounded-xl border border-borda bg-papel p-3">
      <div className="grid grid-cols-7 gap-1.5">
        {cabecalhoDaSemana.map((nome) => (
          <div
            key={nome}
            className="pb-1 text-center font-mono text-[9px] tracking-[0.06em] text-tinta-apagada uppercase"
          >
            {nome}
          </div>
        ))}

        {Array.from({ length: vazias }).map((_, posicao) => (
          <div key={`vazia-${posicao}`} />
        ))}

        {dias.map((entrada) => (
          <Celula key={entrada.dia} dia={entrada.dia} estado={entrada.estado} />
        ))}
      </div>
    </div>
  );
}

function Celula({ dia, estado }: { dia: DiaTexto; estado: EstadoDoHabito }) {
  const ehHoje = dia === hoje();

  const aparencia: Record<EstadoDoHabito, string> = {
    feito: "bg-verde text-white",
    falhou: "bg-cinza-falhou text-[#6b6f66]",
    "nao-era-dia": "bg-fundo text-[#c3c6bf]",
    futuro: "bg-fundo text-[#c3c6bf]",
  };

  return (
    <div
      title={`${dia} — ${rotuloDoEstado(estado)}`}
      className={`flex aspect-square items-center justify-center rounded-md font-mono text-[11px] ${
        aparencia[estado]
      } ${ehHoje ? "ring-2 ring-verde ring-offset-1" : ""}`}
    >
      {Number(numeroDoDia(dia))}
    </div>
  );
}

function rotuloDoEstado(estado: EstadoDoHabito): string {
  if (estado === "feito") {
    return "feito";
  }

  if (estado === "falhou") {
    return "falhou";
  }

  if (estado === "futuro") {
    return "ainda não chegou";
  }

  return "não era dia";
}

function Legenda() {
  return (
    <div className="mt-3 mb-6 flex items-center justify-center gap-3.5">
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
