
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { deviceId, bhajanId } = await request.json();

  if (!deviceId || !bhajanId) {
    return NextResponse.json({ error: 'deviceId and bhajanId are required' }, { status: 400 });
  }

  const supabase = createClient();

  const { data: bhajan, error: bhajanError } = await supabase
    .from('bhajans')
    .select('url')
    .eq('id', bhajanId)
    .single();

  if (bhajanError) {
    return NextResponse.json({ error: bhajanError.message }, { status: 500 });
  }

  const { error } = await supabase
    .from('devices')
    .update({ selected_bhajan_id: bhajanId })
    .eq('device_id', deviceId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const denoUrl = process.env.DENO_SERVER_URL || 'http://localhost:8000';

  try {
    await fetch(`${denoUrl}/bhajan/play`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deviceId,
        bhajanUrl: bhajan.url,
      }),
    });
  } catch (e) {
    // Ignore errors for now
    console.error('Error sending play command to Deno server', e);
  }

  return NextResponse.json({ message: 'Bhajan selection updated' });
}
