echo "check whether http-server has been installed to host documentation"
if ! type "http-server" > /dev/null; then
  echo "!!! Will install http-server first"
  npm install -g http-server
fi

echo "start doc server of app developer..."

http-server ./doc/html/app-dev -p 6400 -o

