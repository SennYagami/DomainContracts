import { ethers } from "hardhat";

async function namehash() {
  const res = ethers.utils.keccak256(
    ethers.utils.solidityPack(
      ["bytes32", "bytes32"],
      [
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("bnb")),
      ]
    )
  );
  console.log({ res });
}

namehash();
