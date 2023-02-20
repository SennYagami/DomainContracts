import { ethers } from "hardhat";
require("dotenv").config();

const RegistryAddress = "0x7C437D1751953a0cF5be4E0C07fb00B85EaE980a";
const BaseNode = "0xdba5666821b22671387fe7ea11d7cc41ede85a5aa67c3e7b3d68ce6a661f389c";
const RegistrarAddress = "0xB1b95A462D596F20B9aB57856A97d617D8d814A4";

async function sidDeploy() {
  const [deployer] = await ethers.getSigners();

  const SIDRegistryFactory = await ethers.getContractFactory("SIDRegistry", deployer);
  const SIDRegistry = await SIDRegistryFactory.deploy();

  await SIDRegistry.deployed();

  console.log(`SIDRegistry deployed to ${SIDRegistry.address}`);
}

async function registrarDepoly() {
  const [deployer] = await ethers.getSigners();

  const BaseRegistrarImplementationFactory = await ethers.getContractFactory(
    "BaseRegistrarImplementation",
    deployer
  );
  const BaseRegistrarImplementation = await BaseRegistrarImplementationFactory.deploy(
    RegistryCAddress, //SID contract address
    BaseNode //base node
  );

  await BaseRegistrarImplementation.deployed();

  console.log(`BaseRegistrarImplementation deployed to ${BaseRegistrarImplementation.address}`);
}

async function setBnbRegistrarInRegistry() {
  const [deployer] = await ethers.getSigners();

  const SIDRegistryFactory = await ethers.getContractFactory("SIDRegistry", deployer);

  const SIDRegistry = SIDRegistryFactory.attach(RegistryAddress);
  const res = await SIDRegistry.setSubnodeOwner(
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    ethers.utils.keccak256(ethers.utils.toUtf8Bytes("bnb")),
    RegistrarAddress
  );

  //   const res = await SIDRegistry.records(BaseNode);

  console.log({ res });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
setBnbRegistrarInRegistry().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
