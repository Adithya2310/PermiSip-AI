# **PermiSIP AI**

### Permissioned, Agent-Driven SIP Automation using MetaMask Advanced Permissions

---

## 🚀 Overview

**PermiSIP AI** is an AI-powered, goal-based SIP (Systematic Investment Plan) platform that uses **MetaMask Advanced Permissions (ERC-7715)** to enable fully automated, permissioned investing.

Instead of users manually executing monthly investments, **PermiSIP AI allows users to delegate limited, fine-grained permissions to an AI agent**. The agent designs an investment plan based on user goals and executes it automatically on a fixed schedule — **without repeated wallet prompts**.

The system is built as a **prototype for the MetaMask Advanced Permissions Hackathon**, focusing on:

* Safe delegation
* Clear user consent
* Automated execution
* AI-assisted decision making

---

## 🎯 Problem Statement

Traditional SIP and automated investment systems face three major issues:

1. **Manual Execution**

   * Users must approve every transaction.
   * Automation breaks wallet UX.

2. **Over-Permissioned Automation**

   * Bots often require full wallet access.
   * High risk and poor user trust.

3. **Lack of Intelligence**

   * Static investment rules.
   * No goal-based or adaptive planning.

---

## 💡 Solution

**PermiSIP AI solves this by combining:**

* **AI agents** for goal-based planning
* **MetaMask Advanced Permissions (ERC-7715)** for scoped delegation
* **Smart contracts** as the financial source of truth
* **Vercel Cron** for automated execution

Users grant **explicit, limited permissions** (e.g. monthly spend limits), and the AI agent executes investments responsibly within those constraints.

---

## 🧠 Core Concept

> **“Permit an AI agent once, and let it invest responsibly for you.”**

---

## 🧩 Architecture Overview

### High-Level Flow

```
User → Goal Input
     → AI Planning (Agents)
     → User Approval
     → MetaMask Advanced Permissions
     → Automated Monthly Execution
```

---

### Key Components

#### 1. **Next.js Application**

* Frontend UI
* API routes acting as AI agents
* Smart account interaction

#### 2. **AI Agent System**

* **Basic Agent (Orchestrator)**

  * Interprets user goals
  * Queries advanced agents
  * Generates SIP plan
* **Advanced Agents (Decision-only)**

  * Risk assessment
  * Yield estimation
  * Protocol allocation

> Agents communicate via internal API routes (no external services).

---

#### 3. **Smart Contracts (On-chain Logic)**

The smart contract:

* Stores SIP plans
* Holds investment strategy
* Executes monthly deposits
* Acts as the **single source of truth**

Protocols like **Aave, Compound, Uniswap** are **mocked** for the demo.

---

#### 4. **MetaMask Advanced Permissions (ERC-7715)**

Used to:

* Allow recurring monthly execution
* Enforce spending limits
* Avoid repeated wallet prompts
* Maintain user custody at all times

---

#### 5. **Vercel KV + Cron**

* **Vercel KV** stores only active user addresses (no financial data)
* **Vercel Cron** triggers monthly execution automatically

---

## 🔄 User Flow (Step-by-Step)

1. **User enters a financial goal**

   ```
   “I want to save $10,000 in 1 year to buy a car”
   ```

2. **Basic AI Agent**

   * Parses the goal
   * Calculates monthly investment
   * Queries advanced agents

3. **Advanced Agents respond**

   * Risk profile (low / medium)
   * Expected APY
   * Protocol allocation

4. **User sees a generated plan**

   ```
   Monthly Investment: $800
   Allocation:
   - Aave: 60%
   - Compound: 30%
   - Uniswap: 10%
   ```

5. **User approves the plan**

   * MetaMask Advanced Permissions requested
   * Monthly spend limit defined

6. **Automation begins**

   * Monthly execution via cron
   * No wallet popups
   * Funds invested via smart contract

---

## 🤖 AI Agent Design

### Basic Agent

* Orchestrates planning
* Never touches funds directly
* Coordinates all decisions

### Advanced Agents

* Stateless
* Decision-only
* No wallet or contract access

This separation ensures:

* Safety
* Explainability
* Clear responsibility boundaries

---

## 🔐 Security Model

* **User funds never leave their smart account without permission**
* Permissions are:

  * Scoped
  * Time-bound
  * Amount-limited
* All financial state lives on-chain
* Off-chain storage holds **only user addresses for automation**

---

## 🗂 Data Storage Strategy

### On-chain (Smart Contract)

* SIP plans
* Strategy
* Deposits
* Active state

### Off-chain (Vercel KV)

```json
sip:active:0xUserAddress → { "createdAt": timestamp }
```

No duplication of financial data.

---

## 🛠 Tech Stack

* **Frontend / Backend:** Next.js (App Router + API routes)
* **Blockchain:** Solidity
* **Wallet & Permissions:** MetaMask Smart Accounts Kit (ERC-7715)
* **Automation:** Vercel Cron
* **Persistence:** Vercel KV
* **Blockchain SDK:** viem / wagmi

---

## 🧪 What Is Mocked (Intentionally)

* Protocol integrations (Aave, Compound, Uniswap)
* Yield calculations
* Time acceleration for demo

## ✅ What Is Real

* Advanced Permissions
* Smart account execution
* Agent-based planning
* Automated execution flow

---

## 🏆 Hackathon Track Alignment

This project directly satisfies:

* ✅ **MetaMask Advanced Permissions usage**
* ✅ **Permission-based automation**
* ✅ **Clear wallet UX improvement**
* ✅ **Working demo with real execution**

---

## 🔮 Future Scope

* Real protocol integrations
* Dynamic rebalancing
* Agent-to-agent micropayments
* Cross-chain SIPs
* Risk-aware plan updates
* x402-based agent marketplaces

---

## 🏁 One-Line Pitch

> **PermiSIP AI enables users to securely permit AI agents to automate long-term investing using MetaMask Advanced Permissions.**