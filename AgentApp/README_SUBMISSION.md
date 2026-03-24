# Autonomous AI Agent: Smart Meeting & Task Orchestrator

An advanced, full-stack autonomous AI agent system that plans, reasons, and executes complex scheduling and notification tasks. Built with **React Native (Expo)** and **Node.js (Express)**, powered by **Google Gemini 1.5 Flash**.

---

## 🚀 Overview
This project demonstrates a state-of-the-art AI Agent capable of transforming simple natural language prompts (e.g., *"Schedule a team standup for tomorrow morning"*) into a series of coordinated actions across multiple platforms (Email, Push Notifications, Calendars).

### Core Intelligence
-   **Gemini AI Decomposer**: Uses Generative AI to break down broad tasks into technical executable steps.
-   **Autonomous Execution Engine**: Handles retries, validation, and multi-step workflows without user intervention.
-   **Intelligent Reasoning**: If a step fails, the agent "thinks" using Gemini to decide the best recovery path.

---

## ✨ Key Functionalities

### 1. AI Task Planning
- **Dynamic Decomposition**: Instead of hardcoded scripts, the agent asks Gemini to "think" of the necessary steps based on the user's specific intent and context.
- **Rule-based Fallback**: Robust system that uses a deterministic planner if the AI service is unreachable.

### 2. Multi-Channel Notifications
- **Gmail Integration**: Sends professional, HTML-formatted meeting invites directly via **Nodemailer**.
- **Push Notifications**: Real-time alerts delivered to mobile devices via **Firebase Cloud Messaging (FCM)**.
- **Verification Logs**: Every action is logged in a real-time terminal-style UI on the mobile app.

### 3. Intelligent Scheduling
- **Availability Check**: Simulates team calendar lookups to find the optimal time slot for everyone.
- **Automated Booking**: Reserves slots and generates unique meeting IDs and join links.

### 4. Adaptive UI
- **Premium Aesthetics**: High-end dark/light theme support with glassmorphism effects and smooth micro-animations.

---

## 🏗️ Architecture

### Frontend (`AgentApp`)
-   **Framework**: React Native with Expo.
-   **Navigation**: React Navigation (Tabs + Stack).
-   **Services**: `agentEngine.js` (Execution logic), `apiService.js` (Communication).

### Backend (`AgentBackend`)
-   **Framework**: Node.js & Express.
-   **AI Engine**: Google Generative AI (Gemini 1.5 Flash).
-   **Notification Services**: Firebase Admin SDK (Push), Nodemailer (Email).

---

## 🛠️ Setup & Installation

### Prerequisites
- Node.js (v18+)
- Expo Go app on your physical device.
- Google Gemini API Key.
- Gmail App Password (for Nodemailer).

### 1. Backend Setup (`AgentBackend`)
```bash
cd AgentBackend
npm install
npm start
```
**Configure `.env` file** with your GEMINI_API_KEY and EMAIL credentials.

### 2. Frontend Setup (`AgentApp`)
```bash
cd AgentApp
npm install
```
**Configure API IP**:
Open `src/services/apiService.js` and update `LOCAL_URL` with your computer's local IP address (`192.168.29.230`).

```bash
npx expo start
```
Scan the QR code with your **Expo Go** app.

---

**Author**: Carevyn (Project Submission PS-3)
**Package ID**: `com.AgentApp.autonomousagent`
