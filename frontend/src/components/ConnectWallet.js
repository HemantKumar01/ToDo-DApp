import React from "react";

import { NetworkErrorMessage } from "./NetworkErrorMessage";

export function ConnectWallet({ connectWallet, networkError, dismiss }) {
  return (
    <div
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
          width: "max(100%, 300px)",
          height: "90vh",
          background: "#ffffffac",
          backdropFilter: "blur(10px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          borderRadius: "20px",
        }}
      >
        <div className="">
          {/* Wallet network should be set to Localhost:8545. */}
          {networkError && (
            <NetworkErrorMessage message={networkError} dismiss={dismiss} />
          )}
        </div>
        <div
          className=""
          style={{
            textAlign: "center",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
          }}
        >
          <img src="/wallet.gif" width="100"></img>
          <p
            style={{
              fontSize: "2rem",
            }}
          >
            Please connect to your wallet.
          </p>
          <button
            className="btn"
            style={{
              background: "#b700ff",
              color: "white",
              padding: "10px 20px",
            }}
            type="button"
            onClick={connectWallet}
          >
            Connect Wallet
          </button>
        </div>
      </div>
    </div>
  );
}
