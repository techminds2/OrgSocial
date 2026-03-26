import "@mantine/core/styles.css";
import "./globals.css";

import { MantineProvider, ColorSchemeScript } from "@mantine/core";
import type { Metadata } from "next";

// ✅ ADD THIS
export const metadata: Metadata = {
  title: "TechMinds Network",
  description: "TechMinds ISP Platform",
  icons: {
    icon: "/icon.png", // from public folder
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-mantine-color-scheme="light" suppressHydrationWarning>
      <head>
        <ColorSchemeScript defaultColorScheme="light" />
      </head>
      <body className="antialiased font-sans">
        <MantineProvider defaultColorScheme="light">
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}