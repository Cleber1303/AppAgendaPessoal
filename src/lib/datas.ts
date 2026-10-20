// Tudo que envolve data e fuso passa por aqui.
//
// A regra da casa: um "dia" do app é um dia do calendário no fuso do app,
// escrito como "2026-10-19". Nunca um Date solto, porque Date carrega hora
// e fuso e isso faz a tarefa aparecer no dia errado perto da meia-noite.

export const FUSO = process.env.AGENDA_FUSO ?? "America/Sao_Paulo";

/** Um dia do calendário, no formato "AAAA-MM-DD". */
export type DiaTexto = string;

const diasAbreviados = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

const mesesLongos = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const diasLongos = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

/**
 * O dia de hoje no fuso do app.
 *
 * Usa Intl em vez de getDate() porque getDate() devolve o dia no fuso de
 * quem está rodando o código — e o servidor roda em UTC, o que no Brasil
 * vira "amanhã" depois das 21h.
 */
export function hoje(): DiaTexto {
  return diaDeInstante(new Date());
}

/** Converte um instante para o dia do calendário correspondente no fuso. */
export function diaDeInstante(instante: Date): DiaTexto {
  const formatador = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatador.format(instante);
}

/**
 * Converte "2026-10-19" para o Date que o Prisma guarda numa coluna @db.Date.
 *
 * Meia-noite UTC de propósito: coluna de data não tem fuso, e fixar UTC
 * evita que o valor volte do banco deslocado em um dia.
 */
export function diaParaData(dia: DiaTexto): Date {
  return new Date(`${dia}T00:00:00.000Z`);
}

/** Caminho inverso: o Date vindo de uma coluna @db.Date volta a ser texto. */
export function dataParaDia(data: Date): DiaTexto {
  return data.toISOString().slice(0, 10);
}

/** Soma (ou subtrai, com número negativo) dias de calendário. */
export function somarDias(dia: DiaTexto, quantidade: number): DiaTexto {
  const data = diaParaData(dia);
  data.setUTCDate(data.getUTCDate() + quantidade);

  return dataParaDia(data);
}

/** Quantos dias de calendário separam dois dias. Positivo se `fim` é depois. */
export function diferencaEmDias(inicio: DiaTexto, fim: DiaTexto): number {
  const umDiaEmMs = 86400000;
  const diferenca = diaParaData(fim).getTime() - diaParaData(inicio).getTime();

  return Math.round(diferenca / umDiaEmMs);
}

/** Dia da semana: 0 = domingo, 6 = sábado. */
export function diaDaSemana(dia: DiaTexto): number {
  return diaParaData(dia).getUTCDay();
}

/** A segunda-feira da semana em que o dia cai. */
export function inicioDaSemana(dia: DiaTexto): DiaTexto {
  const semana = diaDaSemana(dia);
  const recuo = semana === 0 ? 6 : semana - 1;

  return somarDias(dia, -recuo);
}

/** Os sete dias da semana que contém o dia informado, de segunda a domingo. */
export function semanaDe(dia: DiaTexto): DiaTexto[] {
  const primeiro = inicioDaSemana(dia);
  const dias: DiaTexto[] = [];

  for (let posicao = 0; posicao < 7; posicao = posicao + 1) {
    dias.push(somarDias(primeiro, posicao));
  }

  return dias;
}

/** "sex" */
export function rotuloCurto(dia: DiaTexto): string {
  return diasAbreviados[diaDaSemana(dia)];
}

/** "sexta-feira" */
export function rotuloLongo(dia: DiaTexto): string {
  return diasLongos[diaDaSemana(dia)];
}

/** "16" */
export function numeroDoDia(dia: DiaTexto): string {
  return dia.slice(8, 10);
}

/** "16 de outubro" */
export function diaEMes(dia: DiaTexto): string {
  const mes = Number(dia.slice(5, 7)) - 1;

  return `${Number(dia.slice(8, 10))} de ${mesesLongos[mes]}`;
}

/** "Outubro 2026" */
export function mesEAno(dia: DiaTexto): string {
  const mes = mesesLongos[Number(dia.slice(5, 7)) - 1];
  const nomeComMaiuscula = mes.charAt(0).toUpperCase() + mes.slice(1);

  return `${nomeComMaiuscula} ${dia.slice(0, 4)}`;
}

/** Um mês do calendário, no formato "AAAA-MM". */
export type MesTexto = string;

/** O mês a que um dia pertence. */
export function mesDe(dia: DiaTexto): MesTexto {
  return dia.slice(0, 7);
}

/** O mês corrente. */
export function mesAtual(): MesTexto {
  return mesDe(hoje());
}

/** Soma (ou subtrai, com número negativo) meses. */
export function somarMeses(mes: MesTexto, quantidade: number): MesTexto {
  const ano = Number(mes.slice(0, 4));
  const indice = Number(mes.slice(5, 7)) - 1 + quantidade;

  const anoFinal = ano + Math.floor(indice / 12);
  const mesFinal = ((indice % 12) + 12) % 12;

  return `${anoFinal}-${String(mesFinal + 1).padStart(2, "0")}`;
}

/** Todos os dias de um mês, em ordem. */
export function diasDoMes(mes: MesTexto): DiaTexto[] {
  const ano = Number(mes.slice(0, 4));
  const indice = Number(mes.slice(5, 7));

  // Dia 0 do mês seguinte é o último dia deste.
  const quantidade = new Date(Date.UTC(ano, indice, 0)).getUTCDate();
  const dias: DiaTexto[] = [];

  for (let numero = 1; numero <= quantidade; numero = numero + 1) {
    dias.push(`${mes}-${String(numero).padStart(2, "0")}`);
  }

  return dias;
}

/** "16/10" */
export function diaBarraMes(dia: DiaTexto): string {
  return `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;
}

/** "16/10/2026" */
export function dataCompleta(dia: DiaTexto): string {
  return `${dia.slice(8, 10)}/${dia.slice(5, 7)}/${dia.slice(0, 4)}`;
}

/**
 * Transforma um dia mais "HH:mm" no instante correspondente naquele fuso.
 *
 * Faz a conta medindo o deslocamento real do fuso na data em questão, em
 * vez de assumir -03:00 fixo. É isso que mantém o horário certo quando o
 * horário de verão entra ou sai.
 */
export function instanteDe(dia: DiaTexto, hora: string, fuso: string = FUSO): Date {
  const [horas, minutos] = hora.split(":").map(Number);
  const palpite = new Date(`${dia}T${hora}:00.000Z`);
  const deslocamento = deslocamentoEmMinutos(palpite, fuso);

  return new Date(Date.UTC(
    Number(dia.slice(0, 4)),
    Number(dia.slice(5, 7)) - 1,
    Number(dia.slice(8, 10)),
    horas,
    minutos + deslocamento,
  ));
}

/** Quantos minutos o fuso está atrás de UTC naquele instante. */
function deslocamentoEmMinutos(instante: Date, fuso: string): number {
  const formatador = new Intl.DateTimeFormat("en-US", {
    timeZone: fuso,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const partes: Record<string, string> = {};

  for (const parte of formatador.formatToParts(instante)) {
    if (parte.type !== "literal") {
      partes[parte.type] = parte.value;
    }
  }

  const comoUtc = Date.UTC(
    Number(partes.year),
    Number(partes.month) - 1,
    Number(partes.day),
    Number(partes.hour) === 24 ? 0 : Number(partes.hour),
    Number(partes.minute),
    Number(partes.second),
  );

  const umMinutoEmMs = 60000;

  return Math.round((instante.getTime() - comoUtc) / umMinutoEmMs);
}

/** Extrai o "HH:mm" local de um instante. */
export function horaDeInstante(instante: Date, fuso: string = FUSO): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(instante);
}

/** "1h30", "2h", "45min" — a duração entre dois instantes. */
export function duracaoLegivel(inicio: Date, fim: Date): string {
  const totalMinutos = Math.round((fim.getTime() - inicio.getTime()) / 60000);

  if (totalMinutos < 60) {
    return `${totalMinutos}min`;
  }

  const horas = Math.floor(totalMinutos / 60);
  const minutos = totalMinutos % 60;

  if (minutos === 0) {
    return `${horas}h`;
  }

  return `${horas}h${String(minutos).padStart(2, "0")}`;
}