const { expect } = require("chai");
const { ethers } = require("hardhat");
const _ = require("lodash");

const PERMISSION_DENIED = 'permission denied';
const EMPTYNAME_DENIED = 'name cannot be empty';
const EXISTING_PARAM = 'already existing id';
const NO_PARAM = 'no such parameter';
const ALREADY_PENDING = 'already have a pending change';
const ALREADY_PAST = 'cannot set fromBlock to past';
const ONE_VAL_REQUIRED = 'at least one validator required';
const VAL_ALREADY_EXIST = 'validator already exists';
const NO_VAL = 'no such validator';

function encode(data) {
  let buf;
  if (typeof data == 'string') {
    if (data.startsWith('0x')) { // if data is address
      buf = Buffer.from(data.slice(2), 'hex');
    }
    else {
      buf = Buffer.from(data);
    }
  }
  else if (typeof data == 'number') {
    buf = ethers.utils.hexlify(data);
  }
  else {
    console.log("unsupported data type:", typeof data, data);
    process.exit(1);
  }
  return ethers.utils.RLP.encode(buf).padEnd(66, '0');
}

async function getnow() {
  return parseInt(await hre.network.provider.send("eth_blockNumber"));
}

async function mineMoreBlocks(num) {
  mineblock = '0x' + num.toString(16);
  await hre.network.provider.send("hardhat_mine", [mineblock]);
}

params = [{
  name:    ethers.utils.formatBytes32String("istanbul.epoch"),
  votable: true,
  before:  encode(604800),
  after:   encode(86400),
}, {
  name:    ethers.utils.formatBytes32String("governance.unitprice"),
  votable: true,
  before:  encode('25000000000'),
  after:   encode('750000000000'),
}, {
  name:    ethers.utils.formatBytes32String("reward.ratio"),
  votable: true,
  before:  encode('34/54/12'),
  after:   encode('20/30/50'),
}, {
  name:    ethers.utils.formatBytes32String("governance.governancemode"),
  votable: true,
  before:  encode('single'),
  after:   encode('ballot'),
}, {
  name:    ethers.utils.formatBytes32String("governance.governingnode"),
  votable: true,
  before:  encode('0x52d41ca72af615a1ac3301b0a93efa222ecc7541'),
  after:   encode('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'),
}, {
  name:    ethers.utils.formatBytes32String("reward.deferredtxfee"),
  votable: true,
  before:  encode('true'),
  after:   encode('false'),
}, {
  name:    ethers.utils.formatBytes32String("reward.mintingamount"),
  votable: true,
  before:  encode('9600000000000000000'),
  after:   encode('12000000000000000000'),
}];

for ([i, param] of params.entries()) {
  param.id = i;
}

describe("GovParam", function () {
  let accounts, addrs;
  let gp;
  let voteContract, nonvoter;
  
  beforeEach(async function () {
    accounts = await hre.ethers.getSigners();
    addrs = _.map(accounts, 'address');
    voteContract = accounts[1];
    nonvoter = accounts[10];
    const GovParam = await ethers.getContractFactory("GovParam");
    gp = await GovParam.deploy(addrs[0]);
    await gp.deployed();
  });

  describe("constructor", function () {
    it("Constructor success", async function () {
      let GovParam = await ethers.getContractFactory("GovParam");
      let gp = await GovParam.deploy(addrs[1]);
      await gp.deployed();

      expect(await gp.owner()).to.equal(addrs[1]);
    });
  });

  describe("addParam", function () {
    it("addParam success", async function () {
      param = params[0];
      await gp.addParam(param.id, param.name, false, param.before);
      p = await gp.getParam(0);
      expect(p).to.equal(param.before);
    });

    it("addParam for nonvoter should fail", async function () {
      param = params[0];
      await expect(gp.connect(nonvoter).addParam(param.id, param.name, false, param.before))
        .to.be.revertedWith(PERMISSION_DENIED);
    });

    it("addParam for empty name should fail", async function () {
      param = params[0];
      await expect(gp.addParam(param.id, ethers.utils.formatBytes32String(""), false, param.before))
        .to.be.revertedWith(EMPTYNAME_DENIED);
    });

    it("addParam for existing param should fail", async function () {
      param = params[0];
      await gp.addParam(param.id, param.name, false, param.before);
      await expect(gp.addParam(param.id, param.name, false, param.before))
        .to.be.revertedWith(EXISTING_PARAM);
    });
  });

  describe("setParam", function () {
    it("setParam success", async function () {
      param = params[0];
      await gp.addParam(param.id, param.name, param.votable, param.before);

      now = await getnow();
      await gp.setParam(param.id, param.after, now + 10000);
      p = await gp.getParam(param.id);
      expect(p).to.equal(param.before);
      expect(p).to.emit(gp, 'SetParam').withArgs(param.id, param.name, param.after, now + 10000);

      await mineMoreBlocks(10000);
      p = await gp.getParam(param.id);
      expect(p).to.equal(param.after);
    });
    
    it("setParam from voteContract should succeed when votable", async function () {
      param = params[0];
      await gp.setVoteContract(voteContract.address);
      await gp.addParam(param.id, param.name, param.votable, param.before);

      now = await getnow();
      expect(await gp.connect(voteContract).setParam(param.id, param.after, now + 100))
        .to.emit(gp, 'SetParam').withArgs(param.id, param.name, param.after, now + 100);
    });

    it("setParam from voteContract should fail when not votable", async function () {
      param = params[0];
      await gp.setVoteContract(voteContract.address);
      await gp.addParam(param.id, param.name, false, param.before);

      now = await getnow();
      await expect(gp.connect(voteContract).setParam(param.id, param.after, now + 100))
        .to.be.revertedWith(PERMISSION_DENIED);
    });

    it("setParam for nonvoter should fail", async function () {
      param = params[0];
      await expect(gp.connect(nonvoter).setParam(param.id, param.after, 10000))
        .to.be.revertedWith(PERMISSION_DENIED);
    });

    it("setParam for nonexistent id should fail", async function () {
      param = params[0];
      now = await getnow();
      await expect(gp.setParam(100, param.after, now + 10000))
        .to.be.revertedWith(NO_PARAM);
    });

    it("setParam for existing pending change should fail", async function () {
      param = params[0];
      await gp.addParam(param.id, param.name, param.votable, param.before);

      now = await getnow();
      await gp.setParam(param.id, param.after, now + 10000);
      await expect(gp.setParam(param.id, param.after, now + 10000))
        .to.be.revertedWith(ALREADY_PENDING);
    });
    
    it("setParam for past block should fail", async function () {
      param = params[0];
      await gp.addParam(param.id, param.name, param.votable, param.before);

      now = await getnow();
      await expect(gp.setParam(param.id, param.after, now - 50))
        .to.be.revertedWith(ALREADY_PAST);
    });
  });

  describe("scheduledChanges", function () {
    it("scheduledChanges success", async function () {
      for (param of params) {
        await gp.addParam(param.id, param.name, param.votable, param.before);
      }

      for (param of params) {
        now = await getnow();
        p = await gp.setParam(param.id, param.after, now + 10000);
        expect(p).to.emit(gp, 'SetParam').withArgs(param.id, param.name, after, now + 10000);
      }

      for (param of params) {
        p = await gp.getParam(param.id);
        expect(p).to.equal(param.before);
      }

      p = await gp.scheduledChanges();
      expect(p[0]).to.equal(params.length);

      await mineMoreBlocks(await getnow() + 10000);

      for (param of params) {
        p = await gp.getParam(param.id);
        expect(p).to.equal(param.after);
      }

      p = await gp.scheduledChanges();
      expect(p[0]).to.equal(0);
    });
  });

  describe("addValidator", function () {
    it("addValidator success", async function () {
      for (addr of addrs) {
        await gp.addValidator(addr);
      }
      v = await gp.getValidators();
      expect(v.length).to.equal(addrs.length);
    });

    it("addValidator from nonvoter should fail", async function () {
      await expect(gp.connect(nonvoter).addValidator(addrs[1]))
        .to.be.revertedWith(PERMISSION_DENIED);
    });

    it("addValidator from voteContract should succeed when votable", async function () {
      await gp.setVoteContract(voteContract.address);
      await gp.setUpdateValsVotable(true);
      expect(await gp.connect(voteContract).addValidator(addrs[1]))
        .to.emit(gp, 'ValidatorAdded').withArgs(addrs[1]);
      v = await gp.getValidators();
      expect(v).to.deep.equal([addrs[1]]);
    });

    it("addValidator from voteContract should fail when not votable", async function () {
      await gp.setVoteContract(voteContract.address);
      await expect(gp.connect(voteContract).addValidator(addrs[0]))
        .to.be.revertedWith(PERMISSION_DENIED);
    });

    it("addValidator should fail if validator exists", async function () {
      gp.addValidator(addrs[0]);
      await expect(gp.addValidator(addrs[0]))
        .to.be.revertedWith(VAL_ALREADY_EXIST);
    });
  });

  describe("removeValidator", function () {
    function expectedRemoveValidator(arr, addr) {
      idx = arr.indexOf(addr);
      elem = arr.pop();
      arr[idx] = elem;
      return arr;
    }

    it("removeValidator success", async function () {
      var var_accounts = await hre.ethers.getSigners();
      var_accounts = _.map(var_accounts, 'address');

      for (addr of addrs) {
        await gp.addValidator(addr);
      }

      for (addr of [addrs[0], addrs[3], addrs[11]]) {
        await gp.removeValidator(addr);
        var_accounts = expectedRemoveValidator(var_accounts, addr);
        v = await gp.getValidators();
        expect(v).to.deep.equal(var_accounts);
      }
    });

    it("removeValidator success - 2", async function () {
      await gp.addValidator(addrs[0]);
      await gp.addValidator(addrs[1]);
      await expect(gp.removeValidator(addrs[1]))
        .to.emit(gp, 'ValidatorRemoved').withArgs(addrs[1]);
      v = await gp.getValidators();
      expect(v).to.deep.equal([addrs[0]]);
    });

    it("removeValidator from nonvoter should fail", async function () {
      await expect(gp.connect(nonvoter).removeValidator(addrs[1]))
        .to.be.revertedWith(PERMISSION_DENIED);
    });

    it("removeValidator should fail for removing the last validator", async function () {
      await gp.addValidator(addrs[0]);

      await expect(gp.removeValidator(addrs[0]))
        .to.be.revertedWith(ONE_VAL_REQUIRED);
    });

    it("removeValidator should fail for nonexistent address", async function () {
      await gp.addValidator(addrs[0]);
      await gp.addValidator(addrs[1]);

      await expect(gp.removeValidator(addrs[2]))
        .to.be.revertedWith(NO_VAL);
    });

    /*
    it("removeValidator from voter should succeed when votable", async function () {
      await gp.setVoteContract(voteContract.address);
      await gp.setUpdateValsVotable(true);
      await gp.addValidator(addrs[0]);
      await gp.addValidator(addrs[1]);

      await expect(gp.connect(voteContract).removeValidator(addrs[1]))
        .to.emit(gp, 'ValidatorRemoved').withArgs(addrs[1]);
    });*/
  });
});
