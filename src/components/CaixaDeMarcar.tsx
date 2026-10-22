"use client";

// A caixa de marcar do app.
//
// Substitui o <input type="checkbox"> nativo porque o nativo não anima: ele
// pinta de uma vez. Aqui o traço do visto é desenhado, e o toque responde
// antes mesmo da requisição sair — é a diferença entre "o app respondeu" e
// "o app está pensando".
//
// É um <button> com role="checkbox", não uma div: assim continua acessível
// pelo teclado e pelo leitor de tela, com estado anunciado.

export function CaixaDeMarcar({
  marcada,
  rotulo,
  aoAlternar,
  desabilitada = false,
}: {
  marcada: boolean;
  rotulo: string;
  aoAlternar: () => void;
  desabilitada?: boolean;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={marcada}
      aria-label={rotulo}
      disabled={desabilitada}
      onClick={aoAlternar}
      className={`flex size-5 shrink-0 items-center justify-center rounded-[6px] border-[1.5px] transition-all duration-200 ease-out active:scale-90 disabled:opacity-50 ${
        marcada ? "border-verde bg-verde" : "border-[#c9cbc4] bg-papel"
      }`}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={`transition-opacity duration-150 ${marcada ? "opacity-100" : "opacity-0"}`}
      >
        <path
          d="M5 13l4 4L19 7"
          // O traço tem 22 unidades: escondido é todo deslocado, marcado é
          // deslocamento zero — o visto aparece sendo desenhado.
          style={{
            strokeDasharray: 22,
            strokeDashoffset: marcada ? 0 : 22,
            transition: "stroke-dashoffset 220ms ease-out",
          }}
        />
      </svg>
    </button>
  );
}
