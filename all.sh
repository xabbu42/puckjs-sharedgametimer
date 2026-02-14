#!/bin/bash
espruino --list --scan-timeout 10 | grep -o 'Puck.js[^)]*' | sort | while read d; do  espruino -q -d "$d" --scan-timeout 10 "$@" | grep --color=always -E "$d|^"; done
