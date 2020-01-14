const fs = require("fs");
const {submitEpochData} = require("../utils");
const Ethash = artifacts.require('Ethash');
const TestimoniumOptimistic = artifacts.require('optimistic/TestimoniumOptimistic');
const TestimoniumOptimized = artifacts.require('optimized/TestimoniumOptimized');

module.exports = async function(callback) {
    const genesisBlock = process.env.GENESIS_BLOCK;  // --> change with care, since the ethash contract has to be loaded with the corresponding epoch data
    const noOfBlocks = process.env.NO_OF_BLOCKS;
    try {
        await setupContracts(genesisBlock, noOfBlocks);
        callback();
    } catch (err) {
        callback(err);
    }
};

async function setupContracts(genesisBlockNumber, noOfBlocks) {

    // Ethash
    const startEpoch = Math.floor(genesisBlockNumber / 30000);
    const endEpoch = Math.floor((genesisBlockNumber + noOfBlocks) / 30000);
    console.log(`Setting up Ethash with epoch(s) ${startEpoch}${endEpoch !== startEpoch ? `-${endEpoch}` : ''}...`);
    const ethashContract = await Ethash.deployed();
    await setupEthash(ethashContract, startEpoch, endEpoch);


    // Testimonium
    console.log(`Preparing Testimonium with full header validation...`);
    // nothing to do

    console.log(`Preparing Testimonium with optimistic validation...`);
    const optimisticTestimoniumContract = await TestimoniumOptimistic.deployed();
    await setupTestimonium(optimisticTestimoniumContract, noOfBlocks);

    console.log(`Preparing Testimonium with optimized optimistic validation...`);
    const optimizedTestimoniumContract = await TestimoniumOptimized.deployed();
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
    const stake = await testimoniumContract.getStake();
    const requiredStakePerBlock = await testimoniumContract.getRequiredStakePerBlock();
    const requiredStake = web3.utils.toBN(noOfBlocks).mul(web3.utils.toBN(requiredStakePerBlock-stake));
    if (requiredStake > 0) {
        console.log('Staking deposit...');
        await testimoniumContract.depositStake(requiredStake.toString(), {value: requiredStake.toString()});
    }
}
