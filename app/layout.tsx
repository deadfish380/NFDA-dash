import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { MotionProvider } from "@/components/motion/provider";
import { ShellProvider } from "@/components/shell/shell-context";
import { ThemeProvider } from "@/components/theme/theme-provider";

export const metadata: Metadata = {
  title: "NFDA — Social Dashboard",
  description:
    "Reads your websites, writes Facebook posts with AI, you approve — then it posts automatically. One dashboard for every organization.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body>
        <ThemeProvider>
          <MotionProvider>
            <ShellProvider>{children}</ShellProvider>
          </MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
