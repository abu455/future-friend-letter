from __future__ import annotations

from dataclasses import dataclass


@dataclass
class ProjectionStyle:
    cut_line_color: tuple[int, int, int] = (0, 255, 0)
    hole_color: tuple[int, int, int] = (0, 180, 255)
    alignment_marker_color: tuple[int, int, int] = (255, 255, 0)
    forbidden_area_color: tuple[int, int, int] = (0, 0, 180)
    line_width_px: int = 3
    brightness: float = 0.8
    show_grid: bool = True
    show_text: bool = True
    show_deformation_heatmap: bool = False
