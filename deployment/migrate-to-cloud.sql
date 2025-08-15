-- Export your current database schema and data
-- Run this against your current database first, then import to Cloud SQL

-- Export command (run locally first):
-- pg_dump $DATABASE_URL > ievolve_backup.sql

-- Import to Cloud SQL:
-- gcloud sql import sql ievolve-postgres ievolve_backup.sql --database=ievolve_db

-- If you need to run migrations separately, use drizzle:
-- npx drizzle-kit push:pg --connectionString="postgresql://ievolve_user:IevolveSecure2025!@/ievolve_db?host=/cloudsql/PROJECT_ID:us-central1:ievolve-postgres"