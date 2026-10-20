"use client";

/** O estado de carregamento. Discreto de propósito: o app abre rápido. */
export function Carregando() {
  return (
    <div className="px-5 py-10 text-center font-mono text-xs text-tinta-apagada">
      carregando…
    </div>
  );
}

/**
 * Quando a leitura falha.
 *
 * Fala de rede em vez de erro porque, enquanto não houver banco local,
 * rede fora é o motivo de quase toda falha aqui.
 */
export function Falhou({ mensagem, aoTentarDeNovo }: { mensagem: string; aoTentarDeNovo: () => void }) {
  return (
    <div className="mx-5 my-6 rounded-xl border border-ambar-borda bg-ambar-claro p-4">
      <p className="m-0 text-sm text-tinta">{mensagem}</p>
      <button
        type="button"
        onClick={aoTentarDeNovo}
        className="mt-3 min-h-11 rounded-lg border-0 bg-verde px-4 text-sm font-semibold text-white"
      >
        Tentar de novo
      </button>
    </div>
  );
}

/** Lista sem nada dentro. */
export function Vazio({ texto }: { texto: string }) {
  return <p className="my-4 text-sm text-tinta-apagada">{texto}</p>;
}

export function IconeMais() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconeHistorico() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 5h18v4H3z" />
      <path d="M5 9v10h14V9" />
      <path d="M10 13h4" />
    </svg>
  );
}

export function IconeVoltar() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

export function IconeSeta() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
