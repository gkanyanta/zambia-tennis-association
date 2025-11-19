# Admin User Management Setup

## Creating the Initial Admin Account

The ZTA website includes a user management system that allows admins to create other admin and staff accounts. However, for security reasons, you cannot register as an admin through the public signup page.

### Step 1: Seed the Initial Admin Account

Run the following command from the `server` directory to create the initial admin account:

```bash
cd server
npm run seed:admin
```

This will create an admin account with the following credentials:

- **Email**: `admin@zambiatennis.com`
- **Password**: `Admin@ZTA2025`

**⚠️ IMPORTANT**: Change this password immediately after first login!

### Step 2: Log In as Admin

1. Go to the website and click "Login"
2. Enter the admin email and password
3. You will be redirected to the Admin Dashboard

### Step 3: Create Additional Admin/Staff Accounts

Once logged in as admin:

1. Go to **Admin Dashboard** → **User Management**
2. Click **"Create User"** button
3. Fill in the user details
4. Select the appropriate role:
   - **Admin**: Full access to all system features
   - **Staff**: Can manage tournaments, entries, and draws
   - **Club Official**: Can manage their club information
   - **Player**: Regular player account
5. Click **"Create User"**

## User Roles and Permissions

### Admin
- Full access to all features
- Can create other admin and staff accounts
- Can manage tournaments, entries, and draws
- Can manage rankings and news
- Can view all system data

### Staff
- Can manage tournaments, entries, and draws
- Can create player and club official accounts
- Cannot create admin accounts
- Cannot delete admin accounts

### Club Official
- Can manage their club information
- Can view tournament information

### Player
- Can register for tournaments
- Can view rankings and news
- Standard user access

## Managing Users

### Edit User
1. Go to **Admin Dashboard** → **User Management**
2. Click the **Edit** button next to the user
3. Update the information
4. Leave password blank to keep current password
5. Click **"Update User"**

### Delete User
1. Go to **Admin Dashboard** → **User Management**
2. Click the **Trash** button next to the user
3. Confirm deletion

**Note**: You cannot delete your own account.

## Security Notes

- Only admins can create other admin accounts
- Staff can only create player and club official accounts
- Passwords are hashed using bcrypt
- JWT tokens are used for authentication
- Regular users cannot self-register as admin or staff
