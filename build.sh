#!/bin/bash
# Build a single self-contained index-bundle.html
OUT="index-bundle.html"

cat > "$OUT" << 'HEADER'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<title>Piggy Bank</title>
<style>
HEADER

# Inline CSS
cat css/style.css >> "$OUT"
cat css/animals.css >> "$OUT"

cat >> "$OUT" << 'MID'
</style>
</head>
MID

# Extract body from index.html (skip head, skip external script/css refs)
# Just grab from <body> to </body>
sed -n '/<body>/,/<\/body>/p' index.html | \
  grep -v '<script src=' | \
  grep -v '<link rel="stylesheet"' >> "$OUT"

# Now add all JS inline before </body>
sed -i '' 's|</body>||' "$OUT"

echo '<script>' >> "$OUT"
for f in js/data.js js/storage.js js/sound.js js/wallet.js js/stable.js js/market.js js/tasks.js js/quiz.js js/breeding.js js/parent.js js/app.js; do
  cat "$f" >> "$OUT"
  echo "" >> "$OUT"
done
echo '</script>' >> "$OUT"
echo '</body></html>' >> "$OUT"

wc -c "$OUT"
echo "Built $OUT"
