// src/app/layout.tsx
import { AuthProvider } from '@/components/Auth/AuthContext';
import './globals.css';

export const metadata = {
  title: 'S3 Document Manager',
  description: 'Secure document management with AWS S3',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}