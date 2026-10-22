"use client";

// A pilha: o que não tem data.
//
// Duas regras existem só para ela não apodrecer invisível, que é o destino
// dessa lista em todo app de tarefas: teto de itens e envelhecimento.
//
// A ordem manual é arrastando pela alça de pontinhos à esquerda. Arrastar
// enquanto está ordenado por idade troca o modo sozinho: mover um item é
// dizer "eu quero este aqui", e isso é ordem manual por definição.

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { useState } from "react";
import { CaixaDeMarcar } from "@/components/CaixaDeMarcar";
import { Carregando, Falhou, Vazio } from "@/components/Avisos";
import { carregarPilha, concluirTarefa, reordenarPilha } from "@/lib/dados";
import { DIAS_PARA_ENVELHECER, TETO_DA_PILHA, type ItemDaPilha } from "@/lib/tipos";
import { usarDados } from "@/lib/usarDados";

type Ordenacao = "manual" | "idade";

export default function TelaPilha() {
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("idade");
  const [avisoDeFalha, setAvisoDeFalha] = useState<string | null>(null);
  const { dados, carregando, erro, recarregar, definirDados } = usarDados(() =>
    carregarPilha(),
  );

  // Só o PointerSensor: ele já cobre toque, mouse e caneta. Registrar o
  // TouchSensor junto faria os dois dispararem no celular e o arrasto
  // ativar duas vezes.
  //
  // A distância mínima de 6px evita que um toque parado na alça já conte
  // como arrasto; a alça tem touch-action: none, então não briga com a
  // rolagem da lista.
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const itens = ordenarItens(dados ?? [], ordenacao);
  const total = itens.length;

  function aoTerminarArrasto(evento: DragEndEvent) {
    const { active, over } = evento;

    if (over === null || active.id === over.id) {
      return;
    }

    const anterior = itens.findIndex((item) => item.id === active.id);
    const novo = itens.findIndex((item) => item.id === over.id);

    if (anterior === -1 || novo === -1) {
      return;
    }

    const reordenados = arrayMove(itens, anterior, novo).map((item, posicao) => ({
      ...item,
      ordem: posicao,
    }));

    // A lista reordena na hora; o servidor é avisado depois.
    definirDados(() => reordenados);
    setOrdenacao("manual");
    setAvisoDeFalha(null);

    reordenarPilha(reordenados.map((item) => item.id)).catch(() => {
      setAvisoDeFalha("não deu para salvar a nova ordem — recarregando");
      recarregar();
    });
  }

  function concluirItem(id: string) {
    // Some da lista imediatamente. Esperar o servidor para só então sumir
    // faz um toque simples parecer travado.
    definirDados((anterior) =>
      anterior === null ? anterior : anterior.filter((item) => item.id !== id),
    );

    concluirTarefa(id).catch(() => {
      setAvisoDeFalha("não deu para concluir — recarregando");
      recarregar();
    });
  }

  return (
    <>
      <header className="border-b border-borda bg-papel px-5 pt-4 pb-3.5">
        <h1 className="m-0 text-2xl font-semibold tracking-tight">Pilha</h1>

        <div className="mt-3 flex items-center gap-2.5">
          <div className="h-1.5 flex-1 overflow-hidden rounded-sm bg-borda-leve">
            <div
              className="h-1.5 bg-verde transition-[width] duration-300 ease-out"
              style={{ width: `${Math.min(100, (total / TETO_DA_PILHA) * 100)}%` }}
            />
          </div>
          <span className="shrink-0 font-mono text-[11px] text-tinta-fraca">
            {total} / {TETO_DA_PILHA}
          </span>
        </div>

        <div className="mt-3.5 flex gap-1">
          <BotaoDeOrdem ativo={ordenacao === "manual"} aoClicar={() => setOrdenacao("manual")}>
            Ordem manual
          </BotaoDeOrdem>
          <BotaoDeOrdem ativo={ordenacao === "idade"} aoClicar={() => setOrdenacao("idade")}>
            Por idade
          </BotaoDeOrdem>
        </div>
      </header>

      {carregando && dados === null && <Carregando />}
      {erro !== null && dados === null && <Falhou mensagem={erro} aoTentarDeNovo={recarregar} />}

      {dados !== null && (
        <main className="entra px-5 pt-1">
          {avisoDeFalha !== null && (
            <p className="mt-2 mb-0 rounded-lg bg-ambar-claro px-3 py-2 text-[13px] text-ambar">
              {avisoDeFalha}
            </p>
          )}

          {itens.length === 0 && <Vazio texto="A pilha está vazia." />}

          <DndContext
            sensors={sensores}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            onDragEnd={aoTerminarArrasto}
          >
            <SortableContext
              items={itens.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="m-0 list-none p-0">
                {itens.map((item) => (
                  <ItemDaLista key={item.id} item={item} aoConcluir={concluirItem} />
                ))}
              </ul>
            </SortableContext>
          </DndContext>

          <div className="h-6" />
        </main>
      )}

    </>
  );
}

function ordenarItens(itens: ItemDaPilha[], ordenacao: Ordenacao): ItemDaPilha[] {
  if (ordenacao === "manual") {
    return [...itens].sort((um, outro) => um.ordem - outro.ordem);
  }

  // Item velho sobe: é o mecanismo que impede a pilha de virar um depósito.
  return [...itens].sort((um, outro) => outro.idadeEmDias - um.idadeEmDias);
}

function BotaoDeOrdem({
  ativo,
  aoClicar,
  children,
}: {
  ativo: boolean;
  aoClicar: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      aria-pressed={ativo}
      className={`min-h-9 flex-1 rounded-lg text-[12.5px] transition-colors duration-200 active:scale-[0.98] ${
        ativo
          ? "border border-verde bg-verde-claro font-semibold text-verde-escuro"
          : "border border-borda bg-papel text-tinta-fraca"
      }`}
    >
      {children}
    </button>
  );
}

function ItemDaLista({
  item,
  aoConcluir,
}: {
  item: ItemDaPilha;
  aoConcluir: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const velho = item.idadeEmDias > DIAS_PARA_ENVELHECER;

  const estilo: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={estilo}
      className={`flex min-h-13 touch-manipulation items-center gap-3 border-b border-borda-leve bg-fundo py-1 ${
        isDragging
          ? "relative z-10 scale-[1.02] rounded-lg border-transparent shadow-[0_6px_18px_rgba(20,22,25,0.18)]"
          : ""
      }`}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        aria-label={`Reordenar: ${item.titulo}`}
        className="flex size-9 shrink-0 cursor-grab touch-none items-center justify-center border-0 bg-transparent text-[#b6b9b2] active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <svg width="12" height="18" viewBox="0 0 12 18" fill="currentColor" aria-hidden="true">
          <circle cx="3" cy="4" r="1.4" />
          <circle cx="9" cy="4" r="1.4" />
          <circle cx="3" cy="9" r="1.4" />
          <circle cx="9" cy="9" r="1.4" />
          <circle cx="3" cy="14" r="1.4" />
          <circle cx="9" cy="14" r="1.4" />
        </svg>
      </button>

      <CaixaDeMarcar
        marcada={false}
        rotulo={`Concluir: ${item.titulo}`}
        aoAlternar={() => aoConcluir(item.id)}
      />

      <Link
        href={`/tarefa/${item.id}`}
        className="min-w-0 flex-1 truncate text-[14.5px] text-tinta no-underline"
      >
        {item.titulo}
      </Link>

      <span
        className={`shrink-0 rounded-[5px] px-1.5 py-0.5 font-mono text-[11px] ${
          velho ? "bg-ambar-claro text-ambar" : "text-tinta-fraca"
        }`}
      >
        {item.idadeEmDias}d
      </span>
    </li>
  );
}
