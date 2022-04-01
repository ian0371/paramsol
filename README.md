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
- Clone `klaytn-deploy` and checkout to pr20 (`git fetch origin pull/20/head:pr-20 && git checkout pr-20`)
- Copy `conf.json.diff` from this repo to `klaytn-deploy` and run from `klaytn-deploy`: `cp conf.template.json conf.json && git apply conf.json.diff`
- Run `npm install`
- Run `npx hardhat compile`
- (optional) If you want, you can adjust `--params-contract-blocknumber` in `conf.json` for faster experiment. Note that the contract must exist beyond the block. Default is block #300.
- Run `1.create.sh`, `2-1.build.sh`, `2-2.genesis.sh`, `2-3.prepare.sh` from `klaytn-deploy`. DO NOT PROCEED MORE AND STOP AFTER RUNNING `2-3.prepare.sh`.
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

### Run
Before running klaytn-deploy instances, *be ready to run the following commands*.
If the block number set by `--params-contract-blocknumber` passes without deploying the contract, nodes will crash.
Run the rest of `klaytn-deploy` (i.e., `2-4.upload.sh`, `2-5.init.sh`, and `3.start.sh`) and type the commands after checking KEN works:
```bash
# top-up deploy account
$ npx hardhat faucet
# deploy GovParam.sol
$ npx hardhat deploy
address: 0xe0eCF71FdF7fA61b35F5a8EF04FCa81CE2cf07Aa
```
Make sure you have the *SAME* address on the screen as above, which is determined by the contract private key.

Try sending txs of different gas prices:
```bash
$ npx hardhat send --gasprice 25 --receiver 0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
Tx of gas price 25 sent at block 190
$ npx hardhat send --gasprice 750 --receiver 0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
(expected) failed while trying to send with gas price 750 at block 200
```

After the block number set by `--params-contract-blocknumber`, you can increase the gas price from 25 to 750 ston:

```bash
$ npx hardhat setp
setParam(activationBlock=328) done at block 319
```

Wait for 10 blocks to take effect.

```bash
$ npx hardhat send --gasprice 25 --receiver 0xcccccccccccccccccccccccccccccccccccccccc
(expected) failed while trying to send with gas price 25 at block 360
$ npx hardhat send --gasprice 750 --receiver 0xdddddddddddddddddddddddddddddddddddddddd
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
