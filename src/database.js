const { Client } = require('pg');
const Web3 = require('web3');
const web3 = new Web3('http://localhost:8545');

async function getBlocksOfHeight(blocknumber) {
    const client = new Client();
    client.connect();
    const query = 'SELECT block_data FROM blockheader WHERE block_number = $1 ORDER BY block_data ->> \'timestamp\' ASC';
    const values = [blocknumber];
    const result = await client.query(query, values);
    client.end();
    return result.rows.map(result => clean(result.block_data));
}

async function getWitnessDataForBlock(block) {
    const client = new Client();
    client.connect();
    const query = "SELECT dataset_lookup, witness_lookup FROM blockheader WHERE block_number = $1 AND block_data ->> 'hash' = $2";
    const values = [block.number, block.hash];
    const result = await client.query(query, values);
    client.end();
    return result.rows[0]
}

async function getParentOfBlock(block) {
    const client = new Client();
    client.connect();
    const query = "SELECT block_data FROM blockheader WHERE block_data ->> 'hash' = $1";
    const values = [block.parentHash];
    const result = await client.query(query, values);
    client.end();
    return clean(result.rows[0].block_data)
}

const clean = (blockData) => {
    return {
        ...blockData,
        difficulty: web3.utils.hexToNumberString(blockData.difficulty),
        gasLimit: web3.utils.hexToNumber(blockData.gasLimit),
        gasUsed: web3.utils.hexToNumber(blockData.gasUsed),
        number: web3.utils.hexToNumber(blockData.number),
        timestamp: web3.utils.hexToNumber(blockData.timestamp)
    }
};

module.exports = {
    getBlocksOfHeight,
    getWitnessDataForBlock,
    getParentOfBlock
};
