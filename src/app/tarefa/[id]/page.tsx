"use client";

// Rota antiga: editar tarefa virou pop-up (src/components/EditarTarefa).
//
// Continua existindo só para link velho ou aba aberta não cair em 404.
// Manda para Hoje e já abre a edição da tarefa por cima, que é o que a
// URL pedia.

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Carregando } from "@/components/Avisos";
import { usarEdicao } from "@/components/Edicao";

export default function RotaAntigaDaTarefa() {
  const parametros = useParams<{ id: string }>();
  const navegador = useRouter();
  const { abrirTarefa } = usarEdicao();

  const identificador = parametros.id;

  useEffect(() => {
    navegador.replace("/");
    abrirTarefa(identificador);
  }, [identificador, navegador, abrirTarefa]);

  return <Carregando />;
}
