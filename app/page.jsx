"use client";
import React, { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useBalance, useWriteContract } from "wagmi";
import { parseUnits } from "viem";

export default function Home() {
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(false);
  const [aiCommand, setAiCommand] = useState("");
  const [aiResponse, setAiResponse] = useState("Bhai, main aapka BillFlow AI assistant hoon. Boliye kya help karu?");
  const [swapFrom, setSwapFrom] = useState("EURC");

  // Send Modules ke UI states
  const [showSendBox, setShowSendBox] = useState(false);
  const [showReceiveBox, setShowReceiveBox] = useState(false);
  const [sendAddress, setSendAddress] = useState("");
  const [sendAmount, setSendAmount] = useState("");

  // Custom utility inputs tracking
  const [billAmounts, setBillAmounts] = useState({
    grocery: "",
    petrol: "",
    internet: "",
    electricity: "",
    water: "",
    rent: "",
    school: "",
    insurance: "",
    others: ""
  });

  const [history, setHistory] = useState([
    { title: "Grocery Payment", type: "Expense", amount: "1.50", date: "Today, 02:15 PM", hash: "0x3bfbab5d5ce0d1a5d682cbc742d3940cf59db0369d173b71ba2a3b8f43bfbcb1" },
    { title: "Petrol/Gas Refill", type: "Expense", amount: "3.00", date: "Yesterday, 06:45 PM", hash: "0xe15d6dbb50178f60930b8a3e3e775f3c022505ea2e351b6c2c2985d2405c8ebc" }
  ]);

  const { data: balanceData, refetch } = useBalance({
    address,
    token: "0x3600000000000000000000000000000000000000",
    chainId: 5042002
  });

  const { writeContractAsync } = useWriteContract();

  const handleInputChange = (key, val) => {
    setBillAmounts({ ...billAmounts, [key]: val });
  };

  // FULLY CORRECTED BROADCASTER: CLEAR INPUTS ON SUCCESS
  const executeBlockchainTransfer = async (targetTitle, targetRecipient, targetAmount, keyName = null) => {
    if (!isConnected) return alert("Pehle Wallet Connect Kijiye Bhai!");
    if (!targetRecipient || !targetAmount || isNaN(targetAmount) || parseFloat(targetAmount) <= 0) {
      return alert("Bhai, pehle amount box mein sahi value type kijiye!");
    }

    try {
      setLoading(true);
      const tx = await writeContractAsync({
        address: "0x3600000000000000000000000000000000000000",
        abi: [{
          name: "transfer",
          type: "function",
          stateMutability: "nonpayable",
          inputs: [
            { name: "recipient", type: "address" },
            { name: "amount", type: "uint256" }
          ],
          outputs: [{ name: "", type: "bool" }]
        }],
        functionName: "transfer",
        args: [targetRecipient, parseUnits(targetAmount, 6)],
      });
      
      const newTx = {
        title: targetTitle,
        type: "Expense",
        amount: targetAmount,
        date: "Just Now",
        hash: tx
      };

      setHistory([newTx, ...history]);
      alert(`${targetTitle} Successful! Ledger Updated.`);
      
      // FIXING BALANCE/AMOUNT SHOW ISSUE: Success hote hi inputs ko automatic reset aur khali karna
      if (keyName) {
        setBillAmounts(prev => ({ ...prev, [keyName]: "" }));
      } else {
        // Agar main send box se transfer hua hai toh unhe clear karo
        setSendAddress("");
        setSendAmount("");
      }

      setTimeout(() => refetch(), 3000);
    } catch (error) {
      console.error(error);
      alert("Transaction Declined!");
    } finally {
      setLoading(false);
    }
  };

  const handleAiChat = () => {
    const cmd = aiCommand.toLowerCase();
    if (cmd.includes("send")) {
      setShowSendBox(true);
    } else {
      setAiResponse("🤖 AI Neuro-Agent: Send system update fixed. Ab success hote hi purana data input fields se automatic saaf ho jayega.");
    }
  };

  return (
    <main style={{ backgroundColor: "#000000", color: "#ffffff", minHeight: "100vh", padding: "1.2rem 1.2rem 4rem 1.2rem", fontFamily: "sans-serif" }}>
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #111", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
        <h1 style={{ color: "#38bdf8", fontSize: "1.6rem", fontWeight: "bold" }}>⚡ BillFlow</h1>
        <ConnectButton />
      </div>

      {/* OVERVIEW PANEL */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ background: "linear-gradient(145deg, #050505, #111111)", padding: "1.2rem", borderRadius: "16px", border: "1px solid #222" }}>
          <h2 style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: "bold", textTransform: "uppercase" }}>📊 Live Crypto Terminal</h2>
          <div style={{ fontSize: "1.8rem", fontWeight: "bold", color: "#4ade80", marginTop: "0.5rem" }}>
            {isConnected ? `${balanceData?.formatted || "0.00000"} USDC` : "Disconnected"}
          </div>
        </div>

        <div style={{ background: "#0a0a0a", padding: "1.2rem", borderRadius: "16px", border: "1px solid #222", display: "flex", gap: "1rem", alignItems: "center" }}>
          <button onClick={() => { setShowSendBox(!showSendBox); setShowReceiveBox(false); }} style={{ flex: 1, background: showSendBox ? "#fbbf24" : "#38bdf8", color: "#000", border: "none", padding: "0.9rem", borderRadius: "12px", fontWeight: "bold", fontSize: "0.95rem", cursor: "pointer" }}>
            🚀 {showSendBox ? "Close Send" : "Send USDC"}
          </button>
          <button onClick={() => { setShowReceiveBox(!showReceiveBox); setShowSendBox(false); }} style={{ flex: 1, background: "transparent", color: "#38bdf8", border: "2px solid #38bdf8", padding: "0.85rem", borderRadius: "12px", fontWeight: "bold", fontSize: "0.95rem", cursor: "pointer" }}>
            📥 {showReceiveBox ? "Close QR" : "Receive QR"}
          </button>
        </div>
      </div>

      {/* SEND TERMINAL */}
      {showSendBox && (
        <div style={{ background: "#0c0a09", padding: "1.5rem", borderRadius: "16px", border: "2px dashed #38bdf8", marginBottom: "1.5rem" }}>
          <h3 style={{ color: "#38bdf8", fontSize: "1.1rem", fontWeight: "bold", marginBottom: "1rem" }}>📤 Instant Web3 Fund Transfer</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div>
              <label style={{ fontSize: "0.8rem", color: "#a8a29e", display: "block", marginBottom: "0.3rem" }}>Recipient Wallet Address</label>
              <input type="text" value={sendAddress} onChange={(e) => setSendAddress(e.target.value)} placeholder="Enter target 0x address..." style={{ width: "100%", background: "#000", border: "1px solid #444", padding: "0.7rem", borderRadius: "8px", color: "#fff" }} />
            </div>
            <div>
              <label style={{ fontSize: "0.8rem", color: "#a8a29e", display: "block", marginBottom: "0.3rem" }}>Amount (USDC)</label>
              <input type="number" value={sendAmount} onChange={(e) => setSendAmount(e.target.value)} placeholder="0.00" style={{ width: "100%", background: "#000", border: "1px solid #444", padding: "0.7rem", borderRadius: "8px", color: "#fff" }} />
            </div>
            <button onClick={() => executeBlockchainTransfer("Direct Fund Transfer", sendAddress, sendAmount)} disabled={loading} style={{ background: "#4ade80", color: "#000", border: "none", padding: "0.8rem", borderRadius: "8px", fontWeight: "bold", marginTop: "0.5rem", cursor: "pointer" }}>
              {loading ? "Confirming..." : "Broadcast Transfer"}
            </button>
          </div>
        </div>
      )}

      {/* RECEIVE GATEWAY */}
      {showReceiveBox && (
        <div style={{ background: "#0c0a09", padding: "1.5rem", borderRadius: "16px", border: "2px dashed #4ade80", marginBottom: "1.5rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <h3 style={{ color: "#4ade80", fontSize: "1.1rem", fontWeight: "bold" }}>📥 Deposit Gateway (Arc Testnet)</h3>
          <div style={{ background: "#fff", padding: "0.8rem", borderRadius: "12px", width: "140px", height: "140px", display: "flex", justifyContent: "center", alignItems: "center" }}>
            <div style={{ width: "120px", height: "120px", background: "repeating-linear-gradient(45deg, #000, #000 10px, #fff 10px, #fff 20px)" }}></div>
          </div>
          <div style={{ width: "100%", textAlign: "center" }}>
            <p style={{ fontSize: "0.8rem", color: "#94a3b8", wordBreak: "break-all", background: "#000", padding: "0.6rem", borderRadius: "8px", border: "1px solid #222" }}>{address || "Wallet Disconnected!"}</p>
            <button onClick={() => { navigator.clipboard.writeText(address || ""); alert("Copied!"); }} style={{ background: "#222", color: "#4ade80", border: "1px solid #4ade80", padding: "0.5rem 1rem", borderRadius: "6px", fontSize: "0.85rem", fontWeight: "bold" }}>Copy Address</button>
          </div>
        </div>
      )}

      {/* AI & TRADING */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ background: "#0f172a", padding: "1.2rem", borderRadius: "16px", border: "1px solid #1e293b" }}>
          <h3 style={{ color: "#fbbf24", fontSize: "0.95rem", fontWeight: "bold", marginBottom: "0.5rem" }}>🤖 AI Neuro-Copilot</h3>
          <p style={{ fontSize: "0.85rem", color: "#94a3b8", minHeight: "45px", backgroundColor: "#020617", padding: "0.6rem", borderRadius: "8px", border: "1px solid #1e293b", marginBottom: "0.6rem" }}>{aiResponse}</p>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input type="text" value={aiCommand} onChange={(e) => setAiCommand(e.target.value)} placeholder="Type command here..." style={{ flex: 1, background: "#000", border: "1px solid #334155", padding: "0.7rem", borderRadius: "8px", color: "#fff" }} />
            <button onClick={handleAiChat} style={{ background: "#fbbf24", color: "#000", border: "none", padding: "0.7rem 1.2rem", borderRadius: "8px", fontWeight: "bold" }}>Ask</button>
          </div>
        </div>

        <div style={{ background: "#052e16", padding: "1.2rem", borderRadius: "16px", border: "1px solid #064e3b" }}>
          <h3 style={{ color: "#4ade80", fontSize: "0.95rem", fontWeight: "bold", marginBottom: "0.5rem" }}>🔄 StableFX Micro-Trading</h3>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#000", padding: "0.7rem", borderRadius: "8px", marginBottom: "0.6rem" }}>
            <select value={swapFrom} onChange={(e) => setSwapFrom(e.target.value)} style={{ background: "transparent", color: "#fff", border: "none", fontWeight: "bold", fontSize: "0.9rem", width: "100%" }}>
              <option value="EURC" style={{background:"#000"}}>EURC (Euro Coin)</option>
              <option value="USYC" style={{background:"#000"}}>USYC (Treasury)</option>
            </select>
          </div>
          <button onClick={() => alert("Simulation Trade")} disabled={!isConnected} style={{ width: "100%", background: "#4ade80", color: "#000", border: "none", padding: "0.75rem", borderRadius: "8px", fontWeight: "bold" }}>Execute Stable-Trade</button>
        </div>
      </div>

      {/* HISTORY */}
      <div style={{ background: "#0a0a0a", padding: "1.2rem", borderRadius: "16px", border: "1px solid #222", marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#f43f5e", marginBottom: "1rem" }}>📋 Live Expense Tracker & History</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {history.map((item, idx) => (
            <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#020617", padding: "0.8rem 1rem", borderRadius: "10px", border: "1px solid #111" }}>
              <div>
                <h4 style={{ fontSize: "0.95rem", fontWeight: "bold", color: "#fff" }}>{item.title}</h4>
                <p style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.2rem" }}>{item.date} • <span style={{ color: "#f43f5e" }}>Expense</span></p>
              </div>
              <div style={{ textAlign: "right", paddingRight: "0.4rem" }}>
                <span style={{ fontSize: "1rem", fontWeight: "bold", color: "#fff" }}>-{item.amount} USDC</span>
                <p style={{ fontSize: "0.75rem", marginTop: "0.2rem" }}>
                  <a href={`https://testnet.arcscan.app/tx/${item.hash}`} target="_blank" rel="noreferrer" style={{ color: "#38bdf8", textDecoration: "none", fontWeight: "bold" }}>Verify ↗</a>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* UTILITIES */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#38bdf8", marginBottom: "0.8rem" }}>⚡ High-Frequency Utilities</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
          <div style={{ background: "#080808", padding: "1.2rem", borderRadius: "14px", border: "1px solid #1c1c1c", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}><span>🛒</span><h4 style={{ fontSize: "1rem", fontWeight: "bold" }}>Grocery Bill</h4></div>
            <input type="number" value={billAmounts.grocery} onChange={(e) => handleInputChange("grocery", e.target.value)} placeholder="0.00" style={{ background: "#000", border: "1px solid #222", padding: "0.5rem", borderRadius: "6px", color: "#fff" }} />
            <button onClick={() => executeBlockchainTransfer("Grocery Bill", "0xbcf83d3b112cbf43b19904e376dd8dee01fe2758", billAmounts.grocery, "grocery")} disabled={!isConnected} style={{ width: "100%", background: "#111", color: "#38bdf8", border: "1px solid #38bdf8", padding: "0.6rem", borderRadius: "8px", fontWeight: "bold" }}>Pay Now</button>
          </div>
          <div style={{ background: "#080808", padding: "1.2rem", borderRadius: "14px", border: "1px solid #1c1c1c", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}><span>⛽</span><h4 style={{ fontSize: "1rem", fontWeight: "bold" }}>Petrol/Gas</h4></div>
            <input type="number" value={billAmounts.petrol} onChange={(e) => handleInputChange("petrol", e.target.value)} placeholder="0.00" style={{ background: "#000", border: "1px solid #222", padding: "0.5rem", borderRadius: "6px", color: "#fff" }} />
            <button onClick={() => executeBlockchainTransfer("Petrol/Gas", "0xbcf83d3b112cbf43b19904e376dd8dee01fe2758", billAmounts.petrol, "petrol")} disabled={!isConnected} style={{ width: "100%", background: "#111", color: "#38bdf8", border: "1px solid #38bdf8", padding: "0.6rem", borderRadius: "8px", fontWeight: "bold" }}>Pay Now</button>
          </div>
          <div style={{ background: "#080808", padding: "1.2rem", borderRadius: "14px", border: "1px solid #1c1c1c", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}><span>📱</span><h4 style={{ fontSize: "1rem", fontWeight: "bold" }}>Mobile/Internet</h4></div>
            <input type="number" value={billAmounts.internet} onChange={(e) => handleInputChange("internet", e.target.value)} placeholder="0.00" style={{ background: "#000", border: "1px solid #222", padding: "0.5rem", borderRadius: "6px", color: "#fff" }} />
            <button onClick={() => executeBlockchainTransfer("Mobile/Internet", "0xbcf83d3b112cbf43b19904e376dd8dee01fe2758", billAmounts.internet, "internet")} disabled={!isConnected} style={{ width: "100%", background: "#111", color: "#38bdf8", border: "1px solid #38bdf8", padding: "0.6rem", borderRadius: "8px", fontWeight: "bold" }}>Pay Now</button>
          </div>
        </div>
      </div>

      {/* OPERATIONAL COSTS */}
      <div style={{ paddingBottom: "1rem" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#94a3b8", marginBottom: "0.8rem" }}>📅 Operational Costs (All Live)</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
          <div style={{ background: "#050505", padding: "1.2rem", borderRadius: "14px", border: "1px solid #222", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}><span>💡</span><h4 style={{ fontSize: "0.95rem", fontWeight: "bold" }}>Electricity Bill</h4></div>
            <input type="number" value={billAmounts.electricity} onChange={(e) => handleInputChange("electricity", e.target.value)} placeholder="0.00" style={{ background: "#000", border: "1px solid #334155", padding: "0.5rem", borderRadius: "6px", color: "#fff" }} />
            <button onClick={() => executeBlockchainTransfer("Electricity Bill", "0xbcf83d3b112cbf43b19904e376dd8dee01fe2758", billAmounts.electricity, "electricity")} disabled={!isConnected || loading} style={{ width: "100%", background: "#38bdf8", color: "#000", border: "none", padding: "0.6rem", borderRadius: "8px", fontWeight: "bold" }}>Pay Bill</button>
          </div>
          <div style={{ background: "#050505", padding: "1.2rem", borderRadius: "14px", border: "1px solid #222", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}><span>💧</span><h4 style={{ fontSize: "0.95rem", fontWeight: "bold" }}>Water Bill</h4></div>
            <input type="number" value={billAmounts.water} onChange={(e) => handleInputChange("water", e.target.value)} placeholder="0.00" style={{ background: "#000", border: "1px solid #334155", padding: "0.5rem", borderRadius: "6px", color: "#fff" }} />
            <button onClick={() => executeBlockchainTransfer("Water Bill", "0xbcf83d3b112cbf43b19904e376dd8dee01fe2758", billAmounts.water, "water")} disabled={!isConnected || loading} style={{ width: "100%", background: "#38bdf8", color: "#000", border: "none", padding: "0.6rem", borderRadius: "8px", fontWeight: "bold" }}>Pay Bill</button>
          </div>
          <div style={{ background: "#050505", padding: "1.2rem", borderRadius: "14px", border: "1px solid #222", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}><span>🏠</span><h4 style={{ fontSize: "0.95rem", fontWeight: "bold" }}>Rent Payment</h4></div>
            <input type="number" value={billAmounts.rent} onChange={(e) => handleInputChange("rent", e.target.value)} placeholder="0.00" style={{ background: "#000", border: "1px solid #334155", padding: "0.5rem", borderRadius: "6px", color: "#fff" }} />
            <button onClick={() => executeBlockchainTransfer("Rent Payment", "0xbcf83d3b112cbf43b19904e376dd8dee01fe2758", billAmounts.rent, "rent")} disabled={!isConnected || loading} style={{ width: "100%", background: "#38bdf8", color: "#000", border: "none", padding: "0.6rem", borderRadius: "8px", fontWeight: "bold" }}>Pay Bill</button>
          </div>
        </div>
      </div>
    </main>
  );
}
