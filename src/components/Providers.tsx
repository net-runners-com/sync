"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/lib/ThemeContext";
import { Toaster } from "@/components/ui/sonner";
import { useTheme } from "@/lib/ThemeContext";

function ToasterWithTheme() {
  const { theme } = useTheme();
  return <Toaster position="top-right" theme={theme as "light" | "dark" | "system"} />;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        {children}
        <ToasterWithTheme />
      </ThemeProvider>
    </SessionProvider>
  );
}
