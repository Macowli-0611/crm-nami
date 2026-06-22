import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback_secret_for_dev_only_change_in_prod'
);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    if (!ADMIN_PASSWORD) {
      return NextResponse.json(
        { success: false, error: "Servidor no configurado. Falta ADMIN_PASSWORD." },
        { status: 500 }
      );
    }

    if (password === ADMIN_PASSWORD) {
      // Create JWT token
      const token = await new SignJWT({ role: "admin" })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('30d') // Valid for 30 days
        .sign(JWT_SECRET);

      const response = NextResponse.json({ success: true });
      
      // Set HTTP-only secure cookie
      response.cookies.set({
        name: 'nami_jwt_session',
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 30, // 30 days in seconds
        path: '/',
      });

      return response;
    }

    return NextResponse.json(
      { success: false, error: "Contraseña incorrecta" },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Error en el servidor" },
      { status: 500 }
    );
  }
}
