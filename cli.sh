#!/bin/bash
network=development

if [ "$2" != "" ]; then
  network=$2
fi

if [ "$1" == "deploy" ]; then
        truffle migrate --reset --network $network
elif [ "$1" == "setup" ]; then
        mkdir -p ./results/
        truffle exec ./src/cmd/setup.js --network $network
elif [ "$1" == "submission" ]; then
        # used to increase heap size of node (otherwise submission will abort after some time due to out of memory error)
        trufflePath=$(which truffle)
        node --max-old-space-size=8192 $trufflePath exec ./src/cmd/submission.js --network $network
elif [ "$1" == "dispute" ]; then
        truffle exec ./src/cmd/dispute.js --network $network
else
        echo "Unkown command '$1'"
        echo "Usage: testimonium-evaluation <cmd> <network>"
        echo ""
        echo "Commands:"
        echo "   deploy: deploy smart contracts for evaluation"
        echo "   setup:  setup smart contracts for evaluation"
        echo "   submission:  start evaluation of submission (and tx inclusion verification)"
        echo "   dispute:  start evaluation of dispute"
        echo ""
        echo "Parameters:"
        echo "   network: specify blockchain network to use for evaluation (default: development)"
fi
