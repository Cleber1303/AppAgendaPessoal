// Confere a senha e abre a sessão.
//
// Única rota que o middleware deixa passar sem cookie — por isso ela é a
// porta, e precisa ser a parte mais cuidadosa do app.

import { NextResponse } from "next/server";
import {
  criarSessao,
  DIAS_DE_SESSAO,
  iguaisEmTempoConstante,
  NOME_DO_COOKIE,
  segredoDaSessao,
} from "@/lib/sessao";

/**
 * Atraso fixo em toda tentativa errada.
 *
 * Não é proteção de verdade contra força bruta — para isso seria preciso
 * contar tentativas em algum lugar, e aqui não há onde. Mas transforma
 * milhões de tentativas por minuto em algumas por segundo, o que já muda
 * a conta de quem tentaria. O que protege mesmo é uma senha longa.
 */
const ATRASO_NA_FALHA = 500;

function esperar(milissegundos: number): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, milissegundos));
}

export async function POST(requisicao: Request) {
  const senhaCerta = process.env.AGENDA_SENHA;

  if (senhaCerta === undefined || senhaCerta === "") {
    return NextResponse.json(
      { erro: "AGENDA_SENHA não está definida no servidor" },
      { status: 503 },
    );
  }

  const segredo = segredoDaSessao();

  if (segredo === null) {
    return NextResponse.json({ erro: "sessão mal configurada" }, { status: 503 });
  }

  const corpo = await requisicao.json().catch(() => ({}));
  const tentativa = typeof corpo.senha === "string" ? corpo.senha : "";

  if (!iguaisEmTempoConstante(tentativa, senhaCerta)) {
    await esperar(ATRASO_NA_FALHA);

    return NextResponse.json({ erro: "Senha errada." }, { status: 401 });
  }

  const resposta = NextResponse.json({ ok: true });

  resposta.cookies.set({
    name: NOME_DO_COOKIE,
    value: await criarSessao(segredo),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DIAS_DE_SESSAO * 86400,
  });

  return resposta;
}

/** Fecha a sessão. */
export async function DELETE() {
  const resposta = NextResponse.json({ ok: true });

  resposta.cookies.set({
    name: NOME_DO_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return resposta;
}
