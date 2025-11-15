# Bhajan/Kirtan Playback Feature Implementation Guide

## Overview
This guide details the implementation of a bhajan/kirtan playback system for the ElatoAI ESP32 device. Users will be able to play spiritual songs (bhajans/kirtans) both through a web interface and via a physical button on the ESP32 device.

## Architecture Overview

### Current System
- **Frontend**: Next.js web application with real-time AI voice interaction
- **Backend**: Deno server handling WebSocket connections and AI model integration
- **Device**: ESP32 with audio I/O capabilities and WebSocket communication
- **Database**: Supabase with existing device and user management

### New Feature Architecture
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web Frontend  │────▶│   Deno Server   │────▶│   Supabase DB   │
│  (Bhajan List)  │◀────│  (API + WS)     │◀────│  (Bhajans)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   ESP32 Device  │
                       │ (Audio Player)  │
                       └─────────────────┘
```

## Database Schema Updates

### Existing Schema (from your commands)
```sql
CREATE TABLE bhajans (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

INSERT INTO bhajans (name, url) VALUES 
('Ganesh Arti', 'https://ksyttkhqzrgjqvwokich.supabase.co/storage/v1/object/public/Bhajan/Ganesh%20aarti.mp3');

ALTER TABLE devices ADD COLUMN selected_bhajan_id BIGINT REFERENCES bhajans(id);
```

### Additional Required Schema Updates
```sql
-- Add playback tracking
ALTER TABLE devices ADD COLUMN 
    current_bhajan_status TEXT DEFAULT 'stopped' 
    CHECK (current_bhajan_status IN ('playing', 'paused', 'stopped'));

ALTER TABLE devices ADD COLUMN current_bhajan_position INTEGER DEFAULT 0;
ALTER TABLE devices ADD COLUMN bhajan_playback_started_at TIMESTAMPTZ;

-- Add playback history table
CREATE TABLE bhajan_playback_history (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    device_id BIGINT REFERENCES devices(id) NOT NULL,
    bhajan_id BIGINT REFERENCES bhajans(id) NOT NULL,
    played_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    duration_seconds INTEGER,
    completed BOOLEAN DEFAULT false
);

-- Add user preferences for default bhajan
ALTER TABLE devices ADD COLUMN default_bhajan_id BIGINT REFERENCES bhajans(id);
```

## Backend API Implementation

### 1. Bhajan Management API (Deno Server)

#### Get All Bhajans
```typescript
// server-deno/routes/bhajans.ts
export async function getBhajans(supabase: SupabaseClient) {
    const { data, error } = await supabase
        .from('bhajans')
        .select('*')
        .order('name');
    
    if (error) throw error;
    return data;
}
```

#### Device Bhajan Control
```typescript
// server-deno/routes/device-bhajan.ts
export async function playBhajanOnDevice(
    supabase: SupabaseClient,
    deviceId: string,
    bhajanId: number
) {
    // Update device with selected bhajan
    const { error } = await supabase
        .from('devices')
        .update({
            selected_bhajan_id: bhajanId,
            current_bhajan_status: 'playing',
            current_bhajan_position: 0,
            bhajan_playback_started_at: new Date().toISOString()
        })
        .eq('id', deviceId);
    
    if (error) throw error;
    
    // Send WebSocket message to device
    await sendBhajanCommandToDevice(deviceId, 'play', bhajanId);
}
```

### 2. WebSocket Message Handling

#### New Message Types for Bhajan Control
```typescript
// server-deno/websocket/messages.ts
interface BhajanPlayMessage {
    type: 'bhajan_play';
    bhajan_id: number;
    url: string;
    name: string;
}

interface BhajanControlMessage {
    type: 'bhajan_control';
    action: 'play' | 'pause' | 'stop' | 'next' | 'previous';
}
```

## Frontend Implementation

### 1. Bhajan List Component
```tsx
// frontend-nextjs/components/BhajanList.tsx
export function BhajanList({ deviceId }: { deviceId: string }) {
    const [bhajans, setBhajans] = useState<Bhajan[]>([]);
    const [selectedBhajan, setSelectedBhajan] = useState<number | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    
    const playBhajan = async (bhajanId: number) => {
        await fetch('/api/bhajans/play', {
            method: 'POST',
            body: JSON.stringify({ deviceId, bhajanId })
        });
        setSelectedBhajan(bhajanId);
        setIsPlaying(true);
    };
    
    return (
        <div className="bhajan-list">
            {bhajans.map(bhajan => (
                <div key={bhajan.id} className="bhajan-item">
                    <span>{bhajan.name}</span>
                    <button onClick={() => playBhajan(bhajan.id)}>
                        {selectedBhajan === bhajan.id && isPlaying ? '⏸️' : '▶️'}
                    </button>
                </div>
            ))}
        </div>
    );
}
```

### 2. Bhajan Player Widget
```tsx
// frontend-nextjs/components/BhajanPlayer.tsx
export function BhajanPlayer({ deviceId }: { deviceId: string }) {
    const [currentBhajan, setCurrentBhajan] = useState<Bhajan | null>(null);
    const [status, setStatus] = useState<'playing' | 'paused' | 'stopped'>('stopped');
    const [position, setPosition] = useState(0);
    
    // WebSocket listener for bhajan updates
    useEffect(() => {
        const ws = new WebSocket(`ws://localhost:8000/device/${deviceId}/bhajan`);
        
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'bhajan_status') {
                setStatus(data.status);
                setPosition(data.position);
                setCurrentBhajan(data.bhajan);
            }
        };
        
        return () => ws.close();
    }, [deviceId]);
    
    return (
        <div className="bhajan-player">
            {currentBhajan && (
                <>
                    <div className="now-playing">
                        <span>Now Playing: {currentBhajan.name}</span>
                    </div>
                    <div className="controls">
                        <button onClick={() => sendControl('pause')}>⏸️</button>
                        <button onClick={() => sendControl('stop')}>⏹️</button>
                    </div>
                </>
            )}
        </div>
    );
}
```

## ESP32 Firmware Modifications

### 1. Bhajan Audio Task
```cpp
// firmware-arduino/src/BhajanAudio.cpp
#include "BhajanAudio.h"

void bhajanAudioTask(void *parameter) {
    while (1) {
        if (currentBhajan.status == BHAJAN_PLAYING) {
            // Stream audio from URL
            streamBhajanAudio(currentBhajan.url);
        }
        vTaskDelay(100 / portTICK_PERIOD_MS);
    }
}

void streamBhajanAudio(const char* url) {
    // Use HTTP client to stream MP3
    HTTPClient http;
    http.begin(url);
    int httpCode = http.GET();
    
    if (httpCode == HTTP_CODE_OK) {
        WiFiClient *stream = http.getStreamPtr();
        
        // Decode and play MP3 audio
        while (stream->available()) {
            uint8_t buffer[1024];
            size_t bytesRead = stream->readBytes(buffer, sizeof(buffer));
            
            // Send to I2S for audio output
            size_t bytesWritten = 0;
            i2s_write(I2S_PORT_OUT, buffer, bytesRead, &bytesWritten, portMAX_DELAY);
        }
    }
    http.end();
}
```

### 2. WebSocket Message Handler
```cpp
// firmware-arduino/src/WebSocketHandler.cpp
void handleBhajanMessage(JsonDocument& doc) {
    String type = doc["type"];
    
    if (type == "bhajan_play") {
        String url = doc["url"];
        String name = doc["name"];
        
        // Stop current AI audio
        stopAIAudio();
        
        // Start bhajan playback
        startBhajanPlayback(url.c_str(), name.c_str());
        
    } else if (type == "bhajan_control") {
        String action = doc["action"];
        
        if (action == "pause") {
            pauseBhajan();
        } else if (action == "stop") {
            stopBhajan();
        }
    }
}
```

### 3. Button Integration
```cpp
// firmware-arduino/src/ButtonHandler.cpp
void handleBhajanButtonPress() {
    if (currentBhajan.status == BHAJAN_STOPPED) {
        // Play default or last played bhajan
        playDefaultBhajan();
    } else if (currentBhajan.status == BHAJAN_PLAYING) {
        // Pause current bhajan
        pauseBhajan();
    } else if (currentBhajan.status == BHAJAN_PAUSED) {
        // Resume playback
        resumeBhajan();
    }
}
```

## Implementation Steps

### Phase 1: Database Setup
1. Run the additional SQL commands in your Supabase
2. Add sample bhajans to the database
3. Test database connectivity

### Phase 2: Backend API
1. Create bhajan management endpoints in Deno server
2. Implement WebSocket message handlers
3. Add device-bhajan association logic

### Phase 3: Frontend Components
1. Create bhajan list component
2. Add player controls
3. Integrate with existing device management

### Phase 4: ESP32 Firmware
1. Add bhajan audio streaming capability
2. Implement WebSocket message handling
3. Add button integration for physical control

### Phase 5: Testing & Integration
1. Test all API endpoints
2. Verify WebSocket communication
3. Test physical button functionality
4. End-to-end testing

## Security Considerations

1. **Audio URL Security**: Ensure bhajan URLs are properly secured
2. **Device Authentication**: Use existing device auth tokens
3. **Rate Limiting**: Prevent abuse of playback controls
4. **CORS**: Configure proper CORS for audio streaming

## Performance Considerations

1. **Audio Buffering**: Implement proper buffering for smooth playback
2. **Memory Management**: ESP32 has limited memory for audio streaming
3. **Network Optimization**: Handle poor network conditions gracefully
4. **Concurrent Playback**: Manage AI audio vs bhajan audio conflicts

## Future Enhancements

1. **Playlist Support**: Create and manage bhajan playlists
2. **Scheduled Playback**: Auto-play bhajans at specific times
3. **Offline Support**: Cache bhajans for offline playback
4. **Volume Control**: Separate volume control for bhajans
5. **Playback History**: Track and display listening history
6. **Favorites**: Mark favorite bhajans for quick access

## Troubleshooting

### Common Issues
1. **Audio not playing**: Check URL accessibility and format
2. **Button not working**: Verify GPIO pin configuration
3. **WebSocket disconnections**: Check network stability
4. **Memory issues**: Optimize buffer sizes on ESP32

### Debug Steps
1. Check Supabase logs for database errors
2. Monitor WebSocket messages in browser console
3. Use ESP32 serial output for debugging
4. Test audio URLs directly in browser

## Support

For issues and questions:
1. Check existing GitHub issues
2. Review ESP32 serial logs
3. Test with simple audio files first
4. Verify network connectivity

---

This implementation provides a complete bhajan/kirtan playback system integrated with the existing ElatoAI infrastructure while maintaining the spiritual context and user experience requirements.