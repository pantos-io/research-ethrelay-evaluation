const { Client } = require('pg');

async function getBlock(blocknumber) {
    const client = new Client();
    client.connect();
    const query = 'SELECT block_data FROM blockheader WHERE block_number = $1';
    const values = [blocknumber];
    const result = await client.query(query, values);
    return result.rows;
}

module.exports = {
    getBlocksOfHeight: getBlock
};
