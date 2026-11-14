#!/usr/bin/env python3
"""Sinh styles/B3/TuSao.yml từ nguồn duy nhất của danh sách từ sáo:
luật 10 trong skills/b3-write-human/tai-lieu-tieng-viet.md và gạch đầu dòng
"Cụm rỗng" trong SKILL.md. Không sửa TuSao.yml bằng tay.

  python3 dev/b3-write-human/do-luong/sinh-tu-sao.py          # ghi lại TuSao.yml
  python3 dev/b3-write-human/do-luong/sinh-tu-sao.py --check  # thoát 1 nếu TuSao.yml đã lệch nguồn
"""
import re, sys, pathlib

here = pathlib.Path(__file__).resolve().parent
skill = here.parent.parent.parent / "skills" / "b3-write-human"
out = here / "styles" / "B3" / "TuSao.yml"

def flat(p):
    return re.sub(r"\s+", " ", p.read_text())

rule10 = re.search(r"Danh sách cấm: (.+?)\. Muốn nhấn", flat(skill / "tai-lieu-tieng-viet.md"))
cum_rong = re.search(r"^- Cụm rỗng: (.+)$", (skill / "SKILL.md").read_text(), re.M)
if not rule10 or not cum_rong:
    sys.exit("Không tìm thấy 'Danh sách cấm' hoặc 'Cụm rỗng' trong nguồn")

phrases = [w.strip() for w in rule10.group(1).split("·")]
phrases += [w.strip() for w in re.findall(r'"([^"]+)"', cum_rong.group(1))]

def lit(s):
    """Thoát các ký tự đặc biệt của regex Go (Vale), chừa khoảng trắng và chữ có dấu."""
    return re.sub(r"([.^$*+?()\[\]{}|\\])", r"\\\1", s)

tokens = []
for p in phrases:
    p = p.replace("...", "…")
    for v in (p, p.replace("hoá", "hóa")):        # chấp nhận cả hai cách bỏ dấu
        if "…" in v:                              # "không chỉ… mà còn" → cho phép tới 80 ký tự giữa hai vế
            a, b = [s.strip() for s in v.split("…", 1)]
            v = f"{lit(a)}[^.;]{{1,80}}{lit(b)}"
        else:
            v = lit(v)                      # cụm là chữ thường, không phải regex: . ( ? không được mở rộng
        if v not in tokens:
            tokens.append(v)

# YAML nháy đơn: một ' trong cụm phải viết thành ''.
body = "\n".join("  - '" + t.replace("'", "''") + "'" for t in tokens)
text = f"""# SINH TỰ ĐỘNG bởi sinh-tu-sao.py, đừng sửa tay. Nguồn duy nhất: luật 10 trong
# skills/b3-write-human/tai-lieu-tieng-viet.md và gạch "Cụm rỗng" trong SKILL.md.
# Sửa ở đó rồi chạy lại script; do.py tự sinh lại trước mỗi lần đo.
extends: existence
message: "Từ sáo '%s'. Muốn nhấn thì đưa số hoặc so sánh cụ thể (luật 10, tai-lieu-tieng-viet.md)."
level: error
ignorecase: true
nonword: true
tokens:
{body}
"""

if "--check" in sys.argv:
    if out.exists() and out.read_text() == text:
        print(f"khớp: {len(tokens)} cụm"); sys.exit(0)
    print("TuSao.yml lệch nguồn, chạy sinh-tu-sao.py để sinh lại"); sys.exit(1)

out.write_text(text)
print(f"đã ghi {out.relative_to(here.parent.parent.parent)}: {len(tokens)} cụm")
