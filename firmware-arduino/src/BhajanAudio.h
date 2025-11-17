#ifndef BHAJAN_AUDIO_H
#define BHAJAN_AUDIO_H

#include <Arduino.h>
#include <WiFiClient.h>
#include <HTTPClient.h>
#include <driver/i2s.h>
#include "Audio.h"
#include "Config.h"

// Bhajan playback states
enum BhajanStatus {
    BHAJAN_STOPPED,
    BHAJAN_PLAYING,
    BHAJAN_PAUSED
};

// Bhajan information structure
struct BhajanInfo {
    int id;
    String name;
    String url;
    BhajanStatus status;
    uint32_t position;
    uint32_t duration;
};

// Global bhajan state
extern BhajanInfo currentBhajan;
extern bool bhajanPlaybackRequested;
extern bool bhajanPlaybackActive;
extern SemaphoreHandle_t bhajanMutex;

// Function declarations
void bhajanAudioTask(void *parameter);
void initBhajanAudio();
void startBhajanPlayback(const char* url, const char* name, int id = -1);
void pauseBhajan();
void resumeBhajan();
void stopBhajan();
void handleBhajanCommand(const char* command, int bhajanId = -1, const char* url = nullptr);
void streamBhajanAudio(const char* url);
bool isBhajanPlaying();
void setBhajanVolume(int volume);
void playDefaultBhajan();
void handleBhajanButtonPress();

// WebSocket message handlers
void handleBhajanPlayMessage(JsonDocument& doc);
void handleBhajanControlMessage(JsonDocument& doc);

// Audio streaming constants
#define BHAJAN_BUFFER_SIZE 4096
#define BHAJAN_STREAM_TIMEOUT 10000
#define BHAJAN_RECONNECT_DELAY 3000

#endif