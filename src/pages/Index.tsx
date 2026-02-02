import { useState } from "react";
import { MapView } from "@/components/MapView";

type Scope = "caba" | "conurbano" | "amba";
type Tab = "mapa" | "ranking" | "acerca";

export default function Index() {
  const [tab, setTab] = useState<Tab>("mapa");
  const [scope, setScope] = useState<Scope>("amba");

  return (
    <div style={{ height: "100vh", width: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header
        style={{
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          background: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <strong>Aire AMBA</strong>

          <select value={scope} onChange={(e) => setScope(e.target.value as Scope)}>
            <option value="caba">CABA</option>
            <option value="conurbano">Conurbano</option>
            <option value="amba">AMBA</option>
          </select>
        </div>

        <nav style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setTab("mapa")} disabled={tab === "mapa"}>
            Mapa
          </button>
          <button onClick={() => setTab("ranking")} disabled={tab === "ranking"}>
            Ranking
          </button>
          <button onClick={() => setTab("acerca")} disabled={tab === "acerca"}>
            Acerca
          </button>
        </nav>
      </header>

      {/* Main */}
      <main style={{ flex: 1, minHeight: 0 }}>
        {tab === "mapa" ? (
          <div style={{ height: "100%", width: "100%" }}>
            <MapView />
          </div>
        ) : tab === "ranking" ? (
          <div style={{ padding: 16 }}>
            <h2 style={{ marginTop: 0 }}>Ranking</h2>
            <p style={{ opacity: 0.8 }}>
              Próximo: tabla mejor aire → peor aire (por puntos / por barrios).
            </p>
          </div>
        ) : (
          <div style={{ padding: 16 }}>
            <h2 style={{ marginTop: 0 }}>Acerca</h2>
            <p style={{ opacity: 0.8 }}>
              Datos: WAQI (muestreo por coordenadas). El heatmap NO es medición oficial por barrio, es una
              visualización estimada.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
