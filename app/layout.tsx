import "./globals.css";

export const metadata = {
  title: "My Modern App",
  description: "Built with Next.js and Tailwind v4",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light">
      {/* data-theme is managed by daisyUI */}
      <body>{children}</body>
    </html>
  );
}
