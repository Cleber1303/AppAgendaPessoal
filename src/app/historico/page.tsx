"use client";

// O arquivo morto: tudo que foi concluído ou expirou.
//
// Entra por um ícone pequeno no canto, de propósito — é a tela que você
// quase nunca abre, e que precisa existir para que nada seja apagado.

import Link from "next/link";
import { useMemo, useState } from "react";
import { Carregando, Falhou, IconeVoltar, Vazio } from "@/components/Avisos";
import { carregarHistorico } from "@/lib/dados";
import { diaBarraMes, mesEAno } from "@/lib/datas";
import type { ItemDoHistorico } from "@/lib/tipos";
import { usarDados } from "@/lib/usarDados";

type Filtro = "tudo" | "feitas" | "nao-feitas";

export default function TelaHistorico() {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("tudo");
  const { dados, carregando, erro, recarregar } = usarDados(() => carregarHistorico());

  const grupos = useMemo(() => agrupar(dados ?? [], filtro, busca), [dados, filtro, busca]);

  return (
    <>
      <header className="border-b border-borda bg-papel px-4 pt-3 pb-3.5">
        <Link
          href="/"
          aria-label="Voltar"
          className="-ml-2 flex size-11 items-center justify-center text-tinta-fraca no-underline"
        >
          <IconeVoltar />
        </Link>
        <h1 className="mt-0.5 mb-0 text-2xl font-semibold tracking-tight">Histórico</h1>

        <label htmlFor="busca" className="sr-only">
          Buscar no histórico
        </label>
        <input
          id="busca"
          type="search"
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
          placeholder="Buscar"
          className="mt-2.5 min-h-11 w-full rounded-[9px] border border-[#d7d8d2] bg-papel px-3 text-[15px]"
        />

        <div className="mt-2.5 flex gap-1">
          <BotaoDeFiltro ativo={filtro === "tudo"} aoClicar={() => setFiltro("tudo")}>
            Tudo
          </BotaoDeFiltro>
          <BotaoDeFiltro ativo={filtro === "feitas"} aoClicar={() => setFiltro("feitas")}>
            Feitas
          </BotaoDeFiltro>
          <BotaoDeFiltro
            ativo={filtro === "nao-feitas"}
            aoClicar={() => setFiltro("nao-feitas")}
          >
            Não feitas
          </BotaoDeFiltro>
        </div>
      </header>

      {carregando && dados === null && <Carregando />}
      {erro !== null && dados === null && <Falhou mensagem={erro} aoTentarDeNovo={recarregar} />}

      {dados !== null && (
        <main className="px-5 pt-1.5">
          {grupos.length === 0 && <Vazio texto="Nada no histórico ainda." />}

          {grupos.map((grupo) => (
            <div key={grupo.mes}>
              <div className="mt-3.5 mb-1 font-mono text-[10px] tracking-[0.12em] text-tinta-fraca uppercase">
                {grupo.rotulo}
              </div>

              {grupo.itens.map((item) => (
                <div
                  key={item.id}
                  className="flex min-h-12 items-center gap-3 border-b border-borda-leve"
                >
                  <Marca feita={item.feita} />
                  <span
                    className={`min-w-0 flex-1 truncate text-sm ${
                      item.feita ? "text-tinta-apagada line-through" : "text-tinta"
                    }`}
                  >
                    {item.titulo}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-tinta-apagada">
                    {diaBarraMes(item.encerradaEm)}
                  </span>
                </div>
              ))}
            </div>
          ))}

          <p className="mt-4 mb-4 text-center text-[11.5px] leading-relaxed text-tinta-apagada">
            Tudo que foi concluído ou expirou fica aqui.
          </p>
        </main>
      )}
    </>
  );
}

type Grupo = { mes: string; rotulo: string; itens: ItemDoHistorico[] };

function agrupar(itens: ItemDoHistorico[], filtro: Filtro, busca: string): Grupo[] {
  const termo = busca.trim().toLowerCase();

  const filtrados = itens.filter((item) => {
    if (filtro === "feitas" && !item.feita) {
      return false;
    }

    if (filtro === "nao-feitas" && item.feita) {
      return false;
    }

    if (termo !== "" && !item.titulo.toLowerCase().includes(termo)) {
      return false;
    }

    return true;
  });

  const porMes = new Map<string, ItemDoHistorico[]>();

  for (const item of filtrados) {
    const mes = item.encerradaEm.slice(0, 7);
    const lista = porMes.get(mes) ?? [];
    lista.push(item);
    porMes.set(mes, lista);
  }

  return [...porMes.entries()]
    .sort((um, outro) => (um[0] < outro[0] ? 1 : -1))
    .map(([mes, lista]) => ({
      mes,
      rotulo: mesEAno(`${mes}-01`),
      itens: lista,
    }));
}

function BotaoDeFiltro({
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

function Marca({ feita }: { feita: boolean }) {
  if (feita) {
    return (
      <span className="flex size-4.5 shrink-0 items-center justify-center rounded-full border-[1.5px] border-verde bg-verde text-white">
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }

  return (
    <span className="flex size-4.5 shrink-0 items-center justify-center rounded-full border-[1.5px] border-ambar-borda">
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#9A5B06"
        strokeWidth="3.5"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </span>
  );
}
