// Os tipos que trafegam entre a API e as telas.
//
// São diferentes do que está no banco: aqui as datas já viraram texto
// ("2026-10-19", "14:00"), porque JSON não tem tipo de data e porque a
// tela nunca deveria precisar fazer conta de fuso.

import type { DiaTexto } from "./datas";

/** O tipo de uma tarefa, derivado de data e hora — nunca guardado. */
export type TipoDeTarefa = "flutuante" | "do-dia" | "ancorada";

export type Tarefa = {
  id: string;
  titulo: string;
  nota: string | null;
  data: DiaTexto | null;
  hora: string | null;
  concluidaEm: string | null;
  arquivadaEm: string | null;
  adiadaVezes: number;
  ordem: number;
  /** Calculado no servidor para a tela não repetir a regra. */
  tipo: TipoDeTarefa;
};

export type Evento = {
  id: string;
  titulo: string;
  nota: string | null;
  local: string | null;
  cor: string;
  /** O dia em que esta ocorrência acontece, no fuso do app. */
  dia: DiaTexto;
  /** "14:00" */
  horaInicio: string;
  /** "15:30" */
  horaFim: string;
  /** "1h30" */
  duracao: string;
  /** Verdadeiro quando a ocorrência veio da expansão de uma regra. */
  recorrente: boolean;
  /** O id do evento que gerou esta ocorrência (igual a `id` se for único). */
  serieId: string;
};

export type Habito = {
  id: string;
  nome: string;
  icone: string | null;
  metaPorSemana: number | null;
  diasDaSemana: number[];
  ordem: number;
  /** Falso enquanto o hábito está pausado. */
  ativo: boolean;
};

/**
 * O estado de um hábito num dia específico.
 *
 * "pausado" existe separado de "nao-era-dia" porque os dois somem da
 * cobrança pelo mesmo motivo aparente, mas por razões diferentes: um é
 * "não era para fazer nesse dia", o outro é "você parou nessa época".
 */
export type EstadoDoHabito = "feito" | "falhou" | "nao-era-dia" | "pausado" | "futuro";

/** Um período em que o hábito esteve parado. `fim` nulo = ainda parado. */
export type Pausa = { inicio: DiaTexto; fim: DiaTexto | null };

export type HabitoNoDia = Habito & {
  estado: EstadoDoHabito;
  /** Os sete dias da semana corrente, para as bolinhas. */
  semana: { dia: DiaTexto; estado: EstadoDoHabito }[];
  /** Quantos dias cumpridos na semana. */
  feitosNaSemana: number;
  /** O divisor do contador: a meta, ou o número de dias programados. */
  alvoNaSemana: number;
};

/** Tudo que a tela "Hoje" precisa, numa resposta só. */
export type Dia = {
  dia: DiaTexto;
  eventos: Evento[];
  /** Tarefas com hora, que entram na linha do tempo. */
  ancoradas: Tarefa[];
  /** Tarefas com dia e sem hora. */
  doDia: Tarefa[];
  habitos: HabitoNoDia[];
  /** Para os dois botões do rodapé. */
  totalAtrasadas: number;
  totalNaPilha: number;
};

/**
 * Uma faixa da tela "Semana".
 *
 * Sem hábitos de propósito: a semana responde "onde tem compromisso", e
 * hábito não é compromisso. Quem quer ver hábito vai em Hoje ou na tela
 * do próprio hábito, onde cada um aparece com nome.
 */
export type DiaDaSemana = {
  dia: DiaTexto;
  eventos: Evento[];
  /** Todas as tarefas do dia, feitas ou não — a tela decide o que mostrar. */
  tarefas: Tarefa[];
};

export type TarefaAtrasada = Tarefa & {
  /** Quantos dias já passaram do vencimento. */
  diasAtrasada: number;
  /** Quantos dias faltam para sair da lista e ir para o histórico. */
  diasParaExpirar: number;
};

export type ItemDaPilha = Tarefa & {
  /** Dias desde que foi criada. */
  idadeEmDias: number;
};

export type ItemDoHistorico = Tarefa & {
  feita: boolean;
  /** O dia em que saiu de circulação, para agrupar por mês. */
  encerradaEm: DiaTexto;
};

/** O limite da pilha. Passou disso, só entra tirando algo. */
export const TETO_DA_PILHA = 15;

/** Idade em que um item da pilha fica âmbar. */
export const DIAS_PARA_ENVELHECER = 14;

/** Quantos dias uma tarefa vencida fica na lista de atrasadas. */
export const DIAS_ATE_EXPIRAR = 7;
