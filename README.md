# paramsol

## Unit test
```
npx hardhat test
```

## Coverage test
```
npx hardhat coverage
```

## Klaytn-deploy
### Prerequisites
- Clone `klaytn-deploy` and checkout to pr20 (`git fetch origin pull/20/head:pr-20`)
- Patch using the following diff after copying `conf.template.json` to `conf.json` (you can adjust `--params-contract-blocknumber` for faster experiment):

```diff
--- conf.template.json	2022-03-30 16:45:56.000000000 +0900
+++ conf.json	2022-04-01 16:51:27.000000000 +0900
@@ -27,10 +27,10 @@
         "aidankwon/dev:go1.15.7-solc0.4.24"
 	],
       "git":{
-        "ref":"git@github.com:klaytn/klaytn.git",
-        "branch":"dev"
+        "ref":"git@github.com:blukat29/klaytn.git",
+        "branch":"gov/try3"
       },
-      "homiOption": "--baobab-test",
+      "homiOption": "--baobab-test --params-contract-address 0xe0eCF71FdF7fA61b35F5a8EF04FCa81CE2cf07Aa --params-contract-blocknumber 300",
       "_chaindata": "lumberjack",
       "_chaindata": "https://s3.ap-northeast-2.amazonaws.com/klaytn-chaindata/baobab/klaytn-baobab-chaindata-20200601010611.tar.gz",
       "overwriteGenesis": false
@@ -104,7 +104,7 @@
     },
     "PN": {
       "aws":{
-        "numNodes":4,
+        "numNodes":1,
         "instanceType":"m5.large",
         "userName":"ubuntu",
         "imageId":"ami-0b277531c0f0dd2e9",
@@ -120,7 +120,7 @@
     },
     "EN": {
       "aws":{
-        "numNodes":4,
+        "numNodes":1,
         "instanceType":"m5.large",
         "userName":"ubuntu",
         "imageId":"ami-0b277531c0f0dd2e9",
@@ -133,13 +133,13 @@
         "_NETWORK_ID": "",
         "_NO_DISCOVER": "0",
         "RPC_PORT":8551,
-        "RPC_API":"klay,personal",
+        "RPC_API":"db,klay,net,web3,miner,personal,txpool,debug,admin,istanbul,mainbridge,subbridge,eth",
         "DATA_DIR":"~/klaytn/data",
         "LOG_DIR":"~/klaytn/logs"
       }
     },
     "CNBN":{
-      "enabled":true,
+      "enabled":false,
       "discoveryPort":32323,
       "aws": {
         "numNodes":1,
@@ -156,7 +156,7 @@
       }
     },
     "BN":{
-      "enabled":true,
+      "enabled":false,
       "discoveryPort":32323,
       "aws": {
         "numNodes":1,
@@ -237,10 +237,10 @@
       }
     },
     "grafana":{
-      "enabled":true,
+      "enabled":false,
       "prometheusPort":61001,
       "aws": {
-        "numNodes":1,
+        "numNodes":0,
         "imageId":"ami-07d607e091494cbd8",
         "instanceType":"m5.large",
         "securityGroup": ["sg-0f0a2202b1603b972"],
@@ -249,7 +249,7 @@
       }
     },
     "locustMaster":{
-      "enabled":true,
+      "enabled":false,
       "performanceTest": {
         "noweb": false,
         "terminateInstancesAfterTest": false,
@@ -286,7 +286,7 @@
       }
     },
     "locustSlave": {
-      "enabled":true,
+      "enabled":false,
       "enabledEthTest": false,
       "_endpoints":["CN", "PN", "EN", "http://{IP}:{Port}"],
       "endpoints":["EN"],
```
- Run `1.create.sh`, `2-1.build.sh`, `2-2.genesis.sh`, `2-3.prepare.sh` from `klaytn-deploy`. DO NOT PROCEED MORE.
- Appropriately fill in the `<NAME>` in `hardhat.config.js`. A private key of a rich account can be found in `upload/CN0/keys/nodekey`. DO NOT change the contract private key, and DO NOT put multiple rich accounts.
```
  networks: {
    ...
    private: {
      url: "http://<KEN PUBLIC IP>:8551",
      ...
      accounts: [
        '<RICH ACCOUNT PRIVATE KEY>', // rich
        ...
      ],
    },
```

## Run
Before running klaytn-deploy instances, *be ready to run the following commands*.
If the block number set by `--params-contract-blocknumber` passes without deploying the contract, nodes will crash.
Run the rest of `klaytn-deploy` (i.e., `2-4`, `2-5`, and `3`) and type the commands after checking KEN works:
```
# top-up deploy account
$ npx hardhat faucet
# deploy GovParam.sol
$ npx hardhat deploy
address: 0xe0eCF71FdF7fA61b35F5a8EF04FCa81CE2cf07Aa
```
Make sure you have the *SAME* address on the screen, which is determined by the contract private key.

Try sending txs of different gas prices:
```bash
npx hardhat send --gasprice 25 --receiver 0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
Tx of gas price 25 sent at block 190
npx hardhat send --gasprice 750 --receiver 0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
(expected) failed while trying to send with gas price 750 at block 200
```

After the block number set by `--params-contract-blocknumber`, you can increase the gas price from 25 to 750 ston:

```bash
npx hardhat setp
setParam(activationBlock=328) done at block 319
```

Wait for 10 blocks to take effect.

```bash
npx hardhat send --gasprice 25 --receiver 0xcccccccccccccccccccccccccccccccccccccccc
(expected) failed while trying to send with gas price 25 at block 360
npx hardhat send --gasprice 750 --receiver 0xdddddddddddddddddddddddddddddddddddddddd
Tx of gas price 750 sent at block 361
```

Confirm that only addresses 0xaaa... and 0xddd... have more than 0 balances.
```bash
npx hardhat bal
0xaaaa...: BigNumber { value: "1000000000000000000" }
0xbbbb...: BigNumber { value: "0" }
0xcccc...: BigNumber { value: "0" }
0xdddd...: BigNumber { value: "1000000000000000000" }
```
