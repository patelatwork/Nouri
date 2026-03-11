import "./globals.css";
import Providers from "@/components/providers";

export const metadata = {
  title: "Nouri — Ethical Social Media",
  description:
    "A responsible short-form video platform that optimises for your wellbeing, not addiction.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-gray-200 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
