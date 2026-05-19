import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is required. Set it in backend/.env or run: $env:DATABASE_URL = \"your-url\"",
  );
}

export default defineConfig({
  schema: "./shared/db/src/schema/*.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
