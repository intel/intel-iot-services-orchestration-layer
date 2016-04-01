# Fetch pre-build IoT SOL
Download the `dist.tar` from [http://somewebsite](http://somewebsite), then put it into Edison via sdcard or scp. 

## Start IoT SOL
 - untar the tarball: `tar xvf dist.tar`
 - run demo
```
 cd dist
 ./start_tankromeo.sh
```
Then you will see
```
start message broker ...
start center ...
start start tank with romeo ...
visit ip:8080 for develop, ip:3000 for ui view
```
