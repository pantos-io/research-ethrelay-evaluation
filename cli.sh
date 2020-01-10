#!/usr/bin/env sh
if [ "$1" == "setup" ]; then
        truffle migrate --reset
        truffle exec ./src/cmd/setup.js
elif [ "$1" == "start" ]; then
        truffle exec ./src/cmd/start.js
else
        echo "Unkown command '$1'"
        echo "Usage: testimonium-evaluation <cmd>"
        echo ""
        echo "Commands:"
        echo "   setup: setup smart contracts for evaluation"
        echo "   start: start evaluation"
fi
