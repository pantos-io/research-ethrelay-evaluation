# Testimonium Experiments
This project contains the evaluation setup for the [Testimonium blockchain relay](https://github.com/pantos-io/testimonium).
The evaluation is performed using block headers of the main Ethereum network which have been collected between December 2019 - January 2020.

## Prerequisites
* Node.js
* Ethereum node (e.g., [Ganache](https://www.trufflesuite.com/ganache))

Clone the repository and then run the following commands in the project root:
```shell script
$ npm install
$ npm link
```  

## Setup
The block headers are stored in a PostgreSQL database.
Before running the experiments, set the correct ENV variables required for connecting to the database, e.g.,
```shell script
$ export PGUSER=postgres \
    PGHOST=localhost \
    PGPASSWORD=postgres \
    PGDATABASE=blockheader \
    PGPORT=5432 \
    INFURA_ENDPOINT=https://mainnet.infura.io/
```
Make sure Ganache is running, then run:
 ```
$ testimonium-evaluation setup
```

This deploys and configures all smart contracts with the necessary data for the evaluation.

## Start the evaluation
To start the evaluation run:
 ```
 $ testimonium-evaluation start
```

---
## Further info
### Cleanup
Run `npm unlink` to remove the created symlink.

### Generate epoch data
The Ethash smart contract needs to be set up with the epoch data required for performing full block validations.
By default the project contains data for epochs 304-308. 
The data is stored in corresponding JSON files like `./epochs/<epoch>.json`

To generate new epoch JSON files, install the [Testimonium Go Client](https://github.com/pantos-io/go-testimonium) 
and run the command `$ go-testimonium submit epoch <epoch> --json`.

### Generate merkle proof
TODO

