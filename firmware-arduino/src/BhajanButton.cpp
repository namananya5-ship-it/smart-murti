#include "BhajanButton.h"
#include <Arduino.h>

BhajanButton::BhajanButton(int pin)
    : _pin(pin), _lastState(HIGH), _lastDebounceTime(0), _debounceDelay(50) {}

void BhajanButton::begin() {
    pinMode(_pin, INPUT_PULLUP);
    _lastState = digitalRead(_pin);
    _lastDebounceTime = millis();
}

bool BhajanButton::wasPressed() {
    bool currentState = digitalRead(_pin);
    unsigned long currentTime = millis();

    if (currentState != _lastState) {
        _lastDebounceTime = currentTime;
    }

    if ((currentTime - _lastDebounceTime) > _debounceDelay) {
        // state has been stable for debounce period
        if (_lastState == HIGH && currentState == LOW) {
            // falling edge: button pressed
            _lastState = currentState;
            return true;
        }
    }

    _lastState = currentState;
    return false;
}
