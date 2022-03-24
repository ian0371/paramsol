const { expect } = require("chai");
const { ethers } = require("hardhat");
const _ = require("lodash");

function encode(data) {
  let buf;
  if (typeof data === 'string') {
    if (data.startsWith('0x')) { // if data is address
      buf = Buffer.from(data.slice(2), 'hex');
    }
    else {
      buf = Buffer.from(data);
    }
  }
  else if (typeof data === 'number') {
    buf = ethers.utils.hexlify(data);
  }
  else if (typeof data === 'boolean') {
    buf = ethers.utils.hexlify(+data); // true->1, false->0
  }
  else {
    throw new Error(`unsupported data type: ${typeof data}, ${data}`);
  }
  return ethers.utils.RLP.encode(buf);
}

async function getnow() {
  return parseInt(await hre.network.provider.send("eth_blockNumber"));
}

params = [{
  name:    "istanbul.epoch",
  votable: true,
  before:  encode(604800),
  after:   encode(86400),
}, {
  name:    "governance.unitprice",
  votable: true,
  before:  encode('25000000000'),
  after:   encode('750000000000'),
}, {
  name:    "reward.ratio",
  votable: true,
  before:  encode('34/54/12'),
  after:   encode('20/30/50'),
}, {
  name:    "governance.governancemode",
  votable: true,
  before:  encode('single'),
  after:   encode('ballot'),
}, {
  name:    "governance.governingnode",
  votable: true,
  before:  encode('0x52d41ca72af615a1ac3301b0a93efa222ecc7541'),
  after:   encode('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'),
}, {
  name:    "reward.deferredtxfee",
  votable: true,
  before:  encode('true'),
  after:   encode('false'),
}, {
  name:    "reward.mintingamount",
  votable: true,
  before:  encode('9600000000000000000'),
  after:   encode('12000000000000000000'),
}];

describe("KlaytnGovernance", function () {
  let accounts, addrs;
  let gov, gp;
  let proposer, executer;
  
  beforeEach(async function () {
    accounts = await hre.ethers.getSigners();
    addrs = _.map(accounts, 'address');
    proposer = addrs[0];
    executer = addrs[0];

    const Timelock = await ethers.getContractFactory("TimelockController");
    const tl = await Timelock.deploy(30, [proposer], [executer]);
    await tl.deployed();

    const Gov = await ethers.getContractFactory("KlaytnGovernance");
    //gov = await upgrades.deployProxy(Gov, [tl.address]);
    gov = await Gov.deploy(tl.address);
    await gov.deployed();

    const GovParam = await ethers.getContractFactory("GovParam");
    gp = await GovParam.deploy(addrs[0]);
    await gp.deployed();
    gp.setVoteContract(gov.address);
  });

  describe("quorum", function () {
    it("quorum success", async function () {
      expect(await gov.quorum(1)).to.equal(web3.utils.toWei('1000000', 'ether'));
    });
  });

  describe("getVotes", function () {
    it("getVotes success", async function () {
      expect(await gov.getVotes(addrs[1], 0)).to.equal(web3.utils.toWei('100', 'ether'));
    });
  });

  describe("propose", function () {
    it("propose success", async function () {
      param = params[0];
      gp.addParam(0, param.name, true, encode('25000000000'));
      targets = [gp.address];
      values = [0];
      calldatas = [await gp.interface.encodeFunctionData("setParam", [0, encode("750000000000"), 10000])];
      desc = "Set gasPrice to 750 ston";
      deschash = ethers.utils.keccak256(Buffer.from(desc));
      now = getnow();
      id = await gov.hashProposal(targets, values, calldatas, deschash);
      console.log(id, addrs[0], targets, values, Array(targets.length), calldatas, now+1, now+604800, desc);
      await expect(gov.propose(targets, values, calldatas, desc))
        .to.emit(gov, 'ProposalCreated')
        .withArgs(id, addrs[0], targets, values, Array(targets.length), calldatas, now+1, now+604800, desc);
    });
  });
});
