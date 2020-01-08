const fs = require("fs");
const Web3 = require("web3");
const {createRLPHeader} = require("./utils");

// Ethash
const ETHASH_ABI = JSON.parse(fs.readFileSync('./abi/Ethash.abi'));
const ETHASH_BIN = fs.readFileSync('./bin/Ethash.bin');

// Testimonium
const TESTIMONIUM_ABI = JSON.parse(fs.readFileSync('./abi/Testimonium.abi'));
const TESTIMONIUM_BIN = fs.readFileSync('./bin/Ethash.bin');

const args = process.argv.slice(2);
if (args.length < 1) {
    printUsage();
    return;
}

switch (args[0]) {
    case 'deploy':
        deployContracts()
            .then(() => console.log('Successfully deployed contracts.'))
            .catch(err => console.error(err));
        break;
    case 'start':
        startExperiments()
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
Usage: node experiments.js <cmd>

Commands:
    deploy:   deploy contracts necessary for experiments
    start:    starts the experiments
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


async function deployContracts() {
    const web3 = new Web3(Web3.givenProvider || 'http://localhost:8545');
    const accounts = await web3.eth.getAccounts();
    const ethashContract = new web3.eth.Contract(ETHASH_ABI, null, {
        from: accounts[0],
        gas: 1500000,
        gasPrice: '1000000',
    });
    const ethashInstance = await ethashContract.deploy({
        data: ETHASH_BIN,
        arguments: []
    }).send({
        from: accounts[0],
        gas: 6000000,
        gasPrice: '1000000',
    });
    console.log(`Deployed Ethash: ${ethashInstance.options.address}`);
}
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
// const GENESIS_BLOCK             = 8084509;  // --> change with care, since the ethash contract has to be loaded with the corresponding epoch data
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
//         this.timeout(900000);
//         const fd = openCSVFile('gas-costs');
//         fs.writeSync(fd, "run,submission,dispute\n");
//         const NO_OF_RUNS = 100;
//         console.log(`+++ Starting submission and dispute experiment (${NO_OF_RUNS} block headers) +++`);
//
//         // deposit enough stake
//         const requiredStakePerBlock = await testimonium.getRequiredStakePerBlock();
//         const stake = new BN(NO_OF_RUNS).mul(requiredStakePerBlock);
//         await testimonium.depositStake(stake, {from: accounts[0], value: stake, gasPrice: GAS_PRICE_IN_WEI});
//
//         for (let i = 1; i <= NO_OF_RUNS; i++) {
//             // submit block
//             const blockNumber = GENESIS_BLOCK + i;
//             const block = await sourceWeb3.eth.getBlock(blockNumber);
//             block.hash = calculateBlockHash(block);
//             console.log(`Run ${i}: Submitting block header...`);
//             let ret = await submitBlockHeader(testimonium, block, accounts[0], GAS_PRICE_IN_WEI);
//             const submissionCost = ret.receipt.gasUsed;
//             // dispute block
//             console.log(`Run ${i}: Disputing block header...`);
//             ret = await testimonium.disputeBlockHeader(web3.utils.hexToBytes(block.hash), epochData[blockNumber][0], epochData[blockNumber][1], {
//                 from: accounts[0],
//                 gasPrice: GAS_PRICE_IN_WEI
//             });
//             const disputeCost = ret.receipt.gasUsed;
//             fs.writeSync(fd, `${i},${submissionCost},${disputeCost}\n`);
//         }
//
//         fs.closeSync(fd);
//         console.log(`+++ Done +++`);
//         done();
//     });
//
// });
//
//
// function openCSVFile(filename) {
//     // "w" opens the file if exists in truncate mode, creates the file if does not exist
//     return fs.openSync(`./test/results/${filename}.csv`, "w");
// }
