"use client";

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  // Authentication is now handled securely by src/middleware.ts on the server side.
  // This wrapper is kept merely to avoid breaking existing imports in layout.tsx,
  // or in case client-side session context is needed in the future.
  return <>{children}</>;
}
