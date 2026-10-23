// A regra de repetição de um evento, e a tradução dela para iCalendar.
//
// A interface trabalha com esta forma, que é fácil de desenhar; o banco
// guarda a RRULE, que é o padrão e o que permite exportar .ics um dia.
// A conversão vive aqui, num lugar só.

/** Os três modos que a interface oferece. */
export type Repeticao =
  | { tipo: "nao" }
  /** `dias`: 0 = domingo … 6 = sábado. */
  | { tipo: "semanal"; dias: number[] }
  /** `dias`: 1 a 31. */
  | { tipo: "mensal"; dias: number[] };

export const SEM_REPETICAO: Repeticao = { tipo: "nao" };

const siglasDaSemana = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const nomesCurtos = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/**
 * A RRULE correspondente, ou nulo quando não repete.
 *
 * O horário e o início da série saem do próprio evento (o dtstart), então
 * aqui só entra a regra. Se os dias escolhidos não incluírem o dia do
 * evento, a primeira ocorrência é a próxima que bate — que é o que se
 * espera ao marcar "toda segunda" numa quinta-feira.
 */
export function repeticaoParaRrule(repeticao: Repeticao): string | null {
  if (repeticao.tipo === "nao" || repeticao.dias.length === 0) {
    return null;
  }

  if (repeticao.tipo === "semanal") {
    const siglas = [...repeticao.dias].sort((um, outro) => um - outro).map((dia) => siglasDaSemana[dia]);

    return `FREQ=WEEKLY;BYDAY=${siglas.join(",")}`;
  }

  const dias = [...repeticao.dias].sort((um, outro) => um - outro);

  return `FREQ=MONTHLY;BYMONTHDAY=${dias.join(",")}`;
}

/**
 * O caminho inverso: a RRULE guardada volta para a forma da interface.
 *
 * Só entende o que esta tela sabe gerar — semanal por dia da semana e
 * mensal por dia do mês. Qualquer outra regra vira "não repete" em vez
 * de quebrar a tela, e salvar por cima a substitui. Se um dia o app
 * importar .ics de fora, é aqui que vai doer.
 */
export function deRrule(texto: string | null): Repeticao {
  if (texto === null || texto === "") {
    return SEM_REPETICAO;
  }

  const partes = new Map<string, string>();

  for (const pedaco of texto.split(";")) {
    const igual = pedaco.indexOf("=");

    if (igual > 0) {
      partes.set(pedaco.slice(0, igual).toUpperCase(), pedaco.slice(igual + 1));
    }
  }

  const frequencia = partes.get("FREQ");

  if (frequencia === "WEEKLY") {
    const porDia = partes.get("BYDAY");

    if (porDia === undefined || porDia === "") {
      return SEM_REPETICAO;
    }

    const dias = porDia
      .split(",")
      .map((sigla) => siglasDaSemana.indexOf(sigla.trim().toUpperCase()))
      .filter((indice) => indice >= 0);

    return dias.length === 0 ? SEM_REPETICAO : { tipo: "semanal", dias };
  }

  if (frequencia === "MONTHLY") {
    const porDiaDoMes = partes.get("BYMONTHDAY");

    if (porDiaDoMes === undefined || porDiaDoMes === "") {
      return SEM_REPETICAO;
    }

    const dias = porDiaDoMes
      .split(",")
      .map((numero) => Number(numero.trim()))
      .filter((numero) => Number.isInteger(numero) && numero >= 1 && numero <= 31);

    return dias.length === 0 ? SEM_REPETICAO : { tipo: "mensal", dias };
  }

  return SEM_REPETICAO;
}

/** O texto que aparece na linha fechada. */
export function descreverRepeticao(repeticao: Repeticao): string {
  if (repeticao.tipo === "nao") {
    return "Não repete";
  }

  if (repeticao.dias.length === 0) {
    return "Escolha os dias";
  }

  if (repeticao.tipo === "semanal") {
    if (repeticao.dias.length === 7) {
      return "Todo dia";
    }

    const nomes = [...repeticao.dias]
      .sort((um, outro) => um - outro)
      .map((dia) => nomesCurtos[dia]);

    return nomes.join(", ");
  }

  const dias = [...repeticao.dias].sort((um, outro) => um - outro);

  if (dias.length === 1) {
    return `Todo dia ${dias[0]}`;
  }

  return `Dias ${dias.join(", ")}`;
}

/**
 * O primeiro dia, a partir de `aPartirDe`, em que a regra acontece.
 *
 * É isso que o campo de data do evento passa a mostrar quando há
 * repetição: o dia deixa de ser escolhido à mão e vira consequência da
 * regra. Sem isso, marcar "todo dia 24" num evento datado de 22 faz o 22
 * parecer ignorado — porque é.
 *
 * Varre dia a dia em vez de calcular: são no máximo algumas dezenas de
 * voltas, e a conta direta erraria justamente nos casos chatos (dia 31,
 * fevereiro, ano bissexto).
 */
export function primeiroDiaQueBate(repeticao: Repeticao, aPartirDe: string): string {
  if (repeticao.tipo === "nao" || repeticao.dias.length === 0) {
    return aPartirDe;
  }

  let dia = aPartirDe;

  // 400 é folga: o maior intervalo possível é de dia 31 em janeiro até dia
  // 31 em março, uns 59 dias.
  for (let volta = 0; volta < 400; volta = volta + 1) {
    const data = new Date(`${dia}T00:00:00.000Z`);

    const bate =
      repeticao.tipo === "semanal"
        ? repeticao.dias.includes(data.getUTCDay())
        : repeticao.dias.includes(data.getUTCDate());

    if (bate) {
      return dia;
    }

    data.setUTCDate(data.getUTCDate() + 1);
    dia = data.toISOString().slice(0, 10);
  }

  return aPartirDe;
}

/**
 * Avisa quando a regra escolhida pode pular meses.
 *
 * Dia 29, 30 e 31 não existem em todo mês, e o padrão iCalendar
 * simplesmente não gera ocorrência nesses meses — não empurra para o
 * último dia. Quem marca 31 precisa saber que fevereiro fica de fora.
 */
export function mesesQuePula(repeticao: Repeticao): string | null {
  if (repeticao.tipo !== "mensal") {
    return null;
  }

  const maior = Math.max(...repeticao.dias, 0);

  if (maior === 31) {
    return "Meses sem dia 31 ficam de fora.";
  }

  if (maior === 30) {
    return "Fevereiro fica de fora.";
  }

  if (maior === 29) {
    return "Fevereiro fica de fora, exceto em ano bissexto.";
  }

  return null;
}
