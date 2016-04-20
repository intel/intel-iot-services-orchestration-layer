
echo "killing all existing node.js process ..."
case "$(uname -s)" in

   CYGWIN*|MINGW*|MSYS*)
     cmd.exe /c "taskkill /f /im node.exe 2>nul"
     ;;

   *)
     killall node 2>/dev/null
     ;;
esac

echo "start message broker ..."
./run_demo broker > broker.log &
sleep 5

echo "start center ..."
./run_demo center > center.log &
sleep 5

echo "start mock hub_a ..."
./run_demo hub > mock_hub.log &
echo "start mock hub_b ..."
./run_demo hub_b > mock_hub_b.log &
sleep 5

echo "visit ip:8080 for develop, ip:3000 for ui view"
