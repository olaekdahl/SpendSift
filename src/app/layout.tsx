import type { Metadata } from "next";
import { Manrope, Newsreader } from "next/font/google";
import { connection } from "next/server";

import { PreviewBanner } from "@/components/preview-banner";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { APP_DESCRIPTION, APP_NAME } from "@/config/app";
import { getDeploymentConfig } from "@/config/deployment";

import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} | Subscription clarity`,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  await connection();
  const { showPreviewWarning } = getDeploymentConfig();

  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body
        className={`${manrope.variable} ${newsreader.variable} min-h-full font-sans antialiased`}
      >
        <ThemeProvider>
          {showPreviewWarning ? <PreviewBanner /> : null}
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
