# Bhajan/Kirtan Playback Feature Installation Guide

## Prerequisites

Before starting the installation, ensure you have:
- Existing ElatoAI project setup
- Access to your Supabase database
- ESP32 device with audio capabilities
- Development environment for ESP32 (PlatformIO/Arduino)
- Node.js environment for frontend development

## Installation Steps

### Step 1: Database Schema Updates

1. **Connect to your Supabase project:**
   - Go to your Supabase dashboard
   - Navigate to SQL Editor

2. **Run the schema updates:**
   ```sql
   -- Copy and execute the contents of supabase_schema_updates.sql
   -- This file contains all necessary database modifications
   ```

3. **Verify the installation:**
   - Check that the `bhajans` table exists
   - Verify the `device_bhajan_status` view was created
   - Confirm sample data was inserted

### Step 2: Backend Server Setup

1. **Navigate to your server-deno directory:**
   ```bash
   cd server-deno
   ```

2. **Add the bhajan management module:**
   - Copy `bhajans.ts` to your server-deno directory
   - This file contains all bhajan-related business logic

3. **Create the API endpoint:**
   - Copy `api/bhajans.ts` to `server-deno/api/`
   - This creates the REST API for bhajan management

4. **Update your main server file (`main.ts`):**
   ```typescript
   // Add import for bhajan functions
   import { sendBhajanCommandToDevice } from "./bhajans.ts";
   
   // Add bhajan message handling in WebSocket connection handler
   // Update the existing message handling switch statement
   ```

5. **Install required dependencies:**
   ```bash
   deno cache --reload main.ts
   ```

### Step 3: Frontend Integration

1. **Navigate to your frontend directory:**
   ```bash
   cd frontend-nextjs
   ```

2. **Add the bhajan components:**
   - Copy `components/BhajanList.tsx` to `frontend-nextjs/components/`
   - Copy `components/BhajanPlayer.tsx` to `frontend-nextjs/components/`

3. **Integrate components into your pages:**
   ```tsx
   // Example integration in your device control page
   import { BhajanList } from '@/components/BhajanList';
   import { BhajanPlayer } from '@/components/BhajanPlayer';
   
   // In your component render:
   <BhajanList 
     deviceId={deviceId} 
     authToken={authToken} 
   />
   
   <BhajanPlayer 
     deviceId={deviceId} 
     authToken={authToken}
     showControls={true}
   />
   ```

4. **Update API calls in your frontend:**
   - Ensure your frontend uses the correct API endpoints
   - Update authentication headers as needed

### Step 4: ESP32 Firmware Updates

1. **Navigate to your firmware directory:**
   ```bash
   cd firmware-arduino
   ```

2. **Add bhajan audio files:**
   - Copy `src/BhajanAudio.h` to `firmware-arduino/src/`
   - Copy `src/BhajanAudio.cpp` to `firmware-arduino/src/`

3. **Update WebSocket handler:**
   - Copy `src/WebSocketHandler_bhajan.cpp` to `firmware-arduino/src/`
   - Rename it to `WebSocketHandler.cpp` (backup original first)

4. **Update main firmware:**
   - Copy `src/main_bhajan_integration.cpp` to `firmware-arduino/src/main.cpp`
   - Or manually integrate the changes into your existing main.cpp

5. **Update platformio.ini (if needed):**
   ```ini
   ; Ensure you have these libraries:
   lib_deps = 
     ; Existing libraries...
     ; Add if not present:
     fastled/FastLED@^3.5.0
     me-no-dev/ESPAsyncWebServer@^1.2.3
   ```

6. **Build and upload firmware:**
   ```bash
   pio run --target upload
   ```

## Configuration

### Environment Variables

Add these to your environment files:

**Frontend (.env.local):**
```
NEXT_PUBLIC_BHAJAN_API_URL=http://localhost:8001
```

**Backend (.env):**
```
# Add to existing environment variables
BHAJAN_API_PORT=8001
```

### Device Configuration

1. **Set default bhajan for your device:**
   - Use the API endpoint: `POST /api/bhajans/default`
   - Or through the web interface once implemented

2. **Configure audio settings:**
   - Adjust I2S settings for your specific audio hardware
   - Test different buffer sizes for optimal performance

## Testing

### 1. Database Testing

Verify the database setup:
```sql
-- Check bhajans table
SELECT * FROM bhajans;

-- Check device status view
SELECT * FROM device_bhajan_status;

-- Test playback history
SELECT * FROM bhajan_playback_history LIMIT 5;
```

### 2. API Testing

Test the API endpoints:
```bash
# Get all bhajans
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8001/api/bhajans

# Play a bhajan
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"deviceId": "your-device-id", "bhajanId": 1}' \
  http://localhost:8001/api/bhajans/play

# Control playback
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"deviceId": "your-device-id", "action": "pause"}' \
  http://localhost:8001/api/bhajans/control
```

### 3. Frontend Testing

1. **Start the development server:**
   ```bash
   cd frontend-nextjs
   npm run dev
   ```

2. **Navigate to your device page**
3. **Test the bhajan list component**
4. **Verify playback controls work**

### 4. Device Testing

1. **Monitor serial output:**
   ```bash
   pio device monitor
   ```

2. **Test physical button:**
   - Single press should start/pause bhajan
   - Long press should enter sleep mode (existing behavior)

3. **Test WebSocket communication:**
   - Check for bhajan status updates
   - Verify playback commands are received

## Troubleshooting

### Common Issues

1. **Database Connection Errors:**
   - Verify Supabase credentials
   - Check network connectivity
   - Ensure RLS policies are configured

2. **ESP32 Memory Issues:**
   - Reduce buffer sizes in BhajanAudio.h
   - Disable debug logging
   - Optimize HTTP client settings

3. **Audio Playback Problems:**
   - Verify audio file URLs are accessible
   - Check I2S pin configuration
   - Ensure proper audio format (MP3, 44.1kHz, stereo)

4. **WebSocket Disconnections:**
   - Check network stability
   - Verify authentication tokens
   - Monitor server logs

### Debug Commands

**ESP32 Debug Output:**
```cpp
// Add to your code for debugging:
Serial.println("Bhajan status: " + String(currentBhajan.status));
Serial.println("Free heap: " + String(ESP.getFreeHeap()));
```

**Server Debug Mode:**
```bash
# Run with debug logging
deno run -A --env-file=.env --log-level=debug main.ts
```

## Performance Optimization

### ESP32 Optimizations

1. **Memory Management:**
   - Use PSRAM if available
   - Reduce buffer sizes: `BHAJAN_BUFFER_SIZE = 2048`
   - Enable compiler optimizations

2. **Audio Streaming:**
   - Implement audio buffering
   - Add reconnection logic
   - Handle network interruptions gracefully

3. **Task Priorities:**
   - Network task: Highest priority
   - Audio tasks: Medium priority
   - Bhajan task: Lower priority than AI audio

### Server Optimizations

1. **Caching:**
   - Cache bhajan metadata
   - Implement connection pooling
   - Use CDN for audio files

2. **Rate Limiting:**
   - Implement API rate limiting
   - Add request validation
   - Monitor resource usage

## Security Considerations

1. **Audio File Security:**
   - Use signed URLs for audio access
   - Implement access controls
   - Validate file formats

2. **Device Authentication:**
   - Verify device ownership
   - Use secure tokens
   - Implement device registration

3. **API Security:**
   - Rate limiting
   - Input validation
   - CORS configuration

## Monitoring and Analytics

1. **Playback Analytics:**
   - Track most played bhajans
   - Monitor device usage
   - Analyze user preferences

2. **Performance Monitoring:**
   - Track API response times
   - Monitor ESP32 memory usage
   - Log playback errors

3. **Health Checks:**
   - Device connectivity status
   - Audio stream quality
   - Database performance

## Maintenance

### Regular Tasks

1. **Update bhajan library:**
   - Add new spiritual songs
   - Remove unavailable content
   - Update metadata

2. **Monitor performance:**
   - Check system resources
   - Review error logs
   - Optimize queries

3. **Security updates:**
   - Update dependencies
   - Review access controls
   - Monitor for vulnerabilities

### Backup Strategy

1. **Database backups:**
   - Regular Supabase backups
   - Export bhajan metadata
   - Store configuration files

2. **Audio file backups:**
   - Maintain multiple copies
   - Use cloud storage
   - Verify file integrity

## Support and Resources

### Documentation
- [ElatoAI Original Documentation](https://github.com/namankharbanda007/dev-vani)
- [ESP32 Audio Documentation](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/peripherals/i2s.html)
- [Supabase Documentation](https://supabase.com/docs)

### Community
- GitHub Issues for bug reports
- Discord/Slack for discussions
- Email support for critical issues

### Development Tools
- PlatformIO for ESP32 development
- Postman for API testing
- Chrome DevTools for frontend debugging

## Future Enhancements

### Planned Features
1. **Playlist Support:** Create and manage custom playlists
2. **Scheduled Playback:** Auto-play at specific times
3. **Offline Support:** Cache bhajans for offline use
4. **Social Features:** Share favorite bhajans
5. **Voice Control:** Use AI to control playback

### Technical Improvements
1. **Progressive Audio Loading:** Better streaming experience
2. **Multi-room Audio:** Sync across multiple devices
3. **Advanced Analytics:** Detailed usage insights
4. **Mobile App:** Native mobile experience

---

This installation guide provides comprehensive instructions for implementing the bhajan/kirtan playback feature. Follow each step carefully and refer to the troubleshooting section if you encounter issues.