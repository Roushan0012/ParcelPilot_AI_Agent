import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ParcelPilot AI Support & Operations Agent",
  description: "Autonomous internal operations, policy reasoning & issue detection for ParcelPilot logistics.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen selection:bg-teal-500/30 selection:text-teal-200">
        {children}
      </body>
    </html>
  );
}
