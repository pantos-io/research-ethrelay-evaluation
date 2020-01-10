# Testimonium Experiments
This project contains the evaluation setup for the [Testimonium blockchain relay](https://github.com/pantos-io/testimonium).
The evaluation is performed using block headers of the main Ethereum network which have been collected between December 2019 - January 2020.

## Prerequisites
* Node.js
* Ethereum node (e.g., [Ganache](https://www.trufflesuite.com/ganache))

Clone the repository and then run `npm install` and `npm link` in the project root. This symlinks the CLI tool as `testimonium-evaluation`.

Before the evaluation, you need to have all the necessary Testimonium smart contracts deployed. 
Make sure Ganache is running, then simply execute `truffle migrate --reset` to deploy the contracts.  

## Setup
The block headers are stored in a PostgreSQL database.
Before running the experiments, set the correct ENV variables required for connecting to the database and 
to the deployed contracts (replacing the corresponding variables with the addresses of the deployed contracts), e.g.,
```shell script
$ export PGUSER=postgres \
    PGHOST=localhost \
    PGPASSWORD=postgres \
    PGDATABASE=blockheader \
    PGPORT=5432 \
    INFURA_ENDPOINT=https://mainnet.infura.io/ \
    ETHASH=0xF8a328B1bEd197E406d08203c9284DEb4325f5b6 \
    TESTIMONIUM_FULL=0x3cA51ba4DbB12765979a6e13bB0c15Af43A66050 \
    TESTIMONIUM_OPTIMISTIC=0x6497AAfB07ef537799D8f5e92166C15C4126eA31 \
    TESTIMONIUM_OPTIMIZED=0x0cD7C9aF07fd115E7a55175B6ae70E3E0A604E4f
```
Then execute the command `testimonium-evaluation setup`.
This configures all smart contracts with the necessary data for the evaluation.

## Start the experiments
Start the experiments with `testimonium-evaluation start`.

---
## Further info
### Cleanup
Execute `npm unlink` to remove the created symlink of the CLI tool. 

### Generate epoch data
The Ethash smart contract needs to be set up with the epoch data required for performing full block validations.
By default the project contains data for epochs 304-308. 
The data is stored in corresponding JSON files like `./epochs/<epoch>.json`

To generate new epoch JSON files, install the [Testimonium Go Client](https://github.com/pantos-io/go-testimonium) 
and run the command `$ go-testimonium submit epoch <epoch> --json`.

