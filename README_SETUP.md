# 🎾 Zambia Tennis Association - Complete Setup Guide

## ✅ Implementation Status

**ALL 10 BACKEND INTEGRATION TASKS COMPLETED!**

1. ✅ User authentication system
2. ✅ Real-time tournament registration
3. ✅ Payment processing for memberships
4. ✅ News article CMS integration
5. ✅ Rankings database integration
6. ✅ Court booking system
7. ✅ Email notifications
8. ✅ Calendar sync functionality
9. ✅ Search functionality
10. ✅ Admin dashboard

## 📋 Prerequisites

Before you begin, ensure you have installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **MongoDB** - [Download](https://www.mongodb.com/try/download/community) or use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (cloud)
- **Git** (optional, for version control)

## 🚀 Quick Start (Development)

### Step 1: Install Frontend Dependencies

```bash
npm install
```

### Step 2: Install Backend Dependencies

```bash
cd server
npm install
cd ..
```

### Step 3: Configure Environment Variables

#### Frontend Configuration
```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_API_URL=http://localhost:5000/api
```

#### Backend Configuration
```bash
cp server/.env.example server/.env
```

Edit `server/.env`:
```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/zta_database
JWT_SECRET=your-super-secret-key-change-this-in-production
JWT_EXPIRE=7d

# Email (Gmail example - you need to enable "App Passwords")
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
EMAIL_FROM=noreply@zambiatennis.org

# Stripe (Get from https://stripe.com/)
STRIPE_SECRET_KEY=sk_test_your_test_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_test_key

CLIENT_URL=http://localhost:5173
```

### Step 4: Start MongoDB

**If using local MongoDB:**
```bash
mongod
```

**If using MongoDB Atlas:**
- Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- Get your connection string and update `MONGODB_URI` in `server/.env`

### Step 5: Start the Backend Server

```bash
cd server
npm run dev
```

You should see:
```
Server running in development mode on port 5000
MongoDB Connected: ...
```

### Step 6: Start the Frontend (New Terminal)

```bash
npm run dev
```

You should see:
```
  VITE v7.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

### Step 7: Access the Application

Open your browser and visit: **http://localhost:5173**

## 👤 Create Your First Admin User

1. Go to http://localhost:5173/register
2. Create an account with your details
3. Open MongoDB (Compass or CLI) and run:

```javascript
db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { role: "admin" } }
)
```

4. Log out and log back in
5. You'll now see the "Admin" button in the header!

## 📧 Setting Up Email (Gmail Example)

1. Go to your Google Account settings
2. Enable 2-Factor Authentication
3. Go to Security → App Passwords
4. Generate an app password for "Mail"
5. Use this password in `server/.env` for `SMTP_PASS`

## 💳 Setting Up Stripe (Payment Processing)

1. Create a free account at [Stripe](https://stripe.com/)
2. Go to Developers → API Keys
3. Copy your test keys to `server/.env`:
   - Secret key → `STRIPE_SECRET_KEY`
   - Publishable key → `STRIPE_PUBLISHABLE_KEY`

## 📁 Project Structure

```
zambia-tennis-association/
├── src/                          # Frontend source
│   ├── components/               # React components
│   ├── pages/                    # Page components
│   ├── services/                 # API integration
│   ├── context/                  # React context (Auth)
│   ├── types/                    # TypeScript types
│   ├── lib/                      # Utilities
│   └── data/                     # Static data
├── server/                       # Backend source
│   └── src/
│       ├── models/               # MongoDB models
│       ├── controllers/          # Route controllers
│       ├── routes/               # API routes
│       ├── middleware/           # Express middleware
│       ├── config/               # Configuration
│       └── utils/                # Utilities
├── public/                       # Static assets
└── dist/                         # Build output
```

## 🔑 Available Routes

### Frontend Routes
- `/` - Home page
- `/login` - User login
- `/register` - User registration
- `/admin` - Admin dashboard (requires admin role)
- `/news` - News articles
- `/tournaments` - Tournaments
- `/rankings` - Player rankings
- `/play` - Court booking
- `/membership` - Membership plans
- `/players` - Player database
- `/clubs` - Tennis clubs
- And more...

### Backend API Endpoints

**Authentication:**
- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

**Tournaments:**
- `GET /api/tournaments` - List tournaments
- `POST /api/tournaments` - Create (admin)
- `POST /api/tournaments/:id/register` - Register

**News:**
- `GET /api/news` - List articles
- `POST /api/news` - Create (admin)
- `PUT /api/news/:id` - Update (admin)

**Bookings:**
- `GET /api/bookings` - User bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings/available/:club/:court/:date` - Check availability

**Rankings:**
- `GET /api/rankings` - All rankings
- `GET /api/rankings/category/:category` - By category

**Payments:**
- `POST /api/payments/membership` - Pay membership
- `POST /api/payments/tournament/:id` - Pay tournament fee

**Upload:**
- `POST /api/upload` - Upload images (protected)

## 🛠️ Common Issues & Solutions

### Issue: "Cannot connect to MongoDB"
**Solution:** Make sure MongoDB is running. For Windows, run `mongod` in a terminal. For Mac/Linux, use `brew services start mongodb-community` or `sudo systemctl start mongod`.

### Issue: "Port 5000 is already in use"
**Solution:** Either stop the process using port 5000 or change the PORT in `server/.env` to another port (e.g., 5001).

### Issue: "Module not found" errors
**Solution:** Make sure you've run `npm install` in both the root directory and the `server` directory.

### Issue: "401 Unauthorized" on API calls
**Solution:** Make sure you're logged in. The JWT token is stored in localStorage after login.

### Issue: Email not sending
**Solution:** Check your SMTP credentials. For Gmail, make sure you're using an App Password, not your regular password.

## 🏗️ Build for Production

### Frontend Build
```bash
npm run build
```
Output will be in `dist/` folder.

### Backend Production
```bash
cd server
npm start
```

## 📦 Deployment Options

### Backend Deployment
- **Railway** - Easiest, automatic deployments
- **Heroku** - Popular PaaS
- **DigitalOcean** - VPS with more control
- **AWS/GCP** - Enterprise solutions

### Frontend Deployment
- **Vercel** - Recommended, easiest
- **Netlify** - Great alternative
- **GitHub Pages** - Free for static sites

### Database
- **MongoDB Atlas** - Managed MongoDB (recommended)

## 📊 Testing the Features

### Test Authentication
1. Register a new user
2. Log in
3. Check that you can see your name in the header
4. Log out

### Test Admin Dashboard
1. Make your user an admin (see "Create Your First Admin User")
2. Log in
3. Click "Admin" button in header
4. Explore the dashboard

### Test Tournament Registration
1. Go to Tournaments page
2. Click on a tournament with "Registration Open"
3. Register for the tournament
4. Check for confirmation email

### Test Court Booking
1. Go to Play page
2. Click "Book Court" on a club
3. Select date and time slot
4. Complete booking

### Test News Management (Admin)
1. Go to Admin dashboard
2. Click "Manage News"
3. Toggle to "Manage Mode"
4. Add a new article with image
5. View it in "View Mode"

## 🔒 Security Notes

- Change `JWT_SECRET` to a strong, random string in production
- Never commit `.env` files to version control
- Use environment-specific Stripe keys (test vs. production)
- Enable HTTPS in production
- Set up rate limiting (already included)
- Regular security updates: `npm audit fix`

## 📝 Next Steps

1. **Customize Content**: Update static content, images, and branding
2. **Seed Data**: Add initial tournaments, news, rankings
3. **Test Thoroughly**: Test all features in different scenarios
4. **Performance**: Optimize images, enable caching
5. **Monitoring**: Set up error tracking (Sentry, LogRocket)
6. **Backups**: Set up automatic database backups
7. **Domain**: Get a custom domain and SSL certificate
8. **Go Live**: Deploy to production servers

## 📞 Support

For issues or questions:
- Check the `IMPLEMENTATION_COMPLETE.md` file for technical details
- Review the code comments in the source files
- MongoDB docs: https://docs.mongodb.com/
- Stripe docs: https://stripe.com/docs
- React docs: https://react.dev/

## 🎉 Congratulations!

You now have a fully-functional tennis association management system with:
- ✅ User authentication and authorization
- ✅ Tournament management and registration
- ✅ Payment processing
- ✅ News and content management
- ✅ Court booking system
- ✅ Player rankings
- ✅ Admin dashboard
- ✅ Email notifications
- ✅ And much more!

Happy coding! 🎾
