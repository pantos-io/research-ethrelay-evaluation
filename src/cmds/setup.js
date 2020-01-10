const fs = require("fs");
const {submitEpochData} = require("../utils");
const Web3 = require("web3");
const web3 = new Web3(Web3.givenProvider || 'http://localhost:8545');

// Contract ABIs
const ETHASH_ABI = JSON.parse(fs.readFileSync('./abi/Ethash.abi'));
const FULL_TESTIMONIUM_ABI = JSON.parse(fs.readFileSync('./abi/FullTestimonium.abi'));
const OPTIMISTIC_TESTIMONIUM_ABI = JSON.parse(fs.readFileSync('./abi/OptimisticTestimonium.abi'));
const OPTIMIZED_TESTIMONIUM_ABI = JSON.parse(fs.readFileSync('./abi/OptimizedTestimonium.abi'));

module.exports = {
    setupContracts,
    ETHASH_ABI,
    TESTIMONIUM_ABI: OPTIMISTIC_TESTIMONIUM_ABI
};


async function setupContracts(genesisBlockNumber, noOfBlocks) {
    const accounts = await web3.eth.getAccounts();

    // Ethash
    const startEpoch = Math.floor(genesisBlockNumber / 30000);
    const endEpoch = Math.floor((genesisBlockNumber + noOfBlocks) / 30000);
    console.log(`Setting up Ethash with epoch(s) ${startEpoch}${endEpoch !== startEpoch ? `-${endEpoch}` : ''}...`);
    const ethashContract = new web3.eth.Contract(ETHASH_ABI, process.env.ETHASH, {
        from: accounts[0],
        gas: 1500000,
        gasPrice: '1000000',
    });
    await setupEthash(ethashContract, startEpoch, endEpoch);


    // Testimonium
    console.log(`Preparing Testimonium with full header validation...`);
    const fullTestimoniumContract = new web3.eth.Contract(FULL_TESTIMONIUM_ABI, process.env.TESTIMONIUM_FULL, {
        from: accounts[0],
        gas: 1500000,
        gasPrice: '1000000',
    });
    await setupTestimonium(fullTestimoniumContract, noOfBlocks);

    console.log(`Preparing Testimonium with optimistic validation...`);
    const optimisticTestimoniumContract = new web3.eth.Contract(OPTIMISTIC_TESTIMONIUM_ABI, process.env.TESTIMONIUM_OPTIMISTIC, {
        from: accounts[0],
        gas: 1500000,
        gasPrice: '1000000',
    });
    await setupTestimonium(optimisticTestimoniumContract, noOfBlocks);

    console.log(`Preparing Testimonium with optimized optimistic validation...`);
    const optimizedTestimoniumContract = new web3.eth.Contract(OPTIMIZED_TESTIMONIUM_ABI, process.env.TESTIMONIUM_OPTIMIZED, {
        from: accounts[0],
        gas: 1500000,
        gasPrice: '1000000',
    });
    await setupTestimonium(optimizedTestimoniumContract, noOfBlocks);

}

async function setupEthash(ethashContract, startEpoch, endEpoch) {
    for (let epoch = startEpoch; epoch <= endEpoch; epoch++) {
        console.log(`Submitting epoch ${epoch}...`);
        const epochData = JSON.parse(fs.readFileSync(`./epochs/${epoch}.json`));
        await submitEpochData(ethashContract, epochData);
    }
}

async function setupTestimonium(testimoniumContract, noOfBlocks) {
    const stake = await testimoniumContract.methods.getStake().call();
    const requiredStakePerBlock = await testimoniumContract.methods.getRequiredStakePerBlock().call();
    const requiredStake = web3.utils.toBN(noOfBlocks).mul(web3.utils.toBN(requiredStakePerBlock-stake));
    if (requiredStake > 0) {
        console.log('Staking deposit...');
        await testimoniumContract.methods.depositStake(requiredStake.toString()).send({value: requiredStake.toString()});
    }
}
