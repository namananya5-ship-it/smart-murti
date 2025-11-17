
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { deviceId, action } = await request.json();

  if (!deviceId || !action) {
    return NextResponse.json({ error: 'deviceId and action are required' }, { status: 400 });
  }

  const denoUrl = process.env.DENO_SERVER_URL || 'http://localhost:8000';

  try {
    const authHeader = request.headers.get('authorization') || undefined;

    const res = await fetch(`${denoUrl}/api/bhajans/control`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { 'Authorization': authHeader } : {}),
      },
      body: JSON.stringify({ deviceId, action }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Deno control API returned error:', res.status, text);
      return NextResponse.json({ error: 'Failed to invoke control on server' }, { status: 502 });
    }
  } catch (e) {
    console.error('Error sending control command to Deno server', e);
    return NextResponse.json({ error: 'Failed to contact server' }, { status: 502 });
  }

  return NextResponse.json({ message: `Action '${action}' sent to device ${deviceId}` });
}
