from __future__ import annotations

from pathlib import Path

from app.cad.job_model import CutRegion, Job, demo_job


class DXFParser:
    def parse(self, path: str | Path, layer_filter: dict | None = None) -> Job:
        file_path = Path(path)
        if not file_path.exists():
            return demo_job()
        try:
            import ezdxf
        except ImportError as exc:
            raise RuntimeError("ezdxf is required for DXF parsing") from exc
        doc = ezdxf.readfile(file_path)
        msp = doc.modelspace()
        contours: list[list[tuple[float, float]]] = []
        holes: list[tuple[float, float]] = []
        keypoints: list[tuple[float, float]] = []
        cut_layer = (layer_filter or {}).get("cut")
        hole_layer = (layer_filter or {}).get("holes")
        align_layer = (layer_filter or {}).get("alignment")
        for entity in msp:
            layer = entity.dxf.layer
            if entity.dxftype() == "LWPOLYLINE" and (cut_layer is None or layer == cut_layer):
                points = [(float(p[0]), float(p[1])) for p in entity.get_points()]
                if points:
                    contours.append(points)
            elif entity.dxftype() == "CIRCLE":
                center = (float(entity.dxf.center.x), float(entity.dxf.center.y))
                if hole_layer is None or layer == hole_layer:
                    holes.append(center)
                if align_layer is not None and layer == align_layer:
                    keypoints.append(center)
        all_points = [p for contour in contours for p in contour] + holes + keypoints
        bbox = None
        if all_points:
            xs, ys = zip(*all_points)
            bbox = (min(xs), min(ys), max(xs), max(ys))
        regions = [CutRegion(f"part_{i+1:03d}", _center(contour), contour) for i, contour in enumerate(contours)]
        return Job(
            job_id=file_path.stem,
            contours=contours,
            keypoints=keypoints,
            cut_paths=contours,
            holes=holes,
            cut_regions=regions,
            bbox=bbox,
        )


def _center(points: list[tuple[float, float]]) -> tuple[float, float]:
    xs, ys = zip(*points)
    return (float(sum(xs) / len(xs)), float(sum(ys) / len(ys)))
