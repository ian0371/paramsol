//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GovParam is Ownable {
    address public voteContract;
    mapping(uint => Param) public params;
    uint[] public paramIds;

    struct Param {
        string  name;        // ex) "istanbul.epoch"
        bool    votable;     // true: owner&voter can change, false: only owner
        uint64  fromBlock;   // block number for last change
        bytes   prevValue;   // RLP encoded value before nextBlock
        bytes   nextValue;   // RLP encoded value after nextBlock
    }

    event SetParam(uint, string, bytes, uint64);

    constructor(address _owner) {
        if (_owner != address(0)) {
            console.log("Transferring ownership to", _owner);
            transferOwnership(_owner);
        }
    }

    function addParam(uint id, string calldata _name, bool _votable, bytes calldata value) public {
        params[id] = Param({
            name: _name,
            votable: _votable,
            fromBlock: 0, // or block.number
            prevValue: "",  // unused
            nextValue: value
        });
    }

    function setParam(uint id, bytes calldata value, uint64 _fromBlock) public {
        require(params[id].fromBlock < block.number, "already have a pending change");
        require(bytes(params[id].name).length > 0, "no such parameter");

        params[id].prevValue = params[id].nextValue;
        params[id].fromBlock = _fromBlock;
        params[id].nextValue = value;

        emit SetParam(id, params[id].name, value, _fromBlock);
    }

    function getParam(uint id) external view returns (bytes memory) {
        console.log('now:',block.number);
        if (block.number >= params[id].fromBlock) {
            return params[id].nextValue;
        }
        else {
            return params[id].prevValue;
        }
    }
}
