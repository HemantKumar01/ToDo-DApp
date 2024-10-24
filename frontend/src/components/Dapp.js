import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import axios from "axios";

// Import TodoList artifacts
import TodoListArtifact from "../contracts/TodoList.json";
import contractAddress from "../contracts/contract-address.json";

import { NoWalletDetected } from "./NoWalletDetected";
import { ConnectWallet } from "./ConnectWallet";
import { Loading } from "./Loading";
import { TransactionErrorMessage } from "./TransactionErrorMessage";
import { WaitingForTransactionMessage } from "./WaitingForTransactionMessage";

const HARDHAT_NETWORK_ID = "31337";
const ERROR_CODE_TX_REJECTED_BY_USER = 4001;

// Pinata configuration
const PINATA_API_KEY = process.env.REACT_APP_PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.REACT_APP_PINATA_SECRET_KEY;

export function Dapp() {
  const [todoList, setTodoList] = useState();
  const [selectedAddress, setSelectedAddress] = useState();
  const [tasks, setTasks] = useState([]);
  const [txBeingSent, setTxBeingSent] = useState();
  const [transactionError, setTransactionError] = useState();
  const [networkError, setNetworkError] = useState();
  const [provider, setProvider] = useState();
  const [pollDataInterval, setPollDataInterval] = useState();
  const [taskContents, setTaskContents] = useState({});

  // Function to upload to IPFS via Pinata
  const uploadToPinata = async (content) => {
    try {
      const data = JSON.stringify({
        pinataOptions: {
          cidVersion: 1,
        },
        pinataMetadata: {
          name: "todo-task",
        },
        pinataContent: {
          content,
          timestamp: Date.now(),
        },
      });

      const response = await axios.post(
        "https://api.pinata.cloud/pinning/pinJSONToIPFS",
        data,
        {
          headers: {
            "Content-Type": "application/json",
            pinata_api_key: PINATA_API_KEY,
            pinata_secret_api_key: PINATA_SECRET_KEY,
          },
        }
      );

      return response.data.IpfsHash;
    } catch (error) {
      console.error("Error uploading to Pinata:", error);
      throw error;
    }
  };

  // Function to fetch content from IPFS
  const fetchIPFSContent = async (ipfsHash) => {
    try {
      const response = await axios.get(
        `https://gateway.pinata.cloud/ipfs/${ipfsHash}`
      );
      return response.data.content;
    } catch (error) {
      console.error("Error fetching from IPFS:", error);
      return "Error loading content";
    }
  };

  // Initialize ethers
  const initializeEthers = useCallback(async () => {
    const newProvider = new ethers.providers.Web3Provider(window.ethereum);
    setProvider(newProvider);

    const newTodoList = new ethers.Contract(
      contractAddress.TodoList,
      TodoListArtifact.abi,
      newProvider.getSigner(0)
    );
    setTodoList(newTodoList);
  }, []);

  // Update tasks
  const updateTasks = useCallback(async () => {
    if (!todoList) return;
    try {
      const newTasks = await todoList.getAllTasks();
      setTasks(newTasks);

      // Fetch content for new tasks
      const newTaskContents = { ...taskContents };
      for (const task of newTasks) {
        if (!newTaskContents[task.ipfsHash]) {
          newTaskContents[task.ipfsHash] = await fetchIPFSContent(
            task.ipfsHash
          );
        }
      }
      setTaskContents(newTaskContents);
    } catch (error) {
      console.error(error);
    }
  }, [todoList, taskContents]);

  // Create task
  const createTask = async (content) => {
    try {
      setTransactionError(undefined);

      // Upload content to IPFS via Pinata
      const ipfsHash = await uploadToPinata(content);

      const tx = await todoList.createTask(ipfsHash);
      setTxBeingSent(tx.hash);

      const receipt = await tx.wait();

      if (receipt.status === 0) {
        throw new Error("Transaction failed");
      }

      // Update task contents cache
      setTaskContents((prev) => ({
        ...prev,
        [ipfsHash]: content,
      }));

      await updateTasks();
    } catch (error) {
      if (error.code === ERROR_CODE_TX_REJECTED_BY_USER) {
        return;
      }
      console.error(error);
      setTransactionError(error);
    } finally {
      setTxBeingSent(undefined);
    }
  };
  // Start polling data
  const startPollingData = useCallback(() => {
    const newPollDataInterval = setInterval(() => updateTasks(), 1000);
    setPollDataInterval(newPollDataInterval);
    updateTasks();
  }, [updateTasks]);

  // Stop polling data
  const stopPollingData = useCallback(() => {
    if (pollDataInterval) {
      clearInterval(pollDataInterval);
      setPollDataInterval(undefined);
    }
  }, [pollDataInterval]);

  // Initialize
  const initialize = useCallback(
    async (userAddress) => {
      setSelectedAddress(userAddress);
      initializeEthers();
      startPollingData();
    },
    [initializeEthers, startPollingData]
  );

  // Connect wallet
  const connectWallet = async () => {
    const [address] = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    checkNetwork();
    initialize(address);
  };

  // Switch chain
  const switchChain = async () => {
    const chainIdHex = `0x${HARDHAT_NETWORK_ID.toString(16)}`;
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
    await initialize(selectedAddress);
  };

  // Check network
  const checkNetwork = () => {
    if (window.ethereum.networkVersion !== HARDHAT_NETWORK_ID) {
      switchChain();
    }
  };

  // Complete task
  const completeTask = async (taskId) => {
    try {
      setTransactionError(undefined);

      const tx = await todoList.completeTask(taskId);
      setTxBeingSent(tx.hash);

      const receipt = await tx.wait();

      if (receipt.status === 0) {
        throw new Error("Transaction failed");
      }

      await updateTasks();
    } catch (error) {
      if (error.code === ERROR_CODE_TX_REJECTED_BY_USER) {
        return;
      }
      console.error(error);
      setTransactionError(error);
    } finally {
      setTxBeingSent(undefined);
    }
  };

  // Delete task
  const deleteTask = async (taskId) => {
    try {
      setTransactionError(undefined);

      const tx = await todoList.deleteTask(taskId);
      setTxBeingSent(tx.hash);

      const receipt = await tx.wait();

      if (receipt.status === 0) {
        throw new Error("Transaction failed");
      }

      await updateTasks();
    } catch (error) {
      if (error.code === ERROR_CODE_TX_REJECTED_BY_USER) {
        return;
      }
      console.error(error);
      setTransactionError(error);
    } finally {
      setTxBeingSent(undefined);
    }
  };

  // Handle account changes
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", ([newAddress]) => {
        stopPollingData();
        if (newAddress === undefined) {
          // Reset state
          setTodoList(undefined);
          setSelectedAddress(undefined);
          setTasks([]);
          setTxBeingSent(undefined);
          setTransactionError(undefined);
          setNetworkError(undefined);
          setTaskContents({});
          return;
        }
        initialize(newAddress);
      });
    }
  }, [stopPollingData, initialize]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPollingData();
    };
  }, [stopPollingData]);

  useEffect(() => {
    if (todoList) {
      updateTasks();
    }
  }, [todoList, updateTasks]);

  // Check for ethereum wallet
  if (window.ethereum === undefined) {
    return <NoWalletDetected />;
  }

  // Show connect wallet if not connected
  if (!selectedAddress) {
    return (
      <ConnectWallet
        connectWallet={connectWallet}
        networkError={networkError}
        dismiss={() => setNetworkError(undefined)}
      />
    );
  }

  // Show loading if contract not initialized
  if (!todoList) {
    return <Loading />;
  }

  return (
    <div className="container p-4">
      <div className="row">
        <div className="col-12">
          <h1>Todo List</h1>
          <p>
            Welcome <b>{selectedAddress}</b>
          </p>
        </div>
      </div>

      <hr />

      <div className="row">
        <div className="col-12">
          {txBeingSent && <WaitingForTransactionMessage txHash={txBeingSent} />}

          {transactionError && (
            <TransactionErrorMessage
              message={
                transactionError.data?.message || transactionError.message
              }
              dismiss={() => setTransactionError(undefined)}
            />
          )}
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          {/* Add new task form */}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.target);
              createTask(formData.get("taskContent"));
              event.target.reset();
            }}
          >
            <div className="form-group">
              <input
                className="form-control"
                type="text"
                name="taskContent"
                placeholder="Enter new task"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Add Task
            </button>
          </form>

          {/* Task list */}
          <div className="mt-4">
            <h2>Your Tasks</h2>
            {tasks.map((task, index) => (
              <div key={index} className="card mb-2">
                <div className="card-body d-flex justify-content-between align-items-center">
                  <div>
                    <p
                      className={task.isCompleted ? "text-muted mb-0" : "mb-0"}
                    >
                      {taskContents[task.ipfsHash] || "Loading..."}
                    </p>
                    <small className="text-muted">
                      Created:{" "}
                      {new Date(task.createdAt * 1000).toLocaleString()}
                    </small>
                    <br />
                    <small className="text-muted">
                      IPFS Hash: {task.ipfsHash}
                    </small>
                  </div>
                  <div>
                    {!task.isCompleted && (
                      <button
                        className="btn btn-success btn-sm mr-2"
                        onClick={() => completeTask(index)}
                      >
                        Complete
                      </button>
                    )}
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => deleteTask(index)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
