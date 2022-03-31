require("dotenv").config();

require("@nomiclabs/hardhat-web3");
require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-waffle");
require("hardhat-gas-reporter");
require("solidity-coverage");
require('@openzeppelin/hardhat-upgrades');

const _ = require("lodash");

addr = '0xe0eCF71FdF7fA61b35F5a8EF04FCa81CE2cf07Aa';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function now() {
  return parseInt(await hre.network.provider.send("eth_blockNumber"));
}

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

task("rawtx", "Print raw tx", async (taskArgs, hre) => {
  accounts = await hre.ethers.getSigners();
  addrs = _.map(accounts, 'address');
  const GovParam = await ethers.getContractFactory("GovParam");
  //console.log(GovParam.bytecode);
  const gp = await GovParam.deploy(addrs[0]);
  console.log(gp.deployTransaction.data);
  await gp.deployed();
});

task("faucet", "faucet contract deployer", async (taskArgs, hre) => {
  const [rich, contractDeployer] = await hre.ethers.getSigners();
  await rich.sendTransaction({
    to: contractDeployer.address,
    value: ethers.utils.parseEther("100"),
  });
});

task("deploy", "deploy GovParam", async (taskArgs, hre) => {
  const GovParam = await ethers.getContractFactory("GovParam");
  const [rich, contractDeployer] = await hre.ethers.getSigners();
  bal = await ethers.provider.getBalance(contractDeployer.address);
  if (bal.lt(ethers.BigNumber.from('100000000000'))) {
    console.log("run faucet first");
    return;
  }
  const gp = await GovParam.connect(contractDeployer).deploy(rich.address);
  console.log('address:', await gp.address);
  console.log('owner:', await gp.owner());
});

task("gap", "getAllParams()", async (taskArgs, hre) => {
  const GovParam = await ethers.getContractFactory("GovParam");
  const [rich, contractDeployer] = await hre.ethers.getSigners();
  const gp = await GovParam.attach(addr);
  ret = await gp.getAllParams();
  console.log(ret);
});

task("setp", "setParam()", async (taskArgs, hre) => {
  const GovParam = await ethers.getContractFactory("GovParam");
  const [rich, contractDeployer] = await hre.ethers.getSigners();
  const gp = await GovParam.attach(addr);
  block = await now() + 10;
  await gp.setParam(5, '0xae9f7bcc00', block);
  console.log(`setParam(activationBlock=${block}) done at block ${await now()}`);
});

task("sched", "scheduledChanges()", async (taskArgs, hre) => {
  const GovParam = await ethers.getContractFactory("GovParam");
  const [rich, contractDeployer] = await hre.ethers.getSigners();
  const gp = await GovParam.attach(addr);
  ret = await gp.scheduledChanges();
  len = ret[0].toNumber();
  console.log(ret[1].slice(0, len)[0]);
});

task("send", "Send a tx with gas price 25 ston")
  .addParam("gasprice", "gasprice in ston")
  .addParam("receiver", "receiver address")
  .setAction(async ({ gasprice, receiver }) => {
    const [rich, contractDeployer] = await hre.ethers.getSigners();

    try {
      await rich.sendTransaction({
        to: receiver,
        value: ethers.utils.parseEther("1"),
        gasPrice: web3.utils.toHex(web3.utils.toWei(gasprice, 'gwei')),
      });
      await sleep(1000);
      console.log(`Tx of gas price ${gasprice} sent at block ${await now()}`);
    }
    catch(e) {
      console.log(`(expected) failed while trying to send with gas price ${gasprice} at block ${await now()}`);
    }
  });

task("bal", "get balances", async (taskArgs, hre) => {
  bal = await ethers.provider.getBalance('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  console.log('0xaaaa:', bal);
  bal = await ethers.provider.getBalance('0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
  console.log('0xbbbb:', bal);
  bal = await ethers.provider.getBalance('0xcccccccccccccccccccccccccccccccccccccccc');
  console.log('0xcccc:', bal);
  bal = await ethers.provider.getBalance('0xdddddddddddddddddddddddddddddddddddddddd');
  console.log('0xdddd:', bal);
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    version: '0.8.4',
    settings: {
      optimizer: {
        enabled: true,
      }
    }
  },
  defaultNetwork: "private",
  networks: {
    ropsten: {
      url: process.env.ROPSTEN_URL || "",
      accounts:
      process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    private: {
      url: "http://192.168.0.25:8551",
      chainId: 2019,
      gas: 80000000,
      gasPrice: 25000000000,
      accounts: [
        'abd77df35994bcd9ed832d8c6b9f7e81860e73854eb2edd90a2816808130fecb', // rich
        '394b15356a2f0692a47c7318cf820e97b4898d478356a33ec49d10f7b99635aa', // contract
      ],
    },
    public_baobab: {
      url: "https://api.baobab.klaytn.net:8651",
      chainId: 1001,
      gas: 80000000,
      gasPrice: 750000000000,
      accounts: [
        'a096c4a53006d28320e738f29ba810f72413b14d3b4ec27597977c5f995a5b8a', // rich
        '394b15356a2f0692a47c7318cf820e97b4898d478356a33ec49d10f7b99635aa', // contract
      ],
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
