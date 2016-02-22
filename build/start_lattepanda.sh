killall node

echo "start message broker ..."
./run_demo broker > broker.log &
sleep 3

echo "start center ..."
./run_demo center > center.log &
sleep 2

echo "start startkit hub ..."
./run_demo lattepanda > lattepanda.log &
sleep 10

echo "visit ip:8080 for develop, ip:3000 for ui view"