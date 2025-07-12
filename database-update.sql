-- Database Update Script for Built-in Video Chat
-- Run this script in your Supabase SQL Editor to fix the room_id issue and add chat functionality

-- Add room_id column to meetings table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'meetings' AND column_name = 'room_id') THEN
        ALTER TABLE meetings ADD COLUMN room_id TEXT UNIQUE;
        RAISE NOTICE 'Added room_id column to meetings table';
    END IF;
END $$;

-- Create chat_messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_chat_messages_meeting ON chat_messages(meeting_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);

-- Enable RLS on chat_messages table
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view chat messages for their meetings" ON chat_messages;
DROP POLICY IF EXISTS "Users can create chat messages for their meetings" ON chat_messages;

-- Create chat messages RLS policies
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

RAISE NOTICE 'Database update completed successfully!'; 