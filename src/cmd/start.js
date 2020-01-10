const fs = require('fs');
const {getBlocksOfHeight, getWitnessDataForBlock} = require('../database');
const {createRLPHeader} = require("../utils");
const TestimoniumFull = artifacts.require('full/TestimoniumFull');
const TestimoniumOptimistic = artifacts.require('optimistic/TestimoniumOptimistic');
const TestimoniumOptimized = artifacts.require('optimized/TestimoniumOptimized');

module.exports = async function(callback) {
    const GENESIS_BLOCK = 9121452;  // --> change with care, since the ethash contract has to be loaded with the corresponding epoch data
    const NO_OF_BLOCKS  = 100;
    try {
        await startEvaluation(GENESIS_BLOCK, NO_OF_BLOCKS);
        callback();
    } catch (err) {
        callback(err);
    }
};

async function startEvaluation(genesisBlock, noOfBlocks) {
    console.log(`+++ Starting submission gas cost evaluation (Genesis: ${genesisBlock}, No. of headers: ${noOfBlocks}) +++`);
    console.log('TestimoniumFull: ', TestimoniumFull.address);
    console.log('TestimoniumOptimistic: ', TestimoniumOptimistic.address);
    console.log('TestimoniumOptimized: ', TestimoniumOptimized.address);

    const fd = openCSVFile(`submission_${genesisBlock}_${noOfBlocks}`);
    fs.writeSync(fd, "block_number,full,optimistic,optimized\n");

    for (let blockNumber = genesisBlock + 1; blockNumber <= genesisBlock + noOfBlocks; blockNumber++) {
        console.log(`Submitting block header(s) of height ${blockNumber}...`);
        // submit block
        const blocks = await getBlocksOfHeight(blockNumber);
        // const dataset_lookup = await getDataSetLookupOfBlock(blockNumber);
        // const witness_lookup = await getWitnessLookupOfBlock(blockNumber);
        for (let block of blocks) {
            process.stdout.write(`Block ${block.hash}: `);

            // full
            const fullGasCost = await submitBlockToFull(block);
            process.stdout.write(`${fullGasCost}...`);

            // optimistic
            const optimisticGasCost = await submitBlockToOptimistic(block);
            process.stdout.write(`${optimisticGasCost}...`);

            // optimized
            const optimizedGasCost = await submitBlockToOptimized(block);
            process.stdout.write(`${optimizedGasCost}...done.\n`);

            fs.writeSync(fd, `${blockNumber},${fullGasCost},${optimisticGasCost},${optimizedGasCost}\n`);
        }

    }

    fs.closeSync(fd);
    console.log(`+++ Done +++`);
}

async function submitBlockToFull(block) {
    const witnessData = await getWitnessDataForBlock(block);
    const dataset_lookup = witnessData.dataset_lookup;
    const witness_lookup = witnessData.witness_lookup;
    let rlpHeader = createRLPHeader(block);
    const headerHash = web3.utils.keccak256(rlpHeader);
    if (headerHash !== block.hash) {
        throw Error(`Hashes don't equal (${headerHash} != ${block.hash}`);
    }
    const testimonium = await TestimoniumFull.deployed();

    let ret = await testimonium.submitBlock(rlpHeader, dataset_lookup, witness_lookup);
    return ret.receipt.gasUsed;
}

async function submitBlockToOptimistic(block) {
    let rlpHeader = createRLPHeader(block);
    const headerHash = web3.utils.keccak256(rlpHeader);
    if (headerHash !== block.hash) {
        throw Error(`Hashes don't equal (${headerHash} != ${block.hash}`);
    }

    const testimonium = await TestimoniumOptimistic.deployed();

    let ret = await testimonium.submitBlock(rlpHeader);
    return ret.receipt.gasUsed;
}

async function submitBlockToOptimized(block) {
    let rlpHeader = createRLPHeader(block);
    const headerHash = web3.utils.keccak256(rlpHeader);
    if (headerHash !== block.hash) {
        throw Error(`Hashes don't equal (${headerHash} != ${block.hash}`);
    }
    const testimonium = await TestimoniumOptimized.deployed();

    let ret = await testimonium.submitBlock(rlpHeader);
    return ret.receipt.gasUsed;
}

function openCSVFile(filename) {
    // "w" opens the file if exists in truncate mode, creates the file if does not exist
    return fs.openSync(`./results/${filename}.csv`, "w");
}
