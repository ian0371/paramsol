//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GovParam is Ownable {
    address public voteContract;
    mapping(uint => Param) public params;
    uint[] public paramIds;

    address[] validators;

    // For quick lookup and array manipulation
    // 0: not validator, n: stored at validator[n-1]
    mapping(address => uint) validatorIdx; 

    struct Param {
        bytes32 name;      // ex) "istanbul.epoch"
        bool    votable;   // true: owner&voter can change, false: only owner
        uint64  fromBlock; // block number for last change
        bytes32 prevValue; // RLP encoded value before nextBlock
        bytes32 nextValue; // RLP encoded value after nextBlock
    }

    // only for scheduledChanges()
    struct Changes {
        bytes32 name;
        uint64  blocknum;
        bytes32 value;
    }

    event SetParam(uint, bytes32, bytes32, uint64);

    constructor(address _owner) {
        if (_owner != address(0)) {
            console.log("Transferring ownership to", _owner);
            transferOwnership(_owner);
        }
    }

    function addParam(uint id, bytes32 _name, bool _votable, bytes32 value) public {
        require(params[id].name == bytes32(0), "already existing id");
        params[id] = Param({
            name: _name,
            votable: _votable,
            fromBlock: 0, // or block.number
            prevValue: "",  // unused
            nextValue: value
        });
    }

    function setParam(uint id, bytes32 value, uint64 _fromBlock) public {
        require(params[id].fromBlock < block.number, "already have a pending change");
        require(params[id].name != bytes32(0), "no such parameter");

        params[id].prevValue = params[id].nextValue;
        params[id].fromBlock = _fromBlock;
        params[id].nextValue = value;

        paramIds.push(id);

        emit SetParam(id, params[id].name, value, _fromBlock);
    }

    function getParam(uint id) external view returns (bytes32) {
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
        validators.push(v);
        validatorIdx[v] = validators.length;
    }

    function removeValidator(address v) public {
        require(validators.length > 1, "removeValidator rejected since otherwise #val will become zero");

        uint idx = validatorIdx[v] - 1;
        uint len = validators.length;
        validators[idx] = validators[len-1];
        validators.pop();
        validatorIdx[v] = 0;
        validatorIdx[validators[idx]] = idx + 1;
    }

    function getValidators() public view returns (address[] memory) {
        return validators;
    }
}
