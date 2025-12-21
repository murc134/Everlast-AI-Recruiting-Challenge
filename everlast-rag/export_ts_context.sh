#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: export_ts_context.sh [root_dir] [output_file]

Collects folder structure plus all .ts, .tsx, and .css files from app, lib, and
components under root_dir (default: current directory) into output_file
(default: <root_dir>/ai_context.txt).
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

ROOT="${1:-$(pwd)}"
ROOT="$(cd "$ROOT" && pwd)"
OUT="${2:-"$ROOT/ai_context.txt"}"

TARGETS=(app lib components)
TARGET_DIRS=()
for target in "${TARGETS[@]}"; do
  if [[ -d "$ROOT/$target" ]]; then
    TARGET_DIRS+=("$ROOT/$target")
  fi
done

if [[ ${#TARGET_DIRS[@]} -eq 0 ]]; then
  echo "No target directories found under $ROOT (app, lib, components)." >&2
  exit 1
fi

{
  echo "Project root: $ROOT"
  echo
  echo "Folder structure (app, lib, components):"
} > "$OUT"

print_tree() {
  local base="$1"
  find "$base" -type d -print | sort | while IFS= read -r dir; do
    local rel="${dir#$ROOT/}"
    local depth="${rel//[^\/]/}"
    local indent=""
    local i
    for ((i = 0; i < ${#depth}; i++)); do
      indent+="  "
    done
    printf "%s%s/\n" "$indent" "${rel##*/}"
  done
}

for base in "${TARGET_DIRS[@]}"; do
  echo >> "$OUT"
  print_tree "$base" >> "$OUT"
done

mapfile -t FILES < <(
  find "${TARGET_DIRS[@]}" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.css" \) -print | sort
)

if [[ ${#FILES[@]} -eq 0 ]]; then
  echo "No .ts, .tsx, or .css files found under app, lib, components." >&2
  exit 1
fi

{
  echo
  echo "Files (.ts, .tsx, .css):"
} >> "$OUT"

for file in "${FILES[@]}"; do
  rel="${file#$ROOT/}"
  {
    echo
    echo "===== $rel ====="
    cat "$file"
  } >> "$OUT"
done

echo "Wrote context to $OUT"
