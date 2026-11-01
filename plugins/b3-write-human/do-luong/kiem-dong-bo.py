#!/usr/bin/env python3
"""Bắt lệch giữa TuSao.yml và nguồn thật của nó (luật 10 tai-lieu-tieng-viet.md, SKILL.md).
Chạy từ đâu cũng được: python3 plugins/b3-write-human/do-luong/kiem-dong-bo.py
Thoát 1 khi có cụm trong TuSao.yml không tìm thấy ở nguồn, hoặc từ cấm ở luật 10 chưa vào TuSao.yml."""
import re, sys, pathlib
here = pathlib.Path(__file__).resolve().parent
skill = here.parent / "skills" / "b3-write-human"
src = (skill / "tai-lieu-tieng-viet.md").read_text() + (skill / "SKILL.md").read_text()
src = re.sub(r"\s+", " ", src).replace("hóa", "hoá")
yml = (here / "styles" / "B3" / "TuSao.yml").read_text()
tokens = [t.strip("'\"") for t in re.findall(r"^\s*-\s*(.+)$", yml, re.M)]
bad = 0
for t in tokens:
    plain = re.sub(r"\[.*?\]\{.*?\}", "…", t)
    if plain.split("…")[0].strip().replace("hóa", "hoá") not in src:
        print(f"TuSao.yml có '{t}' nhưng nguồn không có"); bad += 1
m = re.search(r"Danh sách cấm: (.+?)\. Muốn nhấn", src, re.S)
if m:
    for w in [w.strip() for w in re.sub(r"\s+", " ", m.group(1)).split("·")]:
        key = w.replace("…", "").split()[0]
        if not any(key in t for t in tokens):
            print(f"Luật 10 có '{w}' nhưng TuSao.yml chưa có"); bad += 1
else:
    print("Không tìm thấy 'Danh sách cấm' trong tai-lieu-tieng-viet.md"); bad += 1
print("khớp" if not bad else f"{bad} chỗ lệch"); sys.exit(1 if bad else 0)
