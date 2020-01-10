const Ethash = artifacts.require("Ethash");

module.exports = async function(deployer) {

  // deploy Ethash
  await deployer.deploy(Ethash);

};
