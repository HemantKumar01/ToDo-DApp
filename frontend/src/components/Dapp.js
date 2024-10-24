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

const chain_id = "11155111";
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

  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Function to upload to IPFS via Pinata
  const uploadToPinata = async (content) => {
    try {
      setLoading(true);
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
      setLoading(false);
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
    const chainIdHex = `0x${chain_id.toString(16)}`;
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
    await initialize(selectedAddress);
  };

  // Check network
  const checkNetwork = () => {
    if (window.ethereum.networkVersion !== chain_id) {
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
    <div
      className=""
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        width: "100vw",
        padding: "30px",
        background: "linear-gradient(-45deg, #6596ff, #b700ff)",
        fontFamily: "Poppins, Roboto, sans-serif",
      }}
    >
      <div
        style={{
          backgroundColor: "#000000c7",
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: "100",
          display: loading ? "flex" : "none",
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
        }}
      >
        <div class="spinner-border text-light" role="status"></div>
        <span
          class=""
          style={{
            color: "white",
            textAlign: "center",
            marginTop: "10px",
            fontSize: "1.1em",
          }}
        >
          Uploading to IPFS..
        </span>
      </div>

      <div
        style={{
          backgroundColor: "#000000c7",
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: "100",
          display: showAddModal ? "grid" : "none",
          placeContent: "center",
        }}
      >
        <form
          style={{
            padding: "50px",
            background: "#ffffff",
            minHeight: "50vh",
            minWidth: "30vw",
            borderRadius: "30px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexDirection: "column",
          }}
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.target);
            createTask(formData.get("taskContent"));
            event.target.reset();
            setShowAddModal(false);
          }}
        >
          <h3>Add New Task</h3>
          <div className="form-group">
            <input
              className="form-control"
              type="text"
              name="taskContent"
              placeholder="Enter Task"
              required
              style={{
                paddingBlock: "25px",
                fontSize: "1.5em",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "20px",
            }}
          >
            <button
              className="btn btn-secondary"
              style={{
                padding: "10px 20px",
              }}
              onClick={(e) => {
                e.preventDefault();
                setShowAddModal(false);
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                padding: "10px 20px",
              }}
            >
              Add Task
            </button>
          </div>
        </form>
      </div>
      <div
        className=""
        style={{
          width: "max(100%, 300px)",
          height: "90vh",
          background: "#ffffffac",
          backdropFilter: "blur(10px)",
          display: "flex",
          justifyContent: "flex-start",
          alignItems: "center",
          flexDirection: "column",
          borderRadius: "20px",
          paddingBlock: "50px",
          paddingInline: "50px",
          overflow: "auto",
        }}
      >
        <div>
          <div
            className=""
            style={{
              textAlign: "center",
            }}
          >
            <h1>Todo List</h1>
            <p>
              Welcome <b>{selectedAddress}</b>
            </p>
          </div>
        </div>

        <hr />

        <button
          className="btn"
          style={{
            background: "#b700ff",
            color: "white",
            padding: "10px 20px",
          }}
          onClick={() => {
            setShowAddModal(true);
          }}
        >
          + Add Task
        </button>
        <div className="">
          <div className="">
            {/* Add new task form */}

            {/* Task list */}
            <div className="mt-4">
              <h2
                style={{
                  width: "100%",
                  textAlign: "center",
                }}
              >
                Your Tasks
              </h2>
              <div className="">
                <div className="col-12">
                  {txBeingSent && (
                    <WaitingForTransactionMessage txHash={txBeingSent} />
                  )}

                  {transactionError && (
                    <TransactionErrorMessage
                      message={
                        transactionError.data?.message ||
                        transactionError.message
                      }
                      dismiss={() => setTransactionError(undefined)}
                    />
                  )}
                </div>
              </div>
              <div>
                {tasks.map((task, index) => (
                  <div
                    key={index}
                    className="card mb-2"
                    style={{
                      borderRadius: "10px",
                      background: task.isCompleted ? "#00ffa227" : "#ffffff58",
                      border: "none",
                      boxShadow: task.isCompleted
                        ? "5px 5px 0 #008e5a"
                        : "5px 5px 0 #b700ff",
                      marginBlock: "20px",
                      paddingInline: "30px",
                      paddingLeft: "55px",
                    }}
                  >
                    <button
                      className="btn"
                      style={{
                        position: "absolute",
                        left: "20px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#008e5a",
                        background: task.isCompleted
                          ? "#00ffa255"
                          : "transparent",
                        border: "2px solid currentColor",
                        borderRadius: "10px",
                        width: "30px",
                        height: "30px",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        padding: 0,
                      }}
                      onClick={() => completeTask(index)}
                    >
                      {task.isCompleted && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          class="lucide lucide-check-check"
                        >
                          <path d="M18 6 7 17l-5-5" />
                          <path d="m22 10-7.5 7.5L13 16" />
                        </svg>
                      )}
                    </button>

                    <div className="card-body d-flex justify-content-between align-items-center">
                      <div>
                        <p
                          className="mb-0"
                          style={{
                            textDecoration: task.isCompleted
                              ? "line-through"
                              : "none",
                          }}
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
                        <button
                          className=""
                          style={{
                            color: "#9e0000c0",
                            background: "transparent",
                            border: "none",
                          }}
                          onClick={() => deleteTask(index)}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            class="lucide lucide-trash-2"
                          >
                            <path d="M3 6h18" />
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            <line x1="10" x2="10" y1="11" y2="17" />
                            <line x1="14" x2="14" y1="11" y2="17" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
