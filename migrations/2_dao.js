const Dao = artifacts.require("Dao");

module.exports = function (deployer, _network, accounts) {
  deployer.deploy(Dao, 2, 2, 50);
};
