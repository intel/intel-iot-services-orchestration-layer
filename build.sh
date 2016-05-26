#!/bin/bash

clean="yes"
doc="yes"
auto_install="no"

for opt in $*; do
  case $opt in
    noclean) clean="no"
    ;;
    nodoc) doc="no"
    ;;
    auto_install) auto_install="yes"
    ;;
    *) echo "Unknown option: $opt. Available options noclean, nodoc, auto_install"
  esac
done

# by default, we clean npm cache first
if test "$clean" = "yes"; then
  echo ">>> cleaning npm cache ..."
  echo "    You may use './build.sh noclean' to avoid cleaning npm cache"
  npm cache clean
fi

rm -rf ./dist/*

if [ ! -e dist/node_modules ]; then
  mkdir -p dist/node_modules
fi

PROJS="base center entity entity-store http-broker hub hub-center-shared message session-manager store workflow demo"

for P in $PROJS; do
  echo ">>> copying $P"
  tar -c --exclude node_modules $P | tar -x -C ./dist/node_modules
  mv ./dist/node_modules/$P ./dist/node_modules/hope-$P
done


echo ">>> creating package.json"
node merge_deps.js $PROJS

if test "$auto_install" = "yes"; then
  echo ">>> install npm packages"
  cd ./dist
  npm install
  cd -
fi


echo ">>> ui widgets"
cd ./ui-widgets
rm -rf node_modules/*
npm install
gulp build
cd -
mkdir -p ./dist/ui-widgets/addons
cp ./ui-widgets/{specs.js,plugins-specs.json} ./dist/ui-widgets
cp ./ui-widgets/node_modules/babel-core/browser.min.js ./dist/ui-widgets/babel-browser.js

echo ">>> ui dev"
cd ./ui-dev
rm -rf node_modules/*
npm install
npm link ../ui-widgets
bower --allow-root install
rm -rf ./public
NODE_ENV=production gulp build
cd -
mkdir -p ./dist/ui-dev
cp -r ./ui-dev/public ./dist/ui-dev/.


echo ">>> ui user"
cd ./ui-user
rm -rf node_modules/*
npm install
npm link ../ui-widgets
bower --allow-root install
rm -rf ./public
NODE_ENV=production gulp build
cd -
mkdir -p ./dist/ui-user
cp -r ./ui-user/public ./dist/ui-user/.


echo ">>> demo"
rm -rf ./dist/node_modules/hope-demo/center/appbundle/*

echo ">>> doc"

if test "$doc" = "yes"; then
  cd ./doc/framework
  npm install
  NODE_ENV=production gulp build
  cd ..
  ./gen_doc.sh
  cd ..
else
  rm -f ./dist/start_doc.sh
fi

mkdir ./dist/doc
cp -r ./doc/html ./dist/doc/.


# app developer
cp -r ./doc/framework/public/{css,fonts,images,img,js,index.html} ./dist/doc/html/app-dev/.


echo ">>> scripts"
cp -r ./build/* ./dist
chmod ugo+x ./dist/center ./dist/hub ./dist/run_demo ./dist/start_edison_demo.sh ./dist/start_mock_demo.sh ./dist/start_doc.sh



# replace the README
cp README_dist.md ./dist/README.md