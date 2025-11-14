#pragma once

#include <Arduino.h>

class BhajanButton {
public:
    BhajanButton(int pin);
    void begin();
    bool wasPressed();

private:
    int _pin;
    bool _lastState;
    unsigned long _lastDebounceTime;
    unsigned long _debounceDelay;
};
