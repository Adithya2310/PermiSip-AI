// SPDX-License-Identifier: MIT
// Contract Address: 0x82adEeeFE3f79D0d459878F36B44CD178080013d
pragma solidity ^0.8.20;

/**
 * @title IERC20
 * @notice Minimal ERC20 interface for token transfers
 */
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

/**
 * @title PermiSIPAI
 * @notice Main contract for PermiSIP AI DeFAI automation using MetaMask Advanced Permissions
 * @dev Uses ERC-7715 permissions for automated USDC investments
 *      SIP investments use USDC, Agent payments use ETH
 */
contract PermiSIPAI {
    struct Strategy {
        uint8 aavePercent;
        uint8 compoundPercent;
        uint8 uniswapPercent;
    }

    struct SIPPlan {
        address user;
        uint256 planId;           // Database plan ID for reference
        uint256 monthlyAmount;    // Amount in USDC (6 decimals) or ETH
        Strategy strategy;
        uint256 totalDeposited;
        uint256 lastDepositTime;
        uint256 createdAt;
        bool active;
        bool rebalancingEnabled;  // Whether AI rebalancing is enabled
    }

    // User address => Plan ID => SIPPlan (users can have multiple plans)
    mapping(address => mapping(uint256 => SIPPlan)) public userPlans;
    // User address => array of plan IDs
    mapping(address => uint256[]) public userPlanIds;
    // Legacy: User address => single plan (for backward compatibility)
    mapping(address => SIPPlan) public legacyUserPlans;
    
    address public aave;
    address public compound;
    address public uniswap;
    address public owner;
    
    // USDC token address on Sepolia
    address public constant USDC = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;
    
    // Native ETH address constant (ERC-7528)
    address public constant NATIVE_ETH = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    
    // Expert agent address for AI payments
    address public expertAgentAddress;

    event SIPCreated(address indexed user, uint256 indexed planId, uint256 monthlyAmount);
    event DepositExecuted(address indexed user, uint256 indexed planId, uint256 amount);
    event FundsAllocated(address indexed protocol, uint256 amount);
    event PlanCancelled(address indexed user, uint256 indexed planId);
    event PlanPaused(address indexed user, uint256 indexed planId);
    event PlanResumed(address indexed user, uint256 indexed planId);
    event PlanRebalanced(address indexed user, uint256 indexed planId, uint8 aavePercent, uint8 compoundPercent, uint8 uniswapPercent);
    event AgentPaymentExecuted(address indexed user, address indexed agent, uint256 amount);
    event ExpertAgentAddressUpdated(address indexed oldAddress, address indexed newAddress);
    // Legacy events for backward compatibility
    event LegacySIPCreated(address indexed user, uint256 totalAmount, uint256 duration);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(address _aave, address _compound, address _uniswap) {
        aave = _aave;
        compound = _compound;
        uniswap = _uniswap;
        owner = msg.sender;
    }

    // ============================================
    // NEW PLAN-ID BASED FUNCTIONS (Multi-plan support)
    // ============================================

    /**
     * @notice Create a new SIP plan for a user with plan ID and rebalancing option
     * @param planId The database plan ID for reference
     * @param monthlyAmount Monthly investment amount
     * @param aavePercent Percentage allocation to Aave
     * @param compoundPercent Percentage allocation to Compound
     * @param uniswapPercent Percentage allocation to Uniswap
     * @param enableRebalancing Whether to enable AI rebalancing
     */
    function createSIPPlanWithId(
        uint256 planId,
        uint256 monthlyAmount,
        uint8 aavePercent,
        uint8 compoundPercent,
        uint8 uniswapPercent,
        bool enableRebalancing
    ) external {
        require(monthlyAmount > 0, "Monthly amount must be greater than 0");
        require(aavePercent + compoundPercent + uniswapPercent == 100, "Percents must sum to 100");
        require(userPlans[msg.sender][planId].createdAt == 0, "Plan already exists");

        Strategy memory strategy = Strategy({
            aavePercent: aavePercent,
            compoundPercent: compoundPercent,
            uniswapPercent: uniswapPercent
        });

        userPlans[msg.sender][planId] = SIPPlan({
            user: msg.sender,
            planId: planId,
            monthlyAmount: monthlyAmount,
            strategy: strategy,
            totalDeposited: 0,
            lastDepositTime: 0,
            createdAt: block.timestamp,
            active: true,
            rebalancingEnabled: enableRebalancing
        });

        userPlanIds[msg.sender].push(planId);

        emit SIPCreated(msg.sender, planId, monthlyAmount);
    }

    /**
     * @notice Execute a deposit for a specific plan (user must call directly)
     * @param planId The plan ID to execute deposit for
     */
    function depositToPlan(uint256 planId) external payable {
        SIPPlan storage plan = userPlans[msg.sender][planId];
        require(plan.active, "No active plan");
        require(plan.user == msg.sender, "Not plan owner");
        require(msg.value > 0, "Must send ETH");

        _allocateFundsETH(plan, msg.value);

        plan.totalDeposited += msg.value;
        plan.lastDepositTime = block.timestamp;

        emit DepositExecuted(msg.sender, planId, msg.value);
    }

    /**
     * @notice Deposit ETH on behalf of a user's plan (only owner/server can call)
     * @dev Used by the server after executing SIP via spend permissions
     * @param user The user whose plan to deposit to
     * @param planId The plan ID to deposit to
     */
    function depositForUser(address user, uint256 planId) external payable onlyOwner {
        SIPPlan storage plan = userPlans[user][planId];
        require(plan.createdAt > 0, "Plan does not exist");
        require(plan.active, "Plan not active");
        require(msg.value > 0, "Must send ETH");

        _allocateFundsETH(plan, msg.value);

        plan.totalDeposited += msg.value;
        plan.lastDepositTime = block.timestamp;

        emit DepositExecuted(user, planId, msg.value);
    }

    /**
     * @notice Rebalance a user's SIP plan with new strategy allocation
     * @dev Called by the owner (server) after AI generates new strategy
     * @param user The user whose plan is being rebalanced
     * @param planId The plan ID to rebalance
     * @param newAavePercent New percentage allocation to Aave
     * @param newCompoundPercent New percentage allocation to Compound
     * @param newUniswapPercent New percentage allocation to Uniswap
     */
    function rebalance(
        address user,
        uint256 planId,
        uint8 newAavePercent,
        uint8 newCompoundPercent,
        uint8 newUniswapPercent
    ) external onlyOwner {
        SIPPlan storage plan = userPlans[user][planId];
        require(plan.active, "No active plan");
        require(plan.user == user, "User mismatch");
        require(plan.rebalancingEnabled, "Rebalancing not enabled");
        require(newAavePercent + newCompoundPercent + newUniswapPercent == 100, "Percents must sum to 100");

        plan.strategy.aavePercent = newAavePercent;
        plan.strategy.compoundPercent = newCompoundPercent;
        plan.strategy.uniswapPercent = newUniswapPercent;

        emit PlanRebalanced(user, planId, newAavePercent, newCompoundPercent, newUniswapPercent);
    }

    /**
     * @notice Toggle rebalancing for a plan
     * @param planId The plan ID
     * @param enabled Whether to enable rebalancing
     */
    function setRebalancing(uint256 planId, bool enabled) external {
        SIPPlan storage plan = userPlans[msg.sender][planId];
        require(plan.createdAt > 0, "Plan does not exist");
        require(plan.user == msg.sender, "Not plan owner");
        
        plan.rebalancingEnabled = enabled;
    }

    /**
     * @notice Cancel a specific plan
     * @param planId The plan ID to cancel
     */
    function cancelPlanById(uint256 planId) external {
        SIPPlan storage plan = userPlans[msg.sender][planId];
        require(plan.active, "No active plan");
        require(plan.user == msg.sender, "Not plan owner");

        plan.active = false;
        emit PlanCancelled(msg.sender, planId);
    }

    /**
     * @notice Pause a specific plan
     * @param planId The plan ID to pause
     */
    function pausePlanById(uint256 planId) external {
        SIPPlan storage plan = userPlans[msg.sender][planId];
        require(plan.active, "No active plan");
        require(plan.user == msg.sender, "Not plan owner");
        
        plan.active = false;
        emit PlanPaused(msg.sender, planId);
    }

    /**
     * @notice Resume a paused plan
     * @param planId The plan ID to resume
     */
    function resumePlanById(uint256 planId) external {
        SIPPlan storage plan = userPlans[msg.sender][planId];
        require(plan.createdAt > 0, "Plan does not exist");
        require(plan.user == msg.sender, "Not plan owner");
        require(!plan.active, "Plan already active");
        
        plan.active = true;
        emit PlanResumed(msg.sender, planId);
    }

    /**
     * @notice Get a user's SIP plan by ID
     */
    function getPlanById(address user, uint256 planId) external view returns (SIPPlan memory) {
        return userPlans[user][planId];
    }

    /**
     * @notice Get all plan IDs for a user
     */
    function getUserPlanIds(address user) external view returns (uint256[] memory) {
        return userPlanIds[user];
    }

    // ============================================
    // LEGACY FUNCTIONS (Backward compatibility)
    // ============================================

    /**
     * @notice Create a SIP plan (legacy - single plan per user)
     */
    function createSIPPlan(
        uint256 totalAmount,
        uint256 monthlyAmount,
        uint256 duration,
        uint8 aavePercent,
        uint8 compoundPercent,
        uint8 uniswapPercent
    ) external payable {
        require(msg.value == totalAmount, "Send correct ETH amount");
        require(monthlyAmount <= totalAmount, "Monthly amount exceeds total");
        require(aavePercent + compoundPercent + uniswapPercent == 100, "Percents must sum to 100");
        require(!legacyUserPlans[msg.sender].active, "Plan already exists");

        Strategy memory strategy = Strategy({
            aavePercent: aavePercent,
            compoundPercent: compoundPercent,
            uniswapPercent: uniswapPercent
        });

        legacyUserPlans[msg.sender] = SIPPlan({
            user: msg.sender,
            planId: 0,
            monthlyAmount: monthlyAmount,
            strategy: strategy,
            totalDeposited: 0,
            lastDepositTime: 0,
            createdAt: block.timestamp,
            active: true,
            rebalancingEnabled: false
        });

        emit LegacySIPCreated(msg.sender, totalAmount, duration);

        // Execute first deposit immediately
        _executeDeposit(msg.sender, totalAmount);
    }

    function _executeDeposit(address user, uint256 amount) internal {
        SIPPlan storage plan = legacyUserPlans[user];
        require(plan.active, "No active plan");

        _allocateFundsETH(plan, amount);

        plan.totalDeposited += amount;
        plan.lastDepositTime = block.timestamp;

        emit DepositExecuted(user, 0, amount);
    }

    /**
     * @notice Internal function to allocate ETH funds to protocols based on strategy
     */
    function _allocateFundsETH(SIPPlan storage plan, uint256 amount) internal {
        // Calculate amounts for each protocol
        uint256 aaveAmount = (amount * plan.strategy.aavePercent) / 100;
        uint256 compoundAmount = (amount * plan.strategy.compoundPercent) / 100;
        uint256 uniswapAmount = (amount * plan.strategy.uniswapPercent) / 100;

        // Send to mock protocols
        if (aaveAmount > 0) {
            (bool success1, ) = aave.call{value: aaveAmount}("");
            require(success1, "Aave deposit failed");
            emit FundsAllocated(aave, aaveAmount);
        }

        if (compoundAmount > 0) {
            (bool success2, ) = compound.call{value: compoundAmount}("");
            require(success2, "Compound deposit failed");
            emit FundsAllocated(compound, compoundAmount);
        }

        if (uniswapAmount > 0) {
            (bool success3, ) = uniswap.call{value: uniswapAmount}("");
            require(success3, "Uniswap deposit failed");
            emit FundsAllocated(uniswap, uniswapAmount);
        }
    }

    /**
     * @notice Internal function to allocate USDC funds to protocols based on strategy
     */
    function _allocateFundsUSDC(SIPPlan storage plan, uint256 amount) internal {
        // Calculate amounts for each protocol
        uint256 aaveAmount = (amount * plan.strategy.aavePercent) / 100;
        uint256 compoundAmount = (amount * plan.strategy.compoundPercent) / 100;
        uint256 uniswapAmount = (amount * plan.strategy.uniswapPercent) / 100;

        IERC20 usdc = IERC20(USDC);

        // Transfer USDC to protocols
        if (aaveAmount > 0) {
            require(usdc.transfer(aave, aaveAmount), "Aave transfer failed");
            emit FundsAllocated(aave, aaveAmount);
        }

        if (compoundAmount > 0) {
            require(usdc.transfer(compound, compoundAmount), "Compound transfer failed");
            emit FundsAllocated(compound, compoundAmount);
        }

        if (uniswapAmount > 0) {
            require(usdc.transfer(uniswap, uniswapAmount), "Uniswap transfer failed");
            emit FundsAllocated(uniswap, uniswapAmount);
        }
    }

    /**
     * @notice Get a user's SIP plan (legacy)
     */
    function getPlan(address user) external view returns (SIPPlan memory) {
        return legacyUserPlans[user];
    }

    /**
     * @notice Cancel a SIP plan (legacy)
     */
    function cancelPlan() external {
        SIPPlan storage plan = legacyUserPlans[msg.sender];
        require(plan.active, "No active plan");

        plan.active = false;
        emit PlanCancelled(msg.sender, 0);
    }

    /**
     * @notice Pause a SIP plan (legacy)
     */
    function pausePlan() external {
        SIPPlan storage plan = legacyUserPlans[msg.sender];
        require(plan.active, "No active plan");
        
        plan.active = false;
        emit PlanPaused(msg.sender, 0);
    }

    /**
     * @notice Resume a paused SIP plan (legacy)
     */
    function resumePlan() external {
        SIPPlan storage plan = legacyUserPlans[msg.sender];
        require(!plan.active, "Plan already active");
        require(plan.user == msg.sender, "No plan found");
        
        plan.active = true;
        emit PlanResumed(msg.sender, 0);
    }

    // ============================================
    // OWNER FUNCTIONS
    // ============================================

    /**
     * @notice Set the expert agent address for AI payments
     */
    function setExpertAgentAddress(address _expertAgentAddress) external onlyOwner {
        address oldAddress = expertAgentAddress;
        expertAgentAddress = _expertAgentAddress;
        emit ExpertAgentAddressUpdated(oldAddress, _expertAgentAddress);
    }

    /**
     * @notice Transfer ownership
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }

    receive() external payable {}
}