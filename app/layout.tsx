import './globals.css';
import Script from 'next/script';

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
      <body>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-950JLWCXF5"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-950JLWCXF5');
          `}
        </Script>
        {children}
      </body>
    </html>
  );
}
