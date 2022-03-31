#!/bin/bash

# IMPORTANT: set governance.blockno=20 in genesis

now() {
    curl -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"klay_blockNumber","id":1}' http://192.168.0.25:8551
}

now
npx hardhat faucet
sleep 2

npx hardhat deploy
sleep 2

npx hardhat setp
sleep 2

npx hardhat sched
npx hardhat send --gasprice 25 --receiver 0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
npx hardhat send --gasprice 750 --receiver 0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
echo 'sleep 15'
sleep 15

npx hardhat send --gasprice 25 --receiver 0xcccccccccccccccccccccccccccccccccccccccc
npx hardhat send --gasprice 750 --receiver 0xdddddddddddddddddddddddddddddddddddddddd
sleep 2

npx hardhat bal
