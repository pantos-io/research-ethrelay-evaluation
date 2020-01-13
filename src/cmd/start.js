const fs = require('fs');
const {getBlocksOfHeight, getWitnessDataForBlock} = require('../database');
const {createRLPHeader} = require("../utils");
const Web3 = require('web3');
const targetWeb3 = new Web3(process.env.INFURA_ENDPOINT);

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
    fs.writeSync(fd, "run,block_number,submit_full,submit_optimistic,submit_optimized,verify_full,verify_optimistic,verify_optimized,dispute_optimistic,dispute_optimized\n");

    for (let run = 1; run <= noOfBlocks; run++) {
        let blockNumber = genesisBlock + run;
        console.log(`Evaluating block header(s) of height ${blockNumber}...`);
        // submit block
        const blocks = await getBlocksOfHeight(blockNumber);
        // const dataset_lookup = await getDataSetLookupOfBlock(blockNumber);
        // const witness_lookup = await getWitnessLookupOfBlock(blockNumber);
        for (let block of blocks) {
            console.log(`Block ${block.hash}...`);

            process.stdout.write('Submission: ');
            // full
            const submitFull = await submitBlockToFull(block);
            process.stdout.write(`${submitFull}...`);

            // optimistic
            const submitOptimistic = await submitBlockToOptimistic(block);
            process.stdout.write(`${submitOptimistic}...`);

            // optimized
            const submitOptimized = await submitBlockToOptimized(block);
            process.stdout.write(`${submitOptimized}...done.\n`);

            // +++ Verification +++
            process.stdout.write('Verification: ');
            const blockForConfirmation = await targetWeb3.eth.getBlock(genesisBlock + 1);
            const tx = await targetWeb3.eth.getTransaction(blockForConfirmation.transactions[0]);
            const merkleProof = JSON.parse(fs.readFileSync(`./merkleproofs/${tx.hash}.json`));

            // full
            const verifyFull = await verifyOnFull(merkleProof);
            process.stdout.write(`${verifyFull}...`);

            // optimistic
            const verifyOptimistic = await verifyOnOptimistic(merkleProof);
            process.stdout.write(`${verifyOptimistic}...`);

            // optimized
            const verifyOptimized = await verifyOnOptimized(merkleProof);
            process.stdout.write(`${verifyOptimized}...done.\n`);

            // +++ Dispute +++
            process.stdout.write('Dispute: ');
            // optimistic
            const disputeOptimistic = await disputeOnOptimistic(genesisBlock + 1);
            process.stdout.write(`${disputeOptimistic}...`);

            // optimized
            const disputeOptimized = await disputeOnOptimized(genesisBlock + 1);
            process.stdout.write(`${disputeOptimized}...done.\n`);

            fs.writeSync(fd, `${run},${blockNumber},${submitFull},${submitOptimistic},${submitOptimized},${verifyFull},${verifyOptimistic},${verifyOptimized},${disputeOptimistic},${disputeOptimized}\n`);
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

async function verifyOnFull(merkleProof) {
    const feeInWei = web3.utils.toBN('100000000000000000');
    const blockHash = web3.utils.hexToBytes(merkleProof.blockHash);
    const noOfConfirmations = 0;
    const rlpEncodedTx = web3.utils.hexToBytes(merkleProof.rlpEncodedTx);
    const path = web3.utils.hexToBytes(merkleProof.path);
    const rlpEncodedNodes = web3.utils.hexToBytes(merkleProof.rlpEncodedNodes);

    const testimonium = await TestimoniumFull.deployed();
    let ret = await testimonium.verifyTransaction(feeInWei, blockHash, noOfConfirmations, rlpEncodedTx, path, rlpEncodedNodes, { value: feeInWei });
    return ret.receipt.gasUsed;
}

async function verifyOnOptimistic(merkleProof) {
    const feeInWei = web3.utils.toBN('100000000000000000');
    const blockHash = web3.utils.hexToBytes(merkleProof.blockHash);
    const noOfConfirmations = 0;
    const rlpEncodedTx = web3.utils.hexToBytes(merkleProof.rlpEncodedTx);
    const path = web3.utils.hexToBytes(merkleProof.path);
    const rlpEncodedNodes = web3.utils.hexToBytes(merkleProof.rlpEncodedNodes);

    const testimonium = await TestimoniumOptimistic.deployed();
    let ret = await testimonium.verifyTransaction(feeInWei, blockHash, noOfConfirmations, rlpEncodedTx, path, rlpEncodedNodes, { value: feeInWei });
    return ret.receipt.gasUsed;
}

async function verifyOnOptimized(merkleProof) {
    const feeInWei = web3.utils.toBN('100000000000000000');
    const block = await targetWeb3.eth.getBlock(merkleProof.blockHash);
    const rlpHeader = createRLPHeader(block);
    const noOfConfirmations = 0;
    const rlpEncodedTx = web3.utils.hexToBytes(merkleProof.rlpEncodedTx);
    const path = web3.utils.hexToBytes(merkleProof.path);
    const rlpEncodedNodes = web3.utils.hexToBytes(merkleProof.rlpEncodedNodes);

    const testimonium = await TestimoniumOptimized.deployed();
    let ret = await testimonium.verifyTransaction(feeInWei, rlpHeader, noOfConfirmations, rlpEncodedTx, path, rlpEncodedNodes, { value: feeInWei });
    return ret.receipt.gasUsed;
}

async function disputeOnOptimistic(blockNumber) {
    return 0;
}

async function disputeOnOptimized(blockNumber) {
    return 0;
}

function openCSVFile(filename) {
    // "w" opens the file if exists in truncate mode, creates the file if does not exist
    return fs.openSync(`./results/${filename}.csv`, "w");
}
