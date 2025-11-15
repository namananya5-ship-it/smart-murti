
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get('deviceId');

  if (!deviceId) {
    return NextResponse.json({ error: 'deviceId is required' }, { status: 400 });
  }

  const supabase = createClient();

  const { data: device, error } = await supabase
    .from('devices')
    .select('*, selected_bhajan_id(*)')
    .eq('device_id', deviceId)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const status = {
    device_id: device.device_id,
    current_bhajan_status: 'stopped', // This will be updated later from the device
    current_bhajan_position: 0,
    bhajan_playback_started_at: null,
    selected_bhajan: device.selected_bhajan_id,
    default_bhajan: null, // We can implement this later
  };

  return NextResponse.json({ status });
}
