# Deployment Guide: Publishing Your Church App

To make your application accessible online to everyone, you need to deploy it to the cloud. We will use **Render** for the backend (server) and **Vercel** for the frontend (website).

## Prerequisites
1.  **GitHub Account**: You need a GitHub account to host your code.
2.  **Render Account**: Sign up at [render.com](https://render.com).
3.  **Vercel Account**: Sign up at [vercel.com](https://vercel.com).

---

## Step 1: Push Code to GitHub
1.  Create a **new repository** on GitHub (e.g., `church-app`).
2.  Run these commands in your terminal (inside `c:\backend`):
    ```bash
    git remote add origin https://github.com/YOUR_USERNAME/church-app.git
    git branch -M main
    git push -u origin main
    ```

---

## Step 2: Deploy Backend (Render)
1.  Go to your **Render Dashboard** and click **New +** -> **Web Service**.
2.  Connect your GitHub repository.
3.  **Settings**:
    *   **Name**: `church-backend` (or similar)
    *   **Root Directory**: `.` (leave empty)
    *   **Runtime**: `Node`
    *   **Build Command**: `npm install`
    *   **Start Command**: `npm start`
4.  Click **Create Web Service**.
5.  Wait for it to deploy. Once done, copy the **URL** (e.g., `https://church-backend.onrender.com`).

---

## Step 3: Deploy Frontend (Vercel)
1.  Go to your **Vercel Dashboard** and click **Add New...** -> **Project**.
2.  Import your GitHub repository.
3.  **Configure Project**:
    *   **Framework Preset**: `Vite`
    *   **Root Directory**: Click `Edit` and select `frontend`.
    *   **Environment Variables**:
        *   Key: `VITE_API_URL`
        *   Value: `https://church-backend.onrender.com` (The URL from Step 2)
4.  Click **Deploy**.

---

## 🎉 Success!
Once Vercel finishes, it will give you a domain (e.g., `https://church-app.vercel.app`).
**Share this link with anyone!**

### Important Note on Data
Currently, your app uses a **local file database** (`database.json`).
*   **On Render (Free Tier)**: The server "sleeps" after inactivity. When it wakes up, **your data might reset** because the file system is ephemeral.
*   **Solution**: For a real production app, we should switch to **MongoDB Atlas** (a cloud database). I can help you set this up if you want to keep your data permanently!
