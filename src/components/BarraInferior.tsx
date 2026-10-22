"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const abas = [
  { href: "/", rotulo: "Hoje", icone: IconeHoje },
  { href: "/semana", rotulo: "Semana", icone: IconeSemana },
  { href: "/pilha", rotulo: "Pilha", icone: IconePilha },
  { href: "/atrasadas", rotulo: "Atrasadas", icone: IconeAtrasadas },
  { href: "/habitos", rotulo: "Hábitos", icone: IconeHabitos },
];

export function BarraInferior() {
  const caminho = usePathname();

  // A tela de detalhe da tarefa é um formulário: a barra sai do caminho
  // para não oferecer fuga no meio dele. Criar item virou pop-up, então
  // não precisa mais estar nesta lista.
  if (caminho.startsWith("/tarefa")) {
    return null;
  }

  return (
    <nav className="rodape-seguro fixed bottom-0 left-1/2 flex w-full max-w-md -translate-x-1/2 border-t border-borda bg-papel pt-2">
      {abas.map((aba) => {
        const ativa = caminho === aba.href;
        const Icone = aba.icone;

        return (
          <Link
            key={aba.href}
            href={aba.href}
            aria-current={ativa ? "page" : undefined}
            className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-1 px-0.5 no-underline transition-colors duration-200 active:scale-90 ${
              ativa ? "text-verde" : "text-tinta-fraca"
            }`}
          >
            <Icone />
            <span className={`text-[9.5px] whitespace-nowrap ${ativa ? "font-semibold" : ""}`}>
              {aba.rotulo}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function IconeHoje() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  );
}

function IconeSemana() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M9 4v16M15 4v16" />
    </svg>
  );
}

function IconePilha() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 13l2.5-8h13L21 13v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M3 13h5l1.5 2.5h5L16 13h5" />
    </svg>
  );
}

function IconeAtrasadas() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9.5V13l2.5 2" />
      <path d="M5 4L8 6M19 4l-3 2" />
    </svg>
  );
}

function IconeHabitos() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}
