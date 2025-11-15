-- Additional Supabase Schema Updates for Bhajan Feature
-- Run these commands in your Supabase SQL editor

-- Add playback tracking columns to devices table
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS current_bhajan_status TEXT 
    DEFAULT 'stopped' 
    CHECK (current_bhajan_status IN ('playing', 'paused', 'stopped'));

ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS current_bhajan_position INTEGER DEFAULT 0;

ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS bhajan_playback_started_at TIMESTAMPTZ;

-- Add user preferences for default bhajan
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS default_bhajan_id BIGINT REFERENCES bhajans(id);

-- Create playback history table
CREATE TABLE IF NOT EXISTS bhajan_playback_history (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    device_id BIGINT REFERENCES devices(id) NOT NULL,
    bhajan_id BIGINT REFERENCES bhajans(id) NOT NULL,
    played_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    duration_seconds INTEGER,
    completed BOOLEAN DEFAULT false
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bhajan_playback_history_device_id 
    ON bhajan_playback_history(device_id);

CREATE INDEX IF NOT EXISTS idx_bhajan_playback_history_bhajan_id 
    ON bhajan_playback_history(bhajan_id);

CREATE INDEX IF NOT EXISTS idx_bhajan_playback_history_played_at 
    ON bhajan_playback_history(played_at);

-- Add more sample bhajans
INSERT INTO bhajans (name, url) VALUES 
('Hanuman Chalisa', 'https://ksyttkhqzrgjqvwokich.supabase.co/storage/v1/object/public/Bhajan/Hanuman%20Chalisa.mp3'),
('Krishna Bhajan', 'https://ksyttkhqzrgjqvwokich.supabase.co/storage/v1/object/public/Bhajan/Krishna%20Bhajan.mp3'),
('Shiva Arti', 'https://ksyttkhqzrgjqvwokich.supabase.co/storage/v1/object/public/Bhajan/Shiva%20Arti.mp3'),
('Durga Arti', 'https://ksyttkhqzrgjqvwokich.supabase.co/storage/v1/object/public/Bhajan/Durga%20Arti.mp3'),
('Sai Bhajan', 'https://ksyttkhqzrgjqvwokich.supabase.co/storage/v1/object/public/Bhajan/Sai%20Bhajan.mp3')
ON CONFLICT DO NOTHING;

-- Create a view for device bhajan status
CREATE OR REPLACE VIEW device_bhajan_status AS
SELECT 
    d.id as device_id,
    d.name as device_name,
    d.current_bhajan_status,
    d.current_bhajan_position,
    d.bhajan_playback_started_at,
    b.id as bhajan_id,
    b.name as bhajan_name,
    b.url as bhajan_url,
    db.name as default_bhajan_name
FROM devices d
LEFT JOIN bhajans b ON d.selected_bhajan_id = b.id
LEFT JOIN bhajans db ON d.default_bhajan_id = db.id;

-- Grant permissions (adjust based on your security requirements)
GRANT SELECT ON device_bhajan_status TO authenticated;
GRANT SELECT ON bhajan_playback_history TO authenticated;
GRANT INSERT ON bhajan_playback_history TO authenticated;

-- Create a function to record playback completion
CREATE OR REPLACE FUNCTION record_bhajan_completion()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.current_bhajan_status = 'stopped' AND OLD.current_bhajan_status = 'playing' THEN
        INSERT INTO bhajan_playback_history (device_id, bhajan_id, duration_seconds, completed)
        VALUES (
            NEW.id, 
            NEW.selected_bhajan_id, 
            EXTRACT(EPOCH FROM (now() - NEW.bhajan_playback_started_at))::INTEGER,
            true
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic playback history
DROP TRIGGER IF EXISTS bhajan_completion_trigger ON devices;
CREATE TRIGGER bhajan_completion_trigger
    AFTER UPDATE OF current_bhajan_status ON devices
    FOR EACH ROW
    EXECUTE FUNCTION record_bhajan_completion();