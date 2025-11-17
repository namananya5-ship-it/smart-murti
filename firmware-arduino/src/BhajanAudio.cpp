#include "BhajanAudio.h"
#include "WebSocketHandler.h"
#include "Config.h"
#include "LEDHandler.h"
#include <ArduinoJson.h>

// Global variables
BhajanInfo currentBhajan;
bool bhajanPlaybackRequested = false;
bool bhajanPlaybackActive = false;
SemaphoreHandle_t bhajanMutex = NULL;

// Static variables for internal use
static WiFiClient bhajanClient;
static HTTPClient http;
static uint8_t audioBuffer[BHAJAN_BUFFER_SIZE];
static uint32_t playbackStartTime = 0;
static uint32_t pausedPosition = 0;
static int currentVolume = 100; // 0-100 percentage

// Initialize bhajan audio system
void initBhajanAudio() {
    currentBhajan.id = -1;
    currentBhajan.status = BHAJAN_STOPPED;
    currentBhajan.position = 0;
    currentBhajan.duration = 0;
    
    bhajanMutex = xSemaphoreCreateMutex();
    
    if (!bhajanMutex) {
        Serial.println("Failed to create bhajan mutex");
    }
}

// Main bhajan audio task
void bhajanAudioTask(void *parameter) {
    Serial.println("Bhajan audio task started");
    
    while (1) {
        // Check if playback is requested
        if (bhajanPlaybackRequested && currentBhajan.url.length() > 0) {
            bhajanPlaybackRequested = false;
            bhajanPlaybackActive = true;
            
            Serial.println("Starting bhajan playback");
            Serial.print("URL: ");
            Serial.println(currentBhajan.url);
            Serial.print("Name: ");
            Serial.println(currentBhajan.name);
            
            streamBhajanAudio(currentBhajan.url.c_str());
            
            bhajanPlaybackActive = false;
        }
        
        // Small delay to prevent task starvation
        vTaskDelay(100 / portTICK_PERIOD_MS);
    }
}

// Stream bhajan audio from URL
void streamBhajanAudio(const char* url) {
    xSemaphoreTake(bhajanMutex, portMAX_DELAY);
    
    currentBhajan.status = BHAJAN_PLAYING;
    playbackStartTime = millis();
    
    xSemaphoreGive(bhajanMutex);
    
    // Send status update to server
    sendBhajanStatusUpdate();
    
    bool playbackError = false;
    int retryCount = 0;
    const int maxRetries = 3;
    
    while (retryCount < maxRetries && !playbackError) {
        http.begin(bhajanClient, url);
        http.setTimeout(BHAJAN_STREAM_TIMEOUT);
        
        // Add user agent header
        http.addHeader("User-Agent", "ESP32-Bhajan-Player/1.0");
        
        int httpCode = http.GET();
        
        if (httpCode == HTTP_CODE_OK) {
            Serial.println("Connected to audio stream");
            
            WiFiClient *stream = http.getStreamPtr();
            size_t bytesWritten = 0;
            
            while (currentBhajan.status == BHAJAN_PLAYING) {
                // Check if we should pause
                if (currentBhajan.status == BHAJAN_PAUSED) {
                    pausedPosition = currentBhajan.position;
                    vTaskDelay(100 / portTICK_PERIOD_MS);
                    continue;
                }
                
                // Check if we should stop
                if (currentBhajan.status == BHAJAN_STOPPED) {
                    break;
                }
                
                // Read audio data
                if (stream->available()) {
                    size_t bytesRead = stream->readBytes(audioBuffer, BHAJAN_BUFFER_SIZE);
                    
                    if (bytesRead > 0) {
                        // Apply volume scaling
                        if (currentVolume < 100) {
                            for (size_t i = 0; i < bytesRead; i += 2) {
                                int16_t sample = (audioBuffer[i + 1] << 8) | audioBuffer[i];
                                sample = (sample * currentVolume) / 100;
                                audioBuffer[i] = sample & 0xFF;
                                audioBuffer[i + 1] = (sample >> 8) & 0xFF;
                            }
                        }
                        
                        // Write to I2S
                        i2s_write(I2S_PORT_OUT, audioBuffer, bytesRead, &bytesWritten, portMAX_DELAY);
                        
                        // Update position
                        xSemaphoreTake(bhajanMutex, portMAX_DELAY);
                        currentBhajan.position += bytesRead;
                        xSemaphoreGive(bhajanMutex);
                    }
                } else {
                    // No data available, small delay
                    vTaskDelay(10 / portTICK_PERIOD_MS);
                }
                
                // Update elapsed time
                currentBhajan.position = (millis() - playbackStartTime) / 1000;
            }
            
            http.end();
            
            // Check if playback completed naturally
            if (currentBhajan.status == BHAJAN_PLAYING) {
                Serial.println("Bhajan playback completed");
                currentBhajan.status = BHAJAN_STOPPED;
                currentBhajan.position = 0;
                sendBhajanStatusUpdate();
            }
            
            break; // Exit retry loop
            
        } else {
            Serial.print("HTTP error: ");
            Serial.println(httpCode);
            http.end();
            retryCount++;
            
            if (retryCount < maxRetries) {
                Serial.print("Retrying in ");
                Serial.print(BHAJAN_RECONNECT_DELAY / 1000);
                Serial.println(" seconds...");
                vTaskDelay(BHAJAN_RECONNECT_DELAY / portTICK_PERIOD_MS);
            } else {
                playbackError = true;
            }
        }
    }
    
    if (playbackError) {
        Serial.println("Failed to stream bhajan audio after retries");
        currentBhajan.status = BHAJAN_STOPPED;
        sendBhajanStatusUpdate();
    }
}

// Start bhajan playback
void startBhajanPlayback(const char* url, const char* name, int id) {
    xSemaphoreTake(bhajanMutex, portMAX_DELAY);
    
    // Stop any current playback
    if (currentBhajan.status == BHAJAN_PLAYING) {
        currentBhajan.status = BHAJAN_STOPPED;
        vTaskDelay(100 / portTICK_PERIOD_MS); // Allow task to stop
    }
    
    // Set new bhajan info
    currentBhajan.id = id;
    currentBhajan.name = String(name);
    currentBhajan.url = String(url);
    currentBhajan.status = BHAJAN_STOPPED;
    currentBhajan.position = 0;
    currentBhajan.duration = 0;
    
    // Request playback start
    bhajanPlaybackRequested = true;
    
    xSemaphoreGive(bhajanMutex);
    
    Serial.println("Bhajan playback requested");
    // Visual feedback: quick LED blink to indicate bhajan requested/starting
    flashBhajanStart();
}

// Pause bhajan playback
void pauseBhajan() {
    xSemaphoreTake(bhajanMutex, portMAX_DELAY);
    
    if (currentBhajan.status == BHAJAN_PLAYING) {
        currentBhajan.status = BHAJAN_PAUSED;
        pausedPosition = currentBhajan.position;
        Serial.println("Bhajan paused");
    }
    
    xSemaphoreGive(bhajanMutex);
    sendBhajanStatusUpdate();
    // Visual feedback: indicate paused
    flashBhajanPause();
}

// Resume bhajan playback
void resumeBhajan() {
    xSemaphoreTake(bhajanMutex, portMAX_DELAY);
    
    if (currentBhajan.status == BHAJAN_PAUSED) {
        currentBhajan.status = BHAJAN_PLAYING;
        playbackStartTime = millis() - (pausedPosition * 1000);
        Serial.println("Bhajan resumed");
    }
    
    xSemaphoreGive(bhajanMutex);
    sendBhajanStatusUpdate();
    // Visual feedback: indicate resume
    flashBhajanResume();
}

// Stop bhajan playback
void stopBhajan() {
    xSemaphoreTake(bhajanMutex, portMAX_DELAY);
    
    currentBhajan.status = BHAJAN_STOPPED;
    currentBhajan.position = 0;
    pausedPosition = 0;
    bhajanPlaybackRequested = false;
    
    xSemaphoreGive(bhajanMutex);
    
    Serial.println("Bhajan stopped");
    sendBhajanStatusUpdate();
    // Visual feedback: indicate stopped
    flashBhajanStop();
}

// Handle bhajan command from WebSocket
void handleBhajanCommand(const char* command, int bhajanId, const char* url) {
    Serial.printf("Received bhajan command: %s, id: %d\n", command, bhajanId);
    
    if (strcmp(command, "play") == 0) {
        if (url) {
            // The name is not sent from the server, we can use a placeholder
            startBhajanPlayback(url, "Playing Bhajan", bhajanId);
        } else {
            // If no URL, maybe resume if paused? Or play default.
            // For now, we require a URL to play.
            Serial.println("Play command received without a URL.");
            if (currentBhajan.status == BHAJAN_PAUSED) {
                resumeBhajan();
            }
        }
    } else if (strcmp(command, "pause") == 0) {
        pauseBhajan();
    } else if (strcmp(command, "resume") == 0) {
        resumeBhajan();
    } else if (strcmp(command, "stop") == 0) {
        stopBhajan();
    }
}

// Check if bhajan is currently playing
bool isBhajanPlaying() {
    return currentBhajan.status == BHAJAN_PLAYING;
}

// Set bhajan volume (0-100)
void setBhajanVolume(int volume) {
    if (volume >= 0 && volume <= 100) {
        currentVolume = volume;
        Serial.print("Bhajan volume set to: ");
        Serial.println(volume);
    }
}

// Play default bhajan
void playDefaultBhajan() {
    // This would typically fetch the default bhajan from device settings
    // For now, we'll play the first available bhajan if URL is known
    if (currentBhajan.url.length() > 0) {
        startBhajanPlayback(currentBhajan.url.c_str(), currentBhajan.name.c_str(), currentBhajan.id);
    } else {
        Serial.println("No default bhajan URL available");
    }
}

// Handle physical button press for bhajan control
void handleBhajanButtonPress() {
    xSemaphoreTake(bhajanMutex, portMAX_DELAY);
    
    switch (currentBhajan.status) {
        case BHAJAN_STOPPED:
            // Start playing default bhajan
            playDefaultBhajan();
            break;
            
        case BHAJAN_PLAYING:
            // Pause current bhajan
            pauseBhajan();
            break;
            
        case BHAJAN_PAUSED:
            // Resume playback
            resumeBhajan();
            break;
    }
    
    xSemaphoreGive(bhajanMutex);
}

// Send status update to server
void sendBhajanStatusUpdate() {
    if (webSocket.isConnected()) {
        StaticJsonDocument<512> doc;
        
        doc["type"] = "bhajan_status";
        doc["device_id"] = deviceId;
        doc["status"] = currentBhajan.status;
        doc["bhajan_id"] = currentBhajan.id;
        doc["bhajan_name"] = currentBhajan.name;
        doc["position"] = currentBhajan.position;
        doc["duration"] = currentBhajan.duration;
        doc["volume"] = currentVolume;
        
        String jsonString;
        serializeJson(doc, jsonString);
        
        webSocket.sendTXT(jsonString);
    }
}

// Handle WebSocket play message
void handleBhajanPlayMessage(JsonDocument& doc) {
    const char* url = doc["url"];
    const char* name = doc["name"];
    int id = doc["bhajan_id"] | -1;
    
    if (url && name) {
        startBhajanPlayback(url, name, id);
    }
}

// Handle WebSocket control message
void handleBhajanControlMessage(JsonDocument& doc) {
    const char* action = doc["action"];
    
    if (action) {
        handleBhajanCommand(action);
    }
}