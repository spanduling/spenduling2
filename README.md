<div align="center">

<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

<h1>Built with AI Studio</h1>

<p>The fastest path from prompt to production with Gemini.</p>

<a href="https://aistudio.google.com/apps">Start building</a>

</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/486726da-22db-4b85-b447-f1681c9bf1e0

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`
3. Run the app:
   `npm run dev`

## Deployment (Netlify/Vercel)

Aplikasi ini menggunakan Vite dan Tailwind CSS. Untuk deploy di Netlify:

1. **Build Command**: `npm run build`
2. **Publish Directory**: `dist`
3. **Environment Variables**: Pastikan Anda telah mengatur `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` di dashboard Netlify.

File `netlify.toml` dan `_redirects` sudah disertakan untuk menangani routing SPA (Single Page Application).
