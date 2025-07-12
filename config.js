// Supabase Configuration
// Replace these values with your actual Supabase project credentials
const SUPABASE_CONFIG = {
    url: 'https://fexyjnavudrdggtjcinl.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZleHlqbmF2dWRyZGdndGpjaW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMDA5NTksImV4cCI6MjA2Nzg3Njk1OX0.2cNlUkeMZtYkTxVVQUaouwleOOkyjSHmUlgLmD5s9vk'
};

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// Database table names
const TABLES = {
    PROFILES: 'profiles',
    SWAP_REQUESTS: 'swap_requests',
    FEEDBACK: 'feedback',
    MEETINGS: 'meetings',
    MEETING_PARTICIPANTS: 'meeting_participants',
    CHAT_MESSAGES: 'chat_messages'
};

// Storage bucket names
const STORAGE = {
    PROFILE_PHOTOS: 'profile-photos'
};

// Admin user emails (replace with actual admin emails)
const ADMIN_EMAILS = [
    'shahparshva2005@gmail.com'  // Replace this with your actual email
    // Add more admin emails as needed
];

// Common skills for suggestions
const COMMON_SKILLS = [
    'JavaScript', 'Python', 'React', 'Node.js', 'HTML/CSS', 'SQL',
    'Photoshop', 'Illustrator', 'Excel', 'PowerPoint', 'Word',
    'Cooking', 'Baking', 'Photography', 'Video Editing', 'Music',
    'Language Teaching', 'Math Tutoring', 'Writing', 'Public Speaking',
    'Fitness Training', 'Yoga', 'Dancing', 'Drawing', 'Painting',
    'Web Design', 'Mobile Development', 'Data Analysis', 'Machine Learning',
    'Graphic Design', 'UI/UX Design', 'Project Management', 'Marketing',
    'Sales', 'Customer Service', 'Accounting', 'Legal Advice',
    'Home Repair', 'Gardening', 'Pet Training', 'Childcare'
];

// Export configuration
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
window.supabase = supabase;
window.TABLES = TABLES;
window.STORAGE = STORAGE;
window.ADMIN_EMAILS = ADMIN_EMAILS;
window.COMMON_SKILLS = COMMON_SKILLS; 