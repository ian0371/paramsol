//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GovParam is Ownable {
    address public voteContract;
    mapping(uint => Param) public params;
    uint[] public paramIds;

    struct Param {
        bytes32 name;      // ex) "istanbul.epoch"
        bool    votable;   // true: owner&voter can change, false: only owner
        uint64  fromBlock; // block number for last change
        bytes32 prevValue; // RLP encoded value before nextBlock
        bytes32 nextValue; // RLP encoded value after nextBlock
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
}
