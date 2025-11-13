# Vercel Deployment Guide - ZTA Website

## 🚀 Deployment Strategy

Your app has 3 components:
1. **Frontend** (React/Vite) → Vercel
2. **Backend** (Node.js/Express) → Vercel Serverless Functions
3. **Database** (MongoDB) → MongoDB Atlas (cloud)
4. **File Uploads** → Need cloud storage solution

## 📋 Prerequisites

Before deploying:
- [ ] Vercel account (free): https://vercel.com/signup
- [ ] MongoDB Atlas account (free): https://www.mongodb.com/cloud/atlas/register
- [ ] GitHub account (to connect your repo)

## 🗄️ Step 1: Set Up MongoDB Atlas (Cloud Database)

### 1.1 Create MongoDB Atlas Cluster
1. Go to https://www.mongodb.com/cloud/atlas/register
2. Sign up / Log in
3. Create a **FREE** M0 cluster (512MB)
4. Choose a cloud provider (AWS recommended)
5. Choose a region closest to your users (Europe/Africa)

### 1.2 Create Database User
1. In Atlas dashboard, go to **Database Access**
2. Click **Add New Database User**
3. Choose **Password** authentication
4. Username: `ztaadmin`
5. Password: Generate a strong password (save it!)
6. Database User Privileges: **Atlas admin**
7. Click **Add User**

### 1.3 Whitelist IP Addresses
1. Go to **Network Access**
2. Click **Add IP Address**
3. Click **Allow Access from Anywhere** (0.0.0.0/0)
4. Click **Confirm**

### 1.4 Get Connection String
1. Go to **Database** → **Connect**
2. Choose **Connect your application**
3. Copy the connection string (looks like):
   ```
   mongodb+srv://ztaadmin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
4. Replace `<password>` with your actual password
5. Add database name: `mongodb+srv://ztaadmin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/zta_database?retryWrites=true&w=majority`

### 1.5 Migrate Existing Data (Optional)
If you want to keep your current data:
```bash
# Export from local MongoDB
mongodump --db zta_database --out ./mongodb_backup

# Import to Atlas (replace with your connection string)
mongorestore --uri "mongodb+srv://ztaadmin:PASSWORD@cluster0.xxxxx.mongodb.net/zta_database" ./mongodb_backup/zta_database
```

## 📦 Step 2: Set Up Cloud Storage for Images

### Option A: Cloudinary (Recommended - Free Tier)

1. Sign up at https://cloudinary.com (free tier: 25GB storage)
2. Get your credentials from dashboard:
   - Cloud Name
   - API Key
   - API Secret
3. Install Cloudinary SDK:
```bash
cd server
npm install cloudinary multer-storage-cloudinary
```

### Option B: Vercel Blob Storage
- Limited free tier
- Requires paid plan for production

**For now, I recommend Cloudinary** (easier and more generous free tier)

## 🛠️ Step 3: Prepare Backend for Vercel

Vercel uses serverless functions. I'll help you adapt the Express app.

## 📝 Step 4: Configure Environment Variables

You'll need these environment variables in Vercel:

### Production Environment Variables:
```
NODE_ENV=production
MONGODB_URI=mongodb+srv://ztaadmin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/zta_database?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-change-this-to-something-random
JWT_EXPIRE=7d
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
EMAIL_FROM=noreply@zambiatennis.org
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
CLIENT_URL=https://your-vercel-app.vercel.app
MAX_FILE_SIZE=5242880
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## 🚀 Step 5: Deploy to Vercel

### Option 1: Deploy from GitHub (Recommended)

1. **Push code to GitHub:**
```bash
cd /home/gerald/zambia-tennis-association
git init
git add .
git commit -m "Initial commit - ZTA website"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/zambia-tennis-association.git
git push -u origin main
```

2. **Connect to Vercel:**
   - Go to https://vercel.com/new
   - Import your GitHub repository
   - Vercel will auto-detect settings
   - Add environment variables
   - Click **Deploy**

### Option 2: Deploy with Vercel CLI

1. **Install Vercel CLI:**
```bash
npm install -g vercel
```

2. **Login:**
```bash
vercel login
```

3. **Deploy:**
```bash
cd /home/gerald/zambia-tennis-association
vercel
```

## ⚙️ Step 6: Post-Deployment Setup

### Update Admin User
Once deployed, create your admin user in Atlas:
1. Go to MongoDB Atlas → Browse Collections
2. Find `zta_database` → `users` collection
3. Find your user by email
4. Edit document and set `"role": "admin"`

### Test Deployment
1. Visit your Vercel URL: `https://your-app.vercel.app`
2. Register a new account
3. Make yourself admin (via Atlas)
4. Test all features:
   - [ ] Login works
   - [ ] News CRUD
   - [ ] Gallery upload
   - [ ] Tournaments
   - [ ] Rankings

## 🔧 Troubleshooting

### Issue: "Cannot connect to database"
- Check MongoDB Atlas connection string
- Verify IP whitelist includes 0.0.0.0/0
- Check database user permissions

### Issue: "Image upload fails"
- Verify Cloudinary credentials
- Check file size limits
- Ensure environment variables are set

### Issue: "API routes not working"
- Check `/api` routes are properly configured
- Verify vercel.json is correct
- Check backend logs in Vercel dashboard

## 💰 Cost Estimate

**Free Tier (sufficient for testing/small usage):**
- Vercel: Free (100GB bandwidth, unlimited deployments)
- MongoDB Atlas: Free M0 cluster (512MB)
- Cloudinary: Free (25GB storage, 25GB bandwidth)

**Paid Tier (for production with high traffic):**
- Vercel Pro: $20/month (1TB bandwidth)
- MongoDB Atlas: Starts at $0.08/hour (~$57/month for M10)
- Cloudinary: $99/month for Pro plan

## 📧 Sharing with Stakeholders

Once deployed, share:
1. **Website URL**: `https://your-app.vercel.app`
2. **Admin Credentials**: Create accounts for stakeholders
3. **Admin Panel**: `https://your-app.vercel.app/admin`

## 🔐 Security Checklist

Before sharing:
- [ ] Change all default passwords
- [ ] Use strong JWT_SECRET
- [ ] Set up Gmail app password for emails
- [ ] Review user permissions
- [ ] Test all authentication flows
- [ ] Enable HTTPS (automatic on Vercel)

## 📱 Custom Domain (Optional)

To use `zambiatennis.org` instead of `.vercel.app`:
1. Buy domain from registrar (Namecheap, GoDaddy, etc.)
2. In Vercel dashboard → Settings → Domains
3. Add your custom domain
4. Update DNS records as instructed
5. Wait for DNS propagation (24-48 hours)

## 🆘 Need Help?

If you encounter issues:
1. Check Vercel deployment logs
2. Check MongoDB Atlas logs
3. Use browser console for frontend errors
4. Contact me for assistance

## ✅ Quick Start Checklist

- [ ] Create MongoDB Atlas cluster
- [ ] Create database user
- [ ] Whitelist all IPs (0.0.0.0/0)
- [ ] Get connection string
- [ ] Sign up for Cloudinary
- [ ] Get Cloudinary credentials
- [ ] Push code to GitHub
- [ ] Create Vercel account
- [ ] Import GitHub repo to Vercel
- [ ] Add environment variables
- [ ] Deploy!
- [ ] Create admin user in Atlas
- [ ] Test deployment
- [ ] Share URL with stakeholders
