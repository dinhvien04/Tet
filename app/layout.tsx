import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { FamilyProvider } from "@/components/family/FamilyContext";
import { Toaster } from "@/components/ui/sonner";
import { SWRProvider } from "@/components/providers/SWRProvider";
import { NetworkStatus } from "@/components/ui/NetworkStatus";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { ErrorBoundary } from "@/components/errors/ErrorBoundary";
import { GlobalErrorHandler } from "@/components/errors/GlobalErrorHandler";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tết Connect",
  description: "Kết nối gia đình trong dịp Tết",
};

export const dynamic = 'force-dynamic'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GlobalErrorHandler />
        <ErrorBoundary>
          <SWRProvider>
            <AuthProvider>
              <FamilyProvider>
                {children}
              </FamilyProvider>
            </AuthProvider>
          </SWRProvider>
        </ErrorBoundary>
        <Toaster />
        <NetworkStatus />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
