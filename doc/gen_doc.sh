#!/bin/sh

pandoc -c styles/style.css -s -S --self-contained --toc -o hope_guide.html md/guide/*.md
pandoc -c styles/style.css -s -S --self-contained --toc -o hope_start.html md/start/*.md
