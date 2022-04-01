const { expect } = require("chai");
const { ethers } = require("hardhat");
const _ = require("lodash");

const NOT_OWNER = 'Ownable: caller is not the owner';
const PERMISSION_DENIED = 'permission denied';
const EMPTYNAME_DENIED = 'name cannot be empty';
const EXISTING_PARAM = 'already existing id';
const NO_PARAM = 'no such parameter';
const ALREADY_PENDING = 'already have a pending change';
const ALREADY_PAST = 'cannot set fromBlock to past';
const ONE_VAL_REQUIRED = 'at least one validator required';
const VAL_ALREADY_EXIST = 'validator already exists';
const NO_VAL = 'no such validator';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

params = [
  {id: 0,  name: "governance.governancemode",     votable: false, before: /* single */"0x73696e676c65",                           after: /* ballot */"0x62616c6c6f74"},
  {id: 1,  name: "governance.governingnode",      votable: false, before: "0x52d41ca72af615a1ac3301b0a93efa222ecc7541",           after: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"},
  {id: 2,  name: "istanbul.epoch",                votable: false, before: /* 604800 */"0x093a80",                                 after: /* 86400 */ "0x015180"},
  {id: 3,  name: "istanbul.policy",               votable: false, before: "0x00",                                                 after: "0x01"},
  {id: 4,  name: "istanbul.committeesize",        votable: false, before: "0x01",                                                 after: "0x10"},
  {id: 5,  name: "governance.unitprice",          votable: false, before: /* 25 ston */"0x05d21dba00",                            after: /* 750 ston */"0xae9f7bcc00"},
  {id: 6,  name: "reward.mintingamount",          votable: false, before: /* 9 klay */"0x39303030303030303030303030303030303030", after: /* 4 klay */"0x34303030303030303030303030303030303030"},
  {id: 7,  name: "reward.ratio",                  votable: false, before: /* 34/54/12  */"0x33342f35342f3132",                    after: /*25/25/50*/"0x32352f32352f3530"},
  {id: 8,  name: "reward.useginicoeff",           votable: false, before: /* true */"0x01",                                       after: /* false */ "0x00"},
  {id: 9,  name: "reward.deferredtxfee",          votable: false, before: /* true */"0x01",                                       after: /* false */ "0x00"},
  {id: 10, name: "reward.minimumstake",           votable: false, before: /* 5 million */"0x35303030303030",                      after: /* 7 million */"0x37303030303030"},
  {id: 11, name: "reward.stakingupdateinterval",  votable: false, before: /* 86400 */"0x015180",                                  after: /* 3600 */"0x0e10"},
  {id: 12, name: "reward.proposerupdateinterval", votable: false, before: /* 3600 */"0x0e10",                                     after: /* 60 */"0x3c"},
];

async function getnow() {
  return parseInt(await hre.network.provider.send("eth_blockNumber"));
}

async function mineMoreBlocks(num) {
  mineblock = '0x' + num.toString(16);
  await hre.network.provider.send("hardhat_mine", [mineblock]);
  // due to bug, the next line is required (https://github.com/NomicFoundation/hardhat/issues/2467)
  await hre.network.provider.send('hardhat_setNextBlockBaseFeePerGas', ['0x0']);
}

describe("GovParam", function () {
  let accounts, addrs;
  let gp;
  let voteContract, nonvoter;

  beforeEach(async function () {
    accounts = await hre.ethers.getSigners();
    addrs = _.map(accounts, 'address');
    voteContract = accounts[1];
    nonvoter = accounts[2];
    const GovParam = await ethers.getContractFactory("GovParam");
    gp = await GovParam.deploy(addrs[0]);
    await gp.deployed();
  });

  describe("constructor", function () {
    it("Constructor success", async function () {
      const GovParam = await ethers.getContractFactory("GovParam");
      const gp = await GovParam.deploy(addrs[1]);
      await gp.deployed();

      expect(await gp.owner()).to.equal(addrs[1]);
    });
  });

  describe("addParam", function () {
    const param = {
      id:      13,
      name:    "custom.mynewparam",
      votable: false,
      val:     "0x41414141",
    };

    it("addParam success", async function () {
      await gp.addParam(param.id, param.name, param.votable, param.val);
      //p = await gp.getParam(param.id);
      //expect(p).to.equal(param.val);
    });

    it("addParam from non owner should fail", async function () {
      await expect(gp.connect(nonvoter).addParam(param.id, param.name, false, param.val))
        .to.be.revertedWith(NOT_OWNER);
    });

    it("addParam of empty name should fail", async function () {
      await expect(gp.addParam(param.id, "", false, param.val))
        .to.be.revertedWith(EMPTYNAME_DENIED);
    });

    it("addParam of existing param should fail", async function () {
      await gp.addParam(param.id, param.name, false, param.val);
      await expect(gp.addParam(param.id, param.name, false, param.val))
        .to.be.revertedWith(EXISTING_PARAM);
    });
  });

  describe("setParam", function () {
    let param = params[5];

    it("setParam success", async function () {
      now = await getnow();
      await expect(gp.setParam(param.id, param.after, now + 10000))
        .to.emit(gp, 'SetParam').withArgs(param.id, param.name, param.after, now + 10000);

      expect(await gp.getParam(param.id))
        .to.equal(param.before);

      await mineMoreBlocks(10000);
      expect(await gp.getParam(param.id))
        .to.equal(param.after);
    });

    it("setParam from voteContract should succeed when votable", async function () {
      await gp.setVoteContract(voteContract.address);
      await gp.setParamVotable(param.id, true);
      now = await getnow();
      await expect(gp.connect(voteContract).setParam(param.id, param.after, now + 100))
        .to.emit(gp, 'SetParam').withArgs(param.id, param.name, param.after, now + 100);
    });

    it("setParam from voteContract should fail when not votable", async function () {
      await gp.setVoteContract(voteContract.address);
      now = await getnow();
      await expect(gp.connect(voteContract).setParam(param.id, param.after, now + 100))
        .to.be.revertedWith(PERMISSION_DENIED);
    });

    it("setParam from nonvoter should fail", async function () {
      await gp.setParamVotable(param.id, true);
      await expect(gp.connect(nonvoter).setParam(param.id, param.after, 10000))
        .to.be.revertedWith(PERMISSION_DENIED);
    });

    it("setParam of nonexistent id should fail", async function () {
      now = await getnow();
      await expect(gp.setParam(100, param.after, now + 10000))
        .to.be.revertedWith(NO_PARAM);
    });

    it("setParam of existing pending change should fail", async function () {
      await gp.setParamVotable(param.id, true);
      now = await getnow();
      await gp.setParam(param.id, param.after, now + 10000);
      await expect(gp.setParam(param.id, param.after, now + 10000))
        .to.be.revertedWith(ALREADY_PENDING);
    });

    it("setParam of past block should fail", async function () {
      await gp.setParamVotable(param.id, true);
      now = await getnow();
      await expect(gp.setParam(param.id, param.after, now - 50))
        .to.be.revertedWith(ALREADY_PAST);
    });
  });

  describe("setParamVotable", function () {
    let param = params[5];
    it("setParamVotable success", async function () {
      await gp.setParamVotable(param.id, true);
      await gp.setParamVotable(param.id, false);
    });
  });

  describe("getAllParams", function () {
    it("getAllParams success", async function () {
      expected = _.map(params, i => ([ i.name, i.before ]));
      expect(await gp.getAllParams()).to.deep.equal(expected);
    });
  });

  describe("scheduledChanges", function () {
    it("scheduledChanges success", async function () {
      let expectedChanges = [];
      for (param of params) {
        now = await getnow();
        await expect(gp.setParam(param.id, param.after, now + 10000))
          .to.emit(gp, 'SetParam')
          .withArgs(param.id, param.name, param.after, now + 10000);
        obj = [
          param.name,
          ethers.BigNumber.from(now + 10000),
          param.after,
        ];
        obj.name = obj[0];
        obj.blocknum = obj[1];
        obj.value = obj[2];
        expectedChanges.push(obj);
      }

      for (param of params) {
        expect(await gp.getParam(param.id)).to.equal(param.before);
      }

      [len, changes] = await gp.scheduledChanges();
      expect(len).to.equal(params.length);
      expect(changes.slice(0, len)).to.deep.equal(expectedChanges.slice(0, len));

      await mineMoreBlocks(await getnow() + 10000);

      for (param of params) {
        p = await gp.getParam(param.id);
        expect(p).to.equal(param.after);
      }

      [len, changes] = await gp.scheduledChanges();
      expect(len).to.equal(0);
      expect(changes.slice(0, len)).to.deep.equal([]);
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
      await expect(gp.connect(voteContract).addValidator(addrs[1]))
        .to.emit(gp, 'ValidatorAdded').withArgs(addrs[1]);
      v = await gp.getValidators();
      expect(v).to.deep.equal([addrs[1]]);
    });

    it("addValidator from voteContract should fail when not votable", async function () {
      await gp.setVoteContract(voteContract.address);
      await gp.setUpdateValsVotable(false);
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
      let expectedAccounts = await hre.ethers.getSigners();
      expectedAccounts = _.map(expectedAccounts, 'address');

      for (addr of addrs) {
        await gp.addValidator(addr);
      }

      for (addr of [addrs[0], addrs[3], addrs[11]]) {
        await gp.removeValidator(addr);
        expectedAccounts = expectedRemoveValidator(expectedAccounts, addr);
        v = await gp.getValidators();
        expect(v).to.deep.equal(expectedAccounts);
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

    it("removeValidator success - 3", async function () {
      await gp.addValidator(addrs[0]);
      await gp.addValidator(addrs[1]);
      await expect(gp.removeValidator(addrs[0]))
        .to.emit(gp, 'ValidatorRemoved').withArgs(addrs[0]);
      v = await gp.getValidators();
      expect(v).to.deep.equal([addrs[1]]);
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

    it("removeValidator from voteContract should succeed when votable", async function () {
      await gp.setVoteContract(voteContract.address);
      await gp.setUpdateValsVotable(true);
      await gp.addValidator(addrs[0]);
      await gp.addValidator(addrs[1]);

      await expect(gp.connect(voteContract).removeValidator(addrs[1]))
        .to.emit(gp, 'ValidatorRemoved').withArgs(addrs[1]);
      v = await gp.getValidators();
      expect(v).to.deep.equal([addrs[0]]);
    });

    it("removeValidator from voteContract should fail when not votable", async function () {
      await gp.setVoteContract(voteContract.address);
      await gp.setUpdateValsVotable(false);
      await gp.addValidator(addrs[0]);
      await gp.addValidator(addrs[1]);

      await expect(gp.connect(voteContract).removeValidator(addrs[1]))
        .to.be.revertedWith(PERMISSION_DENIED);
    });
  });
});
