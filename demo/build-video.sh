#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
FFMPEG="$ROOT_DIR/node_modules/ffmpeg-static/ffmpeg"
CAPTURE="$ROOT_DIR/demo/capture"
OUTPUT="$ROOT_DIR/demo/output"
SILENT_VIDEO="$OUTPUT/gatekeeper-demo-silent.mp4"
FINAL_VIDEO="$OUTPUT/gatekeeper-demo-final.mp4"

if [[ ! -x "$FFMPEG" ]]; then
  echo "ffmpeg-static is missing. Run: npm install --no-save --package-lock=false ffmpeg-static" >&2
  exit 1
fi

mkdir -p "$OUTPUT"

images=(
  "$ROOT_DIR/public/og.png"
  "$CAPTURE/01-hero.png"
  "$CAPTURE/02-evidence-map.png"
  "$CAPTURE/03-risk-findings.png"
  "$CAPTURE/04-annotated-diff.png"
  "$CAPTURE/05-proof-running.png"
  "$CAPTURE/06-proof-failed.png"
  "$CAPTURE/07-safe-refactor.png"
  "$CAPTURE/08-release-receipt.png"
  "$CAPTURE/09-custom-diff.png"
  "$CAPTURE/10-principle.png"
)

durations=(10 15 15 17 14 4 13 16 15 14 16)
transition="0.6"
fps=30

inputs=()
filters=""
for index in "${!images[@]}"; do
  duration="${durations[$index]}"
  frames=$((duration * fps))
  # zoompan expands one still into the exact number of frames required. Feeding
  # an already-looped image here would multiply that duration a second time.
  inputs+=( -i "${images[$index]}" )
  direction=$((index % 3))
  if [[ "$direction" -eq 0 ]]; then
    x_expr="iw/2-(iw/zoom/2)"
    y_expr="ih/2-(ih/zoom/2)"
  elif [[ "$direction" -eq 1 ]]; then
    x_expr="(iw-iw/zoom)*on/${frames}"
    y_expr="ih/2-(ih/zoom/2)"
  else
    x_expr="iw/2-(iw/zoom/2)"
    y_expr="(ih-ih/zoom)*(1-on/${frames})"
  fi
  filters+="[$index:v]scale=1344:756:force_original_aspect_ratio=increase,crop=1344:756,zoompan=z='min(zoom+0.00022,1.035)':x='$x_expr':y='$y_expr':d=$frames:s=1280x720:fps=$fps,format=yuv420p,settb=AVTB,trim=duration=$duration,setpts=PTS-STARTPTS[v$index];"
done

offset="9.4"
filters+="[v0][v1]xfade=transition=fade:duration=$transition:offset=$offset[x1];"
offset="23.8"
filters+="[x1][v2]xfade=transition=fade:duration=$transition:offset=$offset[x2];"
offset="38.2"
filters+="[x2][v3]xfade=transition=fade:duration=$transition:offset=$offset[x3];"
offset="54.6"
filters+="[x3][v4]xfade=transition=fade:duration=$transition:offset=$offset[x4];"
offset="68.0"
filters+="[x4][v5]xfade=transition=fade:duration=$transition:offset=$offset[x5];"
offset="71.4"
filters+="[x5][v6]xfade=transition=fade:duration=$transition:offset=$offset[x6];"
offset="83.8"
filters+="[x6][v7]xfade=transition=fade:duration=$transition:offset=$offset[x7];"
offset="99.2"
filters+="[x7][v8]xfade=transition=fade:duration=$transition:offset=$offset[x8];"
offset="113.6"
filters+="[x8][v9]xfade=transition=fade:duration=$transition:offset=$offset[x9];"
offset="127.0"
filters+="[x9][v10]xfade=transition=fade:duration=$transition:offset=$offset,fade=t=out:st=141.8:d=1.2[vout]"

"$FFMPEG" -hide_banner -loglevel warning -y \
  "${inputs[@]}" \
  -filter_complex "$filters" \
  -map "[vout]" -r "$fps" -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -movflags +faststart \
  "$SILENT_VIDEO"

if [[ $# -eq 0 ]]; then
  echo "$SILENT_VIDEO"
  exit 0
fi

audio="$1"
if [[ ! -f "$audio" ]]; then
  echo "Audio file not found: $audio" >&2
  exit 1
fi

audio_duration="$(afinfo "$audio" | awk -F': ' '/estimated duration/ {print $2; exit}')"
if [[ -z "$audio_duration" ]]; then
  echo "Could not determine narration duration." >&2
  exit 1
fi

ratio="$(awk -v duration="$audio_duration" 'BEGIN {printf "%.8f", duration / 143.0}')"

"$FFMPEG" -hide_banner -loglevel warning -y \
  -i "$SILENT_VIDEO" -i "$audio" \
  -filter_complex "[0:v]setpts=${ratio}*PTS,fade=t=out:st=$(awk -v d="$audio_duration" 'BEGIN {printf "%.3f", d-1.0}'):d=1[v];[1:a]highpass=f=75,lowpass=f=15000,loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=in:st=0:d=.25,afade=t=out:st=$(awk -v d="$audio_duration" 'BEGIN {printf "%.3f", d-0.75}'):d=.75[a]" \
  -map "[v]" -map "[a]" -t "$audio_duration" \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart \
  "$FINAL_VIDEO"

echo "$FINAL_VIDEO"
