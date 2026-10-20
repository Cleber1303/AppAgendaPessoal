// Configuração do Prisma CLI (migrações, db push, studio, seed).
//
// A partir do Prisma 7 a URL do banco não fica mais no schema.prisma: as
// ferramentas de linha de comando leem daqui, e o app em si se conecta
// pelo adaptador em src/lib/prisma.ts.

import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",

  migrations: {
    seed: "tsx prisma/seed.ts",
  },

  datasource: {
    url: env("DATABASE_URL"),
  },
});
