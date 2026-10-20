"use client";

// A pilha: o que não tem data.
//
// Duas regras existem só para ela não apodrecer invisível, que é o destino
// dessa lista em todo app de tarefas: teto de itens e envelhecimento.

import Link from "next/link";
import { useState } from "react";
import { Carregando, Falhou, IconeMais, Vazio } from "@/components/Avisos";
import { carregarPilha, concluirTarefa } from "@/lib/dados";
import { DIAS_PARA_ENVELHECER, TETO_DA_PILHA, type ItemDaPilha } from "@/lib/tipos";
import { usarDados } from "@/lib/usarDados";

type Ordenacao = "manual" | "idade";

export default function TelaPilha() {
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("idade");
  const { dados, carregando, erro, recarregar } = usarDados(() => carregarPilha());

  const itens = ordenarItens(dados ?? [], ordenacao);
  const total = itens.length;

  return (
    <>
      <header className="border-b border-borda bg-papel px-5 pt-4 pb-3.5">
        <h1 className="m-0 text-2xl font-semibold tracking-tight">Pilha</h1>
        <p className="mt-1 mb-0 text-[13px] text-tinta-fraca">Sem data. Faço quando der.</p>

        <div className="mt-3.5 flex items-center gap-2.5">
          <div className="h-1.5 flex-1 overflow-hidden rounded-sm bg-borda-leve">
            <div
              className="h-1.5 bg-verde"
              style={{ width: `${Math.min(100, (total / TETO_DA_PILHA) * 100)}%` }}
            />
          </div>
          <span className="shrink-0 font-mono text-[11px] text-tinta-fraca">
            {total} / {TETO_DA_PILHA}
          </span>
        </div>

        <div className="mt-3.5 flex gap-1">
          <BotaoDeOrdem
            ativo={ordenacao === "manual"}
            aoClicar={() => setOrdenacao("manual")}
          >
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
        <main className="px-5 pt-1">
          {itens.length === 0 && <Vazio texto="A pilha está vazia." />}

          {itens.map((item) => (
            <ItemDaLista key={item.id} item={item} aoMudar={recarregar} />
          ))}

          <div className="mt-3.5 rounded-[10px] bg-ambar-claro px-3.5 py-3">
            <div className="font-mono text-[9.5px] tracking-[0.12em] text-ambar uppercase">
              Regra da pilha
            </div>
            <p className="mt-1.5 mb-0 text-[12.5px] leading-relaxed text-[#4A4D53]">
              Passou de {DIAS_PARA_ENVELHECER} dias, o item sobe e fica âmbar. Chegou a{" "}
              {TETO_DA_PILHA} itens, só entra novo depois de tirar um.
            </p>
          </div>
        </main>
      )}

      <Link
        href="/novo"
        aria-label="Novo item"
        className="pointer-events-none fixed bottom-24 left-1/2 flex w-full max-w-md -translate-x-1/2 justify-end pr-5 no-underline"
      >
        <span className="pointer-events-auto flex size-14 items-center justify-center rounded-full bg-verde text-white shadow-[0_5px_14px_rgba(20,22,25,0.2)]">
          <IconeMais />
        </span>
      </Link>
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
      className={`min-h-9 flex-1 rounded-lg text-[12.5px] ${
        ativo
          ? "border border-verde bg-verde-claro font-semibold text-verde-escuro"
          : "border border-borda bg-papel text-tinta-fraca"
      }`}
    >
      {children}
    </button>
  );
}

function ItemDaLista({ item, aoMudar }: { item: ItemDaPilha; aoMudar: () => void }) {
  const [salvando, setSalvando] = useState(false);
  const velho = item.idadeEmDias > DIAS_PARA_ENVELHECER;

  async function concluir() {
    setSalvando(true);

    try {
      await concluirTarefa(item.id);
      aoMudar();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex min-h-13 items-center gap-3 border-b border-borda-leve py-1">
      <span className="shrink-0 text-[#b6b9b2]" aria-hidden="true">
        <svg width="12" height="18" viewBox="0 0 12 18" fill="currentColor">
          <circle cx="3" cy="4" r="1.4" />
          <circle cx="9" cy="4" r="1.4" />
          <circle cx="3" cy="9" r="1.4" />
          <circle cx="9" cy="9" r="1.4" />
          <circle cx="3" cy="14" r="1.4" />
          <circle cx="9" cy="14" r="1.4" />
        </svg>
      </span>

      <input
        type="checkbox"
        checked={false}
        disabled={salvando}
        onChange={concluir}
        aria-label={`Concluir: ${item.titulo}`}
        className="size-4 shrink-0 accent-verde"
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
    </div>
  );
}
