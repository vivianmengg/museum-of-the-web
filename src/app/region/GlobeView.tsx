"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { Civilization } from "@/lib/timeline";

const Globe = dynamic(() => import("react-globe.gl"), { ssr: false });

// Map ISO Alpha-3 country codes → civ IDs
const COUNTRY_CIV: Record<string, string> = {
  // Nile Valley
  EGY: "egypt",
  // Ancient Near East
  IRQ: "near-east", SYR: "near-east", JOR: "near-east", LBN: "near-east",
  ISR: "near-east", PSE: "near-east", KWT: "near-east", IRN: "near-east",
  // Eastern Mediterranean
  GRC: "greece-rome", ITA: "greece-rome", CYP: "greece-rome",
  MLT: "greece-rome", ALB: "greece-rome", MKD: "greece-rome",
  // East Asia — China
  CHN: "china", TWN: "china", HKG: "china", MAC: "china",
  // South Asia
  IND: "india", PAK: "india", BGD: "india", LKA: "india",
  NPL: "india", BTN: "india",
  // East Asia — Japan
  JPN: "japan",
  // East Asia — Korea
  KOR: "korea", PRK: "korea",
  // Southeast Asia
  THA: "southeast-asia", KHM: "southeast-asia", VNM: "southeast-asia",
  MMR: "southeast-asia", IDN: "southeast-asia", MYS: "southeast-asia",
  PHL: "southeast-asia", SGP: "southeast-asia", LAO: "southeast-asia",
  BRN: "southeast-asia", TLS: "southeast-asia",
  // Islamic World
  SAU: "islamic", TUR: "islamic", MAR: "islamic", DZA: "islamic",
  TUN: "islamic", LBY: "islamic", YEM: "islamic", OMN: "islamic",
  ARE: "islamic", QAT: "islamic", BHR: "islamic", AFG: "islamic",
  UZB: "islamic", TJK: "islamic", AZE: "islamic", KAZ: "islamic",
  TKM: "islamic", KGZ: "islamic",
  // Europe
  FRA: "europe", DEU: "europe", GBR: "europe", ESP: "europe",
  PRT: "europe", NLD: "europe", BEL: "europe", CHE: "europe",
  AUT: "europe", POL: "europe", CZE: "europe", HUN: "europe",
  SWE: "europe", NOR: "europe", DNK: "europe", FIN: "europe",
  RUS: "europe", UKR: "europe", ROU: "europe", BGR: "europe",
  SRB: "europe", HRV: "europe", SVN: "europe", SVK: "europe",
  BLR: "europe", LTU: "europe", LVA: "europe", EST: "europe",
  IRL: "europe", ISL: "europe", LUX: "europe", MNE: "europe",
  BIH: "europe", GEO: "europe", ARM: "europe", MDA: "europe",
  // Africa (Sub-Saharan)
  NGA: "africa", GHA: "africa", SEN: "africa", MLI: "africa",
  COD: "africa", CMR: "africa", CIV: "africa", TZA: "africa",
  KEN: "africa", ETH: "africa", ZWE: "africa", ZAF: "africa",
  BEN: "africa", TGO: "africa", SLE: "africa", LBR: "africa",
  GIN: "africa", BFA: "africa", NER: "africa", SDN: "africa",
  SOM: "africa", MOZ: "africa", ZMB: "africa", AGO: "africa",
  COG: "africa", GAB: "africa", CAF: "africa", TCD: "africa",
  GNQ: "africa", RWA: "africa", BDI: "africa", UGA: "africa",
  MWI: "africa", NAM: "africa", BWA: "africa", LSO: "africa",
  SWZ: "africa", MDG: "africa", MRT: "africa", GMB: "africa",
  // Oceania
  AUS: "oceania", NZL: "oceania", PNG: "oceania", FJI: "oceania",
  WSM: "oceania", TON: "oceania", VUT: "oceania", SLB: "oceania",
  // The Americas
  MEX: "americas", GTM: "americas", BLZ: "americas", HND: "americas",
  SLV: "americas", NIC: "americas", CRI: "americas", PAN: "americas",
  COL: "americas", VEN: "americas", ECU: "americas", PER: "americas",
  BOL: "americas", CHL: "americas", ARG: "americas", BRA: "americas",
  PRY: "americas", URY: "americas", USA: "americas", CAN: "americas",
  CUB: "americas", HTI: "americas", DOM: "americas", JAM: "americas",
  GUY: "americas", SUR: "americas", GUF: "americas",
};

type GeoFeature = {
  type: string;
  properties: Record<string, string>;
  geometry: unknown;
};

export default function GlobeView({ civilizations }: { civilizations: Civilization[] }) {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null);
  const [countries, setCountries] = useState<{ features: GeoFeature[] }>({ features: [] });
  const [hovered, setHovered] = useState<GeoFeature | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; color: string } | null>(null);

  const civMap = new Map(civilizations.map((c) => [c.id, c]));

  function civForFeature(f: GeoFeature): Civilization | null {
    const iso = f.properties?.ADM0_A3 || f.properties?.ISO_A3 || f.properties?.iso_a3;
    const civId = COUNTRY_CIV[iso];
    return civId ? (civMap.get(civId) ?? null) : null;
  }

  // Load countries GeoJSON
  useEffect(() => {
    fetch("https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson")
      .then((r) => r.json())
      .then(setCountries);
  }, []);

  // Start auto-rotate after mount
  useEffect(() => {
    const t = setTimeout(() => {
      if (globeRef.current) {
        const controls = globeRef.current.controls();
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.6;
        globeRef.current.pointOfView({ lat: 20, lng: 10, altitude: 2 }, 1000);
      }
    }, 400);
    return () => clearTimeout(t);
  }, []);

  const handlePolygonClick = useCallback((feat: object) => {
    const f = feat as GeoFeature;
    const civ = civForFeature(f);
    if (civ) router.push(`/region/${civ.id}`);
  }, [civMap, router]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePolygonHover = useCallback((feat: object | null, _: unknown, e?: MouseEvent) => {
    const f = feat as GeoFeature | null;
    setHovered(f);
    if (f && e) {
      const civ = civForFeature(f);
      const name = f.properties?.NAME || f.properties?.name || "";
      if (civ) {
        setTooltip({ x: e.clientX, y: e.clientY, label: `${name} — ${civ.label}`, color: civ.color });
      } else {
        setTooltip(null);
      }
    } else {
      setTooltip(null);
    }
  }, [civMap]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative w-full" style={{ height: "calc(100vh - 80px)" }}>
      <Globe
        ref={globeRef}
        width={typeof window !== "undefined" ? window.innerWidth : 1200}
        height={typeof window !== "undefined" ? window.innerHeight - 80 : 800}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-day.jpg"
        polygonsData={countries.features}
        polygonAltitude={(f) => (hovered === f ? 0.015 : 0.006)}
        polygonCapColor={(f) => {
          const feat = f as GeoFeature;
          const civ = civForFeature(feat);
          if (!civ) return "rgba(200,195,185,0.3)";
          return hovered === feat ? civ.color + "ee" : civ.color + "99";
        }}
        polygonSideColor={() => "rgba(0,0,0,0.05)"}
        polygonStrokeColor={() => "rgba(255,255,255,0.15)"}
        polygonLabel={() => ""}
        onPolygonClick={handlePolygonClick}
        onPolygonHover={handlePolygonHover}
        polygonsTransitionDuration={200}
      />

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none px-3 py-1.5 rounded-lg text-xs font-medium text-white shadow-lg"
          style={{
            left: tooltip.x + 14,
            top: tooltip.y - 10,
            backgroundColor: tooltip.color,
          }}
        >
          {tooltip.label}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-8 left-6 bg-white/90 backdrop-blur-sm border border-[var(--border)] rounded-xl px-4 py-3 shadow-sm">
        <p className="text-[10px] uppercase tracking-widest text-[var(--muted)] mb-2">Regions</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
          {civilizations.map((civ) => (
            <button
              key={civ.id}
              onClick={() => router.push(`/region/${civ.id}`)}
              className="flex items-center gap-1.5 text-xs text-[var(--foreground)] hover:text-[var(--muted)] transition-colors text-left"
            >
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: civ.color }} />
              {civ.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
