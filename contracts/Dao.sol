pragma solidity ^0.5.2;

contract DAO {
    struct Proposal {
        uint256 id;
        string name;
        uint256 amount;
        address payable recipient;
        uint256 votes;
        uint256 end;
        bool executed;
    }

    mapping(uint256 => Proposal) public proposals;
    uint256 public nextProposalId;
    mapping(address => mapping(uint256 => bool)) public votes;
    uint256 public voteTime;
    uint256 public quorum;
    address public admin;

    // Verify the investor
    mapping(address => bool) public investors;
    // Keep track how much money is allocated to a specific investor
    mapping(address => uint256) public shares;
    uint256 public totalShares;
    uint256 public availableFunds;
    uint256 public contributionEnd;

    constructor(
        uint256 contributionTime,
        uint256 _voteTime,
        uint256 _quorum // percent
    ) public {
        require(
            _quorum > 0 && _quorum < 100,
            "Quorum must be between 0 and 100"
        );
        contributionEnd = now + contributionTime;
        voteTime = _voteTime;
        quorum = _quorum;
        admin = msg.sender;
    }

    function getProposalId(uint256 id) external view returns (uint256) {
        return proposals[id].id;
    }

    function contribute() external payable {
        require(
            now < contributionEnd,
            "Cannot contribute after contribution period"
        );
        investors[msg.sender] = true;
        shares[msg.sender] += msg.value;
        totalShares += msg.value;
        availableFunds += msg.value;
    }

    // For collecting funds from shares
    function redeemShare(uint256 amount) external {
        require(shares[msg.sender] >= amount, "Not enough shares");
        require(availableFunds >= amount, "Not enough available funds");
        shares[msg.sender] -= amount;
        availableFunds -= amount;
        msg.sender.transfer(amount);
    }

    // For selling shares to new investors
    function transferShare(uint256 amount, address to) external {
        require(shares[msg.sender] >= amount, "Not enough shares");
        shares[msg.sender] -= amount;
        shares[to] += amount;
        investors[to] = true;
    }

    function createProposal(
        string calldata name,
        uint256 amount,
        address payable recipient
    ) external onlyInvestors {
        require(availableFunds >= amount, "Amount too big");
        proposals[nextProposalId] = Proposal(
            nextProposalId,
            name,
            amount,
            recipient,
            0,
            now + voteTime,
            false
        );
        availableFunds -= amount;
        nextProposalId++;
    }

    function vote(uint256 proposalId) external onlyInvestors {
        // Point to the right proposal
        Proposal storage proposal = proposals[proposalId];
        // Make sure that investor has not voted before
        require(
            votes[msg.sender][proposalId] == false,
            "Investor can only vote once for a proposal"
        );
        require(now < proposal.end, "Can only vote until proposal ends");
        // Prevent double voting
        votes[msg.sender][proposalId] = true;
        // Increment the number of votes by the weight of the investor
        proposal.votes += shares[msg.sender];
    }

    function executeProposal(uint256 proposalId) external onlyAdmin {
        // Point to the right proposal
        Proposal storage proposal = proposals[proposalId];
        // Check that voting period has ended for proposal
        require(now >= proposal.end, "Cannot execute proposal before end date");
        // Make sure that the proposal has not been executed yet
        require(
            proposal.executed == false,
            "Cannot execute a proposal that has already been executed"
        );
        // Make sure the proposal has enough votes
        require(
            ((proposal.votes * 100) / totalShares) >= quorum,
            "Cannot execute proposal with votes below quorum"
        );
        proposal.executed = true;
        _transferEther(proposal.amount, proposal.recipient);
    }

    // For emergencies
    function withdrawEther(uint256 amount, address payable to)
        external
        onlyAdmin
    {
        _transferEther(amount, to);
    }

    // Fallback function
    function() external payable {
        availableFunds += msg.value;
    }

    function _transferEther(uint256 amount, address payable to) internal {
        require(amount <= availableFunds, "Not enough available funds");
        availableFunds -= amount;
        to.transfer(amount);
    }

    modifier onlyInvestors() {
        require(investors[msg.sender] == true, "Investors only");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Admin only");
        _;
    }
}
