killall node

echo "start message broker ..."
./run_demo broker > broker.log &
sleep 5

echo "start center ..."
./run_demo center > center.log &
sleep 5

echo "start mock hub ..."
./run_demo hub > mock_hub.log &
sleep 5

echo "visit ip:8080 for develop, ip:3000 for ui view"
