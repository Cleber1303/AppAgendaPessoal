// A sessão: o cookie que diz "esta pessoa já digitou a senha".
//
// O cookie não guarda a senha, guarda uma validade assinada. Sem a
// assinatura, bastaria alguém criar um cookie chamado agenda_sessao no
// navegador para entrar — é por isso que não dá para usar um valor fixo
// tipo "true".
//
// Tudo aqui usa Web Crypto em vez do módulo crypto do Node, porque o
// middleware roda no Edge, onde o módulo do Node não existe.

export const NOME_DO_COOKIE = "agenda_sessao";

/** Quanto tempo a sessão dura. Longo de propósito: é o seu celular. */
export const DIAS_DE_SESSAO = 180;

/**
 * O segredo que assina o cookie.
 *
 * Se você não definir AGENDA_SEGREDO, ele cai na própria senha. Funciona,
 * e tem um efeito desejável: trocar a senha invalida as sessões abertas.
 */
export function segredoDaSessao(): string | null {
  const segredo = process.env.AGENDA_SEGREDO;

  if (segredo !== undefined && segredo !== "") {
    return segredo;
  }

  const senha = process.env.AGENDA_SENHA;

  if (senha !== undefined && senha !== "") {
    return senha;
  }

  return null;
}

function paraBase64Url(bytes: ArrayBuffer): string {
  const binario = String.fromCharCode(...new Uint8Array(bytes));

  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function assinar(mensagem: string, segredo: string): Promise<string> {
  const codificador = new TextEncoder();

  const chave = await crypto.subtle.importKey(
    "raw",
    codificador.encode(segredo),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const assinatura = await crypto.subtle.sign("HMAC", chave, codificador.encode(mensagem));

  return paraBase64Url(assinatura);
}

/**
 * Compara sem entregar pista pelo tempo gasto.
 *
 * Um `===` normal para de comparar no primeiro caractere diferente, e a
 * diferença de microssegundos entre "errou no primeiro" e "errou no
 * décimo" é medível. Aqui a conta percorre a string inteira sempre.
 */
export function iguaisEmTempoConstante(um: string, outro: string): boolean {
  if (um.length !== outro.length) {
    return false;
  }

  let diferenca = 0;

  for (let posicao = 0; posicao < um.length; posicao = posicao + 1) {
    diferenca = diferenca | (um.charCodeAt(posicao) ^ outro.charCodeAt(posicao));
  }

  return diferenca === 0;
}

/** O valor do cookie: validade mais a assinatura dela. */
export async function criarSessao(segredo: string): Promise<string> {
  const expiraEm = Date.now() + DIAS_DE_SESSAO * 86400000;
  const assinatura = await assinar(String(expiraEm), segredo);

  return `${expiraEm}.${assinatura}`;
}

/** Verdadeiro só se a assinatura confere e a validade não passou. */
export async function sessaoValida(valor: string | undefined, segredo: string): Promise<boolean> {
  if (valor === undefined) {
    return false;
  }

  const separador = valor.lastIndexOf(".");

  if (separador <= 0) {
    return false;
  }

  const expiraEm = valor.slice(0, separador);
  const assinatura = valor.slice(separador + 1);
  const esperada = await assinar(expiraEm, segredo);

  if (!iguaisEmTempoConstante(assinatura, esperada)) {
    return false;
  }

  const limite = Number(expiraEm);

  return Number.isFinite(limite) && limite > Date.now();
}
