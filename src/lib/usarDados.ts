"use client";

import { useCallback, useEffect, useState } from "react";

type Estado<T> = {
  dados: T | null;
  carregando: boolean;
  erro: string | null;
  recarregar: () => void;
  /**
   * Altera os dados localmente, sem ir ao servidor.
   *
   * É o que permite a tela responder na hora: marca a tarefa, desenha o
   * resultado e só então manda a requisição. Se ela falhar, um
   * `recarregar()` traz a verdade do servidor de volta.
   */
  definirDados: (transformar: (anterior: T | null) => T | null) => void;
};

/**
 * Carrega algo da camada de dados e devolve o estado da tela.
 *
 * Os dados anteriores continuam na tela enquanto a próxima busca acontece.
 * Limpar e mostrar "carregando" a cada troca de dia faria a tela piscar a
 * cada toque — o que o usuário lê como lentidão, mesmo sendo rápido.
 */
export function usarDados<T>(buscar: () => Promise<T>, dependencias: unknown[] = []): Estado<T> {
  const [dados, setDados] = useState<T | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);

  const recarregar = useCallback(() => {
    setTentativa((anterior) => anterior + 1);
  }, []);

  const definirDados = useCallback(
    (transformar: (anterior: T | null) => T | null) => {
      setDados((anterior) => transformar(anterior));
    },
    [],
  );

  useEffect(() => {
    let cancelado = false;

    setCarregando(true);
    setErro(null);

    buscar()
      .then((resultado) => {
        if (!cancelado) {
          setDados(resultado);
          setCarregando(false);
        }
      })
      .catch((falha: unknown) => {
        if (!cancelado) {
          const mensagem =
            falha instanceof Error
              ? falha.message
              : "não foi possível carregar — verifique a conexão";

          setErro(mensagem);
          setCarregando(false);
        }
      });

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tentativa, ...dependencias]);

  return { dados, carregando, erro, recarregar, definirDados };
}
