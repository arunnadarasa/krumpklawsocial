/**
 * World map using react-svg-worldmap (MIT)
 * https://github.com/yanivam/react-svg-worldmap
 * Street Fighter 2 style: one country per continent highlighted
 */
import WorldMap from "react-svg-worldmap";

const CONTINENT_REPRESENTATIVES = [
  { country: "gb" as const, value: 1 },   // Europe - UK (London)
  { country: "us" as const, value: 1 },   // North America
  { country: "cn" as const, value: 1 },   // Asia
  { country: "br" as const, value: 1 },   // South America
  { country: "ng" as const, value: 1 },  // Africa
  { country: "au" as const, value: 1 },   // Oceania
];

export function KrumpWorldMap() {
  return (
    <div style={{ width: "100%", minHeight: 180 }}>
      <WorldMap
        data={CONTINENT_REPRESENTATIVES}
        color="#ff4d00"
        backgroundColor="#0a0a0b"
        borderColor="#2a2a2e"
        strokeOpacity={0.3}
        size="md"
        frame={false}
        richInteraction={false}
      />
    </div>
  );
}
