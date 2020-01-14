#!/usr/bin/env sh

mkdir -p ~/.local/share/io.parity.ethereum/docker/
docker run -d \
--name parity \
-v ~/.local/share/io.parity.ethereum/docker/:/home/parity/.local/share/io.parity.ethereum/ \
-p 8545:8545 \
-p 8546:8546 \
-p 8180:8180 \
-p 30303:30303 \
-p 30303:30303/udp \
parity/parity \
--chain dev \
--ui-interface all \
--jsonrpc-interface all \
--base-path /home/parity/.local/share/io.parity.ethereum/
