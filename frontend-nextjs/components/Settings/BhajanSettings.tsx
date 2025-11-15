// Bhajan Settings Component for integration into SettingsDashboard
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BhajanList } from "@/app/components/BhajanList";
import { BhajanPlayer } from "@/app/components/BhajanPlayer";
import { Music } from 'lucide-react';

interface BhajanSettingsProps {
    userId: string;
    deviceId?: string;
    authToken: string;
}

export function BhajanSettings({ userId, deviceId, authToken }: BhajanSettingsProps) {
    const [hasDevice, setHasDevice] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user has a device
        const checkDevice = async () => {
            if (deviceId) {
                setHasDevice(true);
            }
            setLoading(false);
        };

        checkDevice();
    }, [deviceId]);

    if (loading) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!hasDevice) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Music className="w-5 h-5 mr-2 text-orange-500" />
                        Bhajan & Kirtan Player
                    </CardTitle>
                </CardHeader>
                    <CardContent>
                        <div className="text-center py-8 text-gray-500">
                            <Music className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p className="text-lg font-medium mb-2">No Device Connected</p>
                            <p className="text-sm">Please connect an ESP32 device to access bhajan playback features.</p>
                            <div className="mt-4">
                                <Button 
                                    variant="outline" 
                                    className="border-orange-500 text-orange-500 hover:bg-orange-50"
                                >
                                    Connect Device
                                </Button>
                            </div>
                        </div>
                    </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Bhajan Player */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Music className="w-5 h-5 mr-2 text-orange-500" />
                        Now Playing
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <BhajanPlayer 
                        deviceId={deviceId!}
                        authToken={authToken}
                        showControls={true}
                        compact={false}
                    />
                </CardContent>
            </Card>

            {/* Bhajan Library */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Music className="w-5 h-5 mr-2 text-orange-500" />
                        Spiritual Songs Library
                    </CardTitle>
                    <p className="text-sm text-gray-500">
                        Browse and play devotional music on your device
                    </p>
                </CardHeader>
                <CardContent>
                    <BhajanList 
                        deviceId={deviceId!}
                        authToken={authToken}
                        className="max-h-96 overflow-y-auto"
                    />
                </CardContent>
            </Card>

            {/* Instructions */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium">
                        Device Controls
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-gray-600 space-y-2">
                        <p><strong>Physical Button:</strong></p>
                        <ul className="list-disc list-inside ml-4 space-y-1">
                            <li>Single press: Play/Pause current bhajan</li>
                            <li>Long press (2+ seconds): Enter sleep mode</li>
                        </ul>
                        <p className="mt-3"><strong>Web Controls:</strong></p>
                        <ul className="list-disc list-inside ml-4 space-y-1">
                            <li>Click play button to start a bhajan</li>
                            <li>Use controls to pause, stop, or adjust volume</li>
                            <li>Playback status syncs in real-time</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}