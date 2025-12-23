import NavBar from "@/components/NavBar";
import "./globals.css";
import { Providers } from "./providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* <NavBar></NavBar> */}
      <body className="antialiased font-sans" > 
       <Providers>{children}</Providers> 
      </body>
    </html>
  );
}
