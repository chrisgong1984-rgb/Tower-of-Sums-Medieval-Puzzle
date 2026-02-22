# Tower of Sums: Medieval Puzzle

A strategic number-summing puzzle game with a medieval theme.

## Deployment to Vercel

To deploy this project to Vercel, follow these steps:

### 1. Push to GitHub
1. Create a new repository on GitHub.
2. Initialize git in your local project folder:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```
3. Link your local repository to GitHub and push:
   ```bash
   git remote add origin <your-github-repo-url>
   git branch -M main
   git push -u origin main
   ```

### 2. Deploy to Vercel
1. Log in to [Vercel](https://vercel.com/).
2. Click **"New Project"**.
3. Import your GitHub repository.
4. In the **"Environment Variables"** section, add:
   - `GEMINI_API_KEY`: Your Google Gemini API Key.
5. Click **"Deploy"**.

### 3. SPA Routing
A `vercel.json` file has been included to handle Single Page Application (SPA) routing, ensuring that deep links work correctly.

## Local Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
