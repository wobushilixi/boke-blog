#!/usr/bin/env bash
set -euo pipefail
ROOT=${1:-/}
rsync -av bundle/etc/ "$ROOT/etc/"
rsync -av bundle/opt/ "$ROOT/opt/"
rsync -av bundle/www/ "$ROOT/www/"
cd "$ROOT/opt/boke-admin" && npm install --silent
systemctl daemon-reload
systemctl enable --now boke-admin visitor-stats
nginx -t && systemctl reload nginx

echo "Done. Visit https://boke.iozz.cc/admin"
