//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GovParam is Ownable {
    address private voteContract;
    bool private updateValsVotable;
    mapping(uint => Param) private params;
    uint[] private paramIds;

    address[] private validators;

    // For quick lookup and array manipulation
    // 0: not validator, n: stored at validator[n-1]
    mapping(address => uint) private validatorIdx; 

    struct Param {
        string name;      // ex) "istanbul.epoch"
        bool   votable;   // true: owner&voter can change, false: only owner
        uint64 fromBlock; // block number for last change
        bytes  prevValue; // RLP encoded value before nextBlock
        bytes  nextValue; // RLP encoded value after nextBlock
    }

    // only for scheduledChanges()
    struct Changes {
        string name;
        uint64 blocknum;
        bytes  value;
    }

    event VoteContractUpdated(address);
    event VotableUpdated(bool);
    event ParamVotableUpdated(uint, bool);
    event SetParam(uint, string, bytes, uint64);
    event ValidatorAdded(address);
    event ValidatorRemoved(address);

    constructor(address _owner) {
        if (_owner != address(0)) {
            console.log("Transferring ownership to", _owner);
            transferOwnership(_owner);
        }
    }

    modifier onlyVotable(uint idx) {
        require(msg.sender == owner() || (params[idx].votable && msg.sender == voteContract), "permission denied");
        _;
    }
    
    function setVoteContract(address v) external
    onlyOwner {
        voteContract = v;
        emit VoteContractUpdated(voteContract);
    }

    function setUpdateValsVotable(bool flag) external
    onlyOwner {
        updateValsVotable = flag;
        emit VotableUpdated(updateValsVotable);
    }

    function addParam(uint id, string calldata _name, bool _votable, bytes calldata value) public
    onlyVotable(id) {
        require(bytes(_name).length > 0, "name cannot be empty");
        require(bytes(params[id].name).length == 0, "already existing id");
        params[id] = Param({
            name: _name,
            votable: _votable,
            fromBlock: 0, // or block.number
            prevValue: "",  // unused
            nextValue: value
        });
    }

    function setParamVotable(uint id, bool flag) external
    onlyOwner {
        params[id].votable = flag;
        emit ParamVotableUpdated(id, params[id].votable);
    }

    function setParam(uint id, bytes calldata value, uint64 _fromBlock) public 
    onlyVotable(id) {
        require(params[id].fromBlock < block.number, "already have a pending change");
        require(block.number < _fromBlock, "cannot set fromBlock to past");
        require(bytes(params[id].name).length > 0, "no such parameter");

        params[id].prevValue = params[id].nextValue;
        params[id].fromBlock = _fromBlock;
        params[id].nextValue = value;

        paramIds.push(id);

        emit SetParam(id, params[id].name, value, _fromBlock);
    }

    function getParam(uint id) external view returns (bytes memory) {
        if (block.number >= params[id].fromBlock) {
            return params[id].nextValue;
        }
        else {
            return params[id].prevValue;
        }
    }

    function scheduledChanges() external view returns (uint n, Changes[] memory) {
        Changes[] memory c = new Changes[](paramIds.length);
        uint cnt = 0;
        for (uint i = 0; i < paramIds.length; i++) {
            Param memory p = params[paramIds[i]];
            if (p.fromBlock > block.number) {
                Changes memory _c = Changes({
                    name: p.name,
                    blocknum: p.fromBlock,
                    value: p.nextValue
                });
                c[cnt] = _c;
                cnt++;
            }
        }
        return (cnt, c);
    }

    function addValidator(address v) public {
        require(msg.sender == owner() || (updateValsVotable && msg.sender == voteContract), "permission denied");
        require(validatorIdx[v] == 0, "validator already exists");
        validators.push(v);
        validatorIdx[v] = validators.length;
        emit ValidatorAdded(v);
    }

    function removeValidator(address v) public {
        require(msg.sender == owner() || (updateValsVotable && msg.sender == voteContract), "permission denied");
        require(validators.length > 1, "at least one validator required");
        require(validatorIdx[v] != 0, "no such validator");

        uint idx = validatorIdx[v] - 1;
        uint len = validators.length;

        // bring the last element of validators to the removing index
        if (idx != len - 1) {
            validators[idx] = validators[len-1];
            validatorIdx[validators[idx]] = idx + 1;
        }
        validatorIdx[v] = 0;
        validators.pop();
        emit ValidatorRemoved(v);
    }

    function getValidators() public view returns (address[] memory) {
        return validators;
    }
}
