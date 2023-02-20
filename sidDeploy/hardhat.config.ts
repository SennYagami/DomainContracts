import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
require("dotenv").config();

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      { version: "0.6.12" },
      { version: "0.5.17" },
      { version: "0.7.6" },
      { version: "0.8.17" },
    ],
    settings: {
      optimizer: {
        enabled: true,
        runs: 100,
      },
    },
  },
  networks: {
    hardhat: { allowUnlimitedContractSize: true },
    bscTestnet: {
      url: "https://magical-wispy-research.bsc-testnet.discover.quiknode.pro/842c5e0859307f1c3fd3f45e90c98064a533c786/",
      chainId: 97,
      gas: 10000000,
      gasPrice: 20000000000,
      accounts: [process.env.DEPLOYER as string],
    },
  },
};

export default config;
