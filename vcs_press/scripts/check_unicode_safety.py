from __future__ import annotations

from pathlib import Path

DANGEROUS_CODEPOINTS = {
    "\u200b": "ZERO WIDTH SPACE",
    "\u200c": "ZERO WIDTH NON-JOINER",
    "\u200d": "ZERO WIDTH JOINER",
    "\u200e": "LEFT-TO-RIGHT MARK",
    "\u200f": "RIGHT-TO-LEFT MARK",
    "\u202a": "LEFT-TO-RIGHT EMBEDDING",
    "\u202b": "RIGHT-TO-LEFT EMBEDDING",
    "\u202c": "POP DIRECTIONAL FORMATTING",
    "\u202d": "LEFT-TO-RIGHT OVERRIDE",
    "\u202e": "RIGHT-TO-LEFT OVERRIDE",
    "\u2060": "WORD JOINER",
    "\u2066": "LEFT-TO-RIGHT ISOLATE",
    "\u2067": "RIGHT-TO-LEFT ISOLATE",
    "\u2068": "FIRST STRONG ISOLATE",
    "\u2069": "POP DIRECTIONAL ISOLATE",
    "\ufeff": "BYTE ORDER MARK",
}

TEXT_EXTENSIONS = {".py", ".yaml", ".yml", ".md", ".txt"}
SKIP_DIRS = {".git", ".mypy_cache", ".pytest_cache", ".ruff_cache", "__pycache__"}


def iter_text_files(root: Path) -> list[Path]:
    files: list[Path] = []
    for path in root.rglob("*"):
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        if path.is_file() and path.suffix.lower() in TEXT_EXTENSIONS:
            files.append(path)
    return sorted(files)


def scan_file(path: Path) -> list[str]:
    findings: list[str] = []
    text = path.read_text(encoding="utf-8")
    for line_no, line in enumerate(text.splitlines(), start=1):
        for column, char in enumerate(line, start=1):
            if char in DANGEROUS_CODEPOINTS:
                codepoint = f"U+{ord(char):04X}"
                findings.append(f"{path}:{line_no}:{column}: {codepoint} {DANGEROUS_CODEPOINTS[char]}")
    return findings


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    findings: list[str] = []
    for path in iter_text_files(root):
        findings.extend(scan_file(path))
    if findings:
        print("Dangerous hidden Unicode characters detected:")
        for finding in findings:
            print(finding)
        return 1
    print("Unicode safety check passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
