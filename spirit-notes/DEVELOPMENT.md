# Spirit Notes Development Guide

This guide explains how to develop and test Spirit Notes locally using Firebase Emulators, and how to deploy changes to the live environment in batches.

## 1. Local Development Environment

To test the full application (Frontend + Backend + Database) locally:

### Step 1: Start Firebase Emulators
In one terminal, run:
```bash
npm run emulate
```
This starts the local versions of:
- **Authentication** (Port 9099)
- **Functions** (Port 5001)
- **Firestore** (Port 8080)
- **Hosting** (Port 5000)
- **Emulator UI** (Port 4000) - Open this in your browser to manage local data!

### Step 2: Start Vite Dev Server
In another terminal, run:
```bash
npm run dev
```
- The frontend will be available at `http://localhost:5173`.
- All API calls (`/api/**`) are automatically proxied to the local Functions emulator.

---

## 2. Testing and Credential Management

### Local Test Accounts
When using the emulator, the Authentication state is separate from the live server. You can create test accounts via the **Emulator UI** (http://localhost:4000/auth).

### Live Test Accounts
Credentials for the live server are documented in `TEST_ACCOUNTS.md`. **Do not use these for local testing** unless you want to connect to the live database (not recommended).

---

---

## 3. Verification and Deployment Workflow

Follow this 2-step process to ensure a stable environment:

### Step 1: Local Verification
Run the combined development command:
```bash
npm run start:dev
```
- This starts both the **Firebase Emulators** and the **Vite Dev Server** concurrently.
- Changes are reflected immediately in the browser via HMR.
- Verify all UI and logic changes locally first.

### Step 2: Live Production Deployment
Only after you are satisfied with the local results, deploy to the live server:
```bash
npm run deploy:all
```
- This command builds the production bundle and deploys to Firebase.
- **Note**: The live environment will NOT reflect changes until this command is explicitly executed.

---

## 4. Key Configuration Files
- `firebase.json`: Emulator and Firebase service settings.
- `vite.config.js`: Frontend build and dev-proxy settings.
- `src/api/index.js`: API base configuration.
