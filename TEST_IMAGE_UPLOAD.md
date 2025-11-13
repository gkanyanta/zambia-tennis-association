# Image Upload Testing Guide

## What I Fixed

I've improved the image upload functionality with better error handling and debugging:

### Changes Made:

1. **Enhanced Error Messages** (`src/services/api.ts`):
   - Now checks if you're logged in before attempting upload
   - Shows clear error messages if upload fails
   - Logs detailed information to browser console

2. **Better Debugging** (`src/services/newsService.ts`):
   - Logs when upload starts
   - Logs when upload succeeds with details
   - Throws descriptive errors instead of failing silently

3. **Console Logging**:
   - File name, size, and type are logged
   - Upload response status and data are logged
   - Any errors are logged with details

## How to Test Image Upload

### Step 1: Make Sure You're Logged In
1. Open the website: http://localhost:5173
2. Click "Login" in the header
3. Use your credentials:
   - Email: gkanyanta@gmail.com
   - Password: [your password]
4. After login, you should see your name in the header

### Step 2: Test Image Upload on News Page
1. Go to http://localhost:5173/news
2. Click "Manage Mode" button (you should see this as admin)
3. Open your browser's Developer Console (F12 or Ctrl+Shift+I)
4. Fill in the article form:
   - Title: "Test Article"
   - Category: "Test"
   - Excerpt: "This is a test"
   - Author: "Your Name"
5. Click the image upload area or "Choose File"
6. Select an image (JPG, PNG, GIF, or WebP)
7. You should see a preview of the image
8. Click "Publish Article"

### Step 3: Check Console for Detailed Logs
In the browser console, you should see:
```
Attempting to upload image for news article...
Uploading file: [filename] Size: [size] Type: [type]
Upload response: 200 {success: true, data: {...}}
Image uploaded successfully: {success: true, data: {...}}
```

### Step 4: If Upload Fails
If you see an error, the console will show one of these messages:

**"You must be logged in to upload images"**
- Solution: Log in first, then try again

**"Upload failed with status 401"**
- Solution: Your session expired. Log out and log in again

**"Upload failed with status 400"**
- Solution: File might be too large (max 5MB) or wrong type
- Check the file is a valid image (JPG, PNG, GIF, WebP)

**"Upload failed with status 500"**
- Solution: Server error. Check the backend logs in terminal

## Backend Upload Endpoint

The upload endpoint is configured at:
- **URL**: `http://localhost:5000/api/upload`
- **Method**: POST
- **Authentication**: Required (Bearer token)
- **Field Name**: `image`
- **Max Size**: 5MB
- **Allowed Types**: JPEG, JPG, PNG, GIF, WebP

## Manual Testing with curl

You can test the upload endpoint directly:

1. First, login and get your token:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"gkanyanta@gmail.com","password":"YOUR_PASSWORD"}'
```

2. Copy the token from the response, then upload an image:
```bash
curl -X POST http://localhost:5000/api/upload \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "image=@/path/to/your/image.jpg"
```

3. If successful, you should get:
```json
{
  "success": true,
  "data": {
    "filename": "image-1234567890-123456789.jpg",
    "path": "/uploads/image-1234567890-123456789.jpg",
    "size": 12345
  }
}
```

## Troubleshooting

### Problem: "Route not found" error
- Make sure the backend server is running: `cd server && npm run dev`
- Check that you see "Server running in development mode on port 5000"

### Problem: "Network error" or "Failed to fetch"
- Verify the backend is running on port 5000
- Check the frontend is connecting to the right API URL (should be http://localhost:5000/api)

### Problem: Image uploads but doesn't show in article
- Check if the image was saved: `ls -la server/uploads/`
- Try accessing the image directly: `http://localhost:5000/uploads/[filename]`
- Check browser console for image loading errors

### Problem: "CORS error"
- Make sure CORS is enabled in `server/src/index.js` (it should be)
- Verify CLIENT_URL in `server/.env` is set to `http://localhost:5173`

## Current Status

✅ Backend server running on port 5000
✅ MongoDB connected
✅ Upload endpoint exists and is protected
✅ Upload directory created and writable
✅ Static file serving configured
✅ Authentication working
✅ User `gkanyanta@gmail.com` is admin
✅ Error handling and logging improved

## Next Steps

1. Test the upload following the steps above
2. Check the browser console for detailed error messages
3. If you see errors, share the console output for further debugging

The upload functionality should now work correctly with better error messages to help identify any issues!
