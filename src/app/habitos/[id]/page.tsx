"use client";

// O histórico completo de um hábito, mês a mês.
//
// Os dias do calendário são clicáveis: é por aqui que se marca um dia
// esquecido de três semanas atrás, coisa que a tira da tela Hoje não
// alcança, já que ela não sai da semana corrente.
//
// Dia no futuro não se marca — o dia ainda não aconteceu.

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Carregando, Falhou, IconeVoltar } from "@/components/Avisos";
import {
  alternarHabito,
  carregarMesDoHabito,
  editarHabito,
  excluirHabito,
} from "@/lib/dados";
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
  const navegador = useRouter();
  const identificador = parametros.id;

  const [mes, setMes] = useState<MesTexto>(mesAtual());
  const [confirmando, setConfirmando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);

  const { dados, carregando, erro, recarregar, definirDados } = usarDados(
    () => carregarMesDoHabito(identificador, mes),
    [identificador, mes],
  );

  // Não dá para avançar além do mês corrente: não há história no futuro.
  const podeAvancar = mes < mesAtual();

  /**
   * Marca ou desmarca um dia.
   *
   * Muda a célula na hora e só depois avisa o servidor. Os contadores de
   * cima (feitos no mês, série) vêm do servidor, então um recarregar
   * silencioso acerta os números logo em seguida.
   */
  function alternarDia(dia: DiaTexto, estado: EstadoDoHabito) {
    if (dia > hoje()) {
      return;
    }

    const novoEstado: EstadoDoHabito = estado === "feito" ? "falhou" : "feito";

    definirDados((anterior) =>
      anterior === null
        ? anterior
        : {
            ...anterior,
            dias: anterior.dias.map((entrada) =>
              entrada.dia === dia ? { ...entrada, estado: novoEstado } : entrada,
            ),
            feitos: anterior.feitos + (novoEstado === "feito" ? 1 : -1),
          },
    );

    setFalha(null);

    alternarHabito(identificador, dia)
      .then(() => recarregar())
      .catch(() => {
        setFalha("não deu para salvar — recarregando");
        recarregar();
      });
  }

  async function alternarPausa() {
    if (dados === null) {
      return;
    }

    const retomando = !dados.habito.ativo;

    setFalha(null);

    try {
      await editarHabito(identificador, { ativo: retomando });
      recarregar();
    } catch (problema: unknown) {
      setFalha(problema instanceof Error ? problema.message : "não foi possível salvar");
    }
  }

  async function apagar() {
    setExcluindo(true);
    setFalha(null);

    try {
      await excluirHabito(identificador);
      navegador.push("/habitos");
    } catch (problema: unknown) {
      setFalha(problema instanceof Error ? problema.message : "não foi possível apagar");
      setExcluindo(false);
      setConfirmando(false);
    }
  }

  return (
    <>
      <header className="border-b border-borda bg-papel px-4 pt-3 pb-3.5">
        <div className="flex items-center justify-between">
          <Link
            href="/habitos"
            aria-label="Voltar"
            className="-ml-2 flex size-11 items-center justify-center text-tinta-fraca no-underline"
          >
            <IconeVoltar />
          </Link>

          {dados !== null && !confirmando && (
            <button
              type="button"
              onClick={() => setConfirmando(true)}
              aria-label="Apagar hábito"
              className="-mr-2 flex size-11 items-center justify-center border-0 bg-transparent text-tinta-fraca transition-transform duration-150 active:scale-90"
            >
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 7h16M10 7V4h4v3M6 7l1 13h10l1-13" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 px-1">
          <h1 className="m-0 text-2xl font-semibold tracking-tight">
            {dados === null ? "Hábito" : dados.habito.nome}
          </h1>
          {dados !== null && !dados.habito.ativo && (
            <span className="rounded-md bg-[#f0f0ec] px-2 py-0.5 font-mono text-[10.5px] text-tinta-fraca">
              pausado
            </span>
          )}
        </div>

        {dados !== null && (
          <p className="mt-1 mb-0 px-1 font-mono text-[11px] text-tinta-fraca">
            {descreverMeta(dados.habito.metaPorSemana, dados.habito.diasDaSemana)}
          </p>
        )}
      </header>

      {/*
        Confirmação em duas etapas, e não um toque só como nas tarefas:
        apagar um hábito tira meses de marcação da vista de uma vez.
      */}
      {confirmando && dados !== null && (
        <div className="entra border-b border-ambar-borda bg-ambar-claro px-5 py-3.5">
          <p className="m-0 text-[13.5px] leading-relaxed text-[#4A4D53]">
            Apagar <strong className="font-semibold">{dados.habito.nome}</strong> e tirar{" "}
            {dados.totalDeSempre} {dados.totalDeSempre === 1 ? "marcação" : "marcações"} da
            vista?
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={apagar}
              disabled={excluindo}
              className="min-h-11 flex-1 rounded-lg border-0 bg-ambar text-sm font-semibold text-white disabled:opacity-60"
            >
              {excluindo ? "Apagando…" : "Apagar"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              className="min-h-11 rounded-lg border border-borda bg-papel px-4 text-sm text-tinta-fraca"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {falha !== null && (
        <p className="mx-5 mt-3 mb-0 rounded-lg bg-ambar-claro px-3 py-2 text-[13px] text-ambar">
          {falha}
        </p>
      )}

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

          <Calendario dias={dados.dias} aoAlternar={alternarDia} />

          <Legenda temPausa={dados.pausas.length > 0} />

          <button
            type="button"
            onClick={alternarPausa}
            className="mt-4 mb-6 min-h-12 w-full rounded-xl border border-borda bg-papel text-sm font-medium text-tinta-fraca transition-transform duration-150 active:scale-[0.99]"
          >
            {dados.habito.ativo ? "Pausar hábito" : "Retomar hábito"}
          </button>
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
function Calendario({
  dias,
  aoAlternar,
}: {
  dias: { dia: DiaTexto; estado: EstadoDoHabito }[];
  aoAlternar: (dia: DiaTexto, estado: EstadoDoHabito) => void;
}) {
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
          <Celula
            key={entrada.dia}
            dia={entrada.dia}
            estado={entrada.estado}
            aoAlternar={aoAlternar}
          />
        ))}
      </div>
    </div>
  );
}

function Celula({
  dia,
  estado,
  aoAlternar,
}: {
  dia: DiaTexto;
  estado: EstadoDoHabito;
  aoAlternar: (dia: DiaTexto, estado: EstadoDoHabito) => void;
}) {
  const ehHoje = dia === hoje();
  const noFuturo = dia > hoje();

  const aparencia: Record<EstadoDoHabito, string> = {
    feito: "bg-verde text-white",
    falhou: "bg-cinza-falhou text-[#6b6f66]",
    "nao-era-dia": "bg-fundo text-[#c3c6bf]",
    pausado: "bg-fundo text-[#c3c6bf]",
    futuro: "bg-fundo text-[#c3c6bf]",
  };

  const numero = Number(numeroDoDia(dia));

  if (noFuturo) {
    return (
      <div
        className={`flex aspect-square items-center justify-center rounded-md font-mono text-[11px] ${aparencia[estado]}`}
      >
        {numero}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => aoAlternar(dia, estado)}
      aria-pressed={estado === "feito"}
      aria-label={`${dia} — ${rotuloDoEstado(estado)}`}
      className={`flex aspect-square items-center justify-center rounded-md border-0 font-mono text-[11px] transition-all duration-200 active:scale-90 ${
        aparencia[estado]
      } ${ehHoje ? "ring-2 ring-verde ring-offset-1" : ""}`}
    >
      {numero}
    </button>
  );
}

function rotuloDoEstado(estado: EstadoDoHabito): string {
  if (estado === "feito") {
    return "feito";
  }

  if (estado === "falhou") {
    return "falhou";
  }

  if (estado === "pausado") {
    return "pausado";
  }

  if (estado === "futuro") {
    return "ainda não chegou";
  }

  return "não era dia";
}

function Legenda({ temPausa }: { temPausa: boolean }) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1.5">
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
        {temPausa ? "não era dia ou pausado" : "não era dia"}
      </span>
    </div>
  );
}
