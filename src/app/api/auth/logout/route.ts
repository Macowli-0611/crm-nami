import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  
  // Clear the JWT session cookie
  response.cookies.set({
    name: 'nami_jwt_session',
    value: '',
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });

  // Also clear the old insecure cookie just in case it's lingering in the browser
  response.cookies.set({
    name: 'nami_session',
    value: '',
    expires: new Date(0),
    path: '/',
  });

  return response;
}
