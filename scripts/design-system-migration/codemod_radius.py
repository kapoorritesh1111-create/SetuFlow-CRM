#!/usr/bin/env python3
"""
SETU Flow design-token radius codemod.

Maps every `rounded(-[trblse]{1,2})?-[VALUE]` arbitrary radius to the
nearest token per DESIGN-SYSTEM.md 3.4 (ctl=12px, card=16px, panel=24px,
hero=28px), or to the nearest *standard* Tailwind step (sm/default/md/lg)
for values below the ctl token, since those aren't arbitrary once named.
"""
import re
import sys
from pathlib import Path

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else ".")

VALUE_MAP = {
    "1.5rem": "panel",
    "2rem": "hero",
    "1.75rem": "hero",
    "1.25rem": "card",
    "1rem": "card",
    "1.35rem": "panel",
    "9px": "ctl",
    "11px": "ctl",
    "1.4rem": "panel",
    "6px": "md",
    "12px": "ctl",
    "1.6rem": "panel",
    "0.9rem": "card",
    "22px": "panel",
    "10px": "ctl",
    "1.8rem": "hero",
    "1.45rem": "panel",
    "1.1rem": "card",
    "24px": "panel",
    "16px": "card",
    "1.2rem": "card",
    "8px": "lg",
    "28px": "hero",
    "13px": "ctl",
    "7px": "lg",
    "1.15rem": "card",
    "18px": "card",
    "14px": "card",
    "1.7rem": "hero",
    "1.65rem": "hero",
    "1.05rem": "card",
    "5px": "md",
    "4px": "",       # -> bare `rounded`
    "2px": "sm",
    "2.6rem": "hero",
    "2.4rem": "hero",
    "1.55rem": "panel",
    "0.75rem": "ctl",
    "30px": "hero",
    "2.15rem": "hero",
    "26px": "hero",
    "20px": "card",
    "1.85rem": "hero",
    "1.72rem": "hero",
    "1.3rem": "card",
    "1.375rem": "panel",
    "17px": "ctl",
}

RADIUS_RE = re.compile(r"rounded(?P<dir>-[trblse]{1,2})?-\[(?P<val>[^\]]+)\]")

EXCLUDE_DIRS = {"node_modules", ".next", ".git"}
EXCLUDE_PATH_PARTS = (
    "/app/(app)/workspace/",
    "/app/smc/",
)


def should_skip(path: Path) -> bool:
    return any(part in str(path.as_posix()) for part in EXCLUDE_PATH_PARTS)


def process_file(path: Path):
    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return 0
    changed = [0]

    def repl(m: re.Match) -> str:
        val = m.group("val")
        if val not in VALUE_MAP:
            return m.group(0)
        token = VALUE_MAP[val]
        changed[0] += 1
        dir_ = m.group("dir") or ""
        if token == "":
            return f"rounded{dir_}"
        return f"rounded{dir_}-{token}"

    new_text = RADIUS_RE.sub(repl, text)
    if changed[0] and new_text != text:
        path.write_text(new_text, encoding="utf-8")
    return changed[0]


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
    print(f"Replaced {total} arbitrary radius classes across {files_changed} files.")


if __name__ == "__main__":
    main()
