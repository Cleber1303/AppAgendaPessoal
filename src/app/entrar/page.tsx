"use client";

// A tela de senha.
//
// Primeira coisa que aparece quando não há sessão. Sem usuário, sem
// cadastro, sem "esqueci a senha": é um app de uma pessoa só, e tudo isso
// seria cerimônia sem função.

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function TelaDeEntrada() {
  const navegador = useRouter();
  const [senha, setSenha] = useState("");
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function entrar(evento: React.FormEvent) {
    evento.preventDefault();

    if (senha === "") {
      setErro("Digite a senha.");

      return;
    }

    setEntrando(true);
    setErro(null);

    try {
      const resposta = await fetch("/api/entrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha }),
      });

      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => ({}));

        setErro(corpo.erro ?? "Não foi possível entrar.");
        setSenha("");
        setEntrando(false);

        return;
      }

      // `refresh` antes de navegar: sem isso o Next pode servir a tela
      // anterior do cache, ainda sem sessão, e a pessoa volta para cá.
      navegador.refresh();
      navegador.replace("/");
    } catch {
      setErro("Sem conexão com o servidor.");
      setEntrando(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-8">
      <form onSubmit={entrar} className="entra w-full max-w-xs">
        <div className="mb-7 flex flex-col items-center gap-3">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-verde text-white">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <rect x="3" y="5" width="18" height="16" rx="2.5" />
              <path d="M8 3v4M16 3v4M3 10h18" />
            </svg>
          </span>
          <h1 className="m-0 text-2xl font-semibold tracking-tight">Agenda</h1>
        </div>

        <label
          htmlFor="senha"
          className="block font-mono text-[10px] tracking-[0.14em] text-tinta-fraca uppercase"
        >
          Senha
        </label>
        <input
          id="senha"
          type="password"
          value={senha}
          onChange={(campo) => setSenha(campo.target.value)}
          autoComplete="current-password"
          autoFocus
          className="mt-1.5 min-h-12 w-full rounded-[10px] border border-[#d7d8d2] bg-papel px-3 text-center font-mono text-base tracking-[0.3em]"
        />

        {erro !== null && (
          <p className="mt-3 mb-0 rounded-lg bg-ambar-claro px-3 py-2 text-center text-[13px] text-ambar">
            {erro}
          </p>
        )}

        <button
          type="submit"
          disabled={entrando}
          className="mt-4 min-h-12 w-full rounded-[11px] border-0 bg-verde text-[15.5px] font-semibold text-white transition-transform duration-150 active:scale-95 disabled:opacity-60"
        >
          {entrando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
