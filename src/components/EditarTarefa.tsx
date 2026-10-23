"use client";

// Editar tarefa: muda título, remarca, conclui e apaga.
//
// É um pop-up, não uma tela: tocar numa tarefa não deveria te tirar do
// dia que você estava olhando. O fundo continua lá, borrado, e fechar
// devolve você exatamente onde estava.
//
// A mesma forma vale para o evento (EditarEvento): Fechar à esquerda,
// Salvar à direita, campos no meio, apagar no fim. Duas edições com
// botões em lugares diferentes obrigam a reaprender a mesma coisa duas
// vezes.

import { useEffect, useState } from "react";
import { Carregando, Falhou } from "@/components/Avisos";
import { BotaoDoPopup, Popup } from "@/components/Popup";
import { avisarAtualizacao } from "@/lib/atualizacao";
import {
  adiarTarefa,
  carregarTarefa,
  concluirTarefa,
  editarTarefa,
  excluirTarefa,
  reabrirTarefa,
} from "@/lib/dados";
import { dataCompleta, hoje, inicioDaSemana, rotuloCurto, somarDias } from "@/lib/datas";
import { usarDados } from "@/lib/usarDados";

/** "nao-mudar" é o padrão: abrir a edição não deve mexer na data. */
type Escolha = "nao-mudar" | "amanha" | "segunda" | "escolher" | "pilha";

export function EditarTarefa({
  id,
  aberto,
  aoFechar,
}: {
  id: string;
  aberto: boolean;
  aoFechar: () => void;
}) {
  const { dados, carregando, erro, recarregar } = usarDados(() => carregarTarefa(id), [id]);

  const [titulo, setTitulo] = useState("");
  const [escolha, setEscolha] = useState<Escolha>("nao-mudar");
  const [temHora, setTemHora] = useState(false);
  const [hora, setHora] = useState("14:00");
  const [dataEscolhida, setDataEscolhida] = useState(somarDias(hoje(), 7));

  const [salvando, setSalvando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);

  useEffect(() => {
    if (dados === null) {
      return;
    }

    setTitulo(dados.titulo);
    setTemHora(dados.hora !== null);
    setHora(dados.hora ?? "14:00");
    setEscolha("nao-mudar");
    setConfirmando(false);
    setFalha(null);
  }, [dados]);

  const amanha = somarDias(hoje(), 1);
  const proximaSegunda = somarDias(inicioDaSemana(hoje()), 7);

  const ehPilha = escolha === "pilha";
  const mudaData = escolha !== "nao-mudar";

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

  /** Fecha e avisa as telas de trás para se recarregarem. */
  function terminar() {
    avisarAtualizacao();
    aoFechar();
  }

  /**
   * Salva título e data de uma vez.
   *
   * A data só é tocada se você escolheu outra coisa que não "Não mudar" —
   * assim corrigir um erro de digitação no título não remarca a tarefa
   * como efeito colateral, nem sobe o contador de adiamentos.
   */
  async function salvar() {
    if (titulo.trim() === "") {
      setFalha("Escreva um título.");

      return;
    }

    setSalvando(true);
    setFalha(null);

    try {
      if (dados !== null && titulo.trim() !== dados.titulo) {
        await editarTarefa(id, { titulo: titulo.trim() });
      }

      if (mudaData) {
        const data = novaData();

        await adiarTarefa(id, data, data !== null && temHora ? hora : null);
      }

      terminar();
    } catch (problema: unknown) {
      setFalha(problema instanceof Error ? problema.message : "não foi possível salvar");
    } finally {
      setSalvando(false);
    }
  }

  async function concluir() {
    setSalvando(true);

    try {
      await concluirTarefa(id);
      terminar();
    } finally {
      setSalvando(false);
    }
  }

  async function reabrir() {
    setSalvando(true);

    try {
      await reabrirTarefa(id);
      avisarAtualizacao();
      recarregar();
    } finally {
      setSalvando(false);
    }
  }

  async function apagar() {
    setSalvando(true);
    setFalha(null);

    try {
      await excluirTarefa(id);
      terminar();
    } catch (problema: unknown) {
      setFalha(problema instanceof Error ? problema.message : "não foi possível apagar");
      setConfirmando(false);
    } finally {
      setSalvando(false);
    }
  }

  const opcoes: { chave: Escolha; rotulo: string; detalhe: string }[] = [
    {
      chave: "nao-mudar",
      rotulo: "Não mudar",
      detalhe:
        dados === null || dados.data === null ? "sem data" : dataCompleta(dados.data).slice(0, 5),
    },
    {
      chave: "amanha",
      rotulo: "Amanhã",
      detalhe: `${rotuloCurto(amanha)} ${dataCompleta(amanha).slice(0, 5)}`,
    },
    {
      chave: "segunda",
      rotulo: "Próxima segunda",
      detalhe: dataCompleta(proximaSegunda).slice(0, 5),
    },
    {
      chave: "escolher",
      rotulo: "Escolher data",
      detalhe: dataCompleta(dataEscolhida).slice(0, 5),
    },
    { chave: "pilha", rotulo: "Tirar a data", detalhe: "vai pra pilha" },
  ];

  return (
    <Popup
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Tarefa"
      acao={
        dados !== null ? (
          <BotaoDoPopup aoClicar={salvar} desabilitado={salvando}>
            Salvar
          </BotaoDoPopup>
        ) : undefined
      }
    >
      {carregando && dados === null && <Carregando />}
      {erro !== null && dados === null && <Falhou mensagem={erro} aoTentarDeNovo={recarregar} />}

      {dados !== null && (
        <>
          <label
            htmlFor="titulo-tarefa"
            className="block font-mono text-[10px] tracking-[0.14em] text-tinta-fraca uppercase"
          >
            Título
          </label>
          <input
            id="titulo-tarefa"
            type="text"
            value={titulo}
            onChange={(campo) => setTitulo(campo.target.value)}
            className="mt-1.5 min-h-12 w-full rounded-[10px] border border-[#d7d8d2] bg-papel px-3 text-base"
          />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {dados.adiadaVezes > 0 && (
              <span className="rounded-md bg-ambar-claro px-2 py-1 font-mono text-[11.5px] text-ambar">
                adiada {dados.adiadaVezes}x
              </span>
            )}
            {dados.concluidaEm !== null && (
              <span className="rounded-md bg-verde-claro px-2 py-1 font-mono text-[11.5px] text-verde-escuro">
                feita
              </span>
            )}
            {/*
              Tarefa arquivada é a que venceu e ficou 7 dias sem ser
              reagendada. Chega-se aqui pelo histórico, e dar uma data nova
              a traz de volta — por isso o estado precisa aparecer.
            */}
            {dados.arquivadaEm !== null && dados.concluidaEm === null && (
              <span className="rounded-md bg-ambar-claro px-2 py-1 font-mono text-[11.5px] text-ambar">
                arquivada
              </span>
            )}
          </div>

          <div className="mt-5 mb-2 font-mono text-[10px] tracking-[0.14em] text-tinta-fraca uppercase">
            Data
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
                onChange={(campo) => setDataEscolhida(campo.target.value)}
                className="rounded-lg bg-[#f0f0ec] px-2.5 py-2 font-mono text-sm"
              />
            </div>
          )}

          <div className="mt-1.5 flex min-h-15 items-center gap-3 border-t border-borda-leve">
            <div className="min-w-0 flex-1">
              <div className={`text-[15px] ${ehPilha ? "text-tinta-apagada" : "text-tinta"}`}>
                Com horário
              </div>
              {ehPilha && (
                <div className="mt-px text-xs text-tinta-fraca">Sem data não existe horário</div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setTemHora(!temHora)}
              disabled={ehPilha}
              aria-pressed={temHora}
              aria-label="Com horário"
              className={`flex h-8 w-13 shrink-0 items-center rounded-full border-0 p-[3px] transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${
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
                onChange={(campo) => setHora(campo.target.value)}
                className="rounded-lg bg-[#f0f0ec] px-2.5 py-2 font-mono text-sm"
              />
            </div>
          )}

          {falha !== null && (
            <p className="mt-3 mb-0 rounded-lg bg-ambar-claro px-3 py-2 text-[13px] text-ambar">
              {falha}
            </p>
          )}

          {/*
            Concluir fica aqui, e não no cabeçalho, porque é a ação do dia
            a dia: o Salvar é para quando você mexeu em alguma coisa.
          */}
          <button
            type="button"
            onClick={dados.concluidaEm === null ? concluir : reabrir}
            disabled={salvando}
            className="mt-4 min-h-12 w-full rounded-[11px] border border-verde bg-papel text-[15px] font-semibold text-verde transition-transform duration-150 active:scale-[0.99] disabled:opacity-60"
          >
            {dados.concluidaEm === null ? "Concluir agora" : "Reabrir"}
          </button>

          {confirmando ? (
            <div className="entra mt-3 rounded-xl bg-ambar-claro px-4 py-3.5">
              <p className="m-0 text-[13.5px] leading-relaxed text-[#4A4D53]">
                Apagar esta tarefa?
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={apagar}
                  disabled={salvando}
                  className="min-h-11 flex-1 rounded-lg border-0 bg-ambar text-sm font-semibold text-white disabled:opacity-60"
                >
                  Apagar
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
          ) : (
            <button
              type="button"
              onClick={() => setConfirmando(true)}
              className="mt-3 min-h-12 w-full rounded-xl border border-borda bg-papel text-sm font-medium text-ambar transition-transform duration-150 active:scale-[0.99]"
            >
              Apagar tarefa
            </button>
          )}
        </>
      )}
    </Popup>
  );
}
