import { NextResponse } from 'next/server';

// サーバーサイド用の環境変数（NEXT_PUBLIC_プレフィックスなし）
const DING_URL = process.env.DING_URL;

export async function POST(request: Request) {
  try {
    const { message } = await request.json();
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Invalid message format' },
        { status: 400 }
      );
    }
    const res = await sendMessage(message);
    console.log('Message sent successfully:', message);
    
    return NextResponse.json(res);
  } catch (error) {
    console.error('Error in /api/chat:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}

async function sendMessage(message: string) {
    if (!DING_URL) {
        throw new Error("DING_URL is not defined");
    }

    const res = await fetch(
    `${DING_URL}/chat`,
    {
        method: "POST",
        headers: {
        "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
    }
    );
    if (!res.ok) {
        throw new Error("Failed to send chat message");
    }
    return res;
}
