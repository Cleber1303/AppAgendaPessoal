"use client";

// O pop-up do app: cartão no meio da tela, fundo escurecido e borrado.
//
// É um <dialog> de verdade, não uma div com position: fixed. O elemento
// nativo entrega Esc para fechar, travamento de foco dentro do pop-up e
// o resto da página inerte para leitores de tela. Refazer isso à mão dá
// muito trabalho e sai pior.
//
// A aparência vem das regras .pop-up do globals.css, onde está explicado
// por que o próprio <dialog> é a camada escura e não o ::backdrop.
//
// Quem abre controla: a propriedade `aberto` manda, e `aoFechar` é
// chamado DEPOIS da animação de saída. Por isso fechar não é instantâneo
// — são os 150ms da animação.

import { useEffect, useRef, useState } from "react";

export function Popup({
  aberto,
  aoFechar,
  titulo,
  acao,
  children,
}: {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  /** O botão da direita no cabeçalho. Sem ele, só sobra o "Fechar". */
  acao?: React.ReactNode;
  children: React.ReactNode;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [fechando, setFechando] = useState(false);

  useEffect(() => {
    const elemento = dialogo.current;

    if (elemento === null) {
      return;
    }

    if (aberto && !elemento.open) {
      elemento.showModal();
    }

    if (!aberto && elemento.open) {
      elemento.close();
      setFechando(false);
    }
  }, [aberto]);

  useEffect(() => {
    const elemento = dialogo.current;

    if (elemento === null) {
      return;
    }

    // O botão de voltar do celular fecha o <dialog> por fora, sem passar
    // pelo nosso fechar(). Sem isto, o estado de quem abriu continuaria
    // achando que o pop-up está na tela.
    function aoFecharNativo() {
      setFechando(false);
      aoFechar();
    }

    elemento.addEventListener("close", aoFecharNativo);

    return () => {
      elemento.removeEventListener("close", aoFecharNativo);
    };
  }, [aoFechar]);

  function fechar() {
    setFechando(true);

    // Espera a animação de saída antes de tirar o elemento da tela.
    window.setTimeout(() => {
      setFechando(false);
      aoFechar();
    }, 150);
  }

  return (
    <dialog
      ref={dialogo}
      aria-label={titulo}
      onClick={(evento) => {
        // Clique no próprio <dialog> é clique no fundo: o conteúdo está
        // numa div interna, então o alvo só é o dialog fora dela.
        if (evento.target === dialogo.current) {
          fechar();
        }
      }}
      onCancel={(evento) => {
        // Esc: impede o fechamento imediato para a animação acontecer.
        evento.preventDefault();
        fechar();
      }}
      className={`pop-up ${fechando ? "saindo" : ""}`}
    >
      <div className="pop-up-cartao flex max-h-full w-[min(92vw,26rem)] flex-col overflow-hidden rounded-2xl bg-papel shadow-[0_20px_60px_rgba(20,22,25,0.28)]">
        <header className="flex shrink-0 items-center justify-between border-b border-borda px-4 py-3">
          <button
            type="button"
            onClick={fechar}
            className="flex min-h-11 items-center border-0 bg-transparent px-1 text-[14.5px] text-tinta-fraca"
          >
            Fechar
          </button>
          <span className="text-[15px] font-semibold">{titulo}</span>
          {acao ?? <span className="min-h-11 w-14" />}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-5">{children}</div>
      </div>
    </dialog>
  );
}

/** O botão verde da direita no cabeçalho do pop-up. */
export function BotaoDoPopup({
  children,
  aoClicar,
  desabilitado = false,
}: {
  children: React.ReactNode;
  aoClicar: () => void;
  desabilitado?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      disabled={desabilitado}
      className="min-h-11 rounded-[9px] border-0 bg-verde px-3.5 text-[14.5px] font-semibold text-white transition-transform duration-150 active:scale-95 disabled:opacity-60"
    >
      {children}
    </button>
  );
}
