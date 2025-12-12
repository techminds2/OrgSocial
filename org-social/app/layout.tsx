import NavBar from "@/components/NavBar";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <NavBar></NavBar>
      <body className="antialiased font-sans" > 
        {children}
      </body>
    </html>
  );
}
