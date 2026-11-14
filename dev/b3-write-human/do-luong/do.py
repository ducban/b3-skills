#!/usr/bin/env python3
"""Đếm lỗi Vale trên 1.000 chữ, tách theo mức, in 8 lỗi gặp nhiều nhất.
Dùng:  python3 dev/b3-write-human/do-luong/do.py file1.md [file2.md ...]"""
import json, subprocess, sys, pathlib
from collections import Counter
here = pathlib.Path(__file__).resolve().parent
ini = here / ".vale.ini"
import shutil
if not shutil.which("vale"):
    sys.exit("không thấy vale trên PATH: cài vale rồi chạy lại")
subprocess.run([sys.executable, str(here / "sinh-tu-sao.py")], check=True, capture_output=True)  # TuSao.yml luôn sinh từ nguồn
for f in sys.argv[1:]:
    text = pathlib.Path(f).read_text()
    words = len(text.split())
    run = subprocess.run(["vale", "--config", str(ini), "--output=JSON", f], capture_output=True, text=True)
    # Vale thoát 1 khi có lỗi văn bản, 2 khi chính Vale hỏng (cấu hình, style thiếu). Hỏng thì
    # dừng, đừng in "0 lỗi" như một điểm tuyệt đối.
    if run.returncode not in (0, 1):
        sys.exit(f"vale hỏng (mã {run.returncode}) trên {f}:\n{run.stderr.strip()}")
    alerts = [a for v in json.loads(run.stdout or "{}").values() for a in v]
    lv = Counter(a["Severity"] for a in alerts)
    per = lambda n: n * 1000 / words if words else 0
    print(f"{pathlib.Path(f).name}: {words} chữ · {len(alerts)} lỗi · {per(len(alerts)):.1f}/1.000 chữ "
          f"(error {lv['error']}, warning {lv['warning']}, suggestion {lv['suggestion']})")
    for (chk, m), n in Counter((a["Check"], a["Match"].strip().lower()) for a in alerts).most_common(8):
        print(f"  {n:3d}  {chk:16s} {m}")
