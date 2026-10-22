// O aviso de "algo mudou, recarregue".
//
// O pop-up de criar item vive no layout, fora das telas, então não tem
// como chamar o recarregar() de cada uma. Ele dispara este evento na
// janela e quem estiver montado escuta — o usarDados faz isso por todas
// as telas de uma vez.
//
// Mora num arquivo próprio porque o componente importa a camada de dados
// e a camada de dados precisaria importar o componente: pôr a constante
// em qualquer um dos dois fecharia um ciclo.

export const EVENTO_DE_ATUALIZACAO = "agenda:atualizou";

/** Avisa todas as telas abertas que os dados mudaram. */
export function avisarAtualizacao(): void {
  window.dispatchEvent(new CustomEvent(EVENTO_DE_ATUALIZACAO));
}
