// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TodoList {
    struct Task {
        string ipfsHash; // IPFS hash (CID) containing task content
        bool isCompleted;
        uint256 createdAt;
    }

    mapping(address => Task[]) private userTasks;

    event TaskCreated(address indexed user, uint256 taskId, string ipfsHash);
    event TaskCompleted(address indexed user, uint256 taskId);
    event TaskDeleted(address indexed user, uint256 taskId);
    event TaskUpdated(address indexed user, uint256 taskId, string newIpfsHash);

    function createTask(string memory _ipfsHash) public {
        require(bytes(_ipfsHash).length > 0, "IPFS hash cannot be empty");

        Task memory newTask = Task({
            ipfsHash: _ipfsHash,
            isCompleted: false,
            createdAt: block.timestamp
        });

        userTasks[msg.sender].push(newTask);
        emit TaskCreated(
            msg.sender,
            userTasks[msg.sender].length - 1,
            _ipfsHash
        );
    }

    function completeTask(uint256 _taskId) public {
        require(_taskId < userTasks[msg.sender].length, "Task does not exist");
        require(
            !userTasks[msg.sender][_taskId].isCompleted,
            "Task already completed"
        );

        userTasks[msg.sender][_taskId].isCompleted = true;
        emit TaskCompleted(msg.sender, _taskId);
    }

    function deleteTask(uint256 _taskId) public {
        require(_taskId < userTasks[msg.sender].length, "Task does not exist");

        // Move the last element to the deleted position and pop the last element
        if (_taskId < userTasks[msg.sender].length - 1) {
            userTasks[msg.sender][_taskId] = userTasks[msg.sender][
                userTasks[msg.sender].length - 1
            ];
        }
        userTasks[msg.sender].pop();

        emit TaskDeleted(msg.sender, _taskId);
    }

    function updateTask(uint256 _taskId, string memory _newIpfsHash) public {
        require(_taskId < userTasks[msg.sender].length, "Task does not exist");
        require(bytes(_newIpfsHash).length > 0, "IPFS hash cannot be empty");

        userTasks[msg.sender][_taskId].ipfsHash = _newIpfsHash;
        emit TaskUpdated(msg.sender, _taskId, _newIpfsHash);
    }

    function getTask(uint256 _taskId) public view returns (Task memory) {
        require(_taskId < userTasks[msg.sender].length, "Task does not exist");
        return userTasks[msg.sender][_taskId];
    }

    function getAllTasks() public view returns (Task[] memory) {
        return userTasks[msg.sender];
    }

    function getTaskCount() public view returns (uint256) {
        return userTasks[msg.sender].length;
    }
}
