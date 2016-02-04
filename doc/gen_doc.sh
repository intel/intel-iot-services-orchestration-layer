#!/bin/sh

pandoc -c styles/style.css -s -S --self-contained --toc -o html/hope_guide.html md/guide/*.md
pandoc -c styles/style.css -s -S --self-contained --toc -o html/hope_start.html md/start/*.md
pandoc -c styles/style.css -s -S --self-contained --toc -o html/hope_design.html md/design/*.md


# builtin services

for P in md/builtin/*.md; do
  B="$(basename $P)"
  H="${B%.md}.html"
  if [ "$B" != "01_header.md" ]; then
    pandoc -c styles/style.css -s -S --self-contained --toc --data-dir=md/builtin -o html/builtin/$H md/builtin/01_header.md $P
  fi
done


# startkit

mkdir -p html/startkit

for P in md/startkit/*.md; do
  B="$(basename $P)"
  H="${B%.md}.html"
  pandoc -c styles/style.css -s -S --self-contained --toc --data-dir=md/startkit -o html/startkit/$H $P
done
