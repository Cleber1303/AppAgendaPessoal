"use client";

// Quem abre as edições.
//
// As telas não sabem montar o pop-up: elas só pedem "abre a tarefa X".
// O pop-up em si mora no layout, acima de todas as telas, porque é isso
// que o deixa aparecer por cima de qualquer uma sem navegação.
//
// Era rota antes (/tarefa/[id] e /evento/[id]). Virou isto porque rota
// troca a tela, e trocar a tela para mudar um horário faz você perder o
// dia que estava olhando.

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { EditarEvento } from "@/components/EditarEvento";
import { EditarTarefa } from "@/components/EditarTarefa";

type Abertura =
  | { tipo: "tarefa"; id: string }
  | { tipo: "evento"; id: string; dia: string | null };

type Edicao = {
  abrirTarefa: (id: string) => void;
  /** `dia` é a ocorrência tocada, e é o que permite apagar só um dia. */
  abrirEvento: (id: string, dia?: string | null) => void;
};

const Contexto = createContext<Edicao | null>(null);

export function usarEdicao(): Edicao {
  const valor = useContext(Contexto);

  if (valor === null) {
    throw new Error("usarEdicao precisa do ProvedorDeEdicao no layout");
  }

  return valor;
}

export function ProvedorDeEdicao({ children }: { children: React.ReactNode }) {
  const [abertura, setAbertura] = useState<Abertura | null>(null);

  const fechar = useCallback(() => {
    setAbertura(null);
  }, []);

  const acoes = useMemo<Edicao>(
    () => ({
      abrirTarefa: (id) => setAbertura({ tipo: "tarefa", id }),
      abrirEvento: (id, dia = null) => setAbertura({ tipo: "evento", id, dia }),
    }),
    [],
  );

  return (
    <Contexto.Provider value={acoes}>
      {children}

      {/*
        Montado só quando há algo aberto, e com `key` no id: abrir outra
        tarefa monta um componente novo em vez de reaproveitar o anterior
        com os campos ainda preenchidos pela tarefa de antes.
      */}
      {abertura !== null && abertura.tipo === "tarefa" && (
        <EditarTarefa key={abertura.id} id={abertura.id} aberto aoFechar={fechar} />
      )}

      {abertura !== null && abertura.tipo === "evento" && (
        <EditarEvento
          key={`${abertura.id}-${abertura.dia ?? ""}`}
          id={abertura.id}
          dia={abertura.dia}
          aberto
          aoFechar={fechar}
        />
      )}
    </Contexto.Provider>
  );
}
