"use client";

// Detalhe e adiamento de uma tarefa.
//
// Adiar é remarcar: você escolhe para quando, com ou sem horário, ou tira
// a data e manda para a pilha. O contador de adiamentos sobe — e é a única
// coisa no app que te mostra que você empurrou a mesma tarefa cinco vezes.

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Carregando, Falhou } from "@/components/Avisos";
import {
  adiarTarefa,
  carregarTarefa,
  concluirTarefa,
  excluirTarefa,
} from "@/lib/dados";
import {
  dataCompleta,
  hoje,
  inicioDaSemana,
  rotuloCurto,
  somarDias,
} from "@/lib/datas";
import { usarDados } from "@/lib/usarDados";

type Escolha = "amanha" | "segunda" | "escolher" | "pilha";

export default function TelaDaTarefa() {
  const parametros = useParams<{ id: string }>();
  const navegador = useRouter();
  const identificador = parametros.id;

  const { dados, carregando, erro, recarregar } = usarDados(
    () => carregarTarefa(identificador),
    [identificador],
  );

  const [escolha, setEscolha] = useState<Escolha>("amanha");
  const [temHora, setTemHora] = useState(false);
  const [hora, setHora] = useState("14:00");
  const [dataEscolhida, setDataEscolhida] = useState(somarDias(hoje(), 7));
  const [salvando, setSalvando] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);

  if (carregando && dados === null) {
    return <Carregando />;
  }

  if (erro !== null && dados === null) {
    return <Falhou mensagem={erro} aoTentarDeNovo={recarregar} />;
  }

  if (dados === null) {
    return null;
  }

  const amanha = somarDias(hoje(), 1);
  const proximaSegunda = somarDias(inicioDaSemana(hoje()), 7);

  const opcoes: { chave: Escolha; rotulo: string; detalhe: string }[] = [
    { chave: "amanha", rotulo: "Amanhã", detalhe: `${rotuloCurto(amanha)} ${dataCompleta(amanha).slice(0, 5)}` },
    { chave: "segunda", rotulo: "Próxima segunda", detalhe: dataCompleta(proximaSegunda).slice(0, 5) },
    { chave: "escolher", rotulo: "Escolher data", detalhe: dataCompleta(dataEscolhida).slice(0, 5) },
    { chave: "pilha", rotulo: "Tirar a data", detalhe: "vai pra pilha" },
  ];

  const ehPilha = escolha === "pilha";

  function selecionar(chave: Escolha) {
    setEscolha(chave);

    if (chave === "pilha") {
      setTemHora(false);
    }
  }

  function novaData(): string | null {
    if (escolha === "pilha") {
      return null;
    }

    if (escolha === "amanha") {
      return amanha;
    }

    if (escolha === "segunda") {
      return proximaSegunda;
    }

    return dataEscolhida;
  }

  async function adiar() {
    setSalvando(true);
    setFalha(null);

    const data = novaData();

    try {
      await adiarTarefa(identificador, data, data !== null && temHora ? hora : null);
      navegador.push("/");
    } catch (problema: unknown) {
      setFalha(problema instanceof Error ? problema.message : "não foi possível adiar");
      setSalvando(false);
    }
  }

  async function concluir() {
    setSalvando(true);

    try {
      await concluirTarefa(identificador);
      navegador.push("/");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    setSalvando(true);

    try {
      await excluirTarefa(identificador);
      navegador.push("/");
    } finally {
      setSalvando(false);
    }
  }

  const resultado = descrever(escolha, temHora, hora, novaData());

  return (
    <div className="flex min-h-dvh flex-col bg-papel">
      <header className="flex items-center justify-between border-b border-borda px-4 py-3">
        <Link
          href="/"
          className="flex min-h-11 items-center px-1 text-[14.5px] text-tinta-fraca no-underline"
        >
          Fechar
        </Link>
        <span className="text-[15px] font-semibold">Tarefa</span>
        <button
          type="button"
          onClick={excluir}
          disabled={salvando}
          aria-label="Excluir tarefa"
          className="-mr-2 flex size-11 items-center justify-center border-0 bg-transparent text-tinta-fraca"
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
      </header>

      <main className="flex-1 px-5 pt-4">
        <h1 className="m-0 text-[21px] leading-tight font-semibold tracking-tight">
          {dados.titulo}
        </h1>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-[#f0f0ec] px-2 py-1 font-mono text-[11.5px] text-tinta-fraca">
            {dados.data === null ? "sem data" : dataCompleta(dados.data)}
            {dados.hora !== null && ` · ${dados.hora}`}
          </span>
          {dados.adiadaVezes > 0 && (
            <span className="rounded-md bg-ambar-claro px-2 py-1 font-mono text-[11.5px] text-ambar">
              adiada {dados.adiadaVezes}x
            </span>
          )}
        </div>

        <div className="mt-5 mb-2 font-mono text-[10px] tracking-[0.14em] text-tinta-fraca uppercase">
          Adiar para
        </div>

        {opcoes.map((opcao) => {
          const marcada = escolha === opcao.chave;

          return (
            <label
              key={opcao.chave}
              className={`mb-2 flex min-h-14 cursor-pointer items-center gap-3 rounded-[10px] border px-3.5 ${
                marcada ? "border-verde bg-verde-claro" : "border-borda bg-papel"
              }`}
            >
              <input
                type="radio"
                name="quando"
                checked={marcada}
                onChange={() => selecionar(opcao.chave)}
                className="size-4.5 shrink-0 accent-verde"
              />
              <span className="min-w-0 flex-1 text-[15px]">{opcao.rotulo}</span>
              <span className="shrink-0 font-mono text-xs text-tinta-fraca">
                {opcao.detalhe}
              </span>
            </label>
          );
        })}

        {escolha === "escolher" && (
          <div className="mb-2 flex min-h-14 items-center gap-3 border-b border-borda-leve">
            <label htmlFor="data-escolhida" className="flex-1 text-[15px] text-tinta-fraca">
              Data
            </label>
            <input
              id="data-escolhida"
              type="date"
              value={dataEscolhida}
              min={hoje()}
              onChange={(evento) => setDataEscolhida(evento.target.value)}
              className="rounded-lg bg-[#f0f0ec] px-2.5 py-2 font-mono text-sm"
            />
          </div>
        )}

        <div className="mt-1.5 flex min-h-15 items-center gap-3 border-t border-borda-leve">
          <div className="min-w-0 flex-1">
            <div className={`text-[15px] ${ehPilha ? "text-tinta-apagada" : "text-tinta"}`}>
              Com horário
            </div>
            <div className="mt-px text-xs text-tinta-fraca">
              {ehPilha ? "Sem data não existe horário" : "Ancora na linha do tempo"}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setTemHora(!temHora)}
            disabled={ehPilha}
            aria-pressed={temHora}
            aria-label="Com horário"
            className={`flex h-8 w-13 shrink-0 items-center rounded-full border-0 p-[3px] disabled:cursor-not-allowed disabled:opacity-40 ${
              temHora ? "justify-end bg-verde" : "justify-start bg-[#d7d8d2]"
            }`}
          >
            <span className="block size-6.5 rounded-full bg-white shadow-[0_1px_3px_rgba(20,22,25,0.25)]" />
          </button>
        </div>

        {temHora && !ehPilha && (
          <div className="flex min-h-14 items-center gap-3 border-b border-borda-leve">
            <label htmlFor="hora-nova" className="flex-1 text-[15px] text-tinta-fraca">
              Hora
            </label>
            <input
              id="hora-nova"
              type="time"
              value={hora}
              onChange={(evento) => setHora(evento.target.value)}
              className="rounded-lg bg-[#f0f0ec] px-2.5 py-2 font-mono text-sm"
            />
          </div>
        )}

        {falha !== null && (
          <p className="mt-3 mb-0 rounded-lg bg-ambar-claro px-3 py-2 text-[13px] text-ambar">
            {falha}
          </p>
        )}

        <div className="mt-3.5 rounded-xl bg-verde-claro px-4 py-3.5">
          <div className="font-mono text-[9.5px] tracking-[0.14em] text-verde uppercase">
            Fica assim
          </div>
          <div className="mt-1.5 text-[17px] font-semibold text-verde-escuro">
            {resultado.tipo}
          </div>
          <p className="mt-1.5 mb-0 text-[13px] leading-relaxed text-[#3A4A44]">
            {resultado.texto}
          </p>
        </div>
      </main>

      <footer className="rodape-seguro flex flex-col gap-1 border-t border-borda px-5 pt-3">
        <button
          type="button"
          onClick={adiar}
          disabled={salvando}
          className="min-h-12 w-full rounded-[11px] border-0 bg-verde text-[15.5px] font-semibold text-white disabled:opacity-60"
        >
          Adiar
        </button>
        <button
          type="button"
          onClick={concluir}
          disabled={salvando}
          className="min-h-11 w-full border-0 bg-transparent text-[14.5px] text-verde disabled:opacity-60"
        >
          Concluir agora
        </button>
      </footer>
    </div>
  );
}

function descrever(
  escolha: Escolha,
  temHora: boolean,
  hora: string,
  data: string | null,
): { tipo: string; texto: string } {
  if (escolha === "pilha" || data === null) {
    return {
      tipo: "Tarefa flutuante",
      texto:
        "Perde a data e vai para a pilha. Para de aparecer em qualquer dia e nunca mais fica atrasada.",
    };
  }

  const quando = dataCompleta(data).slice(0, 5);

  if (temHora) {
    return {
      tipo: "Tarefa ancorada",
      texto: `Volta para a linha do tempo em ${quando} às ${hora}.`,
    };
  }

  return {
    tipo: "Tarefa do dia",
    texto: `Aparece na lista de ${quando} sem ocupar horário.`,
  };
}
