"use client";

import { useCallback, useEffect, useState } from "react";

type Estado<T> = {
  dados: T | null;
  carregando: boolean;
  erro: string | null;
  recarregar: () => void;
};

/**
 * Carrega algo da camada de dados e devolve o estado da tela.
 *
 * Simples de propósito: não há cache aqui. O cache de verdade é o banco
 * local do navegador, que entra dentro de `dados.ts` quando chegarmos no
 * offline — e aí este hook continua igual.
 */
export function usarDados<T>(buscar: () => Promise<T>, dependencias: unknown[] = []): Estado<T> {
  const [dados, setDados] = useState<T | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);

  const recarregar = useCallback(() => {
    setTentativa((anterior) => anterior + 1);
  }, []);

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

  return { dados, carregando, erro, recarregar };
}
