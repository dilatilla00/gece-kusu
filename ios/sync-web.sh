#!/bin/sh
# Oyunun web dosyalarını iOS uygulamasının içine (GeceKusu/Web) kopyalar.
# Xcode her derlemede bunu otomatik çalıştırır; elle de çalıştırılabilir.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="$HERE/.."
DST="$HERE/GeceKusu/Web"
mkdir -p "$DST"
rsync -a --delete \
  --include='/index.html' --include='/css/***' --include='/js/***' \
  --include='/eras/***' --include='/vendor/***' --exclude='*' \
  "$SRC/" "$DST/"
echo "Web dosyaları kopyalandı: $DST"
