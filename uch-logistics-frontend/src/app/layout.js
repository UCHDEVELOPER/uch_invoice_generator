import { Lato } from "next/font/google";
import "./globals.css";
import LayoutWrapper from "./layoutWrapper";
import { Toaster } from 'react-hot-toast';
import StoreProvider from "@/redux/StoreProvider";


const lato = Lato({
  subsets: ["latin"],
  weight: ["100", "300", "400", "700", "900"],
  style: ["normal", "italic"],
  display: "swap",
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${lato.className} antialiased`} suppressHydrationWarning={true}>
        <StoreProvider>
        <LayoutWrapper>
          {children}
          <Toaster position="top-right" />
        </LayoutWrapper>
        </StoreProvider>
      </body>
    </html>
  );
}