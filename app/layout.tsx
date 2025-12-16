import './globals.css';

export const metadata = {
  title: 'GridMRR',
  description: 'Treemap-style visualization of SaaS MRR dominance',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
