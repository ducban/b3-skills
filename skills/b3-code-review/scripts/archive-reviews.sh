#!/usr/bin/env bash
set -euo pipefail

# archive-reviews.sh - compact CODE-REVIEW.md and CODE-FIXED.md
#
# CODE-REVIEW.md keeps its header, the last CR entry, and a "## Carried
# Findings" section holding the full text of every finding that the last
# entry's Validation Matrix still marks open (New, Still Open, Regressed) but
# that was written in an older entry. CODE-FIXED.md keeps its header and the
# CF entries whose Source Review is the last CR entry. Everything else is
# appended to CODE-REVIEW.archive.md and CODE-FIXED.archive.md.
#
# Usage: archive-reviews.sh [--dry-run]
# Run from the project root. Works with bash 3.2 and POSIX awk.

REVIEW_FILE="CODE-REVIEW.md"
FIXED_FILE="CODE-FIXED.md"
REVIEW_ARCHIVE="CODE-REVIEW.archive.md"
FIXED_ARCHIVE="CODE-FIXED.archive.md"

DRY_RUN=0
case "${1:-}" in
  --dry-run) DRY_RUN=1 ;;
  "") ;;
  *) echo "usage: $0 [--dry-run]" >&2; exit 2 ;;
esac

TODAY=$(date +%Y-%m-%d)
SCRATCH=$(mktemp -d)
cleanup() {
  local f
  for f in "$SCRATCH"/*; do if [[ -e "$f" ]]; then unlink "$f"; fi; done
  rmdir "$SCRATCH"
}
trap cleanup EXIT

header_end() { grep -n '^---$' "$1" | head -1 | cut -d: -f1; }

# Append lines from stdin to an archive, under a dated heading, dropping
# leading blank lines.
append_archive() {
  local archive="$1" src="$2"
  if [[ -s "$archive" ]]; then echo "" >> "$archive"; fi
  { echo "# Archived from $src on $TODAY"; echo ""
    awk 'BEGIN{seen=0} { if (!seen && $0 ~ /^[[:space:]]*$/) next; seen=1; print }'
  } >> "$archive"
}

LATEST_ID=""

archive_review() {
  local src="$REVIEW_FILE"
  if [[ ! -f "$src" ]]; then echo "skip: $src not found"; return; fi
  local hend latest total
  hend=$(header_end "$src")
  if [[ -z "$hend" ]]; then echo "skip: no --- separator in $src"; return; fi
  latest=$(grep -n '^## CR-' "$src" | tail -1 | cut -d: -f1)
  if [[ -z "$latest" ]]; then echo "skip: no CR entry in $src"; return; fi
  LATEST_ID=$(sed -n "${latest}p" "$src" | sed 's/^## //; s/[[:space:]].*//')
  total=$(wc -l < "$src" | tr -d ' ')

  # Everything between the header and the last entry is old. A Carried
  # Findings section alone is not: it would only be rebuilt as it is.
  local old_count
  old_count=$(sed -n "$((hend + 1)),$((latest - 1))p" "$src" | grep -c '^## CR-' || true)
  if [[ "$old_count" -eq 0 ]]; then
    echo "$src: only the last entry ($LATEST_ID) is left, nothing to archive"
    return
  fi

  # Open finding numbers, from the last entry's Validation Matrix. The first
  # column holds a number or a list with ranges ("8-10, 13"); the third holds
  # the status.
  local open
  open=$(sed -n "${latest},\$p" "$src" | awk -F'|' '
    /^### / { inm = ($0 ~ /^### Validation Matrix/) ; next }
    !inm || $0 !~ /^\|/ { next }
    {
      status = $4
      if (status !~ /New|Still Open|Regressed/) next
      spec = $2; gsub(/[^0-9,-]/, "", spec)
      n = split(spec, parts, ",")
      for (i = 1; i <= n; i++) {
        if (parts[i] == "") continue
        if (index(parts[i], "-") > 0) {
          split(parts[i], ab, "-")
          for (k = ab[1] + 0; k <= ab[2] + 0; k++) printf "%d ", k
        } else printf "%d ", parts[i] + 0
      }
    }')

  # Findings written in the last entry itself need no carrying.
  local own
  own=$(sed -n "${latest},\$p" "$src" | awk '/^\*\*[0-9]+\. / { n=$0; sub(/^\*\*/, "", n); sub(/\..*/, "", n); printf "%d ", n }')

  local carry=""
  for n in $open; do
    case " $own " in *" $n "*) ;; *) carry="$carry $n" ;; esac
  done

  # Pull the full text of each carried finding from the old part; the last
  # occurrence wins. Blocks are grouped by the severity heading above them.
  local carried
  carried=$(sed -n "$((hend + 1)),$((latest - 1))p" "$src" | awk -v want=" $carry " '
    function flush() { if (cur != "") { text[cur] = buf; sev[cur] = cursev }; cur = ""; buf = "" }
    /^#### / { flush(); s = $0; sub(/^#### /, "", s); cursev = s; next }
    /^\*\*[0-9]+\. / {
      flush()
      n = $0; sub(/^\*\*/, "", n); sub(/\..*/, "", n)
      if (index(want, " " n " ") > 0) { cur = n; buf = $0 }
      next
    }
    /^(## |### |---$)/ { flush(); next }
    { if (cur != "") buf = buf "\n" $0 }
    END {
      flush()
      split("High Medium Low", order, " ")
      for (o = 1; o <= 3; o++) {
        head = 0
        m = split(want, ws, " ")
        for (i = 1; i <= m; i++) {
          w = ws[i]
          if (!(w in text) || sev[w] != order[o]) continue
          if (!head) { printf "#### %s\n\n", order[o]; head = 1 }
          t = text[w]; sub(/\n+$/, "", t)
          printf "%s\n\n", t
          done[w] = 1
        }
      }
      for (i = 1; i <= m; i++) { w = ws[i]; if ((w in text) && !(w in done)) { t = text[w]; sub(/\n+$/, "", t); printf "%s\n\n", t } }
      for (i = 1; i <= m; i++) { w = ws[i]; if (!(w in text)) printf "MISSING %s\n", w > "/dev/stderr" }
    }' 2> "$SCRATCH/missing")

  local missing
  missing=$(sed 's/^MISSING //' "$SCRATCH/missing" | tr '\n' ' ')

  echo "$src: $total lines; keep header, $LATEST_ID, and carried findings:${carry:- none}"
  if [[ -n "${missing// /}" ]]; then
    echo "  warning: no text found for #$missing- they stay in the archive only"
  fi

  if [[ "$DRY_RUN" -eq 1 ]]; then return; fi

  sed -n "$((hend + 1)),$((latest - 1))p" "$src" | append_archive "$REVIEW_ARCHIVE" "$src"
  {
    head -n "$hend" "$src"
    echo ""
    if [[ -n "${carried// /}" ]]; then
      echo "## Carried Findings"
      echo ""
      echo "Full text of findings still open in $LATEST_ID but written in entries now in \`$REVIEW_ARCHIVE\`. Their current status is in $LATEST_ID's Validation Matrix, not in the \`Status\` lines below."
      echo ""
      printf '%s\n' "$carried"
      echo ""
    fi
    sed -n "${latest},\$p" "$src"
  } > "$SCRATCH/review"
  cat "$SCRATCH/review" > "$src"
  echo "  done: $(wc -l < "$src" | tr -d ' ') lines left, the rest appended to $REVIEW_ARCHIVE"
}

archive_fixed() {
  local src="$FIXED_FILE"
  if [[ ! -f "$src" ]]; then echo "skip: $src not found"; return; fi
  if [[ -z "$LATEST_ID" ]]; then echo "skip: $src, no CR entry to keep fixes for"; return; fi
  local hend total
  hend=$(header_end "$src")
  if [[ -z "$hend" ]]; then echo "skip: no --- separator in $src"; return; fi
  total=$(wc -l < "$src" | tr -d ' ')

  # Split the body into entries; an entry is kept when its Source Review line
  # names the last CR entry.
  tail -n +"$((hend + 1))" "$src" | awk -v id="$LATEST_ID" -v keep="$SCRATCH/keep" -v drop="$SCRATCH/drop" '
    function flush() {
      if (buf == "") return
      out = (entry && index(srcline, id) > 0) || !entry ? keep : drop
      printf "%s", buf > out
      buf = ""
    }
    /^## CF-/ { flush(); entry = 1; srcline = "" }
    /\*\*Source Review\*\*/ { srcline = $0 }
    { buf = buf $0 "\n" }
    END { printf "" > keep; printf "" > drop; flush() }'

  local kept dropped
  kept=$(grep -c '^## CF-' "$SCRATCH/keep" || true)
  dropped=$(grep -c '^## CF-' "$SCRATCH/drop" || true)
  echo "$src: $total lines; keep $kept entr(y/ies) for $LATEST_ID, archive $dropped"

  if [[ "$DRY_RUN" -eq 1 || "$dropped" -eq 0 ]]; then return; fi

  append_archive "$FIXED_ARCHIVE" "$src" < "$SCRATCH/drop"
  {
    head -n "$hend" "$src"
    echo ""
    awk 'BEGIN{seen=0} { if (!seen && $0 ~ /^[[:space:]]*$/) next; seen=1; print }' "$SCRATCH/keep"
  } > "$SCRATCH/fixed"
  cat "$SCRATCH/fixed" > "$src"
  echo "  done: $(wc -l < "$src" | tr -d ' ') lines left, the rest appended to $FIXED_ARCHIVE"
}

if [[ "$DRY_RUN" -eq 1 ]]; then echo "=== Archive Reviews (dry run) ==="; else echo "=== Archive Reviews ==="; fi
archive_review
archive_fixed
