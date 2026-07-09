#!/usr/bin/env python3
"""
SETU Flow design-token color codemod.

Replaces `PREFIX-[#HEX]` Tailwind arbitrary-value classes with semantic
token classes, per DESIGN-SYSTEM.md section 3.1/3.2 and the migration
mapping worked out against the actual repo's hex frequency table.

Deliberately narrow regex: only matches a *single* hex value alone inside
brackets (optionally with an /NN opacity suffix), so multi-stop
`bg-[linear-gradient(...)]` / `bg-[radial-gradient(...)]` composites are
left untouched (they're decorative art, not flat semantic color and
aren't addressed by the token system).
"""
import re
import sys
from pathlib import Path

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else ".")

# Prefixes whose color arg is a "surface" (background-family) role
SURFACE_PREFIXES = {"bg", "from", "to", "via", "ring-offset", "caret", "accent"}
# Prefixes whose color arg is a "text" (foreground) role
TEXT_PREFIXES = {"text", "placeholder", "decoration", "fill", "stroke"}
# Prefixes whose color arg is a "border/line" role
BORDER_PREFIXES = {
    "border", "border-t", "border-r", "border-b", "border-l", "border-x", "border-y",
    "ring", "divide", "outline",
}
ALL_PREFIXES = SURFACE_PREFIXES | TEXT_PREFIXES | BORDER_PREFIXES

# Universal flat-color hex -> token class-suffix (valid regardless of prefix
# group, since these are plain Tailwind color tokens, not role tokens).
UNIVERSAL = {
    # navy / brand family
    "1F487C": "brand-700",
    "193769": "brand-800",
    "13305A": "brand-800",   # ad-hoc hover shade of navy-700, consolidated
    "163561": "brand-800",   # ad-hoc hover shade of navy-700, consolidated
    "0B1F3A": "brand-950",
    "142C54": "brand-900",
    # teal / accent family
    "359F91": "accent-500",
    "279491": "accent-600",
    "108477": "accent-700",
    "7DE2D2": "accent-300",
    # stray blue #0c7fff family -> retired onto brand ramp (design system 3.1)
    "0C7FFF": "brand-500",
    "0A6FE0": "brand-600",
    "075EC2": "brand-600",
    "0966CC": "brand-600",
    # success triad
    "059669": "success-solid",
    "047857": "success-fg",
    "ECFDF5": "success-bg",
    "A7F3D0": "success-border",
    # danger triad
    "E11D48": "danger-solid",
    "DC2626": "danger-solid",
    "FFF1F2": "danger-bg",
    "9F1239": "danger-fg",
    "7F1D1D": "danger-fg",
    "FECACA": "danger-border",
    # warning triad
    "FDE68A": "warning-border",
    "FFFBEB": "warning-bg",
    "92400E": "warning-fg",
    "F59E0B": "warning-solid",
    "7C2D12": "warning-fg",
    "9A3412": "warning-fg",
    # near-white brand tints
    "F5F9FF": "brand-50",
    "F8FBFF": "brand-50",
    "F4F9FF": "brand-50",
}

# Role-specific hex -> token (only applied for prefixes in the matching group)
SURFACE_ROLE = {
    "E2E8F0": "surface-3",
    "94A3B8": "surface-3",
    "64748B": "surface-3",
    "F1F5F9": "surface-2",
    "F8FAFC": "surface-2",
    "EEF2F7": "surface-2",
    "F0F4F8": "surface-app",
    "0B2E4A": "surface-1",   # mobile navy surface (.sf-field theme)
    "10395A": "surface-2",   # mobile navy surface (.sf-field theme)
    "16466C": "surface-3",   # mobile navy surface (.sf-field theme)
    "061C2E": "surface-app", # mobile navy app bg (.sf-field theme)
    "06263F": "surface-2",   # mobile navy (.sf-field theme)
    "CBD5E1": "surface-3",   # muted/disabled backgrounds
}
TEXT_ROLE = {
    "0F172A": "content-primary",
    "1E293B": "content-primary",
    "334155": "content-secondary",
    "475569": "content-secondary",
    "64748B": "content-muted",
    "94A3B8": "content-faint",
    "CBD5E1": "content-faint",
    "F8FAFC": "content-inverse",
    "0B2E4A": "content-primary",  # dark-navy heading text used app-wide
}
BORDER_ROLE = {
    "E2E8F0": "line",
    "CBD5E1": "line-strong",
    "94A3B8": "line-strong",
    "64748B": "line-strong",
    "F1F5F9": "line",
    "F8FAFC": "line",
    "279491": "accent-600",  # accent-toned left-border accents (active row)
    "0B2E4A": "brand-800",   # dark-navy selected/emphasis border
}

# Hex values we've confirmed are decorative/out-of-scope for this pass
# (olive marketing family, admin icon-header gradient accents, SMC-internal
# dark theme) -- explicitly left untouched, never added to a map above.

HEX_RE = re.compile(
    r"(?P<prefix>(?:[\w-]+:)*)(?P<util>" + "|".join(sorted(ALL_PREFIXES, key=len, reverse=True)) + r")-\[#(?P<hex>[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\](?P<opacity>/\d{1,3})?"
)

EXCLUDE_DIRS = {
    "node_modules", ".next", ".git",
}
EXCLUDE_PATH_PARTS = (
    "/app/(app)/workspace/",  # internal SMC sprint board — separate theme
    "/app/smc/",              # internal SMC tool — separate theme
)

def resolve(util: str, hexval: str):
    hexval = hexval.upper()
    if len(hexval) == 3:
        hexval = "".join(c * 2 for c in hexval)
    if hexval in UNIVERSAL:
        return UNIVERSAL[hexval]
    if util in SURFACE_PREFIXES and hexval in SURFACE_ROLE:
        return SURFACE_ROLE[hexval]
    if util in TEXT_PREFIXES and hexval in TEXT_ROLE:
        return TEXT_ROLE[hexval]
    if util in BORDER_PREFIXES and hexval in BORDER_ROLE:
        return BORDER_ROLE[hexval]
    return None


def should_skip(path: Path) -> bool:
    s = str(path.as_posix())
    return any(part in s for part in EXCLUDE_PATH_PARTS)


def process_file(path: Path):
    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return 0
    changed = [0]

    def repl(m: re.Match) -> str:
        token = resolve(m.group("util"), m.group("hex"))
        if token is None:
            return m.group(0)
        changed[0] += 1
        opacity = m.group("opacity") or ""
        return f"{m.group('prefix')}{m.group('util')}-{token}{opacity}"

    new_text = HEX_RE.sub(repl, text)
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
    print(f"Replaced {total} arbitrary hex color classes across {files_changed} files.")


if __name__ == "__main__":
    main()
