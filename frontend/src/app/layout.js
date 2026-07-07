import './globals.css';

export const metadata = {
  title: 'Novt Linker SaaS',
  description: 'VIP Ad Creative Post Generator Dashboard by Novatix Solution',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
