const fs = require('fs');
const {getBlocksOfHeight, getWitnessDataForBlock, getParentOfBlock} = require('../database');
const {createRLPHeader, checkEnvironmentVariables, parseGasUsed} = require("../utils");
const Web3 = require('web3');

checkEnvironmentVariables()
const targetWeb3 = new Web3(process.env.INFURA_ENDPOINT);

const TestimoniumFull = artifacts.require('full/TestimoniumFull');
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
    console.log('TestimoniumFull: ', TestimoniumFull.address);
    console.log('TestimoniumOptimistic: ', TestimoniumOptimistic.address);
    console.log('TestimoniumOptimized: ', TestimoniumOptimized.address);

    // retrieve and generate necessary verify data
    const verifyBlock = await targetWeb3.eth.getBlock(genesisBlock + 1);
    const tx = await targetWeb3.eth.getTransaction(verifyBlock.transactions[0]);
    const merkleProof = JSON.parse(fs.readFileSync(`./merkleproofs/${tx.hash}.json`));

    console.log(`Genesis Block: ${genesisBlock}`);
    console.log(`Start Block: ${startBlock}`);
    console.log(`No. of Blocks: ${noOfBlocks}`);
    console.log(`Transaction used for verifications: ${tx.hash}`);

    const fd = openCSVFile(`gas-costs_${genesisBlock}_${startBlock}_${noOfBlocks}`);
    fs.writeSync(fd, "run,block_number,block_hash,branch_id_full,branch_id_optimistic,branch_id_optimized,junction_full,junction_optimistic,junction_optimized,main_chain_head_full,main_chain_head_optimistic,main_chain_head_optimized,submit_full,submit_optimistic,submit_optimized,verify_full,verify_optimistic,verify_optimized\n");

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
            const headerMetaFull = await getHeaderMetaInfo(TestimoniumFull, block.hash);
            const mainChainHeadFull = await getMainChainHead(TestimoniumFull);
            process.stdout.write(`${submitFull}...`);

            const submitOptimistic = await submitBlockToOptimistic(rlpHeader);
            const headerMetaOptimistic = await getHeaderMetaInfo(TestimoniumOptimistic, block.hash);
            const mainChainHeadOptimistic = await getMainChainHead(TestimoniumOptimistic);
            process.stdout.write(`${submitOptimistic}...`);

            const submitOptimized = await submitBlockToOptimized(rlpHeader);
            const headerMetaOptimized = await getHeaderMetaInfo(TestimoniumOptimized, block.hash);
            const mainChainHeadOptimized = await getMainChainHead(TestimoniumOptimized);
            process.stdout.write(`${submitOptimized}...done.\n`);

            // Verification
            process.stdout.write('Verification: ');

            const verifyFull = await verifyOnFull(merkleProof);
            process.stdout.write(`${verifyFull}...`);

            const verifyOptimistic = await verifyOnOptimistic(merkleProof);
            process.stdout.write(`${verifyOptimistic}...`);

            const verifyOptimized = await verifyOnOptimized(merkleProof);
            process.stdout.write(`${verifyOptimized}...done.\n`);

            // Write to file
            fs.writeSync(fd, `${run},${blockNumber},${block.hash},${headerMetaFull.forkId},${headerMetaOptimistic.forkId},${headerMetaOptimized.forkId},${headerMetaFull.latestFork},${headerMetaOptimistic.latestFork},${headerMetaOptimized.latestFork},${mainChainHeadFull},${mainChainHeadOptimistic},${mainChainHeadOptimized},${submitFull},${submitOptimistic},${submitOptimized},${verifyFull},${verifyOptimistic},${verifyOptimized}\n`);
        }

    }

    fs.closeSync(fd);
    console.log(`+++ Done +++`);
}

async function getHeaderMetaInfo(contract, blockHash) {
    const contractInstance = await contract.deployed();
    return contractInstance.getHeaderMetaInfo(blockHash);
}

async function getMainChainHead(contract) {
    const contractInstance = await contract.deployed();
    return contractInstance.longestChainEndpoint();
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

function openCSVFile(filename) {
    // "w" opens the file if exists in truncate mode, creates the file if does not exist
    return fs.openSync(`./results/${filename}.csv`, "w");
}
