# Production Database

The Supabase backend is defined by ordered SQL files in `supabase/migrations/` and required catalog seed data in `supabase/seed/`.

Apply the migrations to the production Supabase project in order, then apply `supabase/seed/202605280001_catalog.sql`. After that, run:

```sh
npm run verify:database
```

The verifier checks that the expected tables are reachable, the gift catalog is loaded, and the wallet transfer RPC is installed. It does not print secrets.

This repository did not contain a service-role key or direct database connection URL in the agent environment, so the live production database cannot be modified from this checkout without those credentials being supplied to the deploy environment or applied through the Supabase dashboard/CLI.
