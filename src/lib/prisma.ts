import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// A partir do Prisma 7 a conexão vem de um adaptador de driver — aqui o
// `pg`, que é o cliente PostgreSQL de sempre. Não há mais binário de
// engine para baixar: a instalação fica leve e o deploy, previsível.

function criarCliente(): PrismaClient {
  const url = process.env.DATABASE_URL;

  if (url === undefined || url === "") {
    throw new Error(
      "DATABASE_URL não está definida. Copie .env.example para .env e preencha.",
    );
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
}

// Em desenvolvimento o Next recarrega os módulos a cada alteração, e cada
// recarga criaria um cliente novo até o banco recusar conexão. Guardar no
// globalThis mantém um só.

const globalParaPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalParaPrisma.prisma ?? criarCliente();

if (process.env.NODE_ENV !== "production") {
  globalParaPrisma.prisma = prisma;
}
