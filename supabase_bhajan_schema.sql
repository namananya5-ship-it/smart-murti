
-- --------------------------------------------------------------------------------
-- This script updates your Supabase schema to support the Bhajan Player feature.
-- Please execute this script in your Supabase SQL Editor.
-- --------------------------------------------------------------------------------

-- 1. Add new columns to the 'devices' table
-- These columns will track the current state of the bhajan player for each device.
ALTER TABLE public.devices
    ADD COLUMN IF NOT EXISTS current_bhajan_status TEXT DEFAULT 'stopped' NOT NULL,
    ADD COLUMN IF NOT EXISTS current_bhajan_position INTEGER DEFAULT 0 NOT NULL,
    ADD COLUMN IF NOT EXISTS bhajan_playback_started_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS default_bhajan_id BIGINT REFERENCES public.bhajans(id);

COMMENT ON COLUMN public.devices.current_bhajan_status IS 'Tracks the current playback status (playing, paused, stopped).';
COMMENT ON COLUMN public.devices.current_bhajan_position IS 'Stores the last known playback position in seconds.';
COMMENT ON COLUMN public.devices.bhajan_playback_started_at IS 'Timestamp of when the current playback started.';
COMMENT ON COLUMN public.devices.default_bhajan_id IS 'The default Bhajan to be played by the device.';


-- 2. Create the 'bhajan_playback_history' table
-- This table will store a log of all bhajan playback events.
CREATE TABLE IF NOT EXISTS public.bhajan_playback_history (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    device_id TEXT NOT NULL REFERENCES public.devices(device_id),
    bhajan_id BIGINT NOT NULL REFERENCES public.bhajans(id),
    event_type TEXT NOT NULL, -- e.g., 'play', 'pause', 'stop', 'resume'
    duration_seconds INTEGER,
    event_timestamp TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.bhajan_playback_history IS 'Logs events related to bhajan playback on devices.';


-- 3. Create the 'device_bhajan_status' view
-- This view provides a convenient way to query the complete, real-time bhajan status for a device.
CREATE OR REPLACE VIEW public.device_bhajan_status AS
SELECT
    d.device_id,
    d.current_bhajan_status,
    d.current_bhajan_position,
    d.bhajan_playback_started_at,
    -- Selected bhajan details
    sb.id as selected_bhajan_id,
    sb.name as selected_bhajan_name,
    sb.url as selected_bhajan_url,
    -- Default bhajan details
    db.id as default_bhajan_id,
    db.name as default_bhajan_name,
    db.url as default_bhajan_url
FROM
    devices d
LEFT JOIN
    bhajans sb ON d.selected_bhajan_id = sb.id
LEFT JOIN
    bhajans db ON d.default_bhajan_id = db.id;

COMMENT ON VIEW public.device_bhajan_status IS 'Provides a consolidated view of the bhajan status for each device.';


-- 4. Create the 'bhajan_playback_history_view'
-- This view joins the history table with bhajans to get bhajan names in history queries.
CREATE OR REPLACE VIEW public.bhajan_playback_history_view AS
SELECT
    h.id,
    h.device_id,
    h.bhajan_id,
    b.name as bhajan_name,
    h.event_type,
    h.duration_seconds,
    h.event_timestamp
FROM
    bhajan_playback_history h
LEFT JOIN
    bhajans b ON h.bhajan_id = b.id;

COMMENT ON VIEW public.bhajan_playback_history_view IS 'Enriches playback history with bhajan details.';

-- --------------------------------------------------------------------------------
-- End of script.
-- --------------------------------------------------------------------------------
