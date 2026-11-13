#!/usr/bin/env bash
set -euo pipefail

# archive-reviews.sh — Compact resolved CODE-REVIEW.md and CODE-FIXED.md entries
# Moves all content (except the writing-standard header) to .archive.md files,
# then rewrites the active files with only the header section.

REVIEW_FILE="CODE-REVIEW.md"
FIXED_FILE="CODE-FIXED.md"
REVIEW_ARCHIVE="CODE-REVIEW.archive.md"
FIXED_ARCHIVE="CODE-FIXED.archive.md"

archive_file() {
  local src="$1"
  local archive="$2"

  if [[ ! -f "$src" ]]; then
    echo "⚠ $src not found — skipping."
    return
  fi

  local total_lines
  total_lines=$(wc -l < "$src")

  # Find the first "---" separator line (end of header)
  local header_end
  header_end=$(grep -n '^---$' "$src" | head -1 | cut -d: -f1)

  if [[ -z "$header_end" ]]; then
    echo "⚠ No --- separator found in $src — skipping."
    return
  fi

  local body_start=$((header_end + 1))
  local body_lines=$((total_lines - header_end))

  if [[ $body_lines -le 1 ]]; then
    echo "ℹ $src has no entries beyond the header — nothing to archive."
    return
  fi

  # Append body to archive
  if [[ -s "$archive" ]]; then
    echo "" >> "$archive"
  fi
  echo "# Archived from $src on $(date +%Y-%m-%d)" >> "$archive"
  echo "" >> "$archive"
  tail -n +"$body_start" "$src" | awk 'BEGIN{seen=0} { if (!seen && $0 ~ /^[[:space:]]*$/) next; seen=1; print }' >> "$archive"

  # Rewrite active file with header only
  head -n "$header_end" "$src" > "${src}.tmp"
  mv "${src}.tmp" "$src"

  echo "✔ $src: archived $body_lines lines → $archive (kept $header_end header lines)"
}

echo "=== Archive Reviews ==="
echo ""

archive_file "$REVIEW_FILE" "$REVIEW_ARCHIVE"
archive_file "$FIXED_FILE" "$FIXED_ARCHIVE"

echo ""
echo "Done. Active files now contain only headers."
echo "Archived content appended to $REVIEW_ARCHIVE and $FIXED_ARCHIVE."
