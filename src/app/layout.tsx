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
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              tailwind.config = {
                darkMode: 'class',
                theme: {
                  extend: {
                    colors: {
                      brand: {
                        50: '#f0fdfa',
                        100: '#ccfbf1',
                        200: '#99f6e4',
                        300: '#5eead4',
                        400: '#2dd4bf',
                        500: '#14b8a6',
                        600: '#0d9488',
                        700: '#0f766e',
                        800: '#115e59',
                        900: '#134e4a',
                        950: '#042f2e',
                      }
                    }
                  }
                }
              }
            `,
          }}
        />
      </head>
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen selection:bg-teal-500/30 selection:text-teal-200 font-sans">
        {children}
      </body>
    </html>
  );
}
