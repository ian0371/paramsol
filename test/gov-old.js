const { expect } = require("chai");
const { ethers } = require("hardhat");

async function endVote() {
  console.log('mining blocks...')
  for (i = 0; i < 600; i++) {
    await hre.network.provider.request({
      method: "evm_mine",
      params: [],
    });
  }
}

describe("GovernanceContract", function () {
  let Gov, gov;
  let owner, addr1, addr2, addrs;
  let period = 300;

  const description = 'Change fee to 750';

  beforeEach(async function () {
    // Get the ContractFactory and Signers here.
    Gov = await ethers.getContractFactory("GovernanceContract");
    // addr1, addr2, ..., addrs[7] => voters
    // addrs[8], ... => delegators
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    // To deploy our contract, we just have to call Token.deploy() and await
    // for it to be deployed(), which happens once its transaction has been
    // mined.
    gov = await Gov.deploy();
    target = gov.address;
  });

  describe("propose", function () {
    it("Should succeed", async function () {

      ret = await expect(gov.connect(addr1).propose(period, "unitprice", 750, description, {
        value: web3.utils.toWei('500', 'ether')
      })).to.emit(gov, 'ProposalCreated');

      expect(await gov.proposalLen()).to.equal('1');
    });

    it("Should fail if proposer does not send 500 klay", async function () {
      await expect(
        gov.connect(addr1).propose(period, "unitprice", 750, description, {
        value: web3.utils.toWei('100', 'ether')
      })).to.be.revertedWith("not enough proposal fee");
    });

    it("Should succeed", async function () {
      await gov.connect(addr1).propose(period, "unitprice", 750, description, {
        value: web3.utils.toWei('500', 'ether')
      });
      expect(await gov.proposalLen()).to.equal('1');
    });
  });

  describe("vote", function () {
    beforeEach(async function () {
      await gov.connect(addr1).propose(period, "unitprice", 750, description, {
        value: web3.utils.toWei('500', 'ether')
      });
    });

    it("Should fail for non voters", async function () {
      await expect(
        gov.connect(owner).vote(0, 0)
      ).to.be.revertedWith("vote: already voted or not a voter");
    });

    it("Should succeed for voters", async function () {
      await gov.connect(addr1).vote(0, 0);
      let ret = await gov.getProposalInfo(0);
      [tally0, tally1] = [ret[1], ret[2]];
      expect(tally0).to.equal('200'); // delegated by addrs[8]
      expect(tally1).to.equal('0');

      await gov.connect(addrs[7]).vote(0, 1);
      ret = await gov.getProposalInfo(0);
      [tally0, tally1] = [ret[1], ret[2]];
      expect(tally0).to.equal('200'); // only self-delegated
      expect(tally1).to.equal('100');
    });

    it("Should fail on double vote", async function () {
      await gov.connect(addr1).vote(0, 0);
      let ret = await gov.getProposalInfo(0);
      [tally0, tally1] = [ret[1], ret[2]];
      expect(tally0).to.equal('200'); // delegated by addrs[8]
      expect(tally1).to.equal('0');

      await expect(
        gov.connect(addr1).vote(0, 0)
      ).to.be.revertedWith("vote: already voted or not a voter");
    });
  });

  describe("queue", function () {
    beforeEach(async function () {
      await gov.connect(addr1).propose(period, "unitprice", 750, description, {
        value: web3.utils.toWei('500', 'ether')
      });
      await gov.connect(addr1).vote(0, 0);
      await gov.connect(addr2).vote(0, 0);
      await endVote();
    });

    it("Should succeed for owner", async function () {
      await expect(gov.queue(0)).to.emit(gov, 'ProposalQueued').withArgs('0');
    });
  });

  describe("execute", function () {
    beforeEach(async function () {
      await gov.connect(addr1).propose(period, "unitprice", 750, description, {
        value: web3.utils.toWei('500', 'ether')
      });
      await gov.connect(addr1).vote(0, 0);
      await gov.connect(addr2).vote(0, 0);
      await endVote();
      await gov.queue(0);
    });

    it("Should succeed for owner", async function () {
      await expect(gov.execute(0)).to.emit(gov, 'ProposalExecuted');
      expect(await gov.getConfig('unitprice')).to.equal('750');
    });
  });
});
