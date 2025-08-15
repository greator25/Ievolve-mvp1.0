# Database Migration Guide

## Step 1: Export Current Database

```bash
# Export your current Neon database
pg_dump $DATABASE_URL > ievolve_backup.sql

# Or if you want schema only
pg_dump --schema-only $DATABASE_URL > ievolve_schema.sql

# For data only
pg_dump --data-only $DATABASE_URL > ievolve_data.sql
```

## Step 2: Create Cloud SQL Instance (Done by deploy script)

The deployment script will create:
- Cloud SQL PostgreSQL instance: `ievolve-postgres`
- Database: `ievolve_db`  
- User: `ievolve_user`

## Step 3: Import to Cloud SQL

```bash
# Upload backup file to Cloud Storage first
gsutil cp ievolve_backup.sql gs://your-bucket-name/

# Import to Cloud SQL
gcloud sql import sql ievolve-postgres gs://your-bucket-name/ievolve_backup.sql --database=ievolve_db

# Or import locally if you have access
gcloud sql connect ievolve-postgres --user=ievolve_user --database=ievolve_db < ievolve_backup.sql
```

## Step 4: Run Drizzle Migrations (if needed)

```bash
# Set the Cloud SQL connection string
export DATABASE_URL="postgresql://ievolve_user:IevolveSecure2025!@/ievolve_db?host=/cloudsql/PROJECT_ID:us-central1:ievolve-postgres"

# Push schema changes
npx drizzle-kit push:pg
```

## Step 5: Verify Data

Connect to your Cloud SQL instance and verify:
1. All tables exist
2. Data is correctly imported
3. Indexes and constraints are in place

```bash
# Connect to instance
gcloud sql connect ievolve-postgres --user=ievolve_user --database=ievolve_db

# Check tables
\dt

# Verify sample data
SELECT COUNT(*) FROM participants;
SELECT COUNT(*) FROM hotels;
SELECT COUNT(*) FROM users;
```