#include "FactoryReset.h"
#include "LEDHandler.h"
#include "OTA.h"
#include "WifiManager.h"
#include <driver/touch_sensor.h>
#include "Button.h"
#include "BhajanAudio.h"
#include "WebSocketHandler.h"

// Task handles
extern TaskHandle_t speakerTaskHandle;
extern TaskHandle_t micTaskHandle;
extern TaskHandle_t networkTaskHandle;
TaskHandle_t bhajanAudioTaskHandle = NULL;

// Global variables
int currentVolume = 100;
float pitchFactor = 1.0;
String deviceId = "";
bool isWebSocketConnected = false;

// Function prototypes
void bhajanButtonHandler();
void initBhajanSystem();
void createBhajanTask();

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
    String path = "/ws/device/" + String(deviceId);
    websocketSetup(ws_server, ws_port, path.c_str());
    
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

#define TOUCH_THRESHOLD 28000
#define REQUIRED_RELEASE_CHECKS                                                \
  100 // how many consecutive times we need "below threshold" to confirm release
#define TOUCH_DEBOUNCE_DELAY 500 // milliseconds

AsyncWebServer webServer(80);
WIFIMANAGER WifiManager;
esp_err_t getErr = ESP_OK;

// Main Thread -> onButtonLongPressUpEventCb -> enterSleep()
// Main Thread -> onButtonDoubleClickCb -> enterSleep()
// Touch Task -> touchTask -> enterSleep()
// Main Thread -> loop() (inactivity timeout) -> enterSleep()
void enterSleep() {
  Serial.println("Going to sleep...");

  // First, change device state to prevent any new data processing
  deviceState = SLEEP;
  scheduleListeningRestart = false;
  i2sOutputFlushScheduled = true;
  i2sInputFlushScheduled = true;
  vTaskDelay(10); // let all tasks accept state

  xSemaphoreTake(wsMutex, portMAX_DELAY);

  // Stop audio tasks first
  i2s_stop(I2S_PORT_IN);
  i2s_stop(I2S_PORT_OUT);

  // Properly disconnect WebSocket and wait for it to complete
  if (webSocket.isConnected()) {
    webSocket.disconnect();
    // Give some time for the disconnect to process
  }
  xSemaphoreGive(wsMutex);
  delay(100);

  // Stop all tasks that might be using I2S or other peripherals
  i2s_driver_uninstall(I2S_PORT_IN);
  i2s_driver_uninstall(I2S_PORT_OUT);

  // Flush any remaining serial output
  Serial.flush();

#ifdef TOUCH_MODE
  touch_pad_intr_disable(TOUCH_PAD_INTR_MASK_ALL);
  while (touchRead(TOUCH_PAD_NUM2) > TOUCH_THRESHOLD) {
    delay(50);
  }
  delay(500);
  touchSleepWakeUpEnable(TOUCH_PAD_NUM2, TOUCH_THRESHOLD);
#endif

  esp_deep_sleep_start();
  delay(1000);
}

void processSleepRequest() {
  if (sleepRequested) {
    sleepRequested = false;
    enterSleep(); // Just call it directly - no state checking needed
  }
}

void printOutESP32Error(esp_err_t err) {
  switch (err) {
  case ESP_OK:
    Serial.println("ESP_OK no errors");
    break;
  case ESP_ERR_INVALID_ARG:
    Serial.println("ESP_ERR_INVALID_ARG if the selected GPIO is not an RTC "
                   "GPIO, or the mode is invalid");
    break;
  case ESP_ERR_INVALID_STATE:
    Serial.println("ESP_ERR_INVALID_STATE if wakeup triggers conflict or "
                   "wireless not stopped");
    break;
  default:
    Serial.printf("Unknown error code: %d\n", err);
    break;
  }
}

static void onButtonLongPressUpEventCb(void *button_handle, void *usr_data) {
  Serial.println("Button long press end");
  delay(10);
  sleepRequested = true;
}

static void onButtonDoubleClickCb(void *button_handle, void *usr_data) {
  Serial.println("Button double click");
  delay(10);
  sleepRequested = true;
}

void getAuthTokenFromNVS() {
  preferences.begin("auth", false);
  authTokenGlobal = preferences.getString("auth_token", "");
  preferences.end();
}

void setupWiFi() {
  WifiManager.startBackgroundTask(
      "SMART MURTI"); // Run the background task to take care of our Wifi
  WifiManager.fallbackToSoftAp(
      true); // Run a SoftAP if no known AP can be reached
  WifiManager.attachWebServer(&webServer); // Attach our API to the Webserver
  WifiManager.attachUI();                  // Attach the UI to the Webserver

  // Run the Webserver and add your webpages to it
  webServer.on("/", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->redirect("/wifi");
  });
  webServer.onNotFound([](AsyncWebServerRequest *request) {
    request->send(404, "text/plain", "Not found");
  });
  webServer.begin();
}

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

void setupDeviceMetadata() {
      // factoryResetDevice();
  resetAuth();  deviceState = IDLE;

  getAuthTokenFromNVS();
  getOTAStatusFromNVS();

  if (otaState == OTA_IN_PROGRESS || otaState == OTA_COMPLETE) {
    deviceState = OTA;
  }
  if (factory_reset_status) {
    deviceState = FACTORY_RESET;
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);

  // SETUP
  setupDeviceMetadata();
  wsMutex = xSemaphoreCreateMutex();
  bhajanMutex = xSemaphoreCreateMutex();

  // Initialize bhajan system
  initBhajanSystem();

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
  btn->attachClickEventCb([](void* btn, void* data) {
      // Single click handles bhajan control
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
                          &speakerTaskHandle, // Handle
                          1                // Core 1 (application core)
  );

  xTaskCreatePinnedToCore(micTask,           // Function
                          "Microphone Task", // Name
                          4096,              // Stack size
                          NULL,              // Parameters
                          4,                 // Priority
                          &micTaskHandle,    // Handle
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

  // Create bhajan audio task
  createBhajanTask();

  // WIFI
  setupWiFi();

  // Initialize WebSocket with bhajan support
  initWebSocketWithBhajanSupport();
}

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

// Initialize WebSocket with bhajan support
void initWebSocketWithBhajanSupport() {
    // Initialize existing WebSocket
    String path = "/ws/device/" + String(deviceId);
    websocketSetup(ws_server, ws_port, path.c_str());
    
    // Initialize bhajan audio system
    initBhajanAudio();
    
    Serial.println("WebSocket with bhajan support initialized");
}