import { defineConfig } from 'drizzle-kit';

// Used by `npm run db:push` (locally and in the GitHub Actions DB Migrate workflow).
// Reads DATABASE_URL from the environment. Railway/managed Postgres needs SSL,
// which is enabled by default and can be turned off with PGSSL_DISABLE=true.
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    ssl: process.env.PGSSL_DISABLE === 'true' ? false : { rejectUnauthorized: false },
  },
});
