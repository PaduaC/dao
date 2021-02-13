const { expectRevert, time } = require('@openzeppelin/test-helpers');
const Dao = artifacts.require("Dao");

contract("Dao", (accounts) => {
    let dao = null;
    const [investor1, investor2, investor3] = [
        accounts[1],
        accounts[2],
        accounts[3],
    ];
    before(async() => {
        dao = await Dao.new(2, 2, 50);
    });

    it('Should accept contribution', async() => {
        await dao.contribute({ from: investor1, value: 100 });
        await dao.contribute({ from: investor2, value: 200 });
        await dao.contribute({ from: investor3, value: 300 });

        const share1 = await dao.shares(investor1);
        const share2 = await dao.shares(investor2);
        const share3 = await dao.shares(investor3);

        const isInvestor1 = await dao.investors(investor1);
        const isInvestor2 = await dao.investors(investor2);
        const isInvestor3 = await dao.investors(investor3);
        const totalShares = await dao.totalShares();
        const availableFunds = await dao.availableFunds();

        assert(share1.toNumber() === 100);
        assert(share2.toNumber() === 200);
        assert(share3.toNumber() === 300);
        assert(isInvestor1 === true);
        assert(isInvestor2 === true);
        assert(isInvestor3 === true);
        assert(totalShares.toNumber() === 600);
        assert(availableFunds.toNumber() === 600);
    });

    it('Should NOT accept contribution after contribution time', async() => {
        await time.increase(2001);
        await expectRevert(
            dao.contribute({ from: investor1, value: 100 }),
            'Cannot contribute after contribution period'
        );
    });

    it('Should create proposal', async() => {
        await dao.createProposal('name', 100, accounts[4], { from: investor1 });
        const proposal = await dao.proposals(0);
        assert(proposal.name === 'name');
        assert(proposal.recipient === accounts[4]);
        assert(proposal.amount.toNumber() === 100);
        assert(proposal.votes.toNumber() === 0);
        assert(proposal.executed === false);
    });

    it('Should NOT create proposal if not from investor', async() => {
        await expectRevert(
            dao.createProposal('name2', 100, accounts[4], { from: accounts[5] }),
            'Investors only'
        )
    });

    it('Should NOT create proposal if amount too big', async() => {
        await expectRevert(
            dao.createProposal('name2', 1000, accounts[4], { from: investor1 }),
            'Amount too big'
        )
    });

    it('Should vote', async() => {
        const vote = await dao.vote(0, { from: investor1 });
    });

    it('Should NOT vote if not investor', async() => {
        await expectRevert(
            dao.vote(0, { from: accounts[5] }),
            'Investors only'
        )
    });

    it('Should NOT vote if already voted', async() => {
        await expectRevert(
            dao.vote(0, { from: investor1 }),
            'Investor can only vote once for a proposal'
        );
    });

    it('Should NOT vote if after proposal end date', async() => {
        await time.increase(2001);
        await expectRevert(
            dao.vote(0, { from: investor2 }),
            'Can only vote until proposal ends'
        );
    });

    it('Should execute proposal', async() => {
        await dao.createProposal('name2', 100, accounts[4], { from: investor1 });
        await dao.vote(1, { from: investor1 });
        await dao.vote(1, { from: investor3 });
        await time.increase(2001);
        await dao.executeProposal(1);
    });

    it('Should NOT execute proposal if not enough votes', async() => {
        await dao.createProposal('name3', 100, accounts[4], { from: investor1 });
        await dao.vote(2, { from: investor1 });
        await time.increase(2001);
        await expectRevert(
            dao.executeProposal(2),
            'Cannot execute proposal with votes below quorum'
        )
    });

    it('Should NOT execute proposal twice', async() => {
        await expectRevert(
            dao.executeProposal(1),
            'Cannot execute a proposal that has already been executed'
        )
    });

    it('Should NOT execute proposal before end date', async() => {
        await dao.createProposal('name4', 10, accounts[4], { from: investor1 });
        await dao.vote(3, { from: investor1 });
        await dao.vote(3, { from: investor2 });
        await expectRevert(
            dao.executeProposal(3),
            "Cannot execute proposal before end date"
        )
    });

    it('Should withdraw ether', async() => {
        const balanceBefore = await web3.eth.getBalance(accounts[4]);
        await dao.withdrawEther(10, accounts[4]);
        const balanceAfter = await web3.eth.getBalance(accounts[4]);
        const balanceBeforeBN = web3.utils.toBN(balanceBefore);
        const balanceAfterBN = web3.utils.toBN(balanceAfter);
        assert(balanceAfterBN.sub(balanceBeforeBN).toNumber() === 10);
    });

    it('Should NOT withdraw ether if not admin', async() => {
        await expectRevert(
            dao.withdrawEther(10, accounts[4], { from: investor3 }),
            "Admin only"
        )
    });

    it('Should NOT withdraw ether if trying to withdraw too much', async() => {
        await expectRevert(
            dao.withdrawEther(1000, accounts[4]),
            "Not enough available funds"
        )
    });

});