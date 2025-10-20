// app/layout.tsx
import "./globals.css";
import { Metadata } from "next";
import { Providers } from "./providers";
import Navigation from "./components/Navigation";

export const metadata: Metadata = {
  title: "TWCM Partnership Dashboard",
  description: "Monitor sports club orders and store assignments",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="min-h-screen bg-gray-50">
            <Navigation />
            <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
