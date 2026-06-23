from pathlib import Path

from scripts.check_unicode_safety import scan_file


def test_unicode_safety_allows_plain_ascii(tmp_path: Path):
    path = tmp_path / "plain.py"
    path.write_text("print('safe')\n", encoding="utf-8")
    assert scan_file(path) == []


def test_unicode_safety_rejects_bidi_control(tmp_path: Path):
    path = tmp_path / "unsafe.py"
    path.write_text("name = 'abc" + chr(0x202E) + "'\n", encoding="utf-8")
    findings = scan_file(path)
    assert findings
    assert "U+202E" in findings[0]
