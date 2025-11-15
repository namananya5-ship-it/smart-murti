"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
    Play, 
    Pause, 
    Square, 
    Volume2, 
    Music, 
    Clock,
    SkipForward,
    SkipBack
} from 'lucide-react';

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

interface BhajanPlayerProps {
    deviceId: string;
    authToken: string;
    className?: string;
    showControls?: boolean;
    compact?: boolean;
}

export function BhajanPlayer({ 
    deviceId, 
    authToken, 
    className = "",
    showControls = true,
    compact = false 
}: BhajanPlayerProps) {
    const [status, setStatus] = useState<DeviceBhajanStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [volume, setVolume] = useState(50);
    const [elapsedTime, setElapsedTime] = useState(0);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Format time for display
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
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
            setStatus(data.status);
            
            // Calculate elapsed time if playing
            if (data.status.current_bhajan_status === 'playing' && 
                data.status.bhajan_playback_started_at) {
                const startedAt = new Date(data.status.bhajan_playback_started_at);
                const now = new Date();
                setElapsedTime(Math.floor((now.getTime() - startedAt.getTime()) / 1000));
            }
        } catch (err) {
            console.error('Failed to fetch device status:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch status');
        } finally {
            setLoading(false);
        }
    };

    // Send control command
    const sendControlCommand = async (action: 'play' | 'pause' | 'stop' | 'resume') => {
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
                throw new Error('Failed to send control command');
            }

            // Optimistically update status
            if (status) {
                setStatus({
                    ...status,
                    current_bhajan_status: action === 'stop' ? 'stopped' : 
                                         action === 'pause' ? 'paused' : 'playing'
                });
            }

            // Refresh status after a short delay
            setTimeout(() => {
                fetchDeviceStatus();
            }, 500);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send command');
        }
    };

    // WebSocket connection for real-time updates
    const connectWebSocket = () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            return;
        }

        try {
            // Connect to the main WebSocket endpoint
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/ws/device/${deviceId}/bhajan`;
            
            wsRef.current = new WebSocket(wsUrl);

            wsRef.current.onopen = () => {
                console.log('Bhajan WebSocket connected');
                setError(null);
            };

            wsRef.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (data.type === 'bhajan_status') {
                        setStatus(data.status);
                        
                        if (data.status.current_bhajan_status === 'playing') {
                            setElapsedTime(data.status.current_bhajan_position || 0);
                        }
                    }
                } catch (err) {
                    console.error('Error parsing WebSocket message:', err);
                }
            };

            wsRef.current.onerror = (error) => {
                console.error('WebSocket error:', error);
                setError('Connection error');
            };

            wsRef.current.onclose = () => {
                console.log('WebSocket disconnected');
                
                // Attempt to reconnect after 3 seconds
                if (reconnectTimeoutRef.current) {
                    clearTimeout(reconnectTimeoutRef.current);
                }
                
                reconnectTimeoutRef.current = setTimeout(() => {
                    connectWebSocket();
                }, 3000);
            };
        } catch (err) {
            console.error('Failed to connect WebSocket:', err);
            setError('Failed to connect for real-time updates');
        }
    };

    // Handle volume change
    const handleVolumeChange = (newVolume: number) => {
        setVolume(newVolume);
        // TODO: Send volume command to device
        // This would require additional API endpoint and ESP32 support
    };

    // Initialize
    useEffect(() => {
        fetchDeviceStatus();
        connectWebSocket();

        // Set up periodic status updates
        const interval = setInterval(() => {
            fetchDeviceStatus();
        }, 10000);

        return () => {
            clearInterval(interval);
            if (wsRef.current) {
                wsRef.current.close();
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, [deviceId, authToken]);

    // Update elapsed time for playing bhajans
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        
        if (status?.current_bhajan_status === 'playing' && 
            status?.bhajan_playback_started_at) {
            interval = setInterval(() => {
                setElapsedTime(prev => prev + 1);
            }, 1000);
        }
        
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [status?.current_bhajan_status, status?.bhajan_playback_started_at]);

    if (loading) {
        return (
            <div className={`bhajan-player-loading ${className}`}>
                <div className="flex items-center justify-center p-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
                </div>
            </div>
        );
    }

    if (!status?.selected_bhajan && !compact) {
        return (
            <div className={`bhajan-player-empty ${className}`}>
                <div className="text-center py-6 text-gray-500">
                    <Music className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No bhajan playing</p>
                    <p className="text-xs">Select a bhajan from the list to start playing</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`bhajan-player ${compact ? 'compact' : ''} ${className}`}>
            {status?.selected_bhajan && (
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200 p-4">
                    {/* Compact Mode */}
                    {compact ? (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center flex-1 min-w-0">
                                <Music className="w-4 h-4 text-orange-500 mr-2 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-gray-800 truncate">
                                        {status.selected_bhajan.name}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {status.current_bhajan_status}
                                    </div>
                                </div>
                            </div>
                            
                            {showControls && (
                                <div className="flex items-center space-x-1 ml-2">
                                    {status.current_bhajan_status === 'playing' ? (
                                        <button
                                            onClick={() => sendControlCommand('pause')}
                                            className="p-1 text-orange-500 hover:text-orange-600 transition-colors"
                                            title="Pause"
                                        >
                                            <Pause className="w-4 h-4" />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => sendControlCommand('play')}
                                            className="p-1 text-green-500 hover:text-green-600 transition-colors"
                                            title="Play"
                                        >
                                            <Play className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => sendControlCommand('stop')}
                                        className="p-1 text-gray-500 hover:text-gray-600 transition-colors"
                                        title="Stop"
                                    >
                                        <Square className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Full Mode */
                        <>
                            {/* Header */}
                            <div className="flex items-center mb-3">
                                <Music className="w-5 h-5 text-orange-500 mr-2" />
                                <div className="flex-1">
                                    <h4 className="font-medium text-gray-800">
                                        Now Playing
                                    </h4>
                                    <p className="text-xs text-gray-500">
                                        {status.current_bhajan_status === 'playing' ? 'Playing' : 
                                         status.current_bhajan_status === 'paused' ? 'Paused' : 'Stopped'}
                                    </p>
                                </div>
                            </div>

                            {/* Bhajan Info */}
                            <div className="mb-4">
                                <h3 className="font-semibold text-gray-800 mb-1">
                                    {status.selected_bhajan.name}
                                </h3>
                                
                                {/* Progress Bar */}
                                <div className="mt-2">
                                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                        <span>{formatTime(elapsedTime)}</span>
                                        <Clock className="w-3 h-3" />
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-1">
                                        <div 
                                            className="bg-orange-500 h-1 rounded-full transition-all duration-1000"
                                            style={{ 
                                                width: status.current_bhajan_status === 'playing' ? 
                                                    `${Math.min((elapsedTime / 300) * 100, 100)}%` : '0%'
                                            }}
                                        ></div>
                                    </div>
                                </div>
                            </div>

                            {/* Controls */}
                            {showControls && (
                                <>
                                    {/* Playback Controls */}
                                    <div className="flex items-center justify-center space-x-3 mb-4">
                                        <button
                                            onClick={() => {
                                                // TODO: Implement previous bhajan
                                                console.log('Previous bhajan');
                                            }}
                                            className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                                            title="Previous"
                                        >
                                            <SkipBack className="w-4 h-4" />
                                        </button>
                                        
                                        {status.current_bhajan_status === 'playing' ? (
                                            <button
                                                onClick={() => sendControlCommand('pause')}
                                                className="p-3 bg-orange-500 text-white rounded-full hover:bg-orange-600 transition-colors"
                                                title="Pause"
                                            >
                                                <Pause className="w-5 h-5" />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => sendControlCommand('play')}
                                                className="p-3 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
                                                title="Play"
                                            >
                                                <Play className="w-5 h-5" />
                                            </button>
                                        )}
                                        
                                        <button
                                            onClick={() => {
                                                // TODO: Implement next bhajan
                                                console.log('Next bhajan');
                                            }}
                                            className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                                            title="Next"
                                        >
                                            <SkipForward className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Volume Control */}
                                    <div className="flex items-center space-x-2">
                                        <Volume2 className="w-4 h-4 text-gray-500" />
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={volume}
                                            onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                                            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                        />
                                        <span className="text-xs text-gray-500 w-8">
                                            {volume}%
                                        </span>
                                    </div>
                                </>
                            )}
                        </>
                    )}

                    {/* Error Display */}
                    {error && (
                        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                            {error}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}