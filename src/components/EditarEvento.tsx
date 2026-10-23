"use client";

// Editar evento: mudar e apagar.
//
// É um pop-up, pela mesma razão da tarefa: tocar num evento da semana não
// deveria te tirar da semana.
//
// O que se edita aqui é a SÉRIE. Mudar o horário muda em todas as
// ocorrências — "só esta semana" ainda não existe para edição.
//
// Para apagar, existe: quando o evento repete, dá para tirar só o dia em
// que você tocou, sem desfazer a série.

import { useEffect, useState } from "react";
import { SeletorDeRepeticao } from "@/components/SeletorDeRepeticao";
import { Carregando, Falhou } from "@/components/Avisos";
import { BotaoDoPopup, Popup } from "@/components/Popup";
import { avisarAtualizacao } from "@/lib/atualizacao";
import { carregarEvento, editarEvento, excluirEvento } from "@/lib/dados";
import { dataCompleta } from "@/lib/datas";
import { deRrule, repeticaoParaRrule, SEM_REPETICAO, type Repeticao } from "@/lib/repeticao";
import { usarDados } from "@/lib/usarDados";

export function EditarEvento({
  id,
  dia: diaTocado,
  aberto,
  aoFechar,
}: {
  id: string;
  /** O dia da ocorrência em que você tocou, para apagar só ela. */
  dia: string | null;
  aberto: boolean;
  aoFechar: () => void;
}) {
  const { dados, carregando, erro, recarregar } = usarDados(() => carregarEvento(id), [id]);

  const [titulo, setTitulo] = useState("");
  const [dia, setDia] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFim, setHoraFim] = useState("");
  const [local, setLocal] = useState("");
  const [repeticao, setRepeticao] = useState<Repeticao>(SEM_REPETICAO);
  const [repeticaoAberta, setRepeticaoAberta] = useState(false);

  const [salvando, setSalvando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);

  // Preenche o formulário quando o evento chega.
  useEffect(() => {
    if (dados === null) {
      return;
    }

    setTitulo(dados.titulo);
    setDia(dados.dia);
    setHoraInicio(dados.horaInicio);
    setHoraFim(dados.horaFim);
    setLocal(dados.local ?? "");
    setRepeticao(deRrule(dados.rrule));
    setRepeticaoAberta(false);
    setConfirmando(false);
    setFalha(null);
  }, [dados]);

  /** Fecha e avisa as telas de trás para se recarregarem. */
  function terminar() {
    avisarAtualizacao();
    aoFechar();
  }

  async function salvar() {
    if (titulo.trim() === "") {
      setFalha("Escreva um título.");

      return;
    }

    setSalvando(true);
    setFalha(null);

    try {
      await editarEvento(id, {
        titulo: titulo.trim(),
        dia,
        horaInicio,
        horaFim,
        local: local.trim() === "" ? null : local.trim(),
        rrule: repeticaoParaRrule(repeticao),
      });

      terminar();
    } catch (problema: unknown) {
      setFalha(problema instanceof Error ? problema.message : "não foi possível salvar");
    } finally {
      setSalvando(false);
    }
  }

  async function apagar(escopo: "serie" | "ocorrencia") {
    setSalvando(true);
    setFalha(null);

    try {
      await excluirEvento(id, escopo, diaTocado ?? undefined);
      terminar();
    } catch (problema: unknown) {
      setFalha(problema instanceof Error ? problema.message : "não foi possível apagar");
      setConfirmando(false);
    } finally {
      setSalvando(false);
    }
  }

  const repete = repeticao.tipo !== "nao";
  const podeApagarSoUmDia = repete && diaTocado !== null;

  return (
    <Popup
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Evento"
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
            htmlFor="titulo-evento"
            className="block font-mono text-[10px] tracking-[0.14em] text-tinta-fraca uppercase"
          >
            Título
          </label>
          <input
            id="titulo-evento"
            type="text"
            value={titulo}
            onChange={(campo) => setTitulo(campo.target.value)}
            className="mt-1.5 min-h-12 w-full rounded-[10px] border border-[#d7d8d2] bg-papel px-3 text-base"
          />

          <div className="mt-4">
            <Campo rotulo="Dia" tipo="date" valor={dia} aoMudar={setDia} />
            <Campo rotulo="Início" tipo="time" valor={horaInicio} aoMudar={setHoraInicio} />
            <Campo rotulo="Fim" tipo="time" valor={horaFim} aoMudar={setHoraFim} />

            <div className="flex min-h-14 items-center gap-3 border-b border-borda-leve">
              <label htmlFor="local-evento" className="flex-1 text-[15px] text-tinta-fraca">
                Local
              </label>
              <input
                id="local-evento"
                type="text"
                value={local}
                onChange={(campo) => setLocal(campo.target.value)}
                placeholder="opcional"
                className="w-36 rounded-lg bg-[#f0f0ec] px-2.5 py-2 text-right text-sm"
              />
            </div>

            <SeletorDeRepeticao
              repeticao={repeticao}
              diaDoEvento={dia === "" ? dados.dia : dia}
              aberto={repeticaoAberta}
              aoAlternarAbertura={() => setRepeticaoAberta(!repeticaoAberta)}
              aoMudar={setRepeticao}
            />
          </div>

          {repete && (
            <p className="mt-3 mb-0 text-[12.5px] leading-relaxed text-tinta-fraca">
              Salvar muda todas as ocorrências da série.
            </p>
          )}

          {falha !== null && (
            <p className="mt-3 mb-0 rounded-lg bg-ambar-claro px-3 py-2 text-[13px] text-ambar">
              {falha}
            </p>
          )}

          {confirmando ? (
            <div className="entra mt-5 rounded-xl bg-ambar-claro px-4 py-3.5">
              <p className="m-0 text-[13.5px] leading-relaxed text-[#4A4D53]">
                {podeApagarSoUmDia
                  ? `Apagar só ${dataCompleta(diaTocado)} ou a série inteira?`
                  : "Apagar este evento?"}
              </p>

              <div className="mt-3 flex flex-col gap-2">
                {podeApagarSoUmDia && (
                  <button
                    type="button"
                    onClick={() => apagar("ocorrencia")}
                    disabled={salvando}
                    className="min-h-11 w-full rounded-lg border border-ambar-borda bg-papel text-sm font-semibold text-ambar disabled:opacity-60"
                  >
                    Só {dataCompleta(diaTocado).slice(0, 5)}
                  </button>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => apagar("serie")}
                    disabled={salvando}
                    className="min-h-11 flex-1 rounded-lg border-0 bg-ambar text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {repete ? "A série inteira" : "Apagar"}
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
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmando(true)}
              className="mt-5 min-h-12 w-full rounded-xl border border-borda bg-papel text-sm font-medium text-ambar transition-transform duration-150 active:scale-[0.99]"
            >
              Apagar evento
            </button>
          )}
        </>
      )}
    </Popup>
  );
}

function Campo({
  rotulo,
  tipo,
  valor,
  aoMudar,
}: {
  rotulo: string;
  tipo: "date" | "time";
  valor: string;
  aoMudar: (valor: string) => void;
}) {
  const identificador = `evento-${rotulo.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div className="flex min-h-14 items-center gap-3 border-b border-borda-leve">
      <label htmlFor={identificador} className="flex-1 text-[15px] text-tinta-fraca">
        {rotulo}
      </label>
      <input
        id={identificador}
        type={tipo}
        value={valor}
        onChange={(campo) => aoMudar(campo.target.value)}
        className="rounded-lg bg-[#f0f0ec] px-2.5 py-2 font-mono text-sm"
      />
    </div>
  );
}
