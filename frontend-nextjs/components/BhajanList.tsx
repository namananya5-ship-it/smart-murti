"use client";

import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, Music } from 'lucide-react';

interface Bhajan {
    id: number;
    name: string;
    url: string;
    created_at: string;
}

interface DeviceBhajanStatus {
    device_id: string;
    current_bhajan_status: 'playing' | 'paused' | 'stopped';
    current_bhajan_position: number;
    bhajan_playback_started_at: string | null;
    selected_bhajan: Bhajan | null;
    default_bhajan: Bhajan | null;
}

interface BhajanListProps {
    deviceId: string;
    authToken: string;
    className?: string;
}

export function BhajanList({ deviceId, authToken, className = "" }: BhajanListProps) {
    const [bhajans, setBhajans] = useState<Bhajan[]>([]);
    const [deviceStatus, setDeviceStatus] = useState<DeviceBhajanStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [playingBhajan, setPlayingBhajan] = useState<number | null>(null);

    // Fetch bhajans list
    const fetchBhajans = async () => {
        try {
            const response = await fetch('/api/bhajans', {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch bhajans');
            }

            const data = await response.json();
            setBhajans(data.bhajans);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load bhajans');
        }
    };

    // Fetch device status
    const fetchDeviceStatus = async () => {
        try {
            const response = await fetch(`/api/bhajans/status?deviceId=${deviceId}`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch device status');
            }

            const data = await response.json();
            setDeviceStatus(data.status);
            
            // Update playing bhajan based on device status
            if (data.status.current_bhajan_status === 'playing' && data.status.selected_bhajan) {
                setPlayingBhajan(data.status.selected_bhajan.id);
            } else {
                setPlayingBhajan(null);
            }
        } catch (err) {
            console.error('Failed to fetch device status:', err);
        }
    };

    // Play bhajan
    const playBhajan = async (bhajanId: number) => {
        try {
            setError(null);
            
            const response = await fetch('/api/bhajans/play', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    deviceId,
                    bhajanId
                })
            });

            if (!response.ok) {
                throw new Error('Failed to play bhajan');
            }

            setPlayingBhajan(bhajanId);
            
            // Refresh device status after a short delay
            setTimeout(() => {
                fetchDeviceStatus();
            }, 500);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to play bhajan');
        }
    };

    // Control playback (pause/stop)
    const controlPlayback = async (action: 'pause' | 'stop') => {
        try {
            setError(null);
            
            const response = await fetch('/api/bhajans/control', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    deviceId,
                    action
                })
            });

            if (!response.ok) {
                throw new Error('Failed to control playback');
            }

            if (action === 'stop') {
                setPlayingBhajan(null);
            } else {
                // For pause, keep the bhajan ID but update status
                setPlayingBhajan(playingBhajan);
            }
            
            // Refresh device status
            setTimeout(() => {
                fetchDeviceStatus();
            }, 500);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to control playback');
        }
    };

    // Initialize
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await Promise.all([
                fetchBhajans(),
                fetchDeviceStatus()
            ]);
            setLoading(false);
        };

        loadData();

        // Set up periodic status updates
        const interval = setInterval(() => {
            fetchDeviceStatus();
        }, 5000);

        return () => clearInterval(interval);
    }, [deviceId, authToken]);

    if (loading) {
        return (
            <div className={`bhajan-list-loading ${className}`}>
                <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                    <span className="ml-2 text-gray-600">Loading bhajans...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`bhajan-list-error ${className}`}>
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="text-red-800">Error: {error}</div>
                    <button 
                        onClick={() => {
                            setError(null);
                            fetchBhajans();
                            fetchDeviceStatus();
                        }}
                        className="mt-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`bhajan-list ${className}`}>
            <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <Music className="w-5 h-5 mr-2 text-orange-500" />
                    Available Bhajans & Kirtans
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                    Select a spiritual song to play on your device
                </p>
            </div>

            {/* Current Playing Status */}
            {deviceStatus?.selected_bhajan && (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm font-medium text-orange-800">
                                Now Playing
                            </div>
                            <div className="text-sm text-orange-600">
                                {deviceStatus.selected_bhajan.name}
                            </div>
                            <div className="text-xs text-orange-500">
                                Status: {deviceStatus.current_bhajan_status}
                            </div>
                        </div>
                        <div className="flex space-x-2">
                            {deviceStatus.current_bhajan_status === 'playing' && (
                                <button
                                    onClick={() => controlPlayback('pause')}
                                    className="p-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
                                    title="Pause"
                                >
                                    <Pause className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                onClick={() => controlPlayback('stop')}
                                className="p-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                                title="Stop"
                            >
                                <Square className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bhajan List */}
            <div className="space-y-2">
                {bhajans.map((bhajan) => {
                    const isPlaying = playingBhajan === bhajan.id && 
                                    deviceStatus?.current_bhajan_status === 'playing';
                    const isSelected = deviceStatus?.selected_bhajan?.id === bhajan.id;
                    
                    return (
                        <div
                            key={bhajan.id}
                            className={`
                                bhajan-item p-3 rounded-lg border transition-all
                                ${isSelected 
                                    ? 'border-orange-300 bg-orange-50' 
                                    : 'border-gray-200 bg-white hover:border-orange-200'
                                }
                            `}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="font-medium text-gray-800">
                                        {bhajan.name}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        Added {new Date(bhajan.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                    {isPlaying ? (
                                        <button
                                            onClick={() => controlPlayback('pause')}
                                            className="p-2 bg-orange-500 text-white rounded-full hover:bg-orange-600 transition-colors"
                                            title="Pause"
                                        >
                                            <Pause className="w-4 h-4" />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => playBhajan(bhajan.id)}
                                            className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
                                            title="Play"
                                        >
                                            <Play className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {bhajans.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    <Music className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No bhajans available at the moment.</p>
                    <p className="text-sm">Please contact support to add spiritual songs.</p>
                </div>
            )}
        </div>
    );
}