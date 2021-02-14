const Dao = artifacts.require("Dao");

module.exports = async function (deployer, _network, accounts) {
  await deployer.deploy(Dao, 2, 30, 2);
  const dao = await Dao.deployed();
  await Promise.all([
    dao.contribute({ from: accounts[1], value: 100 }),
    dao.contribute({ from: accounts[2], value: 1000 }),
    dao.contribute({ from: accounts[3], value: 2000 }),
  ]);
  await dao.createProposal("name", 200, accounts[5], { from: accounts[1] });
};
