"use client";

// A tela "Hoje": o que você abre de manhã e revisa à noite.
//
// Apesar do nome, ela mostra qualquer dia da semana corrente — tocar num
// número da tira de cima troca o dia, e a estrutura é a mesma. É também
// por aqui que se marca um hábito que você esqueceu ontem.
//
// Marcar tarefa e hábito muda a tela ANTES de falar com o servidor. Se a
// requisição falhar, um recarregar() traz a verdade de volta. Esperar a
// resposta para só então desenhar faz um toque parecer travado mesmo
// quando a rede está boa.

import Link from "next/link";
import { useEffect, useState } from "react";
import { CaixaDeMarcar } from "@/components/CaixaDeMarcar";
import { usarEdicao } from "@/components/Edicao";
import { Carregando, Falhou, IconeHistorico } from "@/components/Avisos";
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
import type { Dia, EstadoDoHabito, HabitoNoDia, Tarefa } from "@/lib/tipos";
import { usarDados } from "@/lib/usarDados";

export default function TelaHoje() {
  const { abrirEvento } = usarEdicao();
  const [diaSelecionado, setDiaSelecionado] = useState<DiaTexto>(hoje());
  const { dados, carregando, erro, recarregar, definirDados } = usarDados(
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

  // Enquanto o próximo dia carrega, o anterior continua na tela, apagado.
  // Limpar tudo e escrever "carregando" faria a tela piscar a cada toque.
  const trocandoDeDia = carregando && dados !== null;

  function alternarTarefa(id: string, feita: boolean) {
    const marca = feita ? new Date().toISOString() : null;

    definirDados((anterior) => {
      if (anterior === null) {
        return anterior;
      }

      const aplicar = (tarefa: Tarefa): Tarefa =>
        tarefa.id === id ? { ...tarefa, concluidaEm: marca } : tarefa;

      return {
        ...anterior,
        ancoradas: anterior.ancoradas.map(aplicar),
        doDia: anterior.doDia.map(aplicar),
      };
    });

    const requisicao = feita ? concluirTarefa(id) : reabrirTarefa(id);

    requisicao.catch(() => {
      recarregar();
    });
  }

  function marcarHabito(id: string) {
    definirDados((anterior) =>
      anterior === null ? anterior : alternarHabitoLocal(anterior, id, diaSelecionado),
    );

    alternarHabito(id, diaSelecionado).catch(() => {
      recarregar();
    });
  }

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
                className="entra min-h-11 rounded-lg border border-borda bg-papel px-3 text-[13px] font-medium text-verde transition-transform duration-150 active:scale-95"
              >
                Hoje
              </button>
            )}
            <Link
              href="/historico"
              aria-label="Histórico"
              className="flex size-11 items-center justify-center text-tinta-apagada no-underline transition-transform duration-150 active:scale-90"
            >
              <IconeHistorico />
            </Link>
          </div>
        </div>

        <TiraDaSemana diaSelecionado={diaSelecionado} aoEscolher={setDiaSelecionado} />
      </header>

      {carregando && dados === null && <Carregando />}
      {erro !== null && dados === null && <Falhou mensagem={erro} aoTentarDeNovo={recarregar} />}

      {dados !== null && (
        <main
          className={`px-5 transition-opacity duration-200 ${
            trocandoDeDia ? "pointer-events-none opacity-40" : "opacity-100"
          }`}
        >
          {(dados.eventos.length > 0 || dados.ancoradas.length > 0) && (
            <>
              <Secao>Agenda</Secao>
              {dados.eventos.map((evento, posicao) => (
                <div key={evento.id} className="entra flex gap-2.5" style={atraso(posicao)}>
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
                  <button
                    type="button"
                    onClick={() => abrirEvento(evento.serieId, evento.dia)}
                    className="mb-2 flex-1 rounded-[10px] border border-borda bg-papel px-3 py-2 text-left text-tinta transition-transform duration-150 active:scale-[0.99]"
                  >
                    <div className="text-sm font-medium">{evento.titulo}</div>
                    {evento.local !== null && (
                      <div className="mt-px text-xs text-tinta-fraca">{evento.local}</div>
                    )}
                  </button>
                </div>
              ))}

              {dados.ancoradas.map((tarefa, posicao) => (
                <TarefaAncorada
                  key={tarefa.id}
                  tarefa={tarefa}
                  posicao={dados.eventos.length + posicao}
                  aoAlternar={alternarTarefa}
                />
              ))}
            </>
          )}

          {dados.doDia.length > 0 && (
            <>
              <Secao>Dia todo</Secao>
              {dados.doDia.map((tarefa, posicao) => (
                <LinhaDeTarefa
                  key={tarefa.id}
                  tarefa={tarefa}
                  posicao={posicao}
                  aoAlternar={alternarTarefa}
                />
              ))}
            </>
          )}

          {dados.habitos.length > 0 && (
            <>
              <Secao>Hábitos</Secao>
              {dados.habitos.map((habito, posicao) => (
                <LinhaDeHabito
                  key={habito.id}
                  habito={habito}
                  posicao={posicao}
                  diaSelecionado={diaSelecionado}
                  podeMarcar={podeMarcarHabito}
                  aoMarcar={marcarHabito}
                />
              ))}
            </>
          )}

          {dados.eventos.length === 0 &&
            dados.ancoradas.length === 0 &&
            dados.doDia.length === 0 &&
            dados.habitos.length === 0 && (
              <p className="entra mt-10 mb-6 text-center text-sm text-tinta-apagada">
                {ehHoje ? "Nada marcado para hoje." : "Nada marcado para este dia."}
              </p>
            )}

          <div className="h-6" />
        </main>
      )}
    </>
  );
}

/** Escalona a entrada dos itens: a lista aparece de cima para baixo. */
function atraso(posicao: number): React.CSSProperties {
  return { animationDelay: `${Math.min(posicao, 8) * 28}ms` };
}

/**
 * Alterna o hábito localmente, sem ir ao servidor.
 *
 * Precisa mexer em dois lugares: o estado do dia na fileira de bolinhas e
 * o contador da semana. Deixar o contador para a resposta do servidor faz
 * ele "pular" meio segundo depois do toque.
 */
function alternarHabitoLocal(dia: Dia, habitoId: string, diaAlvo: DiaTexto): Dia {
  return {
    ...dia,
    habitos: dia.habitos.map((habito) => {
      if (habito.id !== habitoId) {
        return habito;
      }

      const estavaFeito = habito.semana.some(
        (entrada) => entrada.dia === diaAlvo && entrada.estado === "feito",
      );

      const novoEstado: EstadoDoHabito = estavaFeito ? "falhou" : "feito";

      return {
        ...habito,
        estado: novoEstado,
        semana: habito.semana.map((entrada) =>
          entrada.dia === diaAlvo ? { ...entrada, estado: novoEstado } : entrada,
        ),
        feitosNaSemana: habito.feitosNaSemana + (estavaFeito ? -1 : 1),
      };
    }),
  };
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
            className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-[9px] border-0 py-1.5 transition-colors duration-200 ease-out active:scale-95 ${
              escolhido ? "bg-verde" : "bg-transparent"
            }`}
          >
            <span className={`font-mono text-[9px] tracking-[0.06em] uppercase ${corDoRotulo}`}>
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
function TarefaAncorada({
  tarefa,
  posicao,
  aoAlternar,
}: {
  tarefa: Tarefa;
  posicao: number;
  aoAlternar: (id: string, feita: boolean) => void;
}) {
  const { abrirTarefa } = usarEdicao();
  const feita = tarefa.concluidaEm !== null;

  return (
    <div className="entra flex gap-2.5" style={atraso(posicao)}>
      <div className="w-11 shrink-0 pt-px text-right">
        <div className="font-mono text-xs">{tarefa.hora}</div>
      </div>
      <div className="flex w-3 shrink-0 flex-col items-center pt-1.5">
        <div className="size-2.5 shrink-0 rounded-full border-[1.5px] border-verde bg-fundo" />
      </div>
      <div className="mb-2 flex flex-1 items-center gap-2.5 rounded-[10px] border border-dashed border-[#c9cbc4] bg-papel px-3 py-2">
        <CaixaDeMarcar
          marcada={feita}
          rotulo={tarefa.titulo}
          aoAlternar={() => aoAlternar(tarefa.id, !feita)}
        />
        <button
          type="button"
          onClick={() => abrirTarefa(tarefa.id)}
          className={`flex-1 truncate border-0 bg-transparent text-left text-sm transition-colors duration-200 ${
            feita ? "text-tinta-apagada line-through" : "text-tinta"
          }`}
        >
          {tarefa.titulo}
        </button>
      </div>
    </div>
  );
}

/** Tarefa do dia, sem hora. Fica riscada até o dia virar. */
function LinhaDeTarefa({
  tarefa,
  posicao,
  aoAlternar,
}: {
  tarefa: Tarefa;
  posicao: number;
  aoAlternar: (id: string, feita: boolean) => void;
}) {
  const { abrirTarefa } = usarEdicao();
  const feita = tarefa.concluidaEm !== null;

  return (
    <div
      className="entra flex min-h-11 items-center gap-3 border-b border-borda-leve"
      style={atraso(posicao)}
    >
      <CaixaDeMarcar
        marcada={feita}
        rotulo={tarefa.titulo}
        aoAlternar={() => aoAlternar(tarefa.id, !feita)}
      />
      <button
        type="button"
        onClick={() => abrirTarefa(tarefa.id)}
        className={`flex-1 truncate border-0 bg-transparent text-left text-[15px] transition-colors duration-200 ${
          feita ? "text-tinta-apagada line-through" : "text-tinta"
        }`}
      >
        {tarefa.titulo}
      </button>
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
  posicao,
  diaSelecionado,
  podeMarcar,
  aoMarcar,
}: {
  habito: HabitoNoDia;
  posicao: number;
  diaSelecionado: DiaTexto;
  podeMarcar: boolean;
  aoMarcar: (id: string) => void;
}) {
  const temDiasFixos = habito.diasDaSemana.length > 0;

  return (
    <div
      className="entra flex min-h-10 items-center gap-2.5"
      style={atraso(posicao)}
    >
      <Link href={`/habitos/${habito.id}`} className="min-w-0 flex-1 text-tinta no-underline">
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
                onClick={() => aoMarcar(habito.id)}
                aria-label={`Marcar ${habito.nome} em ${entrada.dia}`}
                aria-pressed={entrada.estado === "feito"}
                className={`size-3.5 rounded-full border-2 border-verde transition-all duration-200 ease-out active:scale-75 ${
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
        className={`block size-3.5 rounded-full bg-verde transition-all duration-200 ${
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

