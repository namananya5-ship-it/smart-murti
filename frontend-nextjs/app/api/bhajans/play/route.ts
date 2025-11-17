
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
    // Forward Authorization header if present so Deno can authenticate
    const authHeader = request.headers.get('authorization') || undefined;

    const res = await fetch(`${denoUrl}/api/bhajans/play`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { 'Authorization': authHeader } : {}),
      },
      body: JSON.stringify({ deviceId, bhajanId }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Deno play API returned error:', res.status, text);
      return NextResponse.json({ error: 'Failed to invoke play on server' }, { status: 502 });
    }
  } catch (e) {
    console.error('Error sending play command to Deno server', e);
    return NextResponse.json({ error: 'Failed to contact server' }, { status: 502 });
  }

  return NextResponse.json({ message: 'Bhajan selection updated' });
}
