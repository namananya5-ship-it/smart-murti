// Integration Guide for firmware-arduino/src/main.cpp
// Add these modifications to your existing main.cpp file

// 1. Add bhajan includes at the top
#include "BhajanAudio.h"

// 2. Add bhajan task handle after other task handles
extern TaskHandle_t speakerTaskHandle;
extern TaskHandle_t micTaskHandle; 
extern TaskHandle_t networkTaskHandle;
TaskHandle_t bhajanAudioTaskHandle = NULL;

// 3. Add bhajan setup in setup() function
void setup() {
    Serial.begin(115200);
    delay(500);

    // SETUP
    setupDeviceMetadata();
    wsMutex = xSemaphoreCreateMutex();
    bhajanMutex = xSemaphoreCreateMutex(); // Add this line

    // Initialize bhajan system
    initBhajanSystem(); // Add this line

    // INTERRUPT
#ifdef TOUCH_MODE
    xTaskCreate(touchTask, "Touch Task", 4096, NULL, configMAX_PRIORITIES - 2,
              NULL);
#else
    getErr = esp_sleep_enable_ext0_wakeup(BUTTON_PIN, LOW);
    printOutESP32Error(getErr);
    Button *btn = new Button(BUTTON_PIN, false);
    btn->attachLongPressUpEventCb(&onButtonLongPressUpEventCb, NULL);
    btn->attachDoubleClickEventCb(&onButtonDoubleClickCb, NULL);
    // Modified single click to handle bhajans
    btn->attachClickEventCb([](void* btn, void* data) {
        handleBhajanButtonPress();
    }, NULL);
#endif

    // Pin audio tasks to Core 1 (application core)
    xTaskCreatePinnedToCore(ledTask,    // Function
                          "LED Task", // Name
                          4096,       // Stack size
                          NULL,       // Parameters
                          5,          // Priority
                          NULL,       // Handle
                          1           // Core 1 (application core)
  );

    xTaskCreatePinnedToCore(audioStreamTask, // Function
                          "Speaker Task",  // Name
                          4096,            // Stack size
                          NULL,            // Parameters
                          3,               // Priority
                          NULL,            // Handle
                          1                // Core 1 (application core)
  );

    xTaskCreatePinnedToCore(micTask,           // Function
                          "Microphone Task", // Name
                          4096,              // Stack size
                          NULL,              // Parameters
                          4,                 // Priority
                          NULL,              // Handle
                          1                  // Core 1 (application core)
  );

    // Pin network task to Core 0 (protocol core)
    xTaskCreatePinnedToCore(networkTask,              // Function
                          "Websocket Task",         // Name
                          8192,                     // Stack size
                          NULL,                     // Parameters
                          configMAX_PRIORITIES - 1, // Highest priority
                          &networkTaskHandle,       // Handle
                          0                         // Core 0 (protocol core)
  );

    // Create bhajan audio task - Add this
    createBhajanTask();

    // WIFI
    setupWiFi();
    
    // Initialize WebSocket with bhajan support - Modify this
    initWebSocketWithBhajanSupport();
}

// 4. Add bhajan task creation function
void createBhajanTask() {
    BaseType_t result = xTaskCreatePinnedToCore(
        bhajanAudioTask,
        "Bhajan Audio Task",
        8192,  // Larger stack for HTTP streaming
        NULL,
        2,     // Lower priority than AI audio
        &bhajanAudioTaskHandle,
        1      // Core 1 (application core)
    );
    
    if (result != pdPASS) {
        Serial.println("Failed to create bhajan audio task");
    } else {
        Serial.println("Bhajan audio task created successfully");
    }
}

// 5. Add bhajan system initialization
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

// 6. Modify touch task for bhajan support
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

// 7. Modify audioStreamTask to handle bhajan conflicts
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

// 8. Add enhanced main loop
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