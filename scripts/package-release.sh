#!/usr/bin/env bash
set -euo pipefail
if find dist -type l -print -quit | grep -q .; then
  echo "dist must not contain symbolic links" >&2
  exit 1
fi
test -f dist/index.html
tar --sort=name \
  --mtime='UTC 1970-01-01' \
  --owner=0 --group=0 --numeric-owner \
  --format=posix \
  --use-compress-program='gzip -n' \
  -cf nazoauth-web.tar.gz \
  -C dist .
test "$(stat -c %s nazoauth-web.tar.gz)" -le 67108864
