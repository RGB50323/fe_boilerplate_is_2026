import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CampanaNotificaciones } from "@/components/notificaciones/campana-notificaciones";
import { NotificacionesProvider } from "@/components/notificaciones/notificaciones-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SI Boilerplate",
  description: "Boilerplate con login básico",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NotificacionesProvider>
          <CampanaNotificaciones />
          {children}
        </NotificacionesProvider>
      </body>
    </html>
  );
}
