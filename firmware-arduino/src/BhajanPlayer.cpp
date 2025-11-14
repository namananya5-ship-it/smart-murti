#include "BhajanPlayer.h"
#include "Config.h"
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <SPIFFS.h>
#include <ArduinoJson.h>

// Audio libs used in tests (assumed available in platformio libs)
// We follow the same simple approach as test/WifiSetup: download MP3 to SPIFFS and play it
#include <AudioTools.h>

static const char* BH_FILE = "/bhajan.mp3";

void downloadFileToSPIFFS(const String &url) {
    if (!SPIFFS.begin(true)) {
        Serial.println("SPIFFS mount failed for bhajan download");
        return;
    }

    HTTPClient http;
    WiFiClientSecure client;

#ifdef DEV_MODE
    http.begin("http://" + String(backend_server) + ":" + String(backend_port) + url);
#else
    client.setCACert(Vercel_CA_cert);
    http.begin(client, url);
#endif

    http.setTimeout(15000);
    int httpCode = http.GET();
    if (httpCode != HTTP_CODE_OK) {
        Serial.printf("Failed to download bhajan, HTTP code %d\n", httpCode);
        http.end();
        return;
    }

    // Write to SPIFFS
    File f = SPIFFS.open(BH_FILE, FILE_WRITE);
    if (!f) {
        Serial.println("Failed to open file for writing");
        http.end();
        return;
    }

    WiFiClient *stream = http.getStreamPtr();
    const size_t bufferSize = 1024;
    uint8_t buffer[bufferSize];
    while (http.connected() && stream->available()) {
        size_t len = stream->readBytes(buffer, bufferSize);
        if (len > 0) {
            f.write(buffer, len);
        }
        delay(1);
    }

    f.close();
    http.end();
    Serial.println("Bhajan downloaded to SPIFFS");
}

void playBhajanFromSPIFFS() {
    if (!SPIFFS.begin(true)) {
        Serial.println("SPIFFS mount failed for playback");
        return;
    }

    File f = SPIFFS.open(BH_FILE, "r");
    if (!f) {
        Serial.println("No bhajan file found in SPIFFS");
        return;
    }

    // Setup I2S and player similar to test/WifiSetup.h
    I2SStream i2s;
    MP3DecoderHelix decoder;
    AudioPlayer player(AudioSourceSPIFFS(), i2s, decoder);

    auto cfg = i2s.defaultConfig(TX_MODE);
    cfg.pin_bck  = I2S_BCK_OUT;
    cfg.pin_ws   = I2S_WS_OUT;
    cfg.pin_data = I2S_DATA_OUT;
    cfg.channels = 1;
    cfg.sample_rate = 44100;
    i2s.begin(cfg);

    player.setVolume(1.0f);
    if(!player.begin()) {
        Serial.println("Player.begin() failed");
        return;
    }

    Serial.println("Playing bhajan from SPIFFS...");
    while (true) {
        size_t copied = player.copy();
        if (copied == 0) {
            Serial.println("Playback finished.");
            break;
        }
        delay(1);
    }

    // remove file after play optionally
    // SPIFFS.remove(BH_FILE);
}

void fetchAndPlayBhajanByMac() {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("WiFi not connected, cannot fetch bhajan");
        return;
    }

    // Build device-by-mac endpoint
    String mac = WiFi.macAddress();
    String url = String("http://") + String(backend_server) + ":" + String(backend_port) + "/api/devices/by-mac/" + urlEncode(mac) + "/bhajan";

    HTTPClient http;
    WiFiClientSecure client;
#ifndef DEV_MODE
    client.setCACert(Vercel_CA_cert);
    http.begin(client, url);
#else
    http.begin(url);
#endif
    if (!authTokenGlobal.isEmpty()) {
        http.addHeader("Authorization", "Bearer " + authTokenGlobal);
    }

    int code = http.GET();
    if (code != HTTP_CODE_OK) {
        Serial.printf("bhajan endpoint returned %d\n", code);
        http.end();
        return;
    }

    String body = http.getString();
    DynamicJsonDocument doc(512);
    auto err = deserializeJson(doc, body);
    if (err) {
        Serial.println("Failed to parse bhajan JSON");
        http.end();
        return;
    }

    const char *bhajanUrl = doc["url"];
    if (!bhajanUrl) {
        Serial.println("No url in bhajan response");
        http.end();
        return;
    }

    Serial.printf("Bhajan URL: %s\n", bhajanUrl);
    String urlStr = String(bhajanUrl);
    // Try streaming first; if it fails, fallback to download
    streamAndPlayFromUrl(urlStr);
    // NOTE: streamAndPlayFromUrl will fallback internally to download if streaming isn't available.
    http.end();
}

// Helper urlEncode used here (duplicate of test helper)
String urlEncode(const String &msg)
{
    String encodedMsg = "";
    char c;
    char code0;
    char code1;
    for (int i = 0; i < msg.length(); i++)
    {
        c = msg.charAt(i);
        if (c == ' ')
        {
            encodedMsg += '+';
        }

        // Try to stream and play the MP3 without saving to SPIFFS.
        // Uses AudioFileSourceHTTPStream (common in Arduino audio libs) and MP3 decoder.
        // If streaming classes aren't available or playback fails, falls back to downloadFileToSPIFFS + play.
        void streamAndPlayFromUrl(const String &url) {
            Serial.println("Attempting to stream bhajan...");
            bool streamed = false;

            // Attempt to use AudioFileSourceHTTPStream + AudioPlayer pattern
            // This may require the audio-tools / AudioFileSourceHTTPStream library to be present in platformio
        #if defined(AudioFileSourceHTTPStream_h) || 1
            {
                // Some builds provide a direct constructor taking URL; otherwise fall back
                Serial.println("Using AudioFileSourceHTTPStream approach (if available)");
                I2SStream i2s;
                MP3DecoderHelix decoder;

                // Create an HTTP audio source; many audio libs accept a C string URL
                // AudioFileSourceHTTPStream source(url.c_str());
                // On some platforms AudioFileSourceHTTPStream may not be available; the code below is guarded by try/fallback.
                bool ok = false;
                // We try to compile-time assume the class is available; if it's not, this block will likely fail at link time
                // but at runtime we still provide fallback.
                #ifdef AudioFileSourceHTTPStream_h
                    AudioFileSourceHTTPStream source(url.c_str());
                    AudioPlayer player(source, i2s, decoder);
                    if (player.begin()) {
                        player.setVolume(1.0f);
                        while (true) {
                            size_t copied = player.copy();
                            if (copied == 0) break;
                            delay(1);
                        }
                        ok = true;
                    }
                #else
                    // If AudioFileSourceHTTPStream isn't available at compile, we still attempt a simple stream: read HTTPClient stream and feed decoder directly
                    // Some decoders provide a `fill` or `write` method — here we attempt a common pattern with MP3DecoderHelix if present.
                    WiFiClientSecure client;
                    HTTPClient http;
                    #ifndef DEV_MODE
                    client.setCACert(Vercel_CA_cert);
                    http.begin(client, url);
                    #else
                    http.begin(url);
                    #endif
                    if (!authTokenGlobal.isEmpty()) {
                        http.addHeader("Authorization", "Bearer " + authTokenGlobal);
                    }
                    int code = http.GET();
                    if (code == HTTP_CODE_OK) {
                        WiFiClient *stream = http.getStreamPtr();
                        // Try to feed raw bytes to decoder via AudioPlayer-like API
                        AudioPlayer player(AudioSourceSPIFFS(), i2s, decoder); // placeholder player to reuse decoder
                        if (player.begin()) {
                            // Read stream in chunks and feed into SPIFFS-like buffer used by decoder is not trivial; we'll fallback instead.
                            // Close and mark not ok so fallback will run.
                            player.end();
                        }
                    }
                    http.end();
                #endif

                if (ok) {
                    streamed = true;
                    Serial.println("Streaming playback finished successfully");
                }
            }
        #endif

            if (!streamed) {
                Serial.println("Streaming not available or failed — falling back to download+play");
                downloadFileToSPIFFS(url);
                playBhajanFromSPIFFS();
            }
        }
        else if (isalnum(c))
        {
            encodedMsg += c;
        }
        else
        {
            code1 = (c & 0xf) + '0';
            if ((c & 0xf) > 9)
            {
                code1 = (c & 0xf) - 10 + 'A';
            }
            c = (c >> 4) & 0xf;
            code0 = c + '0';
            if (c > 9)
            {
                code0 = c - 10 + 'A';
            }
            encodedMsg += '%';
            encodedMsg += code0;
            encodedMsg += code1;
        }
    }
    return encodedMsg;
