import "@nomicfoundation/hardhat-toolbox";

const PRIVATE_KEY = "0x92cc93b5b917385b78ece4bd069be73103ee410eef9c68e05b80b6fe69d256ee";

export default {
  solidity: "0.8.20",
  networks: {
    qie: {
      url: "https://rpc1mainnet.qie.digital/",
      accounts: [PRIVATE_KEY],
      chainId: 1990
    }
  }
};
