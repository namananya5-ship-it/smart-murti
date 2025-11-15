// Bhajan Management API for Deno Server
import { SupabaseClient } from "@supabase/supabase-js";

// Types
export interface Bhajan {
    id: number;
    name: string;
    url: string;
    created_at: string;
}

export interface DeviceBhajanStatus {
    device_id: string;
    current_bhajan_status: 'playing' | 'paused' | 'stopped';
    current_bhajan_position: number;
    bhajan_playback_started_at: string | null;
    selected_bhajan: Bhajan | null;
    default_bhajan: Bhajan | null;
}

// Get all available bhajans
export async function getAllBhajans(supabase: SupabaseClient): Promise<Bhajan[]> {
    const { data, error } = await supabase
        .from('bhajans')
        .select('*')
        .order('name');
    
    if (error) {
        console.error('Error fetching bhajans:', error);
        throw new Error('Failed to fetch bhajans');
    }
    
    return data || [];
}

// Get device bhajan status
export async function getDeviceBhajanStatus(
    supabase: SupabaseClient, 
    deviceId: string
): Promise<DeviceBhajanStatus> {
    const { data, error } = await supabase
        .from('device_bhajan_status')
        .select('*')
        .eq('device_id', deviceId)
        .single();
    
    if (error) {
        console.error('Error fetching device bhajan status:', error);
        throw new Error('Failed to fetch device bhajan status');
    }
    
    return {
        device_id: data.device_id,
        current_bhajan_status: data.current_bhajan_status,
        current_bhajan_position: data.current_bhajan_position,
        bhajan_playback_started_at: data.bhajan_playback_started_at,
        selected_bhajan: data.bhajan_id ? {
            id: data.bhajan_id,
            name: data.bhajan_name,
            url: data.bhajan_url,
            created_at: '' // Not available in view
        } : null,
        default_bhajan: data.default_bhajan_name ? {
            id: 0, // Not available in view
            name: data.default_bhajan_name,
            url: '', // Not available in view
            created_at: '' // Not available in view
        } : null
    };
}

// Play bhajan on device
export async function playBhajanOnDevice(
    supabase: SupabaseClient,
    deviceId: string,
    bhajanId: number,
    userId: string
): Promise<void> {
    // Verify user owns the device
    const { data: device, error: deviceError } = await supabase
        .from('devices')
        .select('id')
        .eq('id', deviceId)
        .eq('user_id', userId)
        .single();
    
    if (deviceError || !device) {
        throw new Error('Device not found or not owned by user');
    }
    
    // Get bhajan details
    const { data: bhajan, error: bhajanError } = await supabase
        .from('bhajans')
        .select('*')
        .eq('id', bhajanId)
        .single();
    
    if (bhajanError || !bhajan) {
        throw new Error('Bhajan not found');
    }
    
    // Update device status
    const { error: updateError } = await supabase
        .from('devices')
        .update({
            selected_bhajan_id: bhajanId,
            current_bhajan_status: 'playing',
            current_bhajan_position: 0,
            bhajan_playback_started_at: new Date().toISOString()
        })
        .eq('id', deviceId);
    
    if (updateError) {
        console.error('Error updating device bhajan status:', updateError);
        throw new Error('Failed to update device status');
    }
    
    // Log playback start
    await supabase
        .from('bhajan_playback_history')
        .insert({
            device_id: deviceId,
            bhajan_id: bhajanId,
            played_at: new Date().toISOString()
        });
}

// Control bhajan playback (pause/stop)
export async function controlBhajanPlayback(
    supabase: SupabaseClient,
    deviceId: string,
    action: 'play' | 'pause' | 'stop' | 'resume',
    userId: string
): Promise<void> {
    // Verify user owns the device
    const { data: device, error: deviceError } = await supabase
        .from('devices')
        .select('id, current_bhajan_status, selected_bhajan_id, bhajan_playback_started_at')
        .eq('id', deviceId)
        .eq('user_id', userId)
        .single();
    
    if (deviceError || !device) {
        throw new Error('Device not found or not owned by user');
    }
    
    let newStatus: 'playing' | 'paused' | 'stopped';
    let playbackStartedAt = device.bhajan_playback_started_at;
    
    switch (action) {
        case 'play':
        case 'resume':
            newStatus = 'playing';
            if (action === 'play') {
                playbackStartedAt = new Date().toISOString();
            }
            break;
        case 'pause':
            newStatus = 'paused';
            break;
        case 'stop':
            newStatus = 'stopped';
            // Log playback completion
            if (device.selected_bhajan_id && device.bhajan_playback_started_at) {
                const duration = Math.floor(
                    (new Date().getTime() - new Date(device.bhajan_playback_started_at).getTime()) / 1000
                );
                
                await supabase
                    .from('bhajan_playback_history')
                    .insert({
                        device_id: deviceId,
                        bhajan_id: device.selected_bhajan_id,
                        duration_seconds: duration,
                        completed: false
                    });
            }
            break;
        default:
            throw new Error('Invalid action');
    }
    
    const { error: updateError } = await supabase
        .from('devices')
        .update({
            current_bhajan_status: newStatus,
            bhajan_playback_started_at: playbackStartedAt
        })
        .eq('id', deviceId);
    
    if (updateError) {
        console.error('Error updating device bhajan status:', updateError);
        throw new Error('Failed to update device status');
    }
}

// Set default bhajan for device
export async function setDefaultBhajan(
    supabase: SupabaseClient,
    deviceId: string,
    bhajanId: number,
    userId: string
): Promise<void> {
    // Verify user owns the device
    const { data: device, error: deviceError } = await supabase
        .from('devices')
        .select('id')
        .eq('id', deviceId)
        .eq('user_id', userId)
        .single();
    
    if (deviceError || !device) {
        throw new Error('Device not found or not owned by user');
    }
    
    // Verify bhajan exists
    const { data: bhajan, error: bhajanError } = await supabase
        .from('bhajans')
        .select('id')
        .eq('id', bhajanId)
        .single();
    
    if (bhajanError || !bhajan) {
        throw new Error('Bhajan not found');
    }
    
    const { error: updateError } = await supabase
        .from('devices')
        .update({
            default_bhajan_id: bhajanId
        })
        .eq('id', deviceId);
    
    if (updateError) {
        console.error('Error setting default bhajan:', updateError);
        throw new Error('Failed to set default bhajan');
    }
}

// Get playback history
export async function getPlaybackHistory(
    supabase: SupabaseClient,
    deviceId: string,
    userId: string,
    limit: number = 50
) {
    // Verify user owns the device
    const { data: device, error: deviceError } = await supabase
        .from('devices')
        .select('id')
        .eq('id', deviceId)
        .eq('user_id', userId)
        .single();
    
    if (deviceError || !device) {
        throw new Error('Device not found or not owned by user');
    }
    
    const { data, error } = await supabase
        .from('bhajan_playback_history')
        .select(`
            *,
            bhajans (
                id,
                name,
                url
            )
        `)
        .eq('device_id', deviceId)
        .order('played_at', { ascending: false })
        .limit(limit);
    
    if (error) {
        console.error('Error fetching playback history:', error);
        throw new Error('Failed to fetch playback history');
    }
    
    return data;
}

// WebSocket message sender for bhajan commands
export async function sendBhajanCommandToDevice(
    deviceId: string,
    command: string,
    bhajanId?: number,
    wsConnections?: Map<string, WebSocket>
) {
    const ws = wsConnections?.get(deviceId);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.warn(`Device ${deviceId} not connected`);
        return false;
    }
    
    const message = {
        type: 'bhajan_command',
        command: command,
        bhajan_id: bhajanId,
        timestamp: new Date().toISOString()
    };
    
    ws.send(JSON.stringify(message));
    return true;
}