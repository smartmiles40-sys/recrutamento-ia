import { ReactNode } from "react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo-horizontal-dark-teal.png";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "#F7F8F6" }}>
      <header style={{ background: "#0D2E2A", borderBottom: "1px solid rgba(255,255,255,0.08)" }} className="px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Link to="/vagas-abertas" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img
              src={logo}
              alt="Se Tu For, Eu Vou!"
              className="h-7 object-contain"
              style={{ filter: "brightness(0) invert(1)" }}
            />
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8">{children}</main>
    </div>
  );
}
