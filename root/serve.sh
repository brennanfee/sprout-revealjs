#!/usr/bin/env bash

uname=$(uname -s | tr '[:upper:]' '[:lower:]')
if [[ $uname == "darwin" ]]; then
    ./caddy/mac/caddy -conf ./caddyfile
elif [[ $uname == "linux" ]]; then
    ./caddy/linux/caddy -conf ./caddyfile
elif [[ $uname == "freebsd" ]]; then
    ./caddy/freebsd/caddy -conf ./caddyfile
elif [[ $uname == "openbsd" ]]; then
    ./caddy/openbsd/caddy -conf ./caddyfile
else
    echo -e "\033[31mUnable to determine operating system!\033[0;0;0m"
fi

unset uname
