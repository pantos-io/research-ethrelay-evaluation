#!/usr/bin/env node

const {setupContracts} = require("./cmds/setup");
const {startEvaluation} = require("./cmds/start");

const GENESIS_BLOCK = 9121452;  // --> change with care, since the ethash contract has to be loaded with the corresponding epoch data
const NO_OF_BLOCKS  = 100;

const args = process.argv.slice(2);
if (args.length < 1) {
    printUsage();
    return;
}


switch (args[0]) {
    case 'setup':
        setupContracts(GENESIS_BLOCK, NO_OF_BLOCKS)
            .then(() => console.log('Successfully deployed contracts.'))
            .catch(err => console.error(err));
        break;
    case 'start':
        startEvaluation()
            .then(() => console.log('Successfully ran experiments.'))
            .catch(err => console.error(err));
        break;
    default:
        console.log(`Unknown command: ${args[0]}`);
        printUsage();
        break;
}

function printUsage() {
    console.log(`
Usage: testimonium-evaluation <cmd>

Commands:
    setup:   setup necessary smart contracts
    start:   start the evaluation
`)
}

// deployContracts().then(async () => {
//     const testimoniumAddress = '';
//     const abi = JSON.parse(fs.readFileSync('./abi/Testimonium.abi'));
//     const testimoniumContract = new web3.eth.Contract(abi, testimoniumAddress, {
//         from: accounts[0],
//         gas: 1500000,
//         gasPrice: '1000000',
//     });
//     const rlpHeader = createRLPHeader(header);
//     let txReceipt = await testimoniumContract.methods.submitBlock(rlpHeader).send();
// }).catch((err) => console.error(err));



// const {
//     createRLPHeader,
//     submitEpochData,
//     submitBlockHeader,
//     calculateBlockHash
// } = require('../utils/utils');
//
// const Testimonium = artifacts.require('./TestimoniumTestContract');
// const Ethash = artifacts.require('./Ethash');
// const epochData = require('./epoch-data.json');
//
// const ZERO_HASH                 = '0x0000000000000000000000000000000000000000000000000000000000000000';
// const ZERO_ADDRESS              = '0x0000000000000000000000000000000000000000';
// const LOCK_PERIOD               = time.duration.minutes(5);
// const ALLOWED_FUTURE_BLOCK_TIME = time.duration.seconds(15);
// const MAX_GAS_LIMIT             = new BN(2).pow(new BN(63)).sub(new BN(1));
// const MIN_GAS_LIMIT             = new BN(5000);
// const GAS_LIMIT_BOUND_DIVISOR   = new BN(1024);
// const GAS_PRICE_IN_WEI          = new BN(0);
// const INFURA_ENDPOINT           = "https://mainnet.infura.io/v3/ab050ca98686478e9e9b06dfc3b2f069";
//
// contract('Testimonium', async (accounts) => {
//
//     let testimonium;
//     let ethash;
//     let sourceWeb3;
//
//     before(async () => {
//         sourceWeb3 = new Web3(INFURA_ENDPOINT);
//         ethash = await Ethash.new();
//         const epoch = 269;
//         const fullSizeIn128Resolution = 26017759;
//         const branchDepth = 15;
//         const merkleNodes = require("./epoch-269.json");
//
//         console.log("Submitting data for epoch 269 to Ethash contract...");
//         await submitEpochData(ethash, epoch, fullSizeIn128Resolution, branchDepth, merkleNodes);
//         console.log("Submitted epoch data.");
//     });
//
//     beforeEach(async () => {
//         const genesisBlock = await sourceWeb3.eth.getBlock(GENESIS_BLOCK);
//         const genesisRlpHeader = createRLPHeader(genesisBlock);
//         testimonium = await Testimonium.new(genesisRlpHeader, genesisBlock.totalDifficulty, ethash.address, {
//             from: accounts[0],
//             gasPrice: GAS_PRICE_IN_WEI
//         });
//     });
//
//     it('gas cost experiment (submission and dispute)', async function(done) {

//     });
//
// });

