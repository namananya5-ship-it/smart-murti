// Main firmware with Bhajan integration
#include "FactoryReset.h"
#include "LEDHandler.h"
#include "OTA.h"
#include "WifiManager.h"
#include "Button.h"
#include "BhajanAudio.h"
#include "WebSocketHandler.h"

// Task handles
extern TaskHandle_t speakerTaskHandle;
extern TaskHandle_t micTaskHandle;
extern TaskHandle_t networkTaskHandle;
TaskHandle_t bhajanAudioTaskHandle = NULL;

// Function prototypes
void bhajanButtonHandler();
void initBhajanSystem();
void createBhajanTask();

// Enhanced setup function with bhajan support
void setup() {
    Serial.begin(115200);
    delay(500);

    // Basic setup
    setupDeviceMetadata();
    wsMutex = xSemaphoreCreateMutex();
    bhajanMutex = xSemaphoreCreateMutex();

    // Initialize bhajan system
    initBhajanSystem();

    // Button/Touch setup for bhajan control
#ifdef TOUCH_MODE
    // Touch is already set up in main.cpp
#else
    // Enhanced button setup with bhajan control
    getErr = esp_sleep_enable_ext0_wakeup(BUTTON_PIN, LOW);
    printOutESP32Error(getErr);
    
    Button *btn = new Button(BUTTON_PIN, false);
    btn->attachLongPressUpEventCb(&onButtonLongPressUpEventCb, NULL);
    btn->attachDoubleClickEventCb(&onButtonDoubleClickCb, NULL);
    btn->attachClickEventCb([](void* btn, void* data) {
        // Single click handles bhajan control
        handleBhajanButtonPress();
    }, NULL);
#endif

    // Create tasks
    xTaskCreatePinnedToCore(ledTask, "LED Task", 4096, NULL, 5, NULL, 1);
    xTaskCreatePinnedToCore(audioStreamTask, "Speaker Task", 4096, NULL, 3, &speakerTaskHandle, 1);
    xTaskCreatePinnedToCore(micTask, "Microphone Task", 4096, NULL, 4, &micTaskHandle, 1);
    xTaskCreatePinnedToCore(networkTask, "Websocket Task", 8192, NULL, configMAX_PRIORITIES - 1, &networkTaskHandle, 0);
    
    // Create bhajan audio task
    createBhajanTask();

    // WiFi setup
    setupWiFi();
    
    // Initialize WebSocket with bhajan support
    initWebSocketWithBhajanSupport();
}

// Initialize bhajan system
void initBhajanSystem() {
    // Load default bhajan from preferences
    preferences.begin("bhajan", true);
    int defaultBhajanId = preferences.getInt("default_bhajan_id", -1);
    preferences.end();
    
    if (defaultBhajanId > 0) {
        currentBhajan.id = defaultBhajanId;
        Serial.print("Default bhajan ID loaded: ");
        Serial.println(defaultBhajanId);
    }
    
    // Initialize audio system
    initBhajanAudio();
    
    Serial.println("Bhajan system initialized");
}

// Create bhajan audio task
void createBhajanTask() {
    BaseType_t result = xTaskCreatePinnedToCore(
        bhajanAudioTask,
        "Bhajan Audio Task",
        8192,  // Larger stack for HTTP streaming
        NULL,
        2,     // Lower priority than main audio
        &bhajanAudioTaskHandle,
        1      // Core 1 (application core)
    );
    
    if (result != pdPASS) {
        Serial.println("Failed to create bhajan audio task");
    } else {
        Serial.println("Bhajan audio task created successfully");
    }
}

// Enhanced main loop with bhajan support
void loop() {
    processSleepRequest();
    
    if (otaState == OTA_IN_PROGRESS) {
        loopOTA();
    }
    
    // Handle bhajan-specific tasks
    static uint32_t lastStatusUpdate = 0;
    uint32_t now = millis();
    
    // Send periodic status updates
    if (now - lastStatusUpdate > 30000) {
        sendEnhancedStatusUpdate();
        lastStatusUpdate = now;
    }
    
    // Handle touch input for bhajan control
#ifdef TOUCH_MODE
    static bool wasTouched = false;
    uint32_t touchValue = touchRead(TOUCH_PAD_NUM2);
    bool isTouched = (touchValue > TOUCH_THRESHOLD);
    
    if (isTouched && !wasTouched) {
        // Touch detected - handle bhajan control
        handleBhajanButtonPress();
        wasTouched = true;
    } else if (!isTouched && wasTouched) {
        wasTouched = false;
    }
#endif
}

// Bhajan button handler for touch mode
void bhajanButtonHandler() {
    // This function can be called from touch task
    // to handle bhajan-specific button behavior
    handleBhajanButtonPress();
}

// Enhanced touch task with bhajan support
void touchTask(void *parameter) {
    touch_pad_init();
    touch_pad_config(TOUCH_PAD_NUM2);

    bool touched = false;
    unsigned long pressStartTime = 0;
    unsigned long lastTouchTime = 0;
    const unsigned long LONG_PRESS_DURATION = 500;
    const unsigned long BHAJAN_CONTROL_DURATION = 200; // Shorter for bhajan control

    while (1) {
        uint32_t touchValue = touchRead(TOUCH_PAD_NUM2);
        bool isTouched = (touchValue > TOUCH_THRESHOLD);
        unsigned long currentTime = millis();

        // Initial touch detection
        if (isTouched && !touched && (currentTime - lastTouchTime > TOUCH_DEBOUNCE_DELAY)) {
            touched = true;
            pressStartTime = currentTime;
            lastTouchTime = currentTime;
        }

        // Check for different touch durations
        if (touched && isTouched) {
            unsigned long pressDuration = currentTime - pressStartTime;
            
            if (pressDuration >= LONG_PRESS_DURATION) {
                // Long press - sleep mode
                sleepRequested = true;
            } else if (pressDuration >= BHAJAN_CONTROL_DURATION && pressDuration < LONG_PRESS_DURATION) {
                // Medium press - bhajan control
                if (!sleepRequested) {
                    handleBhajanButtonPress();
                }
            }
        }

        // Release detection
        if (!isTouched && touched) {
            touched = false;
            pressStartTime = 0;
        }

        vTaskDelay(20 / portTICK_PERIOD_MS);
    }
    vTaskDelete(NULL);
}

// Audio task modification to handle bhajan/AI audio conflicts
void audioStreamTask(void *parameter) {
    while (1) {
        // Check if bhajan is playing - if so, pause AI audio
        if (isBhajanPlaying()) {
            // Pause AI audio output
            i2s_stop(I2S_PORT_OUT);
            vTaskDelay(100 / portTICK_PERIOD_MS);
            continue;
        }
        
        // Resume AI audio if bhajan stopped
        if (!isBhajanPlaying()) {
            i2s_start(I2S_PORT_OUT);
        }
        
        // Continue with original audio stream logic
        // ... (existing audioStreamTask code)
        
        vTaskDelay(10 / portTICK_PERIOD_MS);
    }
}

// Network task with bhajan status updates
void networkTask(void *parameter) {
    // Existing network task setup
    websocketSetup(ws_server, ws_port, "/");
    
    while (1) {
        // Handle WebSocket
        webSocket.loop();
        
        // Send periodic bhajan status updates
        static uint32_t lastBhajanUpdate = 0;
        uint32_t now = millis();
        
        if (now - lastBhajanUpdate > 5000) {
            sendBhajanStatusUpdate();
            lastBhajanUpdate = now;
        }
        
        vTaskDelay(10 / portTICK_PERIOD_MS);
    }
}

// Configuration loading with bhajan support
void loadConfiguration() {
    preferences.begin("config", true);
    
    // Load existing configurations
    authTokenGlobal = preferences.getString("auth_token", "");
    
    // Load bhajan configurations
    preferences.begin("bhajan", true);
    int defaultBhajanId = preferences.getInt("default_bhajan_id", -1);
    int bhajanVolume = preferences.getInt("bhajan_volume", 100);
    preferences.end();
    
    if (defaultBhajanId > 0) {
        currentBhajan.id = defaultBhajanId;
    }
    
    setBhajanVolume(bhajanVolume);
    
    Serial.println("Configuration loaded with bhajan support");
}

// Save configuration with bhajan support
void saveConfiguration() {
    preferences.begin("config", false);
    preferences.putString("auth_token", authTokenGlobal);
    preferences.end();
    
    preferences.begin("bhajan", false);
    preferences.putInt("bhajan_volume", currentVolume);
    preferences.end();
    
    Serial.println("Configuration saved with bhajan support");
}