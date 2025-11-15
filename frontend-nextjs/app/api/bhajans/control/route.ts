
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { deviceId, action } = await request.json();

  if (!deviceId || !action) {
    return NextResponse.json({ error: 'deviceId and action are required' }, { status: 400 });
  }

  const denoUrl = process.env.DENO_SERVER_URL || 'http://localhost:8000';

  try {
    await fetch(`${denoUrl}/bhajan/control`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deviceId,
        action,
      }),
    });
  } catch (e) {
    // Ignore errors for now
    console.error('Error sending control command to Deno server', e);
  }

  return NextResponse.json({ message: `Action '${action}' sent to device ${deviceId}` });
}
