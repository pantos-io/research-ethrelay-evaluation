const RLP = require('rlp');
const Web3 = require("web3");
const web3 = new Web3(Web3.givenProvider || 'https://mainnet.infura.io', null, {});
const BN = web3.utils.BN;

const submitEpochData = async (ethashContractInstance, epochData) => {
    const epoch = epochData.epoch;
    const fullSizeIn128Resolution = epochData.fullSizeIn128Resolution;
    const branchDepth = epochData.branchDepth;
    const merkleNodes = epochData.merkleNodes;
    let start = new BN(0);
    let nodes = [];
    let mnlen = 0;
    let index = 0;
    for (let mn of merkleNodes) {
        nodes.push(mn);
        if (nodes.length === 40 || index === merkleNodes.length - 1) {
            mnlen = new BN(nodes.length);

            if (index < 440 && epoch === 128) {
                start = start.add(mnlen);
                nodes = [];
                return;
            }

            await ethashContractInstance.setEpochData(epoch, fullSizeIn128Resolution, branchDepth, nodes, start.toString(), mnlen.toString());

            start = start.add(mnlen);
            nodes = [];
        }
        index++;
    }
};

const createRLPHeader = (block) => {
    return RLP.encode([
        block.parentHash,
        block.sha3Uncles,
        block.miner,
        block.stateRoot,
        block.transactionsRoot,
        block.receiptsRoot,
        block.logsBloom,
        new BN(block.difficulty),
        new BN(block.number),
        block.gasLimit,
        block.gasUsed,
        block.timestamp,
        block.extraData,
        block.mixHash,
        block.nonce,
    ]);
};
const createRLPHeaderWithoutNonce = (block) => {
    return RLP.encode([
        block.parentHash,
        block.sha3Uncles,
        block.miner,
        block.stateRoot,
        block.transactionsRoot,
        block.receiptsRoot,
        block.logsBloom,
        new BN(block.difficulty),
        new BN(block.number),
        block.gasLimit,
        block.gasUsed,
        block.timestamp,
        block.extraData,
    ]);
};

const checkEnvironmentVariables = () => {
    const requiredEnv = ['INFURA_ENDPOINT', 'GENESIS_BLOCK', 'START_BLOCK', 'NO_OF_BLOCKS'];

    for (const env of requiredEnv) {
        if (process.env[env] === "") {
            throw Error(`environment variable ${env} is not set ($ export ${env}=...)`)
        }
    }
};

module.exports = {
    submitEpochData,
    createRLPHeader,
    createRLPHeaderWithoutNonce,
    checkEnvironmentVariables
};
