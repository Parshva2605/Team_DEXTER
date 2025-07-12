-- Skill Swap Platform Database Setup
-- Run these commands in your Supabase SQL Editor

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

const SUPABASE_CONFIG = {
    url: 'https://your-project-id.supabase.co',  // Your Project URL
    anonKey: 'your-actual-anon-key'              // Your anon public key
}; 