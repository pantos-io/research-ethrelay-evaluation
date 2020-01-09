const fs = require('fs');

module.exports = {
    startEvaluation
};

async function startEvaluation(genesisBlock, noOfBlocks) {
    console.log(`+++ Starting submission gas cost evaluation (Genesis: ${genesisBlock}, No. of headers: ${noOfBlocks}) +++`);
    const fd = openCSVFile(`submission_${genesisBlock}_${noOfBlocks}`);
    fs.writeSync(fd, "block_number,full,optimistic,optimized\n");

    for (let i = 1; i <= NO_OF_RUNS; i++) {
        // submit block
        const blockNumber = GENESIS_BLOCK + i;
        const block = await sourceWeb3.eth.getBlock(blockNumber);
        block.hash = calculateBlockHash(block);
        console.log(`Run ${i}: Submitting block header...`);
        let ret = await submitBlockHeader(testimonium, block, accounts[0], GAS_PRICE_IN_WEI);
        const submissionCost = ret.receipt.gasUsed;
        // dispute block
        console.log(`Run ${i}: Disputing block header...`);
        ret = await testimonium.disputeBlockHeader(web3.utils.hexToBytes(block.hash), epochData[blockNumber][0], epochData[blockNumber][1], {
            from: accounts[0],
            gasPrice: GAS_PRICE_IN_WEI
        });
        const disputeCost = ret.receipt.gasUsed;
        fs.writeSync(fd, `${i},${submissionCost},${disputeCost}\n`);
    }

    fs.closeSync(fd);
    console.log(`+++ Done +++`);
}

function openCSVFile(filename) {
    // "w" opens the file if exists in truncate mode, creates the file if does not exist
    return fs.openSync(`./results/${filename}.csv`, "w");
}
