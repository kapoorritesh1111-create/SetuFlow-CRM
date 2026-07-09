#!/usr/bin/env python3
"""
SETU Flow font-weight codemod (DESIGN-SYSTEM.md 3.3 / governance rule 2).

Weights 400/500/600/700 only in product UI; 800-900 reserved for
marketing display. Downgrades font-black (900, not even loaded by
next/font — renders as browser-synthesized bold on top of 800) and
font-extrabold (800) to font-bold (700) everywhere EXCEPT the
marketing-flavored routes/components and the internal SMC tool, which
keep their own distinct visual language untouched.
"""
import re
import sys
from pathlib import Path

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else ".")

EXCLUDE_DIRS = {"node_modules", ".next", ".git"}
EXCLUDE_PATH_PARTS = (
    "/app/(app)/workspace/",
    "/app/smc/",
    "/components/marketing/",
    "/app/solutions/",
    "/app/features/",
    "/app/compare/",
    "/app/resources/",
    "/app/roi-calculator/",
    "/app/trade-show-trial/",
    "/app/investors/",
    "/app/investor-overview/",
    "/app/preseed/",
    "/app/platform/",
    "marketing-hero-tuning.css",
)

WORD_RE = re.compile(r"\bfont-(black|extrabold)\b")


def should_skip(path: Path) -> bool:
    s = str(path.as_posix())
    return any(part in s for part in EXCLUDE_PATH_PARTS)


def process_file(path: Path):
    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return 0
    new_text, n = WORD_RE.subn("font-bold", text)
    if n and new_text != text:
        path.write_text(new_text, encoding="utf-8")
    return n


def main():
    total = 0
    files_changed = 0
    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix not in (".ts", ".tsx", ".js", ".jsx"):
            continue
        if any(part in EXCLUDE_DIRS for part in path.parts):
            continue
        if should_skip(path):
            continue
        n = process_file(path)
        if n:
            total += n
            files_changed += 1
    print(f"Downgraded {total} font-black/font-extrabold usages across {files_changed} files.")


if __name__ == "__main__":
    main()
