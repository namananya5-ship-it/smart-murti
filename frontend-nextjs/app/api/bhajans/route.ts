import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });

  try {
    const { data: bhajans, error } = await supabase
      .from('bhajans')
      .select('*');

    if (error) {
      console.error('Error fetching bhajans:', error);
      return NextResponse.json({ error: 'Failed to fetch bhajans' }, { status: 500 });
    }

    return NextResponse.json(bhajans);
  } catch (error) {
    console.error('An unexpected error occurred:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}