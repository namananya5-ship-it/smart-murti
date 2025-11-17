// Simple WebSocket handler header used by firmware modules
#ifndef WEBSOCKET_HANDLER_H
#define WEBSOCKET_HANDLER_H

#include <WebSocketsClient.h>
#include <Arduino.h>
#include <ArduinoJson.h>
#include "Audio.h"

// Externs from Audio/Global files
extern WebSocketsClient webSocket;
extern SemaphoreHandle_t wsMutex;
extern bool isWebSocketConnected;
extern String deviceId;

// WebSocket lifecycle and helpers
void webSocketEvent(WStype_t type, const uint8_t *payload, size_t length);
void websocketSetup(const String& server_domain, int port, const String& path);
void sendBhajanStatusUpdate();
void sendEnhancedStatusUpdate();

// Bhajan-specific handlers (implemented in WebSocketHandler_bhajan.cpp)
void handleBhajanPlayMessage(JsonDocument& doc);
void handleBhajanControlMessage(JsonDocument& doc);
void handleBhajanSetDefaultMessage(JsonDocument& doc);
void handleGenericWebSocketMessage(JsonDocument& doc);
void sendInitialStatus();
void requestBhajanList();
void handleBhajanListMessage(JsonDocument& doc);
void sendPlaybackHistory(int limit);
void handlePlaybackHistoryMessage(JsonDocument& doc);
void initWebSocketWithBhajanSupport();

#endif
