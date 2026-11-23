# Rebuild assets/fonts/noto-sans-tc-subset.woff2 after changing any page copy.
# Usage: python scripts/subset-font.py /path/to/NotoSansTC-VF.ttf   (needs: pip install fonttools brotli)
import sys, pathlib
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset
root = pathlib.Path(__file__).resolve().parent.parent
src = sys.argv[1]  # path to NotoSansTC-VF.ttf (SIL Open Font License)
out = root / "assets/fonts/noto-sans-tc-subset.woff2"; out = root / "assets/fonts/noto-sans-tc-subset.woff2"
text = ""
for f in ["index.html", "translations.js", "labs.js", "script.js"]:
    text += (root / f).read_text(encoding="utf-8")
chars = {c for c in text if ord(c) > 31}
chars |= {chr(c) for c in range(32, 127)}
font = TTFont(src, lazy=False)
opts = subset.Options()
opts.flavor = "woff2"
opts.layout_features = ["*"]
opts.name_IDs = ["*"]
opts.notdef_outline = True
sub = subset.Subsetter(opts)
sub.populate(text="".join(sorted(chars)))
sub.subset(font)
font = instancer.instantiateVariableFont(font, {"wght": (400, 900)})
font.flavor = "woff2"
font.save(out)
print(len(chars), "chars ->", out.stat().st_size // 1024, "KB")
