// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

interface IERC20Metadata is IERC20 {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
}

contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }
}

contract Ownable is Context {
    address private _owner;
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor() {
        _owner = _msgSender();
        emit OwnershipTransferred(address(0), _owner);
    }

    function owner() public view virtual returns (address) {
        return _owner;
    }

    modifier onlyOwner() {
        require(owner() == _msgSender(), "Ownable: caller is not the owner");
        _;
    }

    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }
}

contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;

    constructor() {
        _status = _NOT_ENTERED;
    }

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}

contract Pausable is Context {
    bool private _paused;
    event Paused(address account);
    event Unpaused(address account);

    constructor() {
        _paused = false;
    }

    function paused() public view virtual returns (bool) {
        return _paused;
    }

    modifier whenNotPaused() {
        require(!_paused, "Pausable: paused");
        _;
    }

    modifier whenPaused() {
        require(_paused, "Pausable: not paused");
        _;
    }

    function _pause() internal virtual whenNotPaused {
        _paused = true;
        emit Paused(_msgSender());
    }

    function _unpause() internal virtual whenPaused {
        _paused = false;
        emit Unpaused(_msgSender());
    }
}

contract GameVault is Context, Ownable, ReentrancyGuard, Pausable {
    IERC20Metadata public immutable minerToken;

    address public backendSigner;
    uint256 public withdrawalCooldown;

    struct WithdrawalRequest {
        address user;
        uint256 amount;
        uint256 nonce;
        uint256 cooldownEnd;
        bool executed;
    }

    mapping(address => uint256) public userNonces;
    mapping(bytes32 => WithdrawalRequest) public withdrawalRequests;
    mapping(address => uint256) public deposits;
    mapping(address => uint256) public totalDeposited;
    mapping(address => uint256) public totalWithdrawn;

    uint256 public totalDeposits;
    uint256 public totalWithdrawals;

    event Deposited(address indexed user, uint256 amount, uint256 newBalance);
    event WithdrawalRequested(bytes32 indexed requestId, address indexed user, uint256 amount, uint256 cooldownEnd);
    event WithdrawalExecuted(bytes32 indexed requestId, address indexed user, uint256 amount);
    event WithdrawalCancelled(bytes32 indexed requestId, address indexed user);
    event BackendSignerUpdated(address indexed oldSigner, address indexed newSigner);
    event WithdrawalCooldownUpdated(uint256 oldCooldown, uint256 newCooldown);

    constructor(
        address _minerToken,
        address _backendSigner,
        uint256 _withdrawalCooldown
    ) {
        require(_minerToken != address(0), "GameVault: zero token address");
        require(_backendSigner != address(0), "GameVault: zero signer address");
        minerToken = IERC20Metadata(_minerToken);
        backendSigner = _backendSigner;
        withdrawalCooldown = _withdrawalCooldown;
    }

    modifier onlyBackendSigner() {
        require(msg.sender == backendSigner, "GameVault: caller is not the backend signer");
        _;
    }

    function deposit(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "GameVault: zero amount");

        deposits[msg.sender] += amount;
        totalDeposited[msg.sender] += amount;
        totalDeposits += amount;

        bool success = minerToken.transferFrom(msg.sender, address(this), amount);
        require(success, "GameVault: transfer failed");

        emit Deposited(msg.sender, amount, deposits[msg.sender]);
    }

    function requestWithdrawal(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "GameVault: zero amount");
        require(deposits[msg.sender] >= amount, "GameVault: insufficient deposit");

        bytes32 requestId = keccak256(abi.encodePacked(msg.sender, amount, userNonces[msg.sender]));
        uint256 cooldownEnd = block.timestamp + withdrawalCooldown;

        withdrawalRequests[requestId] = WithdrawalRequest({
            user: msg.sender,
            amount: amount,
            nonce: userNonces[msg.sender],
            cooldownEnd: cooldownEnd,
            executed: false
        });

        userNonces[msg.sender]++;

        emit WithdrawalRequested(requestId, msg.sender, amount, cooldownEnd);
    }

    function executeWithdrawal(
        bytes32 requestId,
        bytes calldata signature
    ) external nonReentrant whenNotPaused onlyBackendSigner {
        WithdrawalRequest storage request = withdrawalRequests[requestId];
        require(!request.executed, "GameVault: already executed");
        require(request.cooldownEnd <= block.timestamp, "GameVault: cooldown not ended");
        require(request.amount > 0, "GameVault: invalid request");

        bytes32 messageHash = keccak256(abi.encodePacked(
            address(this),
            request.user,
            request.amount,
            request.nonce,
            request.cooldownEnd
        ));

        address signer = _recoverSigner(messageHash, signature);
        require(signer == backendSigner, "GameVault: invalid signature");

        request.executed = true;

        deposits[request.user] -= request.amount;
        totalWithdrawn[request.user] += request.amount;
        totalWithdrawals += request.amount;

        bool success = minerToken.transfer(request.user, request.amount);
        require(success, "GameVault: transfer failed");

        emit WithdrawalExecuted(requestId, request.user, request.amount);
    }

    function cancelWithdrawal(bytes32 requestId) external nonReentrant {
        WithdrawalRequest storage request = withdrawalRequests[requestId];
        require(request.user == msg.sender, "GameVault: not your request");
        require(!request.executed, "GameVault: already executed");
        require(request.amount > 0, "GameVault: invalid request");

        request.executed = true;
        request.amount = 0;

        emit WithdrawalCancelled(requestId, msg.sender);
    }

    function setBackendSigner(address _newSigner) external onlyOwner {
        require(_newSigner != address(0), "GameVault: zero address");
        address old = backendSigner;
        backendSigner = _newSigner;
        emit BackendSignerUpdated(old, _newSigner);
    }

    function setWithdrawalCooldown(uint256 _cooldown) external onlyOwner {
        uint256 old = withdrawalCooldown;
        withdrawalCooldown = _cooldown;
        emit WithdrawalCooldownUpdated(old, _cooldown);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function getUserDeposit(address user) external view returns (uint256) {
        return deposits[user];
    }

    function getVaultBalance() external view returns (uint256) {
        return minerToken.balanceOf(address(this));
    }

    function _recoverSigner(bytes32 messageHash, bytes calldata signature) internal pure returns (address) {
        require(signature.length == 65, "GameVault: invalid signature length");
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }

        if (v < 27) v += 27;
        require(v == 27 || v == 28, "GameVault: invalid signature v value");

        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32",
            messageHash
        ));

        return ecrecover(ethSignedMessageHash, v, r, s);
    }

    receive() external payable {}
}
