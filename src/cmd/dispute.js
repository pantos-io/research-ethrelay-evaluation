const fs = require('fs');
const {getBlocksOfHeight, getWitnessDataForBlock, getParentOfBlock} = require('../database');
const {createRLPHeader, checkEnvironmentVariables, parseGasUsed} = require("../utils");
const Web3 = require('web3');

checkEnvironmentVariables()
const targetWeb3 = new Web3(process.env.INFURA_ENDPOINT);

const TestimoniumOptimistic = artifacts.require('optimistic/TestimoniumOptimistic');
const TestimoniumOptimized = artifacts.require('optimized/TestimoniumOptimized');

module.exports = async function(callback) {
    const genesisBlock = parseInt(process.env.GENESIS_BLOCK);  // --> change with care, since the ethash contract has to be loaded with the corresponding epoch data
    const startBlock = parseInt(process.env.START_BLOCK);
    const noOfBlocks  = parseInt(process.env.NO_OF_BLOCKS);
    try {
        await startEvaluation(genesisBlock, startBlock, noOfBlocks);
        callback();
    } catch (err) {
        callback(err);
    }
};

async function startEvaluation(genesisBlock, startBlock, noOfBlocks) {
    console.log(`+++ Starting gas cost evaluation +++`);
    console.log('TestimoniumOptimistic: ', TestimoniumOptimistic.address);
    console.log('TestimoniumOptimized: ', TestimoniumOptimized.address);

    // retrieve and generate necessary dispute data
    const disputeBlock = (await getBlocksOfHeight(genesisBlock + 1))[0];
    const disputeParent = await getParentOfBlock(disputeBlock);
    const disputeBlockRlp = createRLPHeader(disputeBlock);
    const disputeParentRlp = createRLPHeader(disputeParent);
    const disputeBlockWitnessData = await getWitnessDataForBlock(disputeBlock);

    console.log(`Genesis Block: ${genesisBlock}`);
    console.log(`Start Block: ${startBlock}`);
    console.log(`No. of Blocks: ${noOfBlocks}`);
    console.log(`Block used for disputes: ${disputeBlock.hash}`);

    const fd = openCSVFile(`dispute_${genesisBlock}_${startBlock}_${noOfBlocks}`);
    fs.writeSync(fd, "run,block_number,dispute_optimistic,dispute_optimized\n");

    for (let run = 0; run < noOfBlocks; run++) {
        let endBlock = startBlock + run;
        console.log(`+++ Run ${run} +++`);
        await submitBlocks(startBlock, endBlock);

        // Dispute
        process.stdout.write('Dispute: ');
        const disputeOptimistic = await disputeOnOptimistic(disputeBlock.hash, disputeBlockWitnessData.dataset_lookup, disputeBlockWitnessData.witness_lookup);
        process.stdout.write(`${disputeOptimistic}...`);

        const disputeOptimized = await disputeOnOptimized(disputeBlockRlp, disputeParentRlp, disputeBlockWitnessData.dataset_lookup, disputeBlockWitnessData.witness_lookup);
        process.stdout.write(`${disputeOptimized}...done.\n`);

        // Write to file
        fs.writeSync(fd, `${run},${endBlock},${disputeOptimistic},${disputeOptimized}\n`);

    }

    fs.closeSync(fd);
    console.log(`+++ Done +++`);
}

async function submitBlocks(from, to) {
    for (let i = from; i<= to; i++) {
        process.stdout.write(`Submitting block headers...(${i}/${to})`);
        const blocks = await getBlocksOfHeight(i);
        for (let block of blocks) {
            // retrieve and generate necessary data
            const rlpHeader = createRLPHeader(block);
            await submitBlockToOptimistic(rlpHeader);
            await submitBlockToOptimized(rlpHeader);
        }
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
    }
    process.stdout.write(`Submitting block headers...done.\n`);
}

async function submitBlockToOptimistic(rlpHeader) {
    const testimonium = await TestimoniumOptimistic.deployed();
    let ret = await testimonium.submitBlock(rlpHeader);
    return ret.receipt.gasUsed;
}

async function submitBlockToOptimized(rlpHeader) {
    const testimonium = await TestimoniumOptimized.deployed();
    let ret = await testimonium.submitBlock(rlpHeader);
    return ret.receipt.gasUsed;
}

async function disputeOnOptimistic(blockHash, dataSetLookup, witnessForLookup) {
    const testimonium = await TestimoniumOptimistic.deployed();
    const ret = await testimonium.disputeBlockHeader(blockHash, dataSetLookup, witnessForLookup);
    return ret.receipt.gasUsed;
}

async function disputeOnOptimized(rlpHeader, rlpParent, dataSetLookup, witnessForLookup) {
    const testimonium = await TestimoniumOptimized.deployed();
    const ret = await testimonium.disputeBlockHeader(rlpHeader, rlpParent, dataSetLookup, witnessForLookup);
    return ret.receipt.gasUsed;
}

function openCSVFile(filename) {
    // "w" opens the file if exists in truncate mode, creates the file if does not exist
    return fs.openSync(`./results/${filename}.csv`, "w");
}
