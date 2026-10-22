import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Multiverse — Counterfactual Decision Simulation",
  description:
    "Fork a real-world dilemma into parallel simulated futures. A reflective cognitive simulation tool, not a prediction.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={poppins.variable}>
      <body className={`${poppins.className} antialiased bg-[#09090b] text-[#f4f4f5] min-h-screen selection:bg-zinc-700 selection:text-white`}>
        {children}
      </body>
    </html>
  );
}
