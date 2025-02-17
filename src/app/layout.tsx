import "./globals.css";
import { AuthProvider } from '@/lib/contexts/AuthContext';
import { DeepgramContextProvider } from '@/lib/contexts/DeepgramContext';
import Script from 'next/script';

export const metadata = {
  title: 'NewsWise',
  description: 'Interactive news reading with AI-powered discussions',
  manifest: '/manifest.json',
  themeColor: '#1d4ed8',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'NewsWise',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <Script
          type="module"
          src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js"
          strategy="beforeInteractive"
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1d4ed8" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body>
        <AuthProvider>
          <DeepgramContextProvider>
            {children}
          </DeepgramContextProvider>
        </AuthProvider>
        <Script
          id="sw-registration"
          strategy="lazyOnload"
        >
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').then(
                  function(registration) {
                    console.log('Service Worker registration successful');
                  },
                  function(err) {
                    console.log('Service Worker registration failed: ', err);
                  }
                );
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
