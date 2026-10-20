// Lógica que só roda no servidor: expandir recorrência, calcular o estado
// dos hábitos e traduzir as linhas do banco para os tipos das telas.

import { RRule } from "rrule";
import type {
  Evento as EventoDeTela,
  EstadoDoHabito,
  Habito as HabitoDeTela,
  HabitoNoDia,
  Tarefa as TarefaDeTela,
  TipoDeTarefa,
} from "./tipos";
import {
  dataParaDia,
  diaDeInstante,
  diaDaSemana,
  diferencaEmDias,
  duracaoLegivel,
  hoje,
  horaDeInstante,
  semanaDe,
  type DiaTexto,
} from "./datas";

type LinhaDeTarefa = {
  id: string;
  titulo: string;
  nota: string | null;
  data: Date | null;
  hora: string | null;
  concluidaEm: Date | null;
  arquivadaEm: Date | null;
  adiadaVezes: number;
  ordem: number;
};

type LinhaDeEvento = {
  id: string;
  titulo: string;
  nota: string | null;
  local: string | null;
  cor: string;
  inicio: Date;
  fim: Date;
  fusoHorario: string;
  rrule: string | null;
  eventoPaiId: string | null;
  dataOriginal: Date | null;
  cancelado: boolean;
};

type LinhaDeHabito = {
  id: string;
  nome: string;
  icone: string | null;
  metaPorSemana: number | null;
  diasDaSemana: number[];
  ordem: number;
};

/**
 * O tipo da tarefa sai da combinação de data e hora. Está aqui, num lugar
 * só, para nunca haver duas versões da regra discordando.
 */
export function tipoDaTarefa(data: Date | null, hora: string | null): TipoDeTarefa {
  if (data === null) {
    return "flutuante";
  }

  if (hora === null) {
    return "do-dia";
  }

  return "ancorada";
}

export function tarefaParaTela(linha: LinhaDeTarefa): TarefaDeTela {
  return {
    id: linha.id,
    titulo: linha.titulo,
    nota: linha.nota,
    data: linha.data === null ? null : dataParaDia(linha.data),
    hora: linha.hora,
    concluidaEm: linha.concluidaEm === null ? null : linha.concluidaEm.toISOString(),
    arquivadaEm: linha.arquivadaEm === null ? null : linha.arquivadaEm.toISOString(),
    adiadaVezes: linha.adiadaVezes,
    ordem: linha.ordem,
    tipo: tipoDaTarefa(linha.data, linha.hora),
  };
}

export function habitoParaTela(linha: LinhaDeHabito): HabitoDeTela {
  return {
    id: linha.id,
    nome: linha.nome,
    icone: linha.icone,
    metaPorSemana: linha.metaPorSemana,
    diasDaSemana: linha.diasDaSemana,
    ordem: linha.ordem,
  };
}

/**
 * Expande os eventos de um intervalo de dias.
 *
 * Evento único entra como está. Evento com regra é expandido pela RRULE, e
 * cada ocorrência gerada é confrontada com as exceções da série: se existe
 * uma linha filha para aquela data, ela substitui a ocorrência (ou a remove,
 * quando está cancelada).
 */
export function expandirEventos(
  linhas: LinhaDeEvento[],
  primeiroDia: DiaTexto,
  ultimoDia: DiaTexto,
): EventoDeTela[] {
  const series = linhas.filter((linha) => linha.eventoPaiId === null);
  const excecoes = linhas.filter((linha) => linha.eventoPaiId !== null);
  const expandidos: EventoDeTela[] = [];

  for (const serie of series) {
    const ocorrencias = ocorrenciasDaSerie(serie, primeiroDia, ultimoDia);

    for (const ocorrencia of ocorrencias) {
      const excecao = excecoes.find((candidata) => {
        const mesmaSerie = candidata.eventoPaiId === serie.id;
        const mesmaData =
          candidata.dataOriginal !== null &&
          diaDeInstante(candidata.dataOriginal) === diaDeInstante(ocorrencia.inicio);

        return mesmaSerie && mesmaData;
      });

      if (excecao === undefined) {
        expandidos.push(montarOcorrencia(serie, ocorrencia.inicio, ocorrencia.fim, serie.rrule !== null));
        continue;
      }

      if (excecao.cancelado) {
        continue;
      }

      const diaDaExcecao = diaDeInstante(excecao.inicio);

      if (diaDaExcecao >= primeiroDia && diaDaExcecao <= ultimoDia) {
        expandidos.push(montarOcorrencia(excecao, excecao.inicio, excecao.fim, true));
      }
    }
  }

  return expandidos.sort((umEvento, outroEvento) => {
    if (umEvento.dia !== outroEvento.dia) {
      return umEvento.dia < outroEvento.dia ? -1 : 1;
    }

    return umEvento.horaInicio < outroEvento.horaInicio ? -1 : 1;
  });
}

function ocorrenciasDaSerie(
  serie: LinhaDeEvento,
  primeiroDia: DiaTexto,
  ultimoDia: DiaTexto,
): { inicio: Date; fim: Date }[] {
  const duracaoEmMs = serie.fim.getTime() - serie.inicio.getTime();

  if (serie.rrule === null) {
    const dia = diaDeInstante(serie.inicio);

    if (dia < primeiroDia || dia > ultimoDia) {
      return [];
    }

    return [{ inicio: serie.inicio, fim: serie.fim }];
  }

  // A janela é esticada um dia para cada lado porque a RRULE trabalha em
  // UTC e uma ocorrência da madrugada pode cair do outro lado da borda.
  const umDiaEmMs = 86400000;
  const abertura = new Date(`${primeiroDia}T00:00:00.000Z`).getTime() - umDiaEmMs;
  const fechamento = new Date(`${ultimoDia}T23:59:59.999Z`).getTime() + umDiaEmMs;

  let regra: RRule;

  try {
    regra = new RRule({
      ...RRule.parseString(serie.rrule),
      dtstart: serie.inicio,
    });
  } catch {
    // Regra inválida não derruba a tela: o evento vira único.
    return [{ inicio: serie.inicio, fim: serie.fim }];
  }

  const datas = regra.between(new Date(abertura), new Date(fechamento), true);

  return datas
    .map((inicio) => ({ inicio, fim: new Date(inicio.getTime() + duracaoEmMs) }))
    .filter((ocorrencia) => {
      const dia = diaDeInstante(ocorrencia.inicio);

      return dia >= primeiroDia && dia <= ultimoDia;
    });
}

function montarOcorrencia(
  linha: LinhaDeEvento,
  inicio: Date,
  fim: Date,
  recorrente: boolean,
): EventoDeTela {
  return {
    id: linha.eventoPaiId === null ? `${linha.id}:${diaDeInstante(inicio)}` : linha.id,
    titulo: linha.titulo,
    nota: linha.nota,
    local: linha.local,
    cor: linha.cor,
    dia: diaDeInstante(inicio),
    horaInicio: horaDeInstante(inicio, linha.fusoHorario),
    horaFim: horaDeInstante(fim, linha.fusoHorario),
    duracao: duracaoLegivel(inicio, fim),
    recorrente,
    serieId: linha.eventoPaiId ?? linha.id,
  };
}

/**
 * O estado de um hábito num dia.
 *
 * "nao-era-dia" só existe para hábito de dias fixos, e é o que diferencia
 * uma falha de um dia que nunca foi cobrado.
 */
export function estadoDoHabito(
  habito: LinhaDeHabito,
  dia: DiaTexto,
  diasMarcados: Set<DiaTexto>,
): EstadoDoHabito {
  if (diasMarcados.has(dia)) {
    return "feito";
  }

  const temDiasFixos = habito.diasDaSemana.length > 0;

  if (temDiasFixos && !habito.diasDaSemana.includes(diaDaSemana(dia))) {
    return "nao-era-dia";
  }

  if (dia > hoje()) {
    return "futuro";
  }

  return "falhou";
}

/** Monta um hábito com o contexto da semana em que o dia cai. */
export function habitoNoDia(
  habito: LinhaDeHabito,
  dia: DiaTexto,
  diasMarcados: Set<DiaTexto>,
): HabitoNoDia {
  const dias = semanaDe(dia);
  const semana = dias.map((cadaDia) => ({
    dia: cadaDia,
    estado: estadoDoHabito(habito, cadaDia, diasMarcados),
  }));

  const feitosNaSemana = semana.filter((entrada) => entrada.estado === "feito").length;
  const temDiasFixos = habito.diasDaSemana.length > 0;

  let alvoNaSemana = 7;

  if (temDiasFixos) {
    alvoNaSemana = habito.diasDaSemana.length;
  } else if (habito.metaPorSemana !== null) {
    alvoNaSemana = habito.metaPorSemana;
  }

  return {
    ...habitoParaTela(habito),
    estado: estadoDoHabito(habito, dia, diasMarcados),
    semana,
    feitosNaSemana,
    alvoNaSemana,
  };
}

/** Quantos dias de sequência cumprida, contando só dias programados. */
export function serieDoHabito(habito: LinhaDeHabito, diasMarcados: Set<DiaTexto>): number {
  const temDiasFixos = habito.diasDaSemana.length > 0;
  let dia = hoje();
  let serie = 0;
  let voltas = 0;

  // O limite de voltas é só um freio: 400 dias é mais do que qualquer
  // sequência que valha mostrar.
  while (voltas < 400) {
    voltas = voltas + 1;

    const eraDia = !temDiasFixos || habito.diasDaSemana.includes(diaDaSemana(dia));

    if (eraDia) {
      if (diasMarcados.has(dia)) {
        serie = serie + 1;
      } else if (dia !== hoje()) {
        // Hoje ainda não marcado não quebra a sequência: o dia não acabou.
        break;
      }
    }

    dia = somarUmDiaParaTras(dia);
  }

  return serie;
}

function somarUmDiaParaTras(dia: DiaTexto): DiaTexto {
  const data = new Date(`${dia}T00:00:00.000Z`);
  data.setUTCDate(data.getUTCDate() - 1);

  return dataParaDia(data);
}

/** Quantos dias uma tarefa vencida está atrasada. */
export function diasDeAtraso(data: Date): number {
  return diferencaEmDias(dataParaDia(data), hoje());
}
