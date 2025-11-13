# Quick Deployment Steps for ZTA Website

Follow these steps in order to deploy your website to Vercel:

## ⚡ Quick Start (30 minutes)

### Step 1: MongoDB Atlas Setup (10 min)

1. Go to https://www.mongodb.com/cloud/atlas/register
2. Create FREE account
3. Create a new cluster (choose FREE M0 tier)
4. Wait for cluster to deploy (~5 minutes)
5. Create database user:
   - Click "Database Access" → "Add New Database User"
   - Username: `ztaadmin`
   - Password: `ZTA2025secure!` (or generate strong password)
   - Role: Atlas admin
6. Whitelist IPs:
   - Click "Network Access" → "Add IP Address"
   - Click "Allow Access from Anywhere" (0.0.0.0/0)
7. Get connection string:
   - Click "Connect" → "Connect your application"
   - Copy the string, replace `<password>` with your actual password
   - Should look like: `mongodb+srv://ztaadmin:ZTA2025secure!@cluster0.xxxxx.mongodb.net/zta_database`

### Step 2: Cloudinary Setup (5 min)

1. Go to https://cloudinary.com/users/register/free
2. Sign up for FREE account (25GB storage included)
3. Go to Dashboard
4. Copy these values:
   - Cloud Name: `xxxxxxxxxxxxx`
   - API Key: `xxxxxxxxxxxxx`
   - API Secret: `xxxxxxxxxxxxx`

### Step 3: Push to GitHub (5 min)

```bash
cd /home/gerald/zambia-tennis-association

# Initialize git (if not already)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - ZTA website ready for deployment"

# Create repository on GitHub.com first, then:
git remote add origin https://github.com/YOUR_USERNAME/zambia-tennis-association.git
git branch -M main
git push -u origin main
```

### Step 4: Deploy to Vercel (10 min)

1. Go to https://vercel.com/signup
2. Sign up with GitHub
3. Click "New Project"
4. Import your `zambia-tennis-association` repository
5. Vercel auto-detects settings - just click "Deploy"
6. **WAIT** for first deployment (will fail - that's expected!)
7. Go to Project Settings → Environment Variables
8. Add these variables:

```
NODE_ENV=production
MONGODB_URI=mongodb+srv://ztaadmin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/zta_database
JWT_SECRET=your-super-secret-random-string-here-make-it-long
JWT_EXPIRE=7d
CLIENT_URL=https://your-project-name.vercel.app
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

9. Click "Redeploy" from the Deployments tab

### Step 5: Create Admin User (2 min)

1. Visit your deployed site: `https://your-project.vercel.app`
2. Click "Register" and create your account
3. Go to MongoDB Atlas → Browse Collections
4. Find `users` collection
5. Find your user by email
6. Click "Edit"
7. Change `"role": "user"` to `"role": "admin"`
8. Click "Update"
9. Refresh your website and login

## ✅ Done!

Your website is now live at: `https://your-project.vercel.app`

Share this URL with stakeholders:
- **Website**: https://your-project.vercel.app
- **Admin Panel**: https://your-project.vercel.app/admin
- **Gallery Manager**: https://your-project.vercel.app/gallery/manage

## 🔧 If Something Goes Wrong

### Deployment fails:
1. Check Vercel deployment logs
2. Verify all environment variables are set
3. Make sure MongoDB connection string is correct

### Can't login:
1. Check browser console for errors
2. Verify MongoDB Atlas IP whitelist
3. Check JWT_SECRET is set in Vercel

### Images don't upload:
1. Verify Cloudinary credentials
2. Check browser console for errors
3. Make sure you're logged in as admin

## 📱 Optional: Add Custom Domain

1. Buy domain (e.g., zambiatennis.org) from Namecheap/GoDaddy
2. In Vercel: Settings → Domains → Add Domain
3. Follow DNS instructions
4. Wait 24-48 hours for DNS propagation

## 💡 Tips

- **Free tiers are sufficient** for testing and moderate usage
- **Backups**: MongoDB Atlas automatically backs up your data
- **Updates**: Just push to GitHub, Vercel auto-deploys
- **Monitoring**: Check Vercel dashboard for usage stats

Need help? Check the full deployment guide in `VERCEL_DEPLOYMENT_GUIDE.md`
