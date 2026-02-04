#!/bin/bash

echo "🚀 Vertis Document Chat - Vercel Deployment Helper"
echo "=================================================="
echo ""

# Check if git is initialized
if [ ! -d .git ]; then
    echo "📦 Initializing Git repository..."
    git init
    echo "✅ Git initialized"
else
    echo "✅ Git already initialized"
fi

# Check if .gitignore exists
if [ ! -f .gitignore ]; then
    echo "❌ .gitignore not found! Please create it first."
    exit 1
else
    echo "✅ .gitignore found"
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
    npm install
else
    echo "✅ Dependencies installed"
fi

# Test build
echo ""
echo "🔨 Testing build locally..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed! Fix errors before deploying."
    exit 1
fi

# Git status
echo ""
echo "📋 Git Status:"
git status

echo ""
echo "=================================================="
echo "Next steps:"
echo "1. Review the files above"
echo "2. Make sure .env.local is NOT listed (should be ignored)"
echo "3. Run: git add ."
echo "4. Run: git commit -m 'Initial commit: Vertis Document Chat'"
echo "5. Create GitHub repo: https://github.com/new"
echo "6. Run: git remote add origin <YOUR_REPO_URL>"
echo "7. Run: git push -u origin main"
echo "8. Go to Vercel: https://vercel.com/new"
echo "9. Import your GitHub repository"
echo "10. Add environment variables in Vercel dashboard"
echo "=================================================="
