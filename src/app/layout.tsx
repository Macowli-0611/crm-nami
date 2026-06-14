import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import AuthWrapper from "@/components/AuthWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ñami CRM | Gestión de Restaurantes",
  description: "Sistema interno de control comercial y financiero para Ñami",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased flex bg-slate-900 text-slate-50 min-h-screen`}>
        <AuthWrapper>
          <Sidebar />
          <main className="flex-1 ml-0 md:ml-64 pt-20 pb-6 px-4 md:p-8 overflow-y-auto">
            {children}
          </main>
        </AuthWrapper>
      </body>
    </html>
  );
}
