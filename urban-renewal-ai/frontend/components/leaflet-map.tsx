"use client";

import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";

const points = [
  { unit_id: "SHWB_041", case_name: "Shanghai West Bund", lat: 31.184, lon: 121.452, uei_score: 0.86, top_shap_feature: "waterfront_accessibility" },
  { unit_id: "SHWB_188", case_name: "Shanghai West Bund", lat: 31.191, lon: 121.468, uei_score: 0.79, top_shap_feature: "public_space_improvement" },
  { unit_id: "SHWB_252", case_name: "Shanghai West Bund", lat: 31.177, lon: 121.436, uei_score: 0.68, top_shap_feature: "industrial_reuse_intensity" },
  { unit_id: "QZSTM_027", case_name: "Quzhou Shuitingmen", lat: 28.97, lon: 118.862, uei_score: 0.82, top_shap_feature: "heritage_integrity" },
  { unit_id: "QZSTM_144", case_name: "Quzhou Shuitingmen", lat: 28.976, lon: 118.875, uei_score: 0.73, top_shap_feature: "tourism_business_density" },
  { unit_id: "QZSTM_191", case_name: "Quzhou Shuitingmen", lat: 28.963, lon: 118.849, uei_score: 0.66, top_shap_feature: "nighttime_consumption" }
];

export default function LeafletMap() {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10">
      <MapContainer center={[30.35, 120.25]} zoom={7} scrollWheelZoom={false} style={{ height: 420, width: "100%", background: "#07111f" }}>
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((point) => (
          <CircleMarker
            center={[point.lat, point.lon]}
            key={point.unit_id}
            pathOptions={{ color: point.uei_score > 0.75 ? "#4fd1ff" : "#9f7aea", fillColor: point.uei_score > 0.75 ? "#4fd1ff" : "#9f7aea", fillOpacity: 0.72 }}
            radius={11 + point.uei_score * 10}
          >
            <Popup>
              <div className="text-slate-900">
                <strong>{point.unit_id}</strong>
                <br />
                {point.case_name}
                <br />
                UEI: {point.uei_score}
                <br />
                Top SHAP: {point.top_shap_feature}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
