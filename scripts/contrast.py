"""WCAG 2.x contrast checker for the Footnote Desk palette.

Usage: python3 -I contrast.py
Prints each text/background pair with its ratio and PASS/FAIL against its target
(4.5 for normal text, 3.0 for large text and UI boundaries).
"""

PALETTE = {
    "ink": "#1E1A24",
    "ink-muted": "#5E5868",
    "paper": "#F7F7F9",
    "surface": "#FFFFFF",
    "plum": "#5A2A82",
    "plum-hover": "#46206A",
    "plum-wash": "#EFE9F5",
    "highlighter": "#FBE55A",
    "rule": "#DEDAE3",
    "rule-strong": "#8A8494",
    "error": "#B42318",
}

# (foreground, background, target ratio, what it is)
PAIRS = [
    ("ink", "paper", 4.5, "body text on page"),
    ("ink", "surface", 4.5, "body text on panel"),
    ("ink-muted", "paper", 4.5, "secondary text on page"),
    ("ink-muted", "surface", 4.5, "secondary text on panel"),
    ("ink-muted", "plum-wash", 4.5, "secondary text on plum wash"),
    ("surface", "plum", 4.5, "primary button text"),
    ("surface", "plum-hover", 4.5, "primary button text, hover"),
    ("plum", "paper", 4.5, "link text on page"),
    ("plum", "surface", 4.5, "link text on panel"),
    ("plum", "plum-wash", 4.5, "badge and user bubble text"),
    ("ink", "highlighter", 4.5, "highlighted passage text"),
    ("plum", "highlighter", 4.5, "citation chip on highlighter"),
    ("error", "paper", 4.5, "error text on page"),
    ("error", "surface", 4.5, "error text on panel"),
    ("plum", "paper", 3.0, "focus ring against page"),
    ("plum", "surface", 3.0, "focus ring against panel"),
    ("rule-strong", "paper", 3.0, "input border against page"),
    ("rule-strong", "surface", 3.0, "input border against panel"),
]


def channel(c: int) -> float:
    s = c / 255
    return s / 12.92 if s <= 0.03928 else ((s + 0.055) / 1.055) ** 2.4


def luminance(hex_color: str) -> float:
    h = hex_color.lstrip("#")
    r, g, b = (int(h[i : i + 2], 16) for i in (0, 2, 4))
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)


def ratio(fg: str, bg: str) -> float:
    a, b = luminance(fg), luminance(bg)
    hi, lo = max(a, b), min(a, b)
    return (hi + 0.05) / (lo + 0.05)


def main() -> int:
    failures = 0
    for fg, bg, target, label in PAIRS:
        r = ratio(PALETTE[fg], PALETTE[bg])
        ok = r >= target
        failures += 0 if ok else 1
        print(f"{'PASS' if ok else 'FAIL'}  {r:5.2f}:1 (need {target})  {fg} on {bg}  {label}")
    print(f"\n{len(PAIRS) - failures}/{len(PAIRS)} pairs pass")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
