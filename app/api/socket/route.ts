import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  return new Response('WebSocket endpoint', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}

export async function POST(request: NextRequest) {
  return new Response('WebSocket endpoint', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}