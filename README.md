# 📝 ToDO DAPP

This is a decentralized ToDo List application built on the Ethereum blockchain using **Solidity, Hardhat, Pinata IPFS, and React**. Users can add tasks, mark them as completed, and remove them. The Tasks are stored on **IPFS** usinng Pinata.

## 🛠️ Built With
- Solidity Smart Contracts
- Hardhat development environment
- Pinata IPFS
- React Frontend
- ether.js for connecting to smart contract

## 📂 Directory Structure
```
Project
├───contracts
|   |   ToDoList.sol
├───scripts
|   |   deploy.js
└───frontend
    └───src
        |   Dapp.js
```

## 📦 Installation

The first things you need to do are cloning this repository and installing its
dependencies
You will need Nodsjs installed on your system.

```sh
git clone https://github.com/HemantKumar01/ToDo-DApp.git
cd ToDo-DApp
npm install
```
## 🏃 Running the Dapp
First create a `.env` file in the `frontend` directory and add the following:
```sh
REACT_APP_PINATA_API_KEY=<YOUR_PINATA_API_KEY>
REACT_APP_PINATA_SECRET_KEY=<YOUR_PINATA_SECRET_KEY>
```

Run the following commands to start the frontend:
```sh
cd frontend
npm install
npm start
```

Open [http://localhost:3000/](http://localhost:3000/) to see your Dapp. You will
need to have [Coinbase Wallet](https://www.coinbase.com/wallet) or [Metamask](https://metamask.io) installed.
> Note: If you are using a devnet, you will need to start a hardhat node first, refer below for deploying the contract.


## 🚀 Deploying the Contract
### Method 1: Hardhat DevNet (Faster, Local)
set the chain_id in `frontend/src/Dapp.js` to `31337` and run the following commands:
```sh
npx hardhat node
```
> Then Setup Metamask or any other wallet by creating a new account with private key of any account out of 20 given by hardhat node and chain id as `31337`.

Then, on a new terminal, go to the repository's root folder and run this to
deploy your contract:

```sh
npx hardhat run scripts/deploy.js --network localhost
```

Now you can head over to setting up frontend as described later in this readme.
### Method 2: Sepolia TestNet (Slower, Public)
create a `.env` file in the root directory and add the following:
```sh
INFURA_API_KEY=<YOUR_INFURA_API_KEY>
SEPOLIA_PRIVATE_KEY=<YOUR_SEPOLIA_PRIVATE_KEY>
#for this go to your wallet, select sepolia, 
# then go to account information and copy the private key
```
now run
```sh
npx hardhat run scripts/deploy.js --network sepolia
```

