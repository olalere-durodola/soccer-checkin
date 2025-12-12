# How to Share Your Church App Externally

You have three main options to let someone else view your application, depending on your needs.

## Option 1: Quick Sharing (Recommended for Demos)
Use **ngrok** to create a secure tunnel to your localhost. This gives you a public URL (like `https://random-name.ngrok-free.app`) that anyone can access.

### 1. Install ngrok
Download and install ngrok from [ngrok.com](https://ngrok.com/download).

### 2. Start Tunnels
You need to expose both your **Frontend (5173)** and **Backend (5000)**.

Open two new terminal windows:

**Terminal 1 (Backend):**
```bash
ngrok http 5000
```
*Copy the Forwarding URL (e.g., `https://api-123.ngrok-free.app`)*

**Terminal 2 (Frontend):**
*First, you need to tell your frontend where the backend is.*
Stop your frontend (`Ctrl+C`) and restart it with the backend URL:
```bash
# Windows PowerShell
$env:VITE_API_URL="https://api-123.ngrok-free.app"; npm run dev
```

Then, in a **third** terminal:
```bash
ngrok http 5173
```
*Copy this Forwarding URL (e.g., `https://app-456.ngrok-free.app`). Send this link to your friend!*

---

## Option 2: Local Network (Same WiFi)
If the person is on the same WiFi network as you, they can connect directly to your computer's IP address.

1. **Find your IP Address:**
   Open a terminal and run `ipconfig`. Look for "IPv4 Address" (e.g., `192.168.1.15`).

2. **Run Frontend with Host:**
   Stop the frontend and run:
   ```bash
   npm run dev -- --host
   ```

3. **Access:**
   Your friend can visit: `http://192.168.1.15:5173`

*Note: You might need to allow Node.js through your Windows Firewall.*

---

## Option 3: Permanent Deployment (Free Tier)
For a permanent link that works 24/7, you can deploy to cloud services.

### 1. Backend (Render.com)
*   Create a [Render](https://render.com) account.
*   Connect your GitHub repository.
*   Create a **Web Service** for the `backend` folder.
*   **Command:** `npm start`
*   **Note:** Since we use a local `database.json`, data will reset every time the server restarts. For production, we should switch to MongoDB Atlas (I can help with this!).

### 2. Frontend (Vercel)
*   Create a [Vercel](https://vercel.com) account.
*   Connect your GitHub repository.
*   Select the `frontend` folder.
*   Add Environment Variable: `VITE_API_URL` = `Your_Render_Backend_URL`.
*   Deploy!

---

### Summary
*   **For right now:** Use **Option 2** if they are near you, or **Option 1 (ngrok)** if they are remote.
*   **For later:** We can set up **Option 3** for a real live website.
