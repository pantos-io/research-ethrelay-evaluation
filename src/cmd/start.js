const fs = require('fs');
const {getBlocksOfHeight, getWitnessDataForBlock, getParentOfBlock} = require('../database');
const {createRLPHeader} = require("../utils");
const Web3 = require('web3');
const targetWeb3 = new Web3(process.env.INFURA_ENDPOINT);

const TestimoniumFull = artifacts.require('full/TestimoniumFull');
const TestimoniumOptimistic = artifacts.require('optimistic/TestimoniumOptimistic');
const TestimoniumOptimized = artifacts.require('optimized/TestimoniumOptimized');

module.exports = async function(callback) {
    const genesisBlock = process.env.GENESIS_BLOCK;  // --> change with care, since the ethash contract has to be loaded with the corresponding epoch data
    const startBlock = process.env.START_BLOCK;
    const noOfBlocks  = process.env.NO_OF_BLOCKS;
    try {
        await startEvaluation(genesisBlock, startBlock, noOfBlocks);
        callback();
    } catch (err) {
        callback(err);
    }
};

async function startEvaluation(genesisBlock, startBlock, noOfBlocks) {
    console.log(`+++ Starting gas cost evaluation +++`);
    console.log('TestimoniumFull: ', TestimoniumFull.address);
    console.log('TestimoniumOptimistic: ', TestimoniumOptimistic.address);
    console.log('TestimoniumOptimized: ', TestimoniumOptimized.address);

    // retrieve and generate necessary dispute data
    const disputeBlock = (await getBlocksOfHeight(genesisBlock + 1))[0];
    const disputeParent = await getParentOfBlock(disputeBlock);
    const disputeBlockRlp = createRLPHeader(disputeBlock);
    const disputeParentRlp = createRLPHeader(disputeParent);
    const disputeBlockWitnessData = await getWitnessDataForBlock(disputeBlock);

    // retrieve and generate necessary verify data
    const verifyBlock = await targetWeb3.eth.getBlock(genesisBlock + 1);
    const tx = await targetWeb3.eth.getTransaction(verifyBlock.transactions[0]);
    const merkleProof = JSON.parse(fs.readFileSync(`./merkleproofs/${tx.hash}.json`));

    console.log(`Genesis Block: ${genesisBlock}`);
    console.log(`Start Block: ${startBlock}`);
    console.log(`No. of Blocks: ${noOfBlocks}`);
    console.log(`Block used for disputes: ${disputeBlock.hash}`);
    console.log(`Transaction used for verifications: ${tx.hash}`);

    const fd = openCSVFile(`gas-costs_${genesisBlock}_${startBlock}_${noOfBlocks}`);
    fs.writeSync(fd, "run,block_number,submit_full,submit_optimistic,submit_optimized,verify_full,verify_optimistic,verify_optimized,dispute_optimistic,dispute_optimized\n");

    for (let run = 0; run < noOfBlocks; run++) {
        let blockNumber = startBlock + run;
        console.log(`Evaluating block header(s) of height ${blockNumber}...`);
        const blocks = await getBlocksOfHeight(blockNumber);
        for (let block of blocks) {
            console.log(`Block ${block.hash}...`);

            // retrieve and generate necessary data
            const witnessData = await getWitnessDataForBlock(block);
            const dataSetLookup = witnessData.dataset_lookup;
            const witnessForLookup = witnessData.witness_lookup;
            const rlpHeader = createRLPHeader(block);

            // Submission
            process.stdout.write('Submission: ');
            const submitFull = await submitBlockToFull(rlpHeader, dataSetLookup, witnessForLookup);
            process.stdout.write(`${submitFull}...`);

            const submitOptimistic = await submitBlockToOptimistic(rlpHeader);
            process.stdout.write(`${submitOptimistic}...`);

            const submitOptimized = await submitBlockToOptimized(rlpHeader);
            process.stdout.write(`${submitOptimized}...done.\n`);

            // Verification
            process.stdout.write('Verification: ');

            const verifyFull = await verifyOnFull(merkleProof);
            process.stdout.write(`${verifyFull}...`);

            const verifyOptimistic = await verifyOnOptimistic(merkleProof);
            process.stdout.write(`${verifyOptimistic}...`);

            const verifyOptimized = await verifyOnOptimized(merkleProof);
            process.stdout.write(`${verifyOptimized}...done.\n`);

            // Dispute
            process.stdout.write('Dispute: ');
            const disputeOptimistic = await disputeOnOptimistic(disputeBlock.hash, disputeBlockWitnessData.dataSetLookup, disputeBlockWitnessData.witnessForLookup);
            process.stdout.write(`${disputeOptimistic}...`);

            const disputeOptimized = await disputeOnOptimized(disputeBlockRlp, disputeParentRlp, disputeBlockWitnessData.dataSetLookup, disputeBlockWitnessData.witnessForLookup);
            process.stdout.write(`${disputeOptimized}...done.\n`);

            // Write to file
            fs.writeSync(fd, `${run},${blockNumber},${submitFull},${submitOptimistic},${submitOptimized},${verifyFull},${verifyOptimistic},${verifyOptimized},${disputeOptimistic},${disputeOptimized}\n`);
        }

    }

    fs.closeSync(fd);
    console.log(`+++ Done +++`);
}

async function submitBlockToFull(rlpHeader, dataSetLookup, witnessForLookup) {
    const testimonium = await TestimoniumFull.deployed();
    let ret = await testimonium.submitBlock(rlpHeader, dataSetLookup, witnessForLookup);
    return ret.receipt.gasUsed;
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

async function disputeOnOptimistic(blockHash, dataSetLookup, witnessForLookup) {
    const testimonium = await TestimoniumOptimistic.deployed();
    return await testimonium.disputeBlockHeader.estimateGas(blockHash, dataSetLookup, witnessForLookup);
}

async function disputeOnOptimized(rlpHeader, rlpParent, dataSetLookup, witnessForLookup) {
    const testimonium = await TestimoniumOptimized.deployed();
    return await testimonium.disputeBlockHeader.estimateGas(rlpHeader, rlpParent, dataSetLookup, witnessForLookup);
}

function openCSVFile(filename) {
    // "w" opens the file if exists in truncate mode, creates the file if does not exist
    return fs.openSync(`./results/${filename}.csv`, "w");
}
