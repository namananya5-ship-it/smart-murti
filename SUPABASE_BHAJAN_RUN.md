# Supabase Bhajan Schema — Run Instructions

This file documents the SQL and steps to apply the Bhajan feature schema to your Supabase project.

1) Open Supabase Studio → SQL Editor

2) Run the SQL in `supabase_bhajan_schema.sql` (this repository file). It will:
- Add bhajan tracking columns to `devices`
- Create `bhajan_playback_history` table
- Create `device_bhajan_status` and `bhajan_playback_history_view` views

If you already ran ad-hoc SQL earlier, ensure the following columns exist in `devices`:
- `selected_bhajan_id` (BIGINT referencing `bhajans.id`)
- `current_bhajan_status` (TEXT with values 'playing'|'paused'|'stopped')
- `current_bhajan_position` (INTEGER)
- `bhajan_playback_started_at` (TIMESTAMPTZ)
- `default_bhajan_id` (BIGINT referencing `bhajans.id`)

And ensure `bhajan_playback_history` table has columns:
- `device_id` (TEXT) referencing `devices(device_id)`
- `bhajan_id` (BIGINT)
- `event_type` (TEXT)
- `duration_seconds` (INTEGER)
- `event_timestamp` (TIMESTAMPTZ)

3) Verify views exist:
- `device_bhajan_status` view should include fields: `device_id`, `current_bhajan_status`, `current_bhajan_position`, `bhajan_playback_started_at`, `selected_bhajan_id`, `selected_bhajan_name`, `selected_bhajan_url`, `default_bhajan_id`, etc.
- `bhajan_playback_history_view` should enrich history rows with bhajan names.

4) Test with queries (SQL Editor):

```sql
SELECT * FROM bhajans LIMIT 5;
SELECT * FROM device_bhajan_status LIMIT 5;
SELECT * FROM bhajan_playback_history_view LIMIT 5;
```

5) If you use Row Level Security (RLS), ensure your API service role or Deno server token has permissions to `SELECT/UPDATE/INSERT` these tables.

Notes:
- If you applied different column names earlier, adapt the Deno server SQL calls accordingly (fields expected by server: `selected_bhajan_id`, `current_bhajan_status`, `current_bhajan_position`, `bhajan_playback_started_at`).
- If you prefer, I can prepare a minimal migration SQL that only adds missing columns (tell me which columns you already have and I'll generate the delta SQL).
