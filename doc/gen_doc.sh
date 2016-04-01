#!/bin/sh

mkdir -p html

pandoc -c styles/style.css -s -S --self-contained --toc -o html/hope_guide.html md/guide/*.md
pandoc -c styles/style.css -s -S --self-contained --toc -o html/hope_start.html md/start/*.md
pandoc -c styles/style.css -s -S --self-contained --toc -o html/hope_design.html md/design/*.md


# builtin services

mkdir -p html/builtin
cp -r styles html/builtin/.
cp -r md/builtin/pic html/builtin/.

for P in md/builtin/*.md; do
  B="$(basename $P)"
  H="${B%.md}.html"
  if [ "$B" != "01_header.md" ]; then
    pandoc -c styles/style.css --toc -o html/builtin/$H md/builtin/01_header.md $P
  fi
done


# startkit

mkdir -p html/startkit
cp -r styles html/startkit/.
cp -r md/startkit/pic html/startkit/.

for P in md/startkit/*.md; do
  B="$(basename $P)"
  H="${B%.md}.html"
  pandoc -c styles/style.css --toc -o html/startkit/$H $P
done


# lattepanda

mkdir -p html/lattepanda
cp -r styles html/lattepanda/.
# cp -r md/lattepanda/pic html/lattepanda/.

for P in md/lattepanda/*.md; do
  B="$(basename $P)"
  H="${B%.md}.html"
  pandoc -c styles/style.css --toc -o html/lattepanda/$H $P
done


# app developer

mkdir -p html/app-dev/doc
node framework/docproj.js md/app-dev html/app-dev/doc


