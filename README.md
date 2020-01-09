# Testimonium Experiments
This project contains experiments for evaluating the gas costs of the [Testimonium blockchain relay](https://github.com/pantos-io/testimonium).
The experiments are performed using block headers of the main Ethereum network which have been collected between December 2019 - January 2020.

## Prerequisites
* Node.js
* Ethereum node (e.g., [Ganache](https://www.trufflesuite.com/ganache))

Clone the repository and then run `npm install` and `npm link` in the project root. This symlinks the CLI tool as `testimonium-evaluation`.

## Setup
The block headers are stored in a PostgreSQL database.
Before running the experiments, set the correct ENV variables required for connecting to the database, e.g.,
```shell script
$ export PGUSER=dbuser \
  PGHOST=database.server.com \
  PGPASSWORD=secretpassword \
  PGDATABASE=mydb \
  PGPORT=3211
```
Make sure your Ethereum node is running, then execute the command `testimonium-evaluation setup`.
This setups all smart contracts necessary for the evaluation.

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

