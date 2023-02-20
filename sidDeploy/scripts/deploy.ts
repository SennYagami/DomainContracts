import { ethers } from "hardhat";
require("dotenv").config();

const RegistryAddress = "0x7C437D1751953a0cF5be4E0C07fb00B85EaE980a";
const BaseNode = "0xdba5666821b22671387fe7ea11d7cc41ede85a5aa67c3e7b3d68ce6a661f389c";
const RegistrarAddress = "0xB1b95A462D596F20B9aB57856A97d617D8d814A4";
const ReferralAddress = "0x33B8421b4057B884deeDD27579cF0b992B400f4A";
const BNBRegistrarControllerV9 = "0x4aFC3987fcb9286c3cFF959999Ef62cd0dc8270a";

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
    RegistryAddress, //SID contract address
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
async function referralHubDeploy() {
  const [deployer] = await ethers.getSigners();

  const ReferralHubFactory = await ethers.getContractFactory("ReferralHub", deployer);

  const ReferralHub = await ReferralHubFactory.deploy(RegistryAddress);
  const res = await ReferralHub.deployed();
  console.log(`ReferralHub deployed to ${ReferralHub.address}`);
}

async function controllerDeploy() {
  const [deployer] = await ethers.getSigners();

  const BNBRegistrarControllerV9Factory = await ethers.getContractFactory(
    "BNBRegistrarControllerV9",
    deployer
  );

  const BNBRegistrarControllerV9 = await BNBRegistrarControllerV9Factory.deploy(
    RegistrarAddress,
    ethers.constants.AddressZero,
    ethers.constants.AddressZero,
    ethers.constants.AddressZero,
    30,
    604800
  );
  const res = await BNBRegistrarControllerV9.deployed();
  console.log(`BNBRegistrarControllerV9 deployed to ${BNBRegistrarControllerV9.address}`);
}

async function RegistrarAddController() {
  const [deployer] = await ethers.getSigners();

  const BaseRegistrarImplementationFactory = await ethers.getContractFactory(
    "BaseRegistrarImplementation",
    deployer
  );

  const BaseRegistrarImplementation = BaseRegistrarImplementationFactory.attach(RegistrarAddress);
  const res = await BaseRegistrarImplementation.addController(BNBRegistrarControllerV9);
  console.log({ res });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
RegistrarAddController().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
