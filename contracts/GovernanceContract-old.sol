pragma solidity ^0.8.11;

import "hardhat/console.sol";

contract GovernanceContract {
    function proposalMaxOperations() public pure returns (uint) { return 10; } // 10 actions

    struct Proposal {
        address proposer;
        mapping(address => Voter) voterMap;

        string key; // key to be updated
        uint val;   // value to be updated

        uint eta;

        /// @notice The block at which voting begins: holders must delegate their votes prior to this block
        uint startBlock;

        /// @notice The block at which voting ends: votes must be cast prior to this block
        uint endBlock;

        /// @notice Current number of votes in favor of this proposal
        uint forVotes;

        /// @notice Current number of votes in opposition to this proposal
        uint againstVotes;

        /// @notice Flag marking whether the proposal has been canceled
        bool canceled;

        /// @notice Flag marking whether the proposal has been executed
        bool executed;
    }

    struct Voter {
        uint weight; // weight is accumulated by delegation. reamining weight.
    }

    Proposal[] proposalList;

    address constant admin = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;

    address[19] voters = [
        // voters
        0x70997970C51812dc3A010C7d01b50e0d17dc79C8,
        0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC,
        0x90F79bf6EB2c4f870365E785982E1f101E93b906,
        0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65,
        0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc,
        0x976EA74026E726554dB657fA54763abd0C3a0aa9,
        0x14dC79964da2C08b23698B3D3cc7Ca32193d9955,
        0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f,
        0xa0Ee7A142d267C1f36714E4a8F75612F20a79720,
        0xBcd4042DE499D14e55001CcbB24a551F3b954096,

        // delegators
        0x71bE63f3384f5fb98995898A86B02Fb2426c5788,
        0xFABB0ac9d68B0B445fB7357272Ff202C5651694a,
        0x1CBd3b2770909D4e10f157cABC84C7264073C9Ec,
        0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097,
        0xcd3B766CCDd6AE721141F452C550Ca635964ce71,
        0x2546BcD3c84621e976D8185a91A922aE77ECEc30,
        0xbDA5747bFD65F08deb54cb465eB87D40e51B197E,
        0xdD2FD4581271e230360230F9337D5c0430Bf44C0,
        0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199
    ];

    uint public proposalFee = 1 * 1e9;
    uint constant grace_period = 7 days;

    mapping(string => uint) configs;

    enum ProposalState {
        Pending,
        Active,
        Canceled,
        Defeated,
        Succeeded,
        Queued,
        Expired,
        Executed
    }

    event ProposalCreated(uint, address, uint, uint, string);
    event ProposalQueued(uint);
    event ProposalExecuted(uint);

    constructor() public {
        configs["useginicoeff"] = 1;
        configs["unitprice"] = 25;
    }

    function getAddressListFromAddressBook() private returns (address[] memory) {
        // to-be: fetch from AddressBook.call()
        // 8>------------------------ STUB ---------------------------
        address[] memory a = new address[](voters.length);
        for (uint i = 0; i < voters.length; i++) {
            a[i] = voters[i];
        }
        return a;
    }

    function checkVoterAddr(address addr) private returns (bool) {
        // to-be: fetch from CnStakingVote.call() with try-catch
        // 8>------------------------ STUB ---------------------------
        for (uint i = 0; i < voters.length; i++) {
            if (voters[i] == addr) {
                return true;
            }
        }
        return false;
    }

    function getBalance(address addr) private returns (uint) {
        // to-be: fetch from CnStakingVote.call()
        // 8>------------------------ STUB ---------------------------
        for (uint i = 0; i < voters.length; i++) {
            if (voters[i] == addr) {
                return 100;
            }
        }

        return 0;
    }

    function getDelegatee(address addr) private returns (address) {
        // to-be: fetch from CnStakingVote.call()
        // 8>------------------------ STUB ---------------------------
        address ret = address(0x0);
        for (uint i = 0; i < voters.length; i++) {
            if (voters[i] == addr) {
                if (i < 10) {
                    ret = voters[i];
                }
                else {
                    ret = voters[i - 10];
                }
            }
        }
        require(checkVoterAddr(ret), "cannot delegate to a non-voter");
        return ret;
    }

    function vpSnapshot(uint idx) private {
        /*
           to-be:
           - Fetch all CnStaking addresses from AddressBook
           - Filter CnStakingVote by viewing data from the contract
           - for each contract in CnStakingVoteList:
                if contract is voter:
                    voter = new Voter;
                    voter.weight = contract.balance;
                    proposal[pid].voterList.push(voter);
                    for each admin in contract.adminList:
                       admin address => voter;

                else if contract is delegator:
                    find voter from delegator.delegateAddr;
                    voter.weight += delegator.weight;
         */

        // 8>------------------------ STUB ---------------------------
        require(idx < proposalList.length, "snapshot: not a valid proposal idx");

        address[] memory abookAddressList = getAddressListFromAddressBook();
        for (uint i = 0; i < abookAddressList.length; i++) {
            address cnStakeAddr = abookAddressList[i];

            if (checkVoterAddr(cnStakeAddr)) {
                address delegatee = getDelegatee(cnStakeAddr);
                if (delegatee == address(0)) {
                    // TODO: test not designated
                    continue;
                }

                uint weight = getBalance(cnStakeAddr);
                proposalList[idx].voterMap[delegatee].weight += weight;
            }
        }
    }

    function propose(uint period, string memory key, uint val, string memory description) public payable returns (uint) {
        require(msg.value >= proposalFee, "propose: not enough proposal fee");

        Proposal storage p = proposalList.push();
        uint id = proposalList.length - 1;

        uint startBlock = block.number + 1;
        uint endBlock = startBlock + period;

        p.proposer = msg.sender;
        p.key = key;
        p.val = val;
        p.startBlock = startBlock;
        p.endBlock = endBlock;

        vpSnapshot(id);
        emit ProposalCreated(id, p.proposer, startBlock, endBlock, description);
        return id;
    }

    function vote(uint idx, uint choice) public {
        require(proposalList[idx].voterMap[msg.sender].weight != 0, "vote: already voted or not a voter");
        require(choice < 2, "vote: not a valid choice");
        require(block.number < proposalList[idx].endBlock, "vote: voting period has passed");

        if (choice == 0) {
            proposalList[idx].forVotes += proposalList[idx].voterMap[msg.sender].weight;
        }
        else {
            proposalList[idx].againstVotes += proposalList[idx].voterMap[msg.sender].weight;
        }

        proposalList[idx].voterMap[msg.sender].weight = 0;
    }

    function queue(uint idx) public {
        require(state(idx) == ProposalState.Succeeded, "queue: proposal can only be queued if it is succeeded");
        require(msg.sender == admin, "queue: only admin can queue");
        proposalList[idx].eta = 1;
        emit ProposalQueued(idx);
    }

    function execute(uint idx) public {
        require(state(idx) == ProposalState.Queued, "execute: proposal can only be executed if it is queued");
        require(msg.sender == admin, "execute: only admin can execute");
        Proposal storage p = proposalList[idx];
        configs[p.key] = p.val;
        p.executed = true;
        emit ProposalExecuted(idx);
    }

    function proposalLen() external view returns (uint) {
        return proposalList.length;
    }

    function getProposalInfo(uint idx) external view returns (address, uint, uint) {
        require(idx < proposalList.length);

        return (proposalList[idx].proposer, proposalList[idx].forVotes, proposalList[idx].againstVotes);
    }

    function state(uint idx) public view returns (ProposalState) {
        require(0 <= idx && idx < proposalList.length, "state: invalid proposal id");
        Proposal storage proposal = proposalList[idx];
        if (proposal.canceled) {
            return ProposalState.Canceled;
        } else if (block.number <= proposal.startBlock) {
            return ProposalState.Pending;
        } else if (block.number <= proposal.endBlock) {
            return ProposalState.Active;
        } else if (proposal.forVotes + 1000 <= proposal.againstVotes) {
            return ProposalState.Defeated;
        } else if (proposal.eta == 0) {
            return ProposalState.Succeeded;
        } else if (proposal.executed) {
            return ProposalState.Executed;
        } else if (block.number >= proposal.eta + grace_period) {
            return ProposalState.Expired;
        } else {
            return ProposalState.Queued;
        }
    }

    function getConfig(string calldata key) external view returns (uint) {
        return configs[key];
    }
}
