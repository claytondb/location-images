import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Location Spy - Find images of any location through time",
  description: "Aggregate photos from modern sources and historical archives. See how places changed over decades with images from Library of Congress, Flickr, and more.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
  themeColor: "#3b82f6",
  openGraph: {
    title: "Location Spy",
    description: "Find images of any location through time",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Location Spy",
    description: "Find images of any location through time",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Location Spy",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
