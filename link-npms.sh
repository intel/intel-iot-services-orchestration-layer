#!/bin/sh



cd message
npm install
npm link ../base


cd ../store
npm install
npm link ../base


cd ../entity
npm install
npm link ../base


cd ../entity-store
npm install
npm link ../base
npm link ../store


cd ../session-manager
npm install
npm link ../base

cd ../hub-center-shared
npm install
npm link ../base

cd ../hub
npm install
npm link ../base
npm link ../hub-center-shared
npm link ../store
npm link ../message
npm link ../entity
npm link ../entity-store
npm link ../session-manager


cd ../wfe
npm install
npm link ../base


cd ../center
npm install
npm link ../base
npm link ../ui-widgets
npm link ../hub-center-shared
npm link ../store
npm link ../message
npm link ../entity
npm link ../entity-store
npm link ../session-manager
npm link ../hub
npm link ../wfe

cd ../ui-widgets
npm install
bower --allow-root install
gulp build

cd ../ui-dev
npm install
npm link ../ui-widgets
bower --allow-root install
gulp build

cd ../ui-user
npm install
npm link ../ui-widgets
bower --allow-root install
gulp build
