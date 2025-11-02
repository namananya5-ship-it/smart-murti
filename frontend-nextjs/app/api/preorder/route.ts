import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Minimal validation
    if (!body || !body.email || !body.product || !body.tier) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // In a real app, persist this to a DB or send to email/CRM. Here we simulate an order id.
    const id = `preorder_${Date.now()}`;

    // Optionally: send notification / email / webhook here.

    return NextResponse.json({ success: true, id }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
