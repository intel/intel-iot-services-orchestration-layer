#!/bin/sh

pandoc -c styles/style.css -s -S --self-contained --toc -o hope_guide.html md/guide/*.md
pandoc -c styles/style.css -s -S --self-contained --toc -o hope_start.html md/start/*.md
pandoc -c styles/style.css -s -S --self-contained --toc -o hope_design.html md/design/*.md

# service all in one
mdcvt() {
  mkdir -p builtin
  pandoc -c styles/style.css -s -S --self-contained --toc -o builtin/$1.html md/builtin/01_header.md md/builtin/$1.md
}

# one doc for each service of thing
mdcvt2() {
  mkdir -p builtin/$1
  pandoc -c styles/style.css -s -S --self-contained --toc -o builtin/$1/$2.html md/builtin/01_header.md md/builtin/$1/$2.md
}


mdcvt string

mdcvt math
mdcvt math.zh-CN
