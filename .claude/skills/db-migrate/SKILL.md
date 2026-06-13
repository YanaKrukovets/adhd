---
description: Any Drizzle schema change. Generates migration, reviews SQL, checks for destructive ops.
---

# /db-migrate — Safe Schema Changes

## Steps

### 1. Edit the schema
Make changes in `src/lib/db/schema.js`.

### 2. Generate the migration
```
npm run db:generate
```

### 3. READ the generated SQL
Read the new file in `drizzle/`. Look for:
- `DROP TABLE` / `DROP COLUMN` — **STOP. Require explicit user approval with a description of what data will be lost.**
- `ALTER TABLE ... DROP` — same.
- `DELETE` / `TRUNCATE` — STOP immediately, this should never appear in a migration.
- Column renames (may appear as drop+add) — flag for user confirmation.

If destructive ops found: show the SQL, explain the impact, and wait for explicit "yes, proceed" before running.

### 4. Grep for overdue state
```
grep -r "overdue" drizzle/ src/lib/db/
```
If found: STOP. Remove it. There is NO overdue state in this codebase.

### 5. Migrate dev DB
```
npm run db:migrate
```

### 6. Run unit tests
```
npm test
```
Ensure all DB-touching tests still pass.

### 7. Update queries if needed
If the schema change affects column names or types, update `src/lib/db/queries.js` accordingly.
