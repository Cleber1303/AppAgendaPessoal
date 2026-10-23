// A camada de dados. ÚNICO lugar do app que fala com a rede.
//
// Por que isso importa, e por que não dá para "arrumar depois":
//
// Quando o app tiver que funcionar sem internet, a tela não pode descobrir
// que a rede caiu — ela tem que continuar lendo normalmente. O jeito de
// chegar lá é a tela nunca ter falado com a rede em primeiro lugar: ela
// pede os dados daqui, e daqui para dentro é problema nosso.
//
// Hoje, cada função aqui busca no servidor. Amanhã, cada função lê de um
// banco local no navegador (IndexedDB) e a rede só reabastece esse banco
// em segundo plano. As telas não mudam uma linha.
//
// Se as telas falassem com a rede direto, essa mudança seria reescrever
// tudo. É por isso que essa decisão tinha que vir antes da primeira tela,
// e não depois.

"use client";

import type {
  Dia,
  DiaDaSemana,
  EstadoDoHabito,
  Habito,
  ItemDaPilha,
  ItemDoHistorico,
  Tarefa,
  TarefaAtrasada,
} from "./tipos";
import type { DiaTexto } from "./datas";

/** Hábito com o mapa de 12 semanas, como a tela de Hábitos usa. */
export type HabitoComMapa = Habito & {
  mapa: { dia: DiaTexto; estado: EstadoDoHabito }[];
  serie: number;
  feitosNoMes: number;
  programadosNoMes: number;
};

export class ErroDeDados extends Error {}

async function pedir<T>(caminho: string, opcoes?: RequestInit): Promise<T> {
  const resposta = await fetch(`/api${caminho}`, {
    ...opcoes,
    headers: { "Content-Type": "application/json", ...(opcoes?.headers ?? {}) },
    cache: "no-store",
  });

  if (!resposta.ok) {
    // Sessão expirada: volta para a tela de senha em vez de mostrar um
    // erro que a pessoa não tem como resolver olhando.
    if (resposta.status === 401) {
      window.location.href = "/entrar";

      throw new ErroDeDados("sessão expirada");
    }

    const corpo = await resposta.json().catch(() => ({}));

    if (corpo.erro) {
      throw new ErroDeDados(corpo.erro);
    }

    // Sem `erro` no corpo quer dizer que a rota quebrou antes de responder.
    // O rastro de verdade está no terminal onde o `npm run dev` roda.
    if (resposta.status >= 500) {
      throw new ErroDeDados(
        `erro no servidor (${resposta.status}) — o motivo está no terminal do npm run dev`,
      );
    }

    throw new ErroDeDados(`requisição recusada (${resposta.status})`);
  }

  return resposta.json() as Promise<T>;
}

// ---------------------------------------------------------------- leitura

export function carregarDia(dia?: DiaTexto): Promise<Dia> {
  const parametro = dia === undefined ? "" : `?data=${dia}`;

  return pedir<Dia>(`/dia${parametro}`);
}

export function carregarSemana(dia?: DiaTexto): Promise<DiaDaSemana[]> {
  const parametro = dia === undefined ? "" : `?data=${dia}`;

  return pedir<DiaDaSemana[]>(`/semana${parametro}`);
}

export function carregarPilha(): Promise<ItemDaPilha[]> {
  return pedir<ItemDaPilha[]>("/tarefas?escopo=pilha");
}

export function carregarAtrasadas(): Promise<TarefaAtrasada[]> {
  return pedir<TarefaAtrasada[]>("/tarefas?escopo=atrasadas");
}

export function carregarHistorico(busca?: string): Promise<ItemDoHistorico[]> {
  const parametro = busca ? `&busca=${encodeURIComponent(busca)}` : "";

  return pedir<ItemDoHistorico[]>(`/tarefas?escopo=historico${parametro}`);
}

export function carregarHabitos(): Promise<HabitoComMapa[]> {
  return pedir<HabitoComMapa[]>("/habitos");
}

export function carregarTarefa(id: string): Promise<Tarefa> {
  return pedir<Tarefa>(`/tarefas/${id}`);
}

/** Um mês do histórico de um hábito, para a tela de detalhe. */
export type MesDoHabito = {
  habito: Habito;
  mes: string;
  dias: { dia: DiaTexto; estado: EstadoDoHabito }[];
  feitos: number;
  programados: number;
  serie: number;
  totalDeSempre: number;
};

export function carregarMesDoHabito(id: string, mes: string): Promise<MesDoHabito> {
  return pedir<MesDoHabito>(`/habitos/${id}/historico?mes=${mes}`);
}

// ---------------------------------------------------------------- escrita

export type NovaTarefa = {
  titulo: string;
  nota?: string | null;
  /** Nulo = flutuante, vai para a pilha. */
  data?: DiaTexto | null;
  /** Só vale com data preenchida. */
  hora?: string | null;
};

export function criarTarefa(nova: NovaTarefa): Promise<Tarefa> {
  return pedir<Tarefa>("/tarefas", {
    method: "POST",
    body: JSON.stringify(nova),
  });
}

export function concluirTarefa(id: string): Promise<Tarefa> {
  return pedir<Tarefa>(`/tarefas/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ acao: "concluir" }),
  });
}

export function reabrirTarefa(id: string): Promise<Tarefa> {
  return pedir<Tarefa>(`/tarefas/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ acao: "reabrir" }),
  });
}

/** `data: null` tira a data e manda a tarefa para a pilha. */
export function adiarTarefa(
  id: string,
  data: DiaTexto | null,
  hora: string | null,
): Promise<Tarefa> {
  return pedir<Tarefa>(`/tarefas/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ acao: "adiar", data, hora }),
  });
}

export function excluirTarefa(id: string): Promise<{ ok: boolean }> {
  return pedir<{ ok: boolean }>(`/tarefas/${id}`, { method: "DELETE" });
}

/**
 * Grava a nova ordem da pilha.
 *
 * Manda os ids na ordem em que ficaram na tela — o servidor usa a posição
 * de cada um na lista como valor do campo `ordem`.
 */
export function reordenarPilha(ids: string[]): Promise<{ ok: boolean }> {
  return pedir<{ ok: boolean }>("/tarefas", {
    method: "PATCH",
    body: JSON.stringify({ ids }),
  });
}

export type NovoEvento = {
  titulo: string;
  dia: DiaTexto;
  horaInicio: string;
  horaFim: string;
  local?: string | null;
  nota?: string | null;
  /** Ex.: "FREQ=WEEKLY;BYDAY=TU". Nulo = evento único. */
  rrule?: string | null;
};

export function criarEvento(novo: NovoEvento): Promise<{ id: string }> {
  return pedir<{ id: string }>("/eventos", {
    method: "POST",
    body: JSON.stringify(novo),
  });
}

export type NovoHabito = {
  nome: string;
  /** Um OU outro, nunca os dois. */
  metaPorSemana?: number | null;
  diasDaSemana?: number[];
};

export function criarHabito(novo: NovoHabito): Promise<Habito> {
  return pedir<Habito>("/habitos", {
    method: "POST",
    body: JSON.stringify(novo),
  });
}

/** Marca ou desmarca — a mesma chamada serve para os dois. */
export function alternarHabito(
  id: string,
  dia: DiaTexto,
): Promise<{ dia: DiaTexto; marcado: boolean }> {
  return pedir<{ dia: DiaTexto; marcado: boolean }>(`/habitos/${id}/registro`, {
    method: "POST",
    body: JSON.stringify({ data: dia }),
  });
}

/** A faxina das atrasadas vencidas. Roda na abertura do app. */
export function rodarManutencao(): Promise<{ arquivadas: number }> {
  return pedir<{ arquivadas: number }>("/manutencao", { method: "POST" });
}
