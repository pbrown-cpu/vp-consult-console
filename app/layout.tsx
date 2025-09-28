// app/layout.tsx
export const metadata = {
  title: "Internal Console — Starter",
  description: "Vindicated Productions internal consultation console",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: "#0F0F10",
          color: "#fff",
          fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial",
        }}
      >
        {children}
      </body>
    </html>
  );
}
