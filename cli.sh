#!/bin/bash
network=development

if [ "$2" != "" ]; then
  network=$2
fi

if [ "$1" == "setup" ]; then
        truffle migrate --reset --network $network
        truffle exec ./src/cmd/setup.js --network $network
elif [ "$1" == "start" ]; then
        truffle exec ./src/cmd/start.js --network $network
else
        echo "Unkown command '$1'"
        echo "Usage: testimonium-evaluation <cmd> <network>"
        echo ""
        echo "Commands:"
        echo "   setup: setup smart contracts for evaluation"
        echo "   start: start evaluation"
        echo ""
        echo "Parameters:"
        echo "   network: specify blockchain network to use for evaluation (default: development)"
fi
