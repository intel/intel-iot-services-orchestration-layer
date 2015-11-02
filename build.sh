#!/bin/bash

rm -rf ./dist/*

if [ ! -e dist/node_modules ]; then
  mkdir -p dist/node_modules
fi

PROJS="base center entity entity-store hub hub-center-shared message session-manager store wfe"

for P in $PROJS; do
  echo ">>> copying $P"
  tar -c --exclude node_modules $P | tar -x -C ./dist/node_modules
  mv ./dist/node_modules/$P ./dist/node_modules/hope-$P
done


echo ">>> creating package.json"
node merge_deps.js $PROJS


echo ">>> install npm packages"
cd ./dist
npm install
cd -


echo ">>> ui widgets"
cd ./ui-widgets
npm install
bower --allow-root install
gulp build
cd -
mkdir -p ./dist/node_modules/ui-widgets
cp ./ui-widgets/specs.js ./dist/node_modules/ui-widgets

echo ">>> ui dev"
cd ./ui-dev
npm install
npm link ../ui-widgets
bower --allow-root install
gulp build
cd -
mkdir -p ./dist/node_modules/ui-dev
cp -r ./ui-dev/public ./dist/node_modules/ui-dev/.


echo ">>> ui user"
cd ./ui-user
npm install
npm link ../ui-widgets
bower --allow-root install
gulp build
cd -
mkdir -p ./dist/node_modules/ui-user
cp -r ./ui-user/public ./dist/node_modules/ui-user/.


echo ">>> demo"
mkdir ./dist/node_modules/hope-demo
cp -r ./demo/sample ./dist/node_modules/hope-demo/.
rm -rf ./dist/node_modules/hope-demo/sample/center/appbundle/*


echo ">>> scripts"
cp -r ./build/* ./dist
chmod ugo+x ./dist/center ./dist/hub ./dist/run_demo ./dist/start_edison_demo.sh ./dist/start_mock_demo.sh

