#ifndef LEDHANDLER_H
#define LEDHANDLER_H

#include "Config.h"

void setLEDColor(uint8_t r, uint8_t g, uint8_t b);
void turnOffLED();
void turnOnLED();
void setupRGBLED();
void turnOnBlueLED();
void turnOnRedLEDFlash();
// Visual feedback for bhajan events
void flashBhajanStart();
void flashBhajanPause();
void flashBhajanResume();
void flashBhajanStop();
void ledTask(void *parameter);

#endif