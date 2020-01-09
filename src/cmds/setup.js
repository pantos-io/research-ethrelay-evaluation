const fs = require("fs");
const {createRLPHeader, submitEpochData} = require("../utils");
const Web3 = require("web3");
const web3 = new Web3(Web3.givenProvider || 'http://localhost:8545');

// Ethash
const ETHASH_ABI = JSON.parse(fs.readFileSync('./abi/Ethash.abi'));
const ETHASH_BIN = fs.readFileSync('./bin/Ethash.bin');


// Testimonium
const TESTIMONIUM_ABI = JSON.parse(fs.readFileSync('./abi/Testimonium.abi'));
const TESTIMONIUM_BIN = fs.readFileSync('./bin/Testimonium.bin');
console.log(TESTIMONIUM_ABI, TESTIMONIUM_BIN)

module.exports = {
    setupContracts,
    ETHASH_ABI,
    TESTIMONIUM_ABI
};


async function setupContracts(genesisBlockNumber, noOfBlocks) {
    const accounts = await web3.eth.getAccounts();

    // Ethash
    console.log('Deploying Ethash...');
    const ethashInstance = await deployEthash(accounts[0]);

    const startEpoch = Math.floor(genesisBlockNumber / 30000);
    const endEpoch = Math.floor((genesisBlockNumber + noOfBlocks) / 30000);
    console.log(`Setting up Ethash with epoch(s) ${startEpoch}${endEpoch !== startEpoch ? `-${endEpoch}` : ''}...`);
    await setupEthash(ethashInstance, startEpoch, endEpoch);

    // Testimonium
    console.log('Deploying Testimonium...');
    const testimoniumInstance = await deployTestimonium(accounts[0], genesisBlockNumber, ethashInstance.options.address);
    console.log(`Setting up Testimonium...`);
    await setupTestimonium(accounts[0], testimoniumInstance, noOfBlocks);

    console.log(`Deployed Ethash: ${ethashInstance.options.address}`);
    console.log(`Deployed Testimonium: ${testimoniumInstance.options.address}`);
}

async function deployEthash(deployer) {
    const ethashContract = new web3.eth.Contract(ETHASH_ABI, null, {
        from: deployer,
        gas: 1500000,
        gasPrice: '1000000',
    });
    return ethashContract.deploy({
        data: ETHASH_BIN,
        arguments: []
    }).send({
        from: deployer,
        gas: 6000000,
        gasPrice: '1000000',
    });
}

async function setupEthash(ethashInstance, startEpoch, endEpoch) {
    for (let epoch = startEpoch; epoch <= endEpoch; epoch++) {
        console.log(`Submitting epoch ${epoch}...`);
        const epochData = JSON.parse(fs.readFileSync(`./epochs/${epoch}.json`));
        await submitEpochData(ethashInstance, epochData);
    }
}

async function deployTestimonium(deployer, genesisBlock, ethashAddress) {
    const sourceWeb3 = new Web3(process.env.INFURA_ENDPOINT);
    const block = await sourceWeb3.eth.getBlock(genesisBlock);
    const totalDifficulty = block.totalDifficulty;
    const genesisRlpHeader = createRLPHeader(block);
    const testimoniumContract = new web3.eth.Contract(TESTIMONIUM_ABI, null, {
        from: deployer,
        gas: 1500000,
        gasPrice: '1000000',
    });
    console.log(web3.utils.bytesToHex(genesisRlpHeader), totalDifficulty, ethashAddress);
    return testimoniumContract.deploy({
        data: TESTIMONIUM_BIN,
        arguments: [web3.utils.bytesToHex(genesisRlpHeader), totalDifficulty, ethashAddress]
    }).send({
        from: deployer,
        gas: 6000000,
        gasPrice: '1000000',
    });
}

async function setupTestimonium(sender, testimoniumInstance, noOfBlocks) {
    console.log('Staking...');
    const stake = await testimoniumInstance.methods.getStake().call();
    console.log(stake);
    const requiredStakePerBlock = await testimoniumInstance.methods.getRequiredStakePerBlock().call({ from: sender });
    const requiredStake = new BN(noOfBlocks).mul(requiredStakePerBlock);
    console.log(requiredStakePerBlock);
    await testimoniumInstance.methods.depositStake(requiredStake).send({from: sender, value: requiredStake});
}
