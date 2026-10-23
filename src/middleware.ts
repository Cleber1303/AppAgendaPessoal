// A tranca do app.
//
// Roda antes de qualquer tela e de qualquer rota de API. É aqui que a
// senha vale — proteger só as telas e deixar /api/tarefas aberto não
// protegeria nada, porque os dados saem por lá do mesmo jeito.

import { NextResponse, type NextRequest } from "next/server";
import { NOME_DO_COOKIE, segredoDaSessao, sessaoValida } from "@/lib/sessao";

export async function middleware(requisicao: NextRequest) {
  const ehApi = requisicao.nextUrl.pathname.startsWith("/api/");
  const senhaConfigurada = process.env.AGENDA_SENHA;

  // Sem senha definida em produção, tranca tudo em vez de liberar tudo.
  // Uma variável de ambiente esquecida no deploy não pode virar um app
  // aberto para a internet sem ninguém perceber.
  if (senhaConfigurada === undefined || senhaConfigurada === "") {
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.next();
    }

    return new NextResponse(
      "AGENDA_SENHA não está definida. Defina a variável de ambiente para liberar o app.",
      { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  const segredo = segredoDaSessao();

  if (segredo === null) {
    return new NextResponse("Sessão mal configurada.", { status: 503 });
  }

  const cookie = requisicao.cookies.get(NOME_DO_COOKIE)?.value;

  if (await sessaoValida(cookie, segredo)) {
    return NextResponse.next();
  }

  // API responde 401 em vez de redirecionar: a tela trata o erro, e um
  // fetch que recebe HTML de login no lugar de JSON quebra de um jeito
  // confuso de depurar.
  if (ehApi) {
    return NextResponse.json({ erro: "sessão expirada" }, { status: 401 });
  }

  const destino = requisicao.nextUrl.clone();
  destino.pathname = "/entrar";
  destino.search = "";

  return NextResponse.redirect(destino);
}

export const config = {
  // Tudo, menos a própria tela de senha, a rota que confere a senha e os
  // arquivos estáticos — que precisam carregar antes de haver sessão.
  matcher: [
    "/((?!entrar|api/entrar|_next/static|_next/image|manifest\\.json|icone\\.svg|favicon\\.ico).*)",
  ],
};
