// WebSocket Handler modifications for Bhajan support
#include "WebSocketHandler.h"
#include "BhajanAudio.h"
#include "OTA.h"

// Extended WebSocket message handling with bhajan support
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
    switch(type) {
        case WStype_DISCONNECTED:
            Serial.println("WebSocket disconnected");
            isWebSocketConnected = false;
            break;
            
        case WStype_CONNECTED:
            Serial.println("WebSocket connected");
            isWebSocketConnected = true;
            
            // Send initial status including bhajan status
            sendInitialStatus();
            break;
            
        case WStype_TEXT:
            {
                Serial.print("Received WebSocket message: ");
                Serial.println((char*)payload);
                
                StaticJsonDocument<1024> doc;
                DeserializationError error = deserializeJson(doc, payload);
                
                if (error) {
                    Serial.print("JSON parsing failed: ");
                    Serial.println(error.c_str());
                    return;
                }
                
                // Handle different message types
                const char* messageType = doc["type"];
                
                if (messageType) {
                    if (strcmp(messageType, "auth_success") == 0) {
                        const char* devId = doc["deviceId"];
                        if (devId) {
                            deviceId = String(devId);
                            Serial.print("Device ID set: ");
                            Serial.println(deviceId);
                        }
                    } else if (strcmp(messageType, "bhajan_play") == 0) {
                        handleBhajanPlayMessage(doc);
                    } else if (strcmp(messageType, "bhajan_control") == 0) {
                        handleBhajanControlMessage(doc);
                    } else if (strcmp(messageType, "bhajan_set_default") == 0) {
                        handleBhajanSetDefaultMessage(doc);
                    } else if (strcmp(messageType, "bhajan_get_status") == 0) {
                        sendBhajanStatusUpdate();
                    } else {
                        // Handle other existing message types
                        handleGenericWebSocketMessage(doc);
                    }
                }
            }
            break;
            
        case WStype_BIN:
            // Handle binary messages if needed
            break;
            
        case WStype_ERROR:
            Serial.println("WebSocket error");
            break;
            
        default:
            break;
    }
}

// Handle bhajan set default message
void handleBhajanSetDefaultMessage(JsonDocument& doc) {
    int bhajanId = doc["bhajan_id"];
    
    if (bhajanId > 0) {
        // Store default bhajan ID in preferences
        preferences.begin("bhajan", false);
        preferences.putInt("default_bhajan_id", bhajanId);
        preferences.end();
        
        Serial.print("Default bhajan set to ID: ");
        Serial.println(bhajanId);
        
        // Send confirmation
        StaticJsonDocument<256> response;
        response["type"] = "bhajan_default_set";
        response["bhajan_id"] = bhajanId;
        response["success"] = true;
        
        String jsonString;
        serializeJson(response, jsonString);
        webSocket.sendTXT(jsonString);
    }
}

// Send initial status including bhajan status
void sendInitialStatus() {
    StaticJsonDocument<1024> doc;
    
    doc["type"] = "initial_status";
    doc["device_id"] = deviceId;
    doc["firmware_version"] = FIRMWARE_VERSION;
    doc["wifi_rssi"] = WiFi.RSSI();
    
    // Add bhajan status
    doc["bhajan_status"] = currentBhajan.status;
    doc["bhajan_id"] = currentBhajan.id;
    doc["bhajan_name"] = currentBhajan.name;
    doc["bhajan_position"] = currentBhajan.position;
    
    String jsonString;
    serializeJson(doc, jsonString);
    webSocket.sendTXT(jsonString);
}

// Handle generic WebSocket messages (existing functionality)
void handleGenericWebSocketMessage(JsonDocument& doc) {
    const char* type = doc["type"];
    
    // Handle existing message types (volume, OTA, etc.)
    if (strcmp(type, "volume") == 0) {
        int vol = doc["volume"];
        // Update global/current bhajan volume
        currentVolume = vol; // Update global volume
        setBhajanVolume(vol);
        
    } else if (strcmp(type, "ota") == 0) {
        // Handle OTA updates
        const char* url = doc["url"];
        if (url) {
            startOTAUpdate(url);
        }
        
    } else if (strcmp(type, "factory_reset") == 0) {
        // Handle factory reset
        factoryResetDevice();
        
    } else if (strcmp(type, "restart") == 0) {
        // Handle device restart
        ESP.restart();
        
    } else if (strcmp(type, "ping") == 0) {
        // Handle ping/pong
        StaticJsonDocument<128> response;
        response["type"] = "pong";
        response["timestamp"] = millis();
        
        String jsonString;
        serializeJson(response, jsonString);
        webSocket.sendTXT(jsonString);
    }
}

// Request bhajan list from server
void requestBhajanList() {
    if (webSocket.isConnected()) {
        StaticJsonDocument<256> doc;
        doc["type"] = "get_bhajan_list";
        doc["device_id"] = deviceId;
        
        String jsonString;
        serializeJson(doc, jsonString);
        webSocket.sendTXT(jsonString);
    }
}

// Handle incoming bhajan list
void handleBhajanListMessage(JsonDocument& doc) {
    JsonArray bhajans = doc["bhajans"];
    
    Serial.println("Received bhajan list:");
    for (JsonObject bhajan : bhajans) {
        int id = bhajan["id"];
        const char* name = bhajan["name"];
        const char* url = bhajan["url"];
        
        Serial.print("ID: ");
        Serial.print(id);
        Serial.print(" Name: ");
        Serial.print(name);
        Serial.print(" URL: ");
        Serial.println(url);
    }
    
    // Store bhajan list if needed
    // This could be stored in SPIFFS or preferences for offline access
}

// Send playback history request
void sendPlaybackHistory(int limit) {
    if (webSocket.isConnected()) {
        StaticJsonDocument<256> doc;
        doc["type"] = "get_playback_history";
        doc["device_id"] = deviceId;
        doc["limit"] = limit;
        
        String jsonString;
        serializeJson(doc, jsonString);
        webSocket.sendTXT(jsonString);
    }
}

// Handle playback history response
void handlePlaybackHistoryMessage(JsonDocument& doc) {
    JsonArray history = doc["history"];
    
    Serial.println("Playback history:");
    for (JsonObject entry : history) {
        const char* bhajanName = entry["bhajans"]["name"];
        const char* playedAt = entry["played_at"];
        int duration = entry["duration_seconds"];
        
        Serial.print("Song: ");
        Serial.print(bhajanName);
        Serial.print(" Played: ");
        Serial.print(playedAt);
        Serial.print(" Duration: ");
        Serial.print(duration);
        Serial.println(" seconds");
    }
}

// Enhanced status update including device info
void sendEnhancedStatusUpdate() {
    if (webSocket.isConnected()) {
        StaticJsonDocument<1024> doc;
        
        doc["type"] = "status_update";
        doc["device_id"] = deviceId;
        doc["timestamp"] = millis();
        
        // Device info
        doc["free_heap"] = ESP.getFreeHeap();
        doc["wifi_rssi"] = WiFi.RSSI();
        doc["uptime"] = millis() / 1000;
        
        // Bhajan info
        doc["bhajan_status"] = currentBhajan.status;
        doc["bhajan_id"] = currentBhajan.id;
        doc["bhajan_name"] = currentBhajan.name;
        doc["bhajan_position"] = currentBhajan.position;
        doc["bhajan_duration"] = currentBhajan.duration;
        
        // Audio info
        doc["volume"] = currentVolume;
        doc["pitch_factor"] = currentPitchFactor;
        
        String jsonString;
        serializeJson(doc, jsonString);
        webSocket.sendTXT(jsonString);
    }
}

// Schedule periodic status updates
void scheduleStatusUpdates() {
    static uint32_t lastUpdate = 0;
    uint32_t now = millis();
    
    // Send update every 30 seconds
    if (now - lastUpdate > 30000) {
        sendEnhancedStatusUpdate();
        lastUpdate = now;
    }
}

// Initialize WebSocket with bhajan support
void initWebSocketWithBhajanSupport() {
    // Initialize existing WebSocket
    websocketSetup(ws_server, ws_port, "/");
    
    // Initialize bhajan audio system
    initBhajanAudio();
    
    Serial.println("WebSocket with bhajan support initialized");
}