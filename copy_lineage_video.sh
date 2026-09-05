#!/usr/bin/env bash

set -euo pipefail

readonly VIDEO_DIR='/media/0/Vid'

usage() {
  cat >&2 <<'EOF'
Usage:
  ./copy_lineage_video.sh 'exact video filename.mp4'

Copies one file from /media/0/Vid on an attached LineageOS microSD card
into the current directory. The SD-card filesystem is opened read-only.

If more than one suitable card is attached, specify its userdata partition:
  LINEAGE_PARTITION=disk6s4 ./copy_lineage_video.sh 'exact video filename.mp4'
EOF
}

die() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

debugfs_escape() {
  local value=$1
  value=${value//\\/\\\\}
  value=${value//\"/\\\"}
  printf '%s' "$value"
}

if [[ $# -ne 1 ]]; then
  usage
  exit 2
fi

filename=$1
[[ -n "$filename" ]] || die 'The filename is empty.'
[[ "$filename" != */* ]] || die 'Pass a filename only, not a path.'
[[ "$filename" != '.' && "$filename" != '..' ]] || die 'Invalid filename.'

destination="$PWD/$filename"
[[ ! -e "$destination" ]] || die "Destination already exists: $destination"

if [[ -x /opt/homebrew/opt/e2fsprogs/sbin/debugfs ]]; then
  debugfs=/opt/homebrew/opt/e2fsprogs/sbin/debugfs
elif command -v debugfs >/dev/null 2>&1; then
  debugfs=$(command -v debugfs)
else
  die 'debugfs is unavailable. Install it with: /opt/homebrew/bin/brew install e2fsprogs'
fi

command -v diskutil >/dev/null 2>&1 || die 'diskutil is unavailable; this script requires macOS.'

candidates=()
if [[ -n "${LINEAGE_PARTITION:-}" ]]; then
  partition=${LINEAGE_PARTITION#/dev/}
  partition=${partition#r}
  [[ "$partition" =~ ^disk[0-9]+s[0-9]+$ ]] || \
    die "Invalid LINEAGE_PARTITION: $LINEAGE_PARTITION"
  candidates+=("$partition")
else
  while IFS= read -r partition; do
    candidates+=("$partition")
  done < <(
    diskutil list external physical |
      awk '$2 == "Linux" && $NF ~ /^disk[0-9]+s[0-9]+$/ { print $NF }'
  )
fi

(( ${#candidates[@]} > 0 )) || die 'No external Linux partitions were found.'

printf 'Administrator authorization is required for read-only access to the SD card.\n'
sudo -v

matches=()
for partition in "${candidates[@]}"; do
  raw_device="/dev/r$partition"
  [[ -e "$raw_device" ]] || continue

  probe=$(sudo "$debugfs" -R "stat $VIDEO_DIR" "$raw_device" 2>&1 || true)
  if printf '%s\n' "$probe" | grep -q '^Inode:'; then
    matches+=("$partition")
  fi
done

if (( ${#matches[@]} == 0 )); then
  die "No attached Linux partition contains $VIDEO_DIR."
fi

if (( ${#matches[@]} > 1 )); then
  printf 'More than one LineageOS userdata partition was found:\n' >&2
  printf '  %s\n' "${matches[@]}" >&2
  die 'Set LINEAGE_PARTITION to the intended partition and run again.'
fi

partition=${matches[0]}
raw_device="/dev/r$partition"
remote_path="$VIDEO_DIR/$filename"
remote_escaped=$(debugfs_escape "$remote_path")

source_stat=$(sudo "$debugfs" -R "stat \"$remote_escaped\"" "$raw_device" 2>&1 || true)
source_inode=$(printf '%s\n' "$source_stat" | awk '/^Inode:/ { print $2; exit }')
source_size=$(
  printf '%s\n' "$source_stat" |
    awk '/^User:/ { for (i = 1; i <= NF; i++) if ($i == "Size:") { print $(i + 1); exit } }'
)

if [[ -z "$source_inode" || -z "$source_size" ]]; then
  printf '%s\n' "$source_stat" >&2
  die "File not found: $remote_path"
fi

temporary_directory=$(mktemp -d "$PWD/.lineage-copy.XXXXXX")
temporary_file="$temporary_directory/$filename"

cleanup() {
  if [[ -e "$temporary_file" ]]; then
    sudo rm -f -- "$temporary_file"
  fi
  rmdir "$temporary_directory" 2>/dev/null || true
}
trap cleanup EXIT HUP INT TERM

temporary_escaped=$(debugfs_escape "$temporary_file")
printf 'Copying %s (%s bytes) from %s...\n' "$filename" "$source_size" "$partition"
sudo "$debugfs" -R "dump <$source_inode> \"$temporary_escaped\"" "$raw_device"
sudo chown "$(id -u):$(id -g)" "$temporary_file"
chmod u+rw "$temporary_file"

copied_size=$(stat -f '%z' "$temporary_file")
[[ "$copied_size" == "$source_size" ]] || \
  die "Size mismatch: source=$source_size bytes, copy=$copied_size bytes"

mv "$temporary_file" "$destination"
rmdir "$temporary_directory"
trap - EXIT HUP INT TERM

printf 'Copied successfully:\n  %s\n' "$destination"
printf 'Size: %s bytes\n' "$copied_size"
printf 'SHA-256: '
shasum -a 256 "$destination" | awk '{ print $1 }'
file "$destination"

