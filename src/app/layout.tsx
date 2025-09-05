import './globals.css'
export const metadata = { title: 'PriceTracker.store' }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en'>
      <body>{children}</body>
    </html>
  )
}
