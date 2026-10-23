"use client";

// Rota antiga: editar evento virou pop-up (src/components/EditarEvento).
//
// Continua existindo só para link velho ou aba aberta não cair em 404.
// Manda para Hoje e já abre a edição do evento por cima, que é o que a
// URL pedia.

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Carregando } from "@/components/Avisos";
import { usarEdicao } from "@/components/Edicao";

export default function RotaAntigaDoEvento() {
  const parametros = useParams<{ id: string }>();
  const busca = useSearchParams();
  const navegador = useRouter();
  const { abrirEvento } = usarEdicao();

  const identificador = parametros.id;
  const dia = busca.get("dia");

  useEffect(() => {
    navegador.replace("/");
    abrirEvento(identificador, dia);
  }, [identificador, dia, navegador, abrirEvento]);

  return <Carregando />;
}
