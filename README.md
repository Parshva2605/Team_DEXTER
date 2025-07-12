# Skill Swap Platform

A community-based peer-to-peer learning platform built with HTML, CSS, JavaScript, and Supabase. Users can list their skills, request swaps with others, and manage their activity through a clean, simple interface.

## 🚀 Features

### Core Functionality
- **User Authentication** - Secure signup/login using Supabase Auth
- **Profile Management** - Complete user profiles with skills, availability, and photo uploads
- **Skill Discovery** - Search and filter users by skills, location, and availability
- **Swap Request System** - Send, accept, reject, and manage skill swap requests
- **Rating & Feedback** - Rate completed swaps and leave feedback
- **Admin Dashboard** - Monitor users, swaps, and platform activity

### User Experience
- **Responsive Design** - Works perfectly on desktop, tablet, and mobile
- **Real-time Updates** - Live notifications and status updates
- **Clean Interface** - Modern, intuitive design with smooth animations
- **Skill Suggestions** - Auto-complete for common skills
- **Photo Upload** - Profile pictures via Supabase Storage

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Supabase (Auth, Database, Storage, Realtime)
- **Styling**: Custom CSS with responsive design
- **Icons**: Font Awesome 6.0
- **No Frameworks**: Pure vanilla implementation

## 📋 Prerequisites

Before you begin, ensure you have:
- A Supabase account and project
- Basic knowledge of HTML, CSS, and JavaScript
- A modern web browser

## 🚀 Quick Start

### 1. Clone or Download
Download all files to your local directory:
- `index.html`
- `styles.css`
- `app.js`
- `config.js`
- `README.md`

### 2. Set Up Supabase

#### Create a Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Create a new project
4. Note your project URL and anon key

#### Configure Database Tables

**Option 1: Use the provided SQL file (Recommended)**
1. Copy the contents of `database-setup.sql`
2. Paste it into your Supabase SQL Editor
3. Run the entire script

**Option 2: Manual setup**
Run these SQL commands in your Supabase SQL editor:

```sql
-- Enable Row Level Security
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location TEXT,
    photo_url TEXT,
    skills_offered TEXT[] DEFAULT '{}',
    skills_wanted TEXT[] DEFAULT '{}',
    weekends BOOLEAN DEFAULT false,
    evenings BOOLEAN DEFAULT false,
    weekdays BOOLEAN DEFAULT false,
    public_profile BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create swap_requests table
CREATE TABLE swap_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    offered_skill TEXT NOT NULL,
    requested_skill TEXT NOT NULL,
    message TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create feedback table
CREATE TABLE feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    swap_request_id UUID REFERENCES swap_requests(id) ON DELETE CASCADE,
    rater_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create meetings table for video chat
CREATE TABLE meetings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    swap_request_id UUID REFERENCES swap_requests(id) ON DELETE CASCADE,
    organizer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    meeting_type TEXT NOT NULL CHECK (meeting_type IN ('scheduled', 'instant')),
    meeting_link TEXT,
    scheduled_time TIMESTAMP WITH TIME ZONE,
    description TEXT,
    room_id TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_messages table for built-in chat
CREATE TABLE chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table for real-time notifications
CREATE TABLE notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_public ON profiles(public_profile) WHERE public_profile = true;
CREATE INDEX idx_swap_requests_requester ON swap_requests(requester_id);
CREATE INDEX idx_swap_requests_target ON swap_requests(target_user_id);
CREATE INDEX idx_swap_requests_status ON swap_requests(status);
CREATE INDEX idx_feedback_swap_request ON feedback(swap_request_id);
CREATE INDEX idx_feedback_rater ON feedback(rater_id);
CREATE INDEX idx_meetings_swap_request ON meetings(swap_request_id);
CREATE INDEX idx_meetings_room_id ON meetings(room_id);
CREATE INDEX idx_chat_messages_meeting ON chat_messages(meeting_id);
CREATE INDEX idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read) WHERE read = false;

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE swap_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
CREATE POLICY "Users can view public profiles" ON profiles
    FOR SELECT USING (public_profile = true);

CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Swap requests RLS policies
CREATE POLICY "Users can view their own swap requests" ON swap_requests
    FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = target_user_id);

CREATE POLICY "Users can create swap requests" ON swap_requests
    FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update their own swap requests" ON swap_requests
    FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = target_user_id);

CREATE POLICY "Users can delete their own swap requests" ON swap_requests
    FOR DELETE USING (auth.uid() = requester_id);

-- Feedback RLS policies
CREATE POLICY "Users can view feedback for their swaps" ON feedback
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM swap_requests 
            WHERE id = feedback.swap_request_id 
            AND (requester_id = auth.uid() OR target_user_id = auth.uid())
        )
    );

CREATE POLICY "Users can create feedback" ON feedback
    FOR INSERT WITH CHECK (auth.uid() = rater_id);

-- Meetings RLS policies
CREATE POLICY "Users can view meetings for their swaps" ON meetings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM swap_requests 
            WHERE id = meetings.swap_request_id 
            AND (requester_id = auth.uid() OR target_user_id = auth.uid())
        )
    );

CREATE POLICY "Users can create meetings for their swaps" ON meetings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM swap_requests 
            WHERE id = meetings.swap_request_id 
            AND (requester_id = auth.uid() OR target_user_id = auth.uid())
        )
    );

CREATE POLICY "Users can update meetings for their swaps" ON meetings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM swap_requests 
            WHERE id = meetings.swap_request_id 
            AND (requester_id = auth.uid() OR target_user_id = auth.uid())
        )
    );

-- Notifications RLS policies
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert notifications for other users" ON notifications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Chat messages RLS policies
CREATE POLICY "Users can view chat messages for their meetings" ON chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM meetings 
            WHERE id = chat_messages.meeting_id 
            AND EXISTS (
                SELECT 1 FROM swap_requests 
                WHERE id = meetings.swap_request_id 
                AND (requester_id = auth.uid() OR target_user_id = auth.uid())
            )
        )
    );

CREATE POLICY "Users can create chat messages for their meetings" ON chat_messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM meetings 
            WHERE id = chat_messages.meeting_id 
            AND EXISTS (
                SELECT 1 FROM swap_requests 
                WHERE id = meetings.swap_request_id 
                AND (requester_id = auth.uid() OR target_user_id = auth.uid())
            )
        )
    );

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (user_id, name)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

#### Set Up Storage
1. Go to Storage in your Supabase dashboard
2. Create a new bucket called `profile-photos`
3. Set the bucket to public
4. Add this storage policy:

```sql
CREATE POLICY "Users can upload their own profile photos" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'profile-photos' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Profile photos are publicly viewable" ON storage.objects
    FOR SELECT USING (bucket_id = 'profile-photos');
```

### 3. Configure the Application

1. Open `config.js`
2. Replace the placeholder values with your Supabase credentials:

```javascript
const SUPABASE_CONFIG = {
    url: 'https://your-project-id.supabase.co',
    anonKey: 'your-anon-key'
};
```

3. Update the admin emails array with your email:

```javascript
const ADMIN_EMAILS = [
    'your-email@example.com'
];
```

### 4. Run the Application

1. Open `index.html` in your web browser
2. Or serve the files using a local server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js (if you have http-server installed)
   npx http-server
   ```

3. Navigate to `http://localhost:8000`

## 📱 Features Overview

### Home Page
- Welcome message and platform statistics
- Quick access to skill discovery
- User count, successful swaps, and average ratings

### User Authentication
- Email/password signup and login
- Secure session management
- Automatic profile creation on signup

### Profile Management
- **Personal Information**: Name, location, profile photo
- **Skills**: Add/remove skills you offer and want to learn
- **Availability**: Select when you're available (weekends, evenings, weekdays)
- **Privacy**: Toggle profile visibility (public/private)
- **Photo Upload**: Upload profile pictures via Supabase Storage

### Skill Discovery
- **Search**: Find users by skill name
- **Filters**: Filter by availability and location
- **Profile Cards**: View user information, skills, and ratings
- **Quick Actions**: Request swaps or view full profiles

### Swap Management
- **Incoming Requests**: View and respond to swap requests
- **Outgoing Requests**: Track your sent requests
- **Status Tracking**: Pending, accepted, rejected, completed
- **Actions**: Accept, reject, cancel, or mark as complete

### Rating System
- **Star Ratings**: Rate completed swaps (1-5 stars)
- **Feedback**: Leave optional comments
- **Profile Display**: Show average ratings on profiles

### Admin Dashboard
- **User Management**: View all users and their status
- **Activity Monitoring**: Track swap requests and completions
- **Statistics**: Platform usage metrics
- **Access Control**: Only accessible to admin users

## 🔧 Customization

### Adding New Skills
Edit the `COMMON_SKILLS` array in `config.js`:

```javascript
const COMMON_SKILLS = [
    'JavaScript', 'Python', 'React', 'Node.js',
    // Add your skills here
];
```

### Styling
- Modify `styles.css` to change colors, fonts, and layout
- The design uses CSS custom properties for easy theming
- Responsive breakpoints are defined for mobile optimization

### Admin Access
Add admin emails to the `ADMIN_EMAILS` array in `config.js`:

```javascript
const ADMIN_EMAILS = [
    'admin@yourdomain.com',
    'another-admin@yourdomain.com'
];
```

## 🚀 Deployment

### Static Hosting
Deploy to any static hosting service:

- **Netlify**: Drag and drop the folder
- **Vercel**: Connect your GitHub repository
- **GitHub Pages**: Push to a GitHub repository
- **Firebase Hosting**: Use Firebase CLI
- **AWS S3**: Upload to S3 bucket with static website hosting

### Environment Variables
For production, consider using environment variables for sensitive data:

```javascript
const SUPABASE_CONFIG = {
    url: process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL',
    anonKey: process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'
};
```

## 🔒 Security Features

- **Row Level Security (RLS)**: Database-level access control
- **Authentication**: Secure user sessions
- **Input Validation**: Client and server-side validation
- **File Upload Security**: Restricted to images only
- **Admin Access Control**: Email-based admin verification

## 📊 Database Schema

### Profiles Table
```sql
profiles (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    location TEXT,
    photo_url TEXT,
    skills_offered TEXT[],
    skills_wanted TEXT[],
    weekends BOOLEAN,
    evenings BOOLEAN,
    weekdays BOOLEAN,
    public_profile BOOLEAN,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
)
```

### Swap Requests Table
```sql
swap_requests (
    id UUID PRIMARY KEY,
    requester_id UUID REFERENCES auth.users(id),
    target_user_id UUID REFERENCES auth.users(id),
    offered_skill TEXT NOT NULL,
    requested_skill TEXT NOT NULL,
    message TEXT,
    status TEXT CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
)
```

### Feedback Table
```sql
feedback (
    id UUID PRIMARY KEY,
    swap_request_id UUID REFERENCES swap_requests(id),
    rater_id UUID REFERENCES auth.users(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    created_at TIMESTAMP
)
```

## 🐛 Troubleshooting

### Common Issues

1. **"Please configure your Supabase credentials"**
   - Check that you've updated `config.js` with your actual Supabase URL and anon key

2. **"Failed to load profiles"**
   - Ensure you've created the database tables and RLS policies
   - Check that the `profiles` table exists and has the correct structure

3. **Photo upload not working**
   - Verify the `profile-photos` storage bucket exists
   - Check that storage policies are correctly configured

4. **Admin dashboard not accessible**
   - Make sure your email is in the `ADMIN_EMAILS` array in `config.js`
   - Verify you're logged in with the correct email

### Debug Mode
Add this to your browser console to enable debug logging:

```javascript
localStorage.setItem('debug', 'true');
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🆘 Support

If you encounter any issues:

1. Check the troubleshooting section above
2. Review the Supabase documentation
3. Check browser console for error messages
4. Verify all database tables and policies are created correctly

## 🎯 Future Enhancements

- Email notifications for new swap requests
- Real-time chat between users
- Skill verification system
- Advanced search filters
- Mobile app version
- Integration with calendar systems
- Video call integration
- Skill categories and tags
- Achievement/badge system
- Community forums

---

Built with ❤️ using HTML, CSS, JavaScript, and Supabase 