/**
 *Submitted for verification at Etherscan.io on 2020-01-29
 */
pragma solidity ^0.5.0;

import {Ownable} from "./Ownable.sol";
import {StringUtils} from "../libarary/StringUtils.sol";
import {BaseRegistrar} from "./BaseRegistrar.sol";
import {PriceOracle} from "../interface/PriceOracle.sol";
import {Resolver} from "../interface/Resolver.sol";

contract ETHRegistrarController is Ownable {
    using StringUtils for *;

    uint256 public constant MIN_REGISTRATION_DURATION = 28 days;

    bytes4 private constant INTERFACE_META_ID =
        bytes4(keccak256("supportsInterface(bytes4)"));
    bytes4 private constant COMMITMENT_CONTROLLER_ID =
        bytes4(
            keccak256("rentPrice(string,uint256)") ^
                keccak256("available(string)") ^
                keccak256("makeCommitment(string,address,bytes32)") ^
                keccak256("commit(bytes32)") ^
                keccak256("register(string,address,uint256,bytes32)") ^
                keccak256("renew(string,uint256)")
        );

    bytes4 private constant COMMITMENT_WITH_CONFIG_CONTROLLER_ID =
        bytes4(
            keccak256(
                "registerWithConfig(string,address,uint256,bytes32,address,address)"
            ) ^
                keccak256(
                    "makeCommitmentWithConfig(string,address,bytes32,address,address)"
                )
        );

    BaseRegistrar base;
    PriceOracle prices;
    uint256 public minCommitmentAge;
    uint256 public maxCommitmentAge;

    mapping(bytes32 => uint256) public commitments;

    event NameRegistered(
        string name,
        bytes32 indexed label,
        address indexed owner,
        uint256 cost,
        uint256 expires
    );
    event NameRenewed(
        string name,
        bytes32 indexed label,
        uint256 cost,
        uint256 expires
    );
    event NewPriceOracle(address indexed oracle);

    constructor(
        BaseRegistrar _base,
        PriceOracle _prices,
        uint256 _minCommitmentAge,
        uint256 _maxCommitmentAge
    ) public {
        require(_maxCommitmentAge > _minCommitmentAge);

        base = _base;
        prices = _prices;
        minCommitmentAge = _minCommitmentAge;
        maxCommitmentAge = _maxCommitmentAge;
    }

    function rentPrice(string memory name, uint256 duration)
        public
        view
        returns (uint256)
    {
        bytes32 hash = keccak256(bytes(name));
        return prices.price(name, base.nameExpires(uint256(hash)), duration);
    }

    function valid(string memory name) public pure returns (bool) {
        return name.strlen() >= 3;
    }

    function available(string memory name) public view returns (bool) {
        bytes32 label = keccak256(bytes(name));
        return valid(name) && base.available(uint256(label));
    }

    function makeCommitment(
        string memory name,
        address owner,
        bytes32 secret
    ) public pure returns (bytes32) {
        return
            makeCommitmentWithConfig(
                name,
                owner,
                secret,
                address(0),
                address(0)
            );
    }

    function makeCommitmentWithConfig(
        string memory name,
        address owner,
        bytes32 secret,
        address resolver,
        address addr
    ) public pure returns (bytes32) {
        bytes32 label = keccak256(bytes(name));
        if (resolver == address(0) && addr == address(0)) {
            return keccak256(abi.encodePacked(label, owner, secret));
        }
        require(resolver != address(0));
        return
            keccak256(abi.encodePacked(label, owner, resolver, addr, secret));
    }

    function commit(bytes32 commitment) public {
        require(commitments[commitment] + maxCommitmentAge < now);
        commitments[commitment] = now;
    }

    function register(
        string calldata name,
        address owner,
        uint256 duration,
        bytes32 secret
    ) external payable {
        registerWithConfig(
            name,
            owner,
            duration,
            secret,
            address(0),
            address(0)
        );
    }

    function registerWithConfig(
        string memory name,
        address owner,
        uint256 duration,
        bytes32 secret,
        address resolver,
        address addr
    ) public payable {
        bytes32 commitment = makeCommitmentWithConfig(
            name,
            owner,
            secret,
            resolver,
            addr
        );
        uint256 cost = _consumeCommitment(name, duration, commitment);

        bytes32 label = keccak256(bytes(name));
        uint256 tokenId = uint256(label);

        uint256 expires;
        if (resolver != address(0)) {
            // Set this contract as the (temporary) owner, giving it
            // permission to set up the resolver.
            expires = base.register(tokenId, address(this), duration);

            // The nodehash of this label
            bytes32 nodehash = keccak256(
                abi.encodePacked(base.baseNode(), label)
            );

            // Set the resolver
            base.ens().setResolver(nodehash, resolver);

            // Configure the resolver
            if (addr != address(0)) {
                Resolver(resolver).setAddr(nodehash, addr);
            }

            // Now transfer full ownership to the expeceted owner
            base.reclaim(tokenId, owner);
            base.transferFrom(address(this), owner, tokenId);
        } else {
            require(addr == address(0));
            expires = base.register(tokenId, owner, duration);
        }

        emit NameRegistered(name, label, owner, cost, expires);

        // Refund any extra payment
        if (msg.value > cost) {
            msg.sender.transfer(msg.value - cost);
        }
    }

    function renew(string calldata name, uint256 duration) external payable {
        uint256 cost = rentPrice(name, duration);
        require(msg.value >= cost);

        bytes32 label = keccak256(bytes(name));
        uint256 expires = base.renew(uint256(label), duration);

        if (msg.value > cost) {
            msg.sender.transfer(msg.value - cost);
        }

        emit NameRenewed(name, label, cost, expires);
    }

    function setPriceOracle(PriceOracle _prices) public onlyOwner {
        prices = _prices;
        emit NewPriceOracle(address(prices));
    }

    function setCommitmentAges(
        uint256 _minCommitmentAge,
        uint256 _maxCommitmentAge
    ) public onlyOwner {
        minCommitmentAge = _minCommitmentAge;
        maxCommitmentAge = _maxCommitmentAge;
    }

    function withdraw() public onlyOwner {
        msg.sender.transfer(address(this).balance);
    }

    function supportsInterface(bytes4 interfaceID)
        external
        pure
        returns (bool)
    {
        return
            interfaceID == INTERFACE_META_ID ||
            interfaceID == COMMITMENT_CONTROLLER_ID ||
            interfaceID == COMMITMENT_WITH_CONFIG_CONTROLLER_ID;
    }

    function _consumeCommitment(
        string memory name,
        uint256 duration,
        bytes32 commitment
    ) internal returns (uint256) {
        // Require a valid commitment
        require(commitments[commitment] + minCommitmentAge <= now);

        // If the commitment is too old, or the name is registered, stop
        require(commitments[commitment] + maxCommitmentAge > now);
        require(available(name));

        delete (commitments[commitment]);

        uint256 cost = rentPrice(name, duration);
        require(duration >= MIN_REGISTRATION_DURATION);
        require(msg.value >= cost);

        return cost;
    }
}
