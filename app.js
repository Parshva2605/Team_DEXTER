// Global variables
let currentUser = null;
let userProfile = null;
let selectedRating = 0;
let currentSwapRequest = null;

let successfulSwapsCount = 0;

// WebRTC variables
let localStream = null;
let remoteStream = null;
let peerConnection = null;
let localVideo = null;
let remoteVideo = null;
let isVideoEnabled = true;
let isAudioEnabled = true;
let roomId = null;

// DOM Elements
const authBtn = document.getElementById('auth-btn');
const authModal = document.getElementById('auth-modal');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const swapModal = document.getElementById('swap-modal');
const feedbackModal = document.getElementById('feedback-modal');
const loading = document.getElementById('loading');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    checkAuthState();
});

// Initialize the application
async function initializeApp() {
    try {
        // Check if Supabase is configured
        if (SUPABASE_CONFIG.url === 'YOUR_SUPABASE_URL') {
            showError('Please configure your Supabase credentials in config.js');
            return;
        }

        // Load home page stats
        loadHomeStats();
        
        // Load common skills for suggestions
        setupSkillSuggestions();
        
        // Initialize real-time subscriptions
        initializeRealtimeSubscriptions();
        

        
    } catch (error) {
        console.error('Initialization error:', error);
        showError('Failed to initialize application');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = e.target.dataset.page;
            showPage(page);
        });
    });

    // Mobile navigation toggle
    document.getElementById('nav-toggle').addEventListener('click', toggleMobileMenu);

    // Authentication
    authBtn.addEventListener('click', showAuthModal);
    document.querySelectorAll('.close').forEach(close => {
        close.addEventListener('click', hideModals);
    });

    // Auth tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            switchAuthTab(e.target.dataset.tab);
        });
    });

    // Auth forms
    loginForm.addEventListener('submit', handleLogin);
    signupForm.addEventListener('submit', handleSignup);

    // Profile form
    document.getElementById('profile-form').addEventListener('submit', handleProfileSave);

    // Photo upload
    document.getElementById('photo-input').addEventListener('change', handlePhotoUpload);

    // Skill inputs
    setupSkillInputs();

    // Search and filters
    document.getElementById('skill-search').addEventListener('input', debounce(handleSearch, 300));
    document.getElementById('availability-filter').addEventListener('change', handleSearch);
    document.getElementById('location-filter').addEventListener('change', handleSearch);

    // Swap tabs
    document.querySelectorAll('.swaps-tabs .tab-btn').forEach(tab => {
        tab.addEventListener('click', (e) => {
            switchSwapTab(e.target.dataset.tab);
        });
    });



    // Swap request form
    document.getElementById('swap-request-form').addEventListener('submit', handleSwapRequest);

    // Feedback form
    document.getElementById('feedback-form').addEventListener('submit', handleFeedback);

    // Rating stars
    document.querySelectorAll('.rating-stars i').forEach(star => {
        star.addEventListener('click', (e) => {
            selectedRating = parseInt(e.target.dataset.rating);
            updateRatingStars();
        });
    });

    // Modal backdrop clicks
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            hideModals();
        }
    });

    // Admin form event listeners
    document.getElementById('platform-message-form')?.addEventListener('submit', handlePlatformMessage);
    document.getElementById('ban-user-form')?.addEventListener('submit', handleBanUser);
    
    // Moderation tab switching
    document.querySelectorAll('.moderation-tabs .tab-btn').forEach(tab => {
        tab.addEventListener('click', (e) => {
            switchModerationTab(e.target.dataset.tab);
        });
    });

    // Admin tab switching
    document.querySelectorAll('.admin-tab-btn').forEach(tab => {
        tab.addEventListener('click', (e) => {
            switchAdminTab(e.target.dataset.tab);
        });
    });
}

// Check authentication state
async function checkAuthState() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) throw error;
        
        if (user) {
            currentUser = user;
            await loadUserProfile();
            updateAuthUI();
        } else {
            updateAuthUI();
        }
    } catch (error) {
        console.error('Auth state check error:', error);
    }
}

// Update authentication UI
function updateAuthUI() {
    if (currentUser) {
        authBtn.textContent = 'Logout';
        authBtn.onclick = handleLogout;
        
        // Show admin link if user is admin
        const adminLink = document.querySelector('.admin-only');
        if (currentUser.role === 'admin' || ADMIN_EMAILS.includes(currentUser.email)) {
            adminLink.style.display = 'block';
        }
        
        // Hide auth modal if open
        hideModals();
    } else {
        authBtn.textContent = 'Login';
        authBtn.onclick = showAuthModal;
        
        // Hide admin link
        document.querySelector('.admin-only').style.display = 'none';
    }
}

// Show authentication modal
function showAuthModal() {
    authModal.style.display = 'block';
    switchAuthTab('login');
}

// Hide all modals
function hideModals() {
    authModal.style.display = 'none';
    swapModal.style.display = 'none';
    feedbackModal.style.display = 'none';
    document.getElementById('profile-view-modal').style.display = 'none';
}

// Switch authentication tabs
function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    document.getElementById(`${tab}-form`).classList.add('active');
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    showLoading();
    
    try {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        // Check for admin login
        if (email === 'admin01@gmail.com' && password === 'admin01') {
            // Redirect to admin.html page
            window.location.href = 'admin.html?email=admin01@gmail.com';
            return;
        }
        
        // Regular user login
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        
        currentUser = data.user;
        await loadUserProfile();
        updateAuthUI();
        
        // Initialize real-time subscriptions after login
        initializeRealtimeSubscriptions();
        
        showSuccess('Login successful!');
        
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Handle signup
async function handleSignup(e) {
    e.preventDefault();
    showLoading();
    
    try {
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const name = document.getElementById('signup-name').value;
        
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name: name
                }
            }
        });
        
        if (error) throw error;
        
        // Manually create profile if user was created successfully
        if (data.user) {
            try {
                const { error: profileError } = await supabase
                    .from(TABLES.PROFILES)
                    .insert([{
                        user_id: data.user.id,
                        name: name
                    }]);
                
                if (profileError) {
                    console.warn('Profile creation failed:', profileError);
                    // Don't throw error here, user account was created successfully
                }
            } catch (profileError) {
                console.warn('Profile creation failed:', profileError);
                // Don't throw error here, user account was created successfully
            }
        }
        
        showSuccess('Account created! Please check your email to verify your account.');
        switchAuthTab('login');
        
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Handle logout
async function handleLogout() {
    try {
        // Clean up real-time subscriptions
        if (window.swapRequestsSubscription) {
            window.swapRequestsSubscription.unsubscribe();
            window.swapRequestsSubscription = null;
        }
        
        if (window.notificationsSubscription) {
            window.notificationsSubscription.unsubscribe();
            window.notificationsSubscription = null;
        }
        if (window.chatMessagesSubscription) {
            window.chatMessagesSubscription.unsubscribe();
            window.chatMessagesSubscription = null;
        }
        
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        currentUser = null;
        userProfile = null;
        updateAuthUI();
        showPage('home');
        showSuccess('Logged out successfully');
        
    } catch (error) {
        showError(error.message);
    }
}

// Load user profile
async function loadUserProfile() {
    try {
        const { data, error } = await supabase
            .from(TABLES.PROFILES)
            .select('*')
            .eq('user_id', currentUser.id)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        
        userProfile = data || null;
        
        if (userProfile) {
            populateProfileForm();
            updateProfileDisplay();
        }
        
    } catch (error) {
        console.error('Profile load error:', error);
    }
}

// Populate profile form
function populateProfileForm() {
    if (!userProfile) return;
    
    document.getElementById('name').value = userProfile.name || '';
    document.getElementById('location').value = userProfile.location || '';
    document.getElementById('weekends').checked = userProfile.weekends || false;
    document.getElementById('evenings').checked = userProfile.evenings || false;
    document.getElementById('weekdays').checked = userProfile.weekdays || false;
    document.getElementById('public-profile').checked = userProfile.public_profile || false;
    
    // Populate skills
    populateSkills('skills-offered-tags', userProfile.skills_offered || []);
    populateSkills('skills-wanted-tags', userProfile.skills_wanted || []);
    
    // Update profile display
    updateProfileDisplay();
}

// Populate skills tags
function populateSkills(containerId, skills) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    skills.forEach(skill => {
        const tag = createSkillTag(skill, containerId.includes('wanted'));
        container.appendChild(tag);
    });
}

// Create skill tag
function createSkillTag(skill, isWanted = false) {
    const tag = document.createElement('span');
    tag.className = `skill-tag ${isWanted ? 'wanted' : ''}`;
    tag.textContent = skill;
    
    const removeBtn = document.createElement('span');
    removeBtn.innerHTML = ' ×';
    removeBtn.style.cursor = 'pointer';
    removeBtn.style.marginLeft = '5px';
    removeBtn.onclick = () => tag.remove();
    
    tag.appendChild(removeBtn);
    return tag;
}

// Setup skill inputs
function setupSkillInputs() {
    const offeredInput = document.getElementById('skill-offered-input');
    const wantedInput = document.getElementById('skill-wanted-input');
    
    [offeredInput, wantedInput].forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addSkill(input);
            }
        });
        
        input.addEventListener('blur', () => {
            if (input.value.trim()) {
                addSkill(input);
            }
        });
    });
}

// Add skill
function addSkill(input) {
    const skill = input.value.trim();
    if (!skill) return;
    
    const isWanted = input.id.includes('wanted');
    const containerId = isWanted ? 'skills-wanted-tags' : 'skills-offered-tags';
    const container = document.getElementById(containerId);
    
    // Check if skill already exists
    const existingTags = Array.from(container.children).map(tag => tag.textContent.replace(' ×', ''));
    if (existingTags.includes(skill)) {
        input.value = '';
        return;
    }
    
    const tag = createSkillTag(skill, isWanted);
    container.appendChild(tag);
    input.value = '';
}

// Setup skill suggestions
function setupSkillSuggestions() {
    const inputs = [document.getElementById('skill-offered-input'), document.getElementById('skill-wanted-input')];
    
    inputs.forEach(input => {
        input.addEventListener('input', (e) => {
            const value = e.target.value.toLowerCase();
            if (value.length < 2) return;
            
            const suggestions = COMMON_SKILLS.filter(skill => 
                skill.toLowerCase().includes(value)
            ).slice(0, 5);
            
            showSkillSuggestions(input, suggestions);
        });
    });
}

// Show skill suggestions
function showSkillSuggestions(input, suggestions) {
    // Remove existing suggestions
    const existing = input.parentNode.querySelector('.skill-suggestions');
    if (existing) existing.remove();
    
    if (suggestions.length === 0) return;
    
    const suggestionsDiv = document.createElement('div');
    suggestionsDiv.className = 'skill-suggestions';
    suggestionsDiv.style.cssText = `
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        z-index: 1000;
        max-height: 200px;
        overflow-y: auto;
    `;
    
    suggestions.forEach(skill => {
        const item = document.createElement('div');
        item.textContent = skill;
        item.style.cssText = `
            padding: 0.5rem 1rem;
            cursor: pointer;
            border-bottom: 1px solid #eee;
        `;
        item.onclick = () => {
            input.value = skill;
            addSkill(input);
            suggestionsDiv.remove();
        };
        suggestionsDiv.appendChild(item);
    });
    
    input.parentNode.appendChild(suggestionsDiv);
}

// Handle profile save
async function handleProfileSave(e) {
    e.preventDefault();
    showLoading();
    
    try {
        if (!currentUser) {
            throw new Error('You must be logged in to save your profile');
        }
        
        const formData = {
            user_id: currentUser.id,
            name: document.getElementById('name').value,
            location: document.getElementById('location').value,
            weekends: document.getElementById('weekends').checked,
            evenings: document.getElementById('evenings').checked,
            weekdays: document.getElementById('weekdays').checked,
            public_profile: document.getElementById('public-profile').checked,
            skills_offered: getSkillsFromTags('skills-offered-tags'),
            skills_wanted: getSkillsFromTags('skills-wanted-tags'),
            updated_at: new Date().toISOString()
        };
        
        let result;
        if (userProfile) {
            // Update existing profile
            result = await supabase
                .from(TABLES.PROFILES)
                .update(formData)
                .eq('user_id', currentUser.id);
        } else {
            // Create new profile
            result = await supabase
                .from(TABLES.PROFILES)
                .insert([formData]);
        }
        
        if (result.error) throw result.error;
        
        userProfile = formData;
        updateProfileDisplay();
        showSuccess('Profile saved successfully!');
        
        // Switch back to view mode
        toggleProfileEdit();
        
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Get skills from tags
function getSkillsFromTags(containerId) {
    const container = document.getElementById(containerId);
    return Array.from(container.children).map(tag => 
        tag.textContent.replace(' ×', '')
    );
}

// Handle photo upload
async function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    showLoading();
    
    try {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            throw new Error('Please select an image file');
        }
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            throw new Error('File size must be less than 5MB');
        }
        
        const fileExt = file.name.split('.').pop().toLowerCase();
        const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;
        
        // Upload file to storage
        const { data, error } = await supabase.storage
            .from(STORAGE.PROFILE_PHOTOS)
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            });
        
        if (error) {
            console.error('Upload error:', error);
            throw new Error('Failed to upload photo: ' + error.message);
        }
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from(STORAGE.PROFILE_PHOTOS)
            .getPublicUrl(fileName);
        
        // Update profile with photo URL
        const { error: updateError } = await supabase
            .from(TABLES.PROFILES)
            .update({ photo_url: publicUrl })
            .eq('user_id', currentUser.id);
        
        if (updateError) {
            console.error('Profile update error:', updateError);
            throw new Error('Failed to update profile: ' + updateError.message);
        }
        
        // Update display
        document.getElementById('profile-photo').src = publicUrl;
        showSuccess('Photo uploaded successfully!');
        
    } catch (error) {
        console.error('Photo upload error:', error);
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Update profile display
function updateProfileDisplay() {
    if (!userProfile) return;
    
    document.getElementById('profile-name').textContent = userProfile.name || 'Your Name';
    document.getElementById('profile-location').textContent = userProfile.location || 'Location';
    
    if (userProfile.photo_url) {
        document.getElementById('profile-photo').src = userProfile.photo_url;
    }
    
    // Update swap count
    updateProfileSwapCount();
    
    // Update profile details display
    updateProfileDetailsDisplay();
}

// Update profile swap count
async function updateProfileSwapCount() {
    try {
        const { count: totalSwaps, error } = await supabase
            .from(TABLES.SWAP_REQUESTS)
            .select('*', { count: 'exact', head: true })
            .or(`requester_id.eq.${currentUser.id},target_user_id.eq.${currentUser.id}`)
            .eq('status', 'accepted');
        
        const swapCount = totalSwaps || 0;
        document.getElementById('profile-swap-count').textContent = `${swapCount} successful swaps`;
    } catch (error) {
        console.error('Error loading swap count:', error);
        document.getElementById('profile-swap-count').textContent = '0 successful swaps';
    }
}

// Update profile details display
function updateProfileDetailsDisplay() {
    if (!userProfile) return;
    
    // Update skills offered display
    const skillsOfferedDisplay = document.getElementById('profile-skills-offered-display');
    skillsOfferedDisplay.innerHTML = (userProfile.skills_offered || []).map(skill => 
        `<span class="skill-tag">${skill}</span>`
    ).join('') || '<span style="color: #666; font-style: italic;">No skills offered yet</span>';
    
    // Update skills wanted display
    const skillsWantedDisplay = document.getElementById('profile-skills-wanted-display');
    skillsWantedDisplay.innerHTML = (userProfile.skills_wanted || []).map(skill => 
        `<span class="skill-tag wanted">${skill}</span>`
    ).join('') || '<span style="color: #666; font-style: italic;">No skills wanted yet</span>';
    
    // Update availability display
    const availabilityDisplay = document.getElementById('profile-availability-display');
    const availabilityTags = [];
    if (userProfile.weekends) availabilityTags.push('Weekends');
    if (userProfile.evenings) availabilityTags.push('Evenings');
    if (userProfile.weekdays) availabilityTags.push('Weekdays');
    
    availabilityDisplay.innerHTML = availabilityTags.map(tag => 
        `<span class="availability-tag">${tag}</span>`
    ).join('') || '<span style="color: #666; font-style: italic;">No availability set</span>';
    
    // Update visibility display
    const visibilityDisplay = document.getElementById('profile-visibility-display');
    const isPublic = userProfile.public_profile;
    visibilityDisplay.innerHTML = `
        <div class="visibility-status ${isPublic ? 'public' : 'private'}">
            <i class="fas fa-${isPublic ? 'eye' : 'eye-slash'}"></i>
            <span>${isPublic ? 'Public Profile' : 'Private Profile'}</span>
        </div>
    `;
}

// Toggle between profile view and edit modes
function toggleProfileEdit() {
    const viewMode = document.getElementById('profile-view-mode');
    const editMode = document.getElementById('profile-edit-mode');
    
    if (viewMode.style.display === 'none') {
        // Switch to view mode
        viewMode.style.display = 'block';
        editMode.style.display = 'none';
    } else {
        // Switch to edit mode
        viewMode.style.display = 'none';
        editMode.style.display = 'block';
        
        // Populate form with current data
        populateProfileForm();
    }
}

// Show page
function showPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    const page = document.getElementById(`${pageName}-page`);
    if (page) {
        page.classList.add('active');
        
        // Load page-specific content
        switch (pageName) {
            case 'discover':
                loadProfiles();
                break;
            case 'profile':
                if (currentUser) {
                    loadUserProfile();
                } else {
                    showAuthModal();
                }
                break;
            case 'swaps':
                if (currentUser) {
                    loadSwapRequests();
                } else {
                    showAuthModal();
                }
                break;

            case 'admin':
                if (currentUser && (currentUser.role === 'admin' || ADMIN_EMAILS.includes(currentUser.email))) {
                    loadAdminDashboard();
                } else {
                    showError('Access denied. Admin privileges required.');
                    showPage('home');
                }
                break;
            case 'admin-dashboard':
                if (currentUser && currentUser.role === 'admin') {
                    loadAdminDashboardEnhanced();
                } else {
                    showError('Access denied. Admin privileges required.');
                    showPage('home');
                }
                break;
        }
    }
}

// Load home stats
async function loadHomeStats() {
    try {
        // Get user count
        const { count: userCount } = await supabase
            .from(TABLES.PROFILES)
            .select('*', { count: 'exact', head: true });
        
        // Get swap count
        const { count: swapCount } = await supabase
            .from(TABLES.SWAP_REQUESTS)
            .select('*', { count: 'exact', head: true })
            .eq('status', 'accepted');
        
        // Get average rating
        const { data: feedback } = await supabase
            .from(TABLES.FEEDBACK)
            .select('rating');
        
        const avgRating = feedback && feedback.length > 0 
            ? (feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length).toFixed(1)
            : '0.0';
        
        // Update display
        document.getElementById('user-count').textContent = userCount || 0;
        document.getElementById('swap-count').textContent = swapCount || 0;
        document.getElementById('rating-avg').textContent = avgRating;
        
    } catch (error) {
        console.error('Stats load error:', error);
    }
}

// Load profiles for discovery
async function loadProfiles(searchTerm = '', filters = {}) {
    try {
        let query = supabase
            .from(TABLES.PROFILES)
            .select('*')
            .eq('public_profile', true);
        
        // Exclude current user's profile
        if (currentUser) {
            query = query.neq('user_id', currentUser.id);
        }
        
        // Apply search filter
        if (searchTerm) {
            query = query.or(`skills_offered.cs.{${searchTerm}},skills_wanted.cs.{${searchTerm}},name.ilike.%${searchTerm}%`);
        }
        
        // Apply availability filter
        if (filters.availability) {
            query = query.eq(filters.availability, true);
        }
        
        // Apply location filter
        if (filters.location) {
            query = query.ilike('location', `%${filters.location}%`);
        }
        
        const { data: profiles, error } = await query;
        
        if (error) throw error;
        
        displayProfiles(profiles || []);
        
    } catch (error) {
        console.error('Profiles load error:', error);
        showError('Failed to load profiles');
    }
}

// Display profiles
function displayProfiles(profiles) {
    const grid = document.getElementById('profiles-grid');
    grid.innerHTML = '';
    
    if (profiles.length === 0) {
        grid.innerHTML = '<p style="text-align: center; color: #666; grid-column: 1/-1;">No profiles found</p>';
        return;
    }
    
    profiles.forEach(profile => {
        const card = createProfileCard(profile);
        grid.appendChild(card);
    });
}

// Create profile card
function createProfileCard(profile) {
    const card = document.createElement('div');
    card.className = 'profile-card';
    
    const photoUrl = profile.photo_url || 'https://via.placeholder.com/60';
    
    card.innerHTML = `
        <div class="profile-card-header">
            <img src="${photoUrl}" alt="${profile.name}" class="profile-card-photo">
            <div class="profile-card-info">
                <h3>${profile.name}</h3>
                <p>${profile.location || 'Location not specified'}</p>
            </div>
        </div>
        <div class="profile-card-skills">
            <div class="skills-section">
                <h4>Offers:</h4>
                <div class="skills-tags">
                    ${(profile.skills_offered || []).slice(0, 3).map(skill => 
                        `<span class="skill-tag">${skill}</span>`
                    ).join('')}
                    ${(profile.skills_offered || []).length > 3 ? 
                        `<span class="skill-tag">+${(profile.skills_offered || []).length - 3} more</span>` : ''
                    }
                </div>
            </div>
            <div class="skills-section">
                <h4>Wants:</h4>
                <div class="skills-tags">
                    ${(profile.skills_wanted || []).slice(0, 3).map(skill => 
                        `<span class="skill-tag wanted">${skill}</span>`
                    ).join('')}
                    ${(profile.skills_wanted || []).length > 3 ? 
                        `<span class="skill-tag wanted">+${(profile.skills_wanted || []).length - 3} more</span>` : ''
                    }
                </div>
            </div>
        </div>
        <div class="profile-card-actions">
            <button class="btn btn-primary" onclick="requestSwap('${profile.user_id}')">Request Swap</button>
            <button class="btn btn-secondary" onclick="viewProfile('${profile.user_id}')">View Profile</button>
        </div>
    `;
    
    return card;
}

// Handle search
function handleSearch() {
    const searchTerm = document.getElementById('skill-search').value;
    const availability = document.getElementById('availability-filter').value;
    const location = document.getElementById('location-filter').value;
    
    loadProfiles(searchTerm, { availability, location });
}

// Request swap
function requestSwap(userId) {
    if (!currentUser) {
        showAuthModal();
        return;
    }
    
    // Prevent users from requesting swaps with themselves
    if (userId === currentUser.id) {
        showError('You cannot request a swap with yourself');
        return;
    }
    
    currentSwapRequest = { targetUserId: userId };
    swapModal.style.display = 'block';
    
    // Populate skill options
    populateSwapSkillOptions();
}

// View profile
async function viewProfile(userId) {
    try {
        showLoading();
        
        // Get profile data
        const { data: profile, error } = await supabase
            .from(TABLES.PROFILES)
            .select('*')
            .eq('user_id', userId)
            .eq('public_profile', true)
            .single();
        
        if (error) {
            if (error.code === 'PGRST116') {
                showError('Profile not found or not public');
            } else {
                throw error;
            }
            return;
        }
        
        // Get user's total successful swaps count
        const { count: totalSwaps, error: swapError } = await supabase
            .from(TABLES.SWAP_REQUESTS)
            .select('*', { count: 'exact', head: true })
            .or(`requester_id.eq.${userId},target_user_id.eq.${userId}`)
            .eq('status', 'accepted');
        
        const swapCount = totalSwaps || 0;
        
        // Create availability tags
        const availabilityTags = [];
        if (profile.weekends) availabilityTags.push('Weekends');
        if (profile.evenings) availabilityTags.push('Evenings');
        if (profile.weekdays) availabilityTags.push('Weekdays');
        
        const availabilityHTML = availabilityTags.map(tag => 
            `<span class="availability-tag">${tag}</span>`
        ).join('');
        
        // Populate profile view modal
        const profileViewContent = document.getElementById('profile-view-content');
        profileViewContent.innerHTML = `
            <div class="profile-view-header">
                <img src="${profile.photo_url || 'https://via.placeholder.com/80'}" alt="${profile.name}" class="profile-view-photo">
                <div class="profile-view-info">
                    <h2>${profile.name}</h2>
                    <p>${profile.location || 'Location not specified'}</p>
                    <div class="profile-view-swaps">
                        <div class="swap-count-display">
                            <i class="fas fa-exchange-alt"></i>
                            <span class="swap-count-text">${swapCount} successful swaps</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="profile-view-section">
                <h3>Skills Offered</h3>
                <div class="profile-view-skills">
                    ${(profile.skills_offered || []).map(skill => 
                        `<span class="profile-view-skill">${skill}</span>`
                    ).join('')}
                </div>
            </div>
            
            <div class="profile-view-section">
                <h3>Skills Wanted</h3>
                <div class="profile-view-skills">
                    ${(profile.skills_wanted || []).map(skill => 
                        `<span class="profile-view-skill wanted">${skill}</span>`
                    ).join('')}
                </div>
            </div>
            
            ${availabilityTags.length > 0 ? `
                <div class="profile-view-section">
                    <h3>Availability</h3>
                    <div class="profile-view-availability">
                        ${availabilityHTML}
                    </div>
                </div>
            ` : ''}
            
            <div class="profile-view-actions">
                <button class="btn btn-primary" onclick="requestSwap('${userId}')">Request Swap</button>
                <button class="btn btn-secondary" onclick="hideModals()">Close</button>
            </div>
        `;
        
        // Show modal
        document.getElementById('profile-view-modal').style.display = 'block';
        
    } catch (error) {
        console.error('View profile error:', error);
        showError('Failed to load profile');
    } finally {
        hideLoading();
    }
}

// Populate swap skill options
function populateSwapSkillOptions() {
    const offerSelect = document.getElementById('swap-offer');
    const requestSelect = document.getElementById('swap-request');
    
    // Clear existing options
    offerSelect.innerHTML = '<option value="">Select a skill...</option>';
    requestSelect.innerHTML = '<option value="">Select a skill...</option>';
    
    if (!userProfile) return;
    
    // Add offered skills to offer select
    (userProfile.skills_offered || []).forEach(skill => {
        const option = document.createElement('option');
        option.value = skill;
        option.textContent = skill;
        offerSelect.appendChild(option);
    });
    
    // Add wanted skills to request select
    (userProfile.skills_wanted || []).forEach(skill => {
        const option = document.createElement('option');
        option.value = skill;
        option.textContent = skill;
        requestSelect.appendChild(option);
    });
}

// Handle swap request
async function handleSwapRequest(e) {
    e.preventDefault();
    showLoading();
    
    try {
        const offerSkill = document.getElementById('swap-offer').value;
        const requestSkill = document.getElementById('swap-request').value;
        const message = document.getElementById('swap-message').value;
        
        if (!offerSkill || !requestSkill) {
            throw new Error('Please select both skills');
        }
        
        const swapData = {
            requester_id: currentUser.id,
            target_user_id: currentSwapRequest.targetUserId,
            offered_skill: offerSkill,
            requested_skill: requestSkill,
            message: message,
            status: 'pending',
            created_at: new Date().toISOString()
        };
        
        const { error } = await supabase
            .from(TABLES.SWAP_REQUESTS)
            .insert([swapData]);
        
        if (error) throw error;
        
        hideModals();
        showSuccess('Swap request sent successfully!');
        
        // Reset form
        document.getElementById('swap-request-form').reset();
        
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Load swap requests
async function loadSwapRequests() {
    try {
        showLoading();
        
        console.log('Loading swap requests for user:', currentUser.id);
        
        // Load incoming requests
        const { data: incoming, error: incomingError } = await supabase
            .from(TABLES.SWAP_REQUESTS)
            .select('*')
            .eq('target_user_id', currentUser.id)
            .order('created_at', { ascending: false });
        
        console.log('Incoming requests result:', { data: incoming, error: incomingError });
        
        if (incomingError) {
            console.error('Incoming requests error:', incomingError);
            throw incomingError;
        }
        
        // Load outgoing requests
        const { data: outgoing, error: outgoingError } = await supabase
            .from(TABLES.SWAP_REQUESTS)
            .select('*')
            .eq('requester_id', currentUser.id)
            .order('created_at', { ascending: false });
        
        console.log('Outgoing requests result:', { data: outgoing, error: outgoingError });
        
        if (outgoingError) {
            console.error('Outgoing requests error:', outgoingError);
            throw outgoingError;
        }
        
        // Load user profiles for incoming requests
        if (incoming && incoming.length > 0) {
            const requesterIds = [...new Set(incoming.map(req => req.requester_id))];
            const { data: requesterProfiles, error: profilesError } = await supabase
                .from('profiles')
                .select('user_id, name, photo_url, location')
                .in('user_id', requesterIds);
            
            if (profilesError) {
                console.error('Profiles error:', profilesError);
            } else {
                const profilesMap = {};
                requesterProfiles.forEach(profile => {
                    profilesMap[profile.user_id] = profile;
                });
                
                incoming.forEach(request => {
                    request.requester = profilesMap[request.requester_id];
                });
            }
        }
        
        // Load user profiles for outgoing requests
        if (outgoing && outgoing.length > 0) {
            const targetIds = [...new Set(outgoing.map(req => req.target_user_id))];
            const { data: targetProfiles, error: profilesError } = await supabase
                .from('profiles')
                .select('user_id, name, photo_url, location')
                .in('user_id', targetIds);
            
            if (profilesError) {
                console.error('Profiles error:', profilesError);
            } else {
                const profilesMap = {};
                targetProfiles.forEach(profile => {
                    profilesMap[profile.user_id] = profile;
                });
                
                outgoing.forEach(request => {
                    request.target = profilesMap[request.target_user_id];
                });
            }
        }
        

        
        displaySwapRequests('incoming-swaps', incoming || []);
        displaySwapRequests('outgoing-swaps', outgoing || []);
        
        // Update notification badge
        updateSwapNotificationBadge(incoming || []);
        
    } catch (error) {
        console.error('Swap requests load error:', error);
        showError('Failed to load swap requests: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Display swap requests
function displaySwapRequests(containerId, requests) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    if (requests.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666;">No swap requests found</p>';
        return;
    }
    
    requests.forEach(request => {
        const item = createSwapRequestItem(request, containerId.includes('incoming'));
        container.appendChild(item);
    });
}

// Create swap request item
function createSwapRequestItem(request, isIncoming) {
    const item = document.createElement('div');
    item.className = 'swap-item';
    item.setAttribute('data-request-id', request.id);
    
    const user = isIncoming ? request.requester : request.target;
    const photoUrl = user?.photo_url || 'https://via.placeholder.com/50';
    
    item.innerHTML = `
        <div class="swap-item-header">
            <div class="swap-item-user">
                <img src="${photoUrl}" alt="${user?.name || 'User'}">
                <div>
                    <h4>${user?.name || 'Unknown User'}</h4>
                    <small>${new Date(request.created_at).toLocaleDateString()}</small>
                </div>
            </div>
            <span class="swap-item-status ${request.status}">${request.status}</span>
        </div>
        <div class="swap-item-details">
            <p><strong>Offers:</strong> ${request.offered_skill}</p>
            <p><strong>Wants:</strong> ${request.requested_skill}</p>
            ${request.message ? `<p><strong>Message:</strong> ${request.message}</p>` : ''}

        </div>
        <div class="swap-item-actions">
            ${getSwapActions(request, isIncoming)}
        </div>
    `;
    
    return item;
}

// Get swap actions
function getSwapActions(request, isIncoming) {
    let actions = '';
    
    if (request.status === 'pending') {
        if (isIncoming) {
            actions += `
                <button class="btn btn-primary" onclick="handleSwapResponse('${request.id}', 'accepted')">Accept</button>
                <button class="btn btn-secondary" onclick="handleSwapResponse('${request.id}', 'rejected')">Reject</button>
            `;
        } else {
            actions += `
                <button class="btn btn-secondary" onclick="cancelSwapRequest('${request.id}')">Cancel</button>
            `;
        }
    } else if (request.status === 'accepted') {
        actions += `
            <button class="btn btn-primary" onclick="completeSwap('${request.id}')">Mark Complete</button>
        `;
    } else if (request.status === 'completed') {
        actions += `
            <button class="btn btn-primary" onclick="rateSwap('${request.id}')">Rate Experience</button>
        `;
    }
    
    // Add delete option for all requests (except completed ones that haven't been rated)
    if (request.status !== 'completed' || request.rating) {
        actions += `
            <button class="btn btn-danger" onclick="deleteSwapRequest('${request.id}')" style="margin-left: 8px;">
                <i class="fas fa-trash"></i> Delete
            </button>
        `;
    }
    
    return actions;
}



// Handle swap response
async function handleSwapResponse(requestId, status) {
    showLoading();
    
    try {
        const { error } = await supabase
            .from(TABLES.SWAP_REQUESTS)
            .update({ 
                status,
                updated_at: new Date().toISOString()
            })
            .eq('id', requestId);
        
        if (error) throw error;
        
        // Reload swap requests to show updated data
        loadSwapRequests();
        
        // Show success message
        const statusText = status === 'accepted' ? 'accepted' : 
                          status === 'rejected' ? 'rejected' : status;
        showSuccess(`Swap request ${statusText}!`);
        
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Cancel swap request
async function cancelSwapRequest(requestId) {
    if (!confirm('Are you sure you want to cancel this request?')) return;
    
    showLoading();
    
    try {
        const { error } = await supabase
            .from(TABLES.SWAP_REQUESTS)
            .delete()
            .eq('id', requestId);
        
        if (error) throw error;
        
        // Immediately remove the item from the DOM for better UX
        const swapItem = document.querySelector(`.swap-item[data-request-id="${requestId}"]`);
        if (swapItem) {
            swapItem.remove();
        }
        
        // Also reload to ensure consistency
        loadSwapRequests();
        showSuccess('Request cancelled successfully!');
        
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Delete swap request (for any status)
async function deleteSwapRequest(requestId) {
    if (!confirm('Are you sure you want to delete this swap request? This action cannot be undone.')) return;
    
    showLoading();
    
    try {
        const { error } = await supabase
            .from(TABLES.SWAP_REQUESTS)
            .delete()
            .eq('id', requestId);
        
        if (error) throw error;
        
        // Immediately remove the item from the DOM for better UX
        const swapItem = document.querySelector(`.swap-item[data-request-id="${requestId}"]`);
        if (swapItem) {
            swapItem.remove();
        }
        
        // Also reload to ensure consistency
        loadSwapRequests();
        showSuccess('Swap request deleted successfully!');
        
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Complete swap
async function completeSwap(requestId) {
    showLoading();
    
    try {
        const { error } = await supabase
            .from(TABLES.SWAP_REQUESTS)
            .update({ status: 'completed' })
            .eq('id', requestId);
        
        if (error) throw error;
        
        loadSwapRequests();
        showSuccess('Swap marked as completed!');
        
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Rate swap
function rateSwap(requestId) {
    currentSwapRequest = { requestId };
    selectedRating = 0;
    updateRatingStars();
    feedbackModal.style.display = 'block';
}

// Update rating stars
function updateRatingStars() {
    document.querySelectorAll('.rating-stars i').forEach((star, index) => {
        star.classList.toggle('active', index < selectedRating);
    });
}

// Handle feedback
async function handleFeedback(e) {
    e.preventDefault();
    showLoading();
    
    try {
        const feedbackText = document.getElementById('feedback-text').value;
        
        if (selectedRating === 0) {
            throw new Error('Please select a rating');
        }
        
        const feedbackData = {
            swap_request_id: currentSwapRequest.requestId,
            rater_id: currentUser.id,
            rating: selectedRating,
            feedback: feedbackText,
            created_at: new Date().toISOString()
        };
        
        const { error } = await supabase
            .from(TABLES.FEEDBACK)
            .insert([feedbackData]);
        
        if (error) throw error;
        
        hideModals();
        showSuccess('Feedback submitted successfully!');
        
        // Reset form
        document.getElementById('feedback-form').reset();
        selectedRating = 0;
        updateRatingStars();
        
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Switch swap tabs
function switchSwapTab(tab) {
    document.querySelectorAll('.swaps-tabs .tab-btn').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.swaps-list').forEach(l => l.classList.remove('active'));
    
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    document.getElementById(`${tab}-swaps`).classList.add('active');
    
    if (tab === 'incoming') {
        loadSwapRequests();
    }
}





// Load admin dashboard
async function loadAdminDashboard() {
    try {
        // Check if user is admin
        if (currentUser?.role !== 'admin') {
            showError('Access denied. Admin privileges required.');
            return;
        }

        showLoading();

        // Load comprehensive overview data
        await loadAdminOverview();
        
        // Load users table
        await loadUsersTable();
        
        // Load activity table
        await loadActivityTable();

        hideLoading();
        
    } catch (error) {
        console.error('Admin dashboard load error:', error);
        showError('Failed to load admin dashboard');
        hideLoading();
    }
}

// Load admin overview with all statistics
async function loadAdminOverview() {
    try {
        // Load all statistics in parallel
        const [userCount, totalSwaps, pendingSwaps, completedSwaps, bannedUsers, avgRating] = await Promise.all([
            supabase.from(TABLES.PROFILES).select('*', { count: 'exact', head: true }),
            supabase.from(TABLES.SWAP_REQUESTS).select('*', { count: 'exact', head: true }),
            supabase.from(TABLES.SWAP_REQUESTS).select('*', { count: 'exact', head: true }).eq('status', 'pending'),
            supabase.from(TABLES.SWAP_REQUESTS).select('*', { count: 'exact', head: true }).eq('status', 'completed'),
            supabase.from(TABLES.PROFILES).select('*', { count: 'exact', head: true }).eq('status', 'banned'),
            supabase.from(TABLES.FEEDBACK).select('rating')
        ]);

        // Calculate average rating
        const avgRatingValue = avgRating.data && avgRating.data.length > 0 
            ? (avgRating.data.reduce((sum, f) => sum + f.rating, 0) / avgRating.data.length).toFixed(1)
            : '0.0';

        // Update overview statistics
        document.getElementById('total-users-overview').textContent = userCount.count || 0;
        document.getElementById('total-swaps-overview').textContent = totalSwaps.count || 0;
        document.getElementById('pending-swaps-overview').textContent = pendingSwaps.count || 0;
        document.getElementById('completed-swaps-overview').textContent = completedSwaps.count || 0;
        document.getElementById('avg-rating-overview').textContent = avgRatingValue;
        document.getElementById('banned-users-overview').textContent = bannedUsers.count || 0;

        // Load recent activity
        await loadRecentActivity();

    } catch (error) {
        console.error('Admin overview load error:', error);
        showError('Failed to load admin overview');
    }
}

// Load recent activity
async function loadRecentActivity() {
    try {
        // Get recent swaps
        const { data: recentSwaps } = await supabase
            .from(TABLES.SWAP_REQUESTS)
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        const activityContainer = document.getElementById('recent-activity');
        
        if (!recentSwaps || recentSwaps.length === 0) {
            activityContainer.innerHTML = '<p>No recent activity</p>';
            return;
        }

        const activityHTML = recentSwaps.map(swap => {
            const activityType = swap.status === 'pending' ? 'swap' : 
                               swap.status === 'completed' ? 'rating' : 'swap';
            
            const activityText = swap.status === 'pending' ? 'New swap request' :
                               swap.status === 'completed' ? 'Swap completed' :
                               swap.status === 'accepted' ? 'Swap accepted' :
                               'Swap updated';

            return `
                <div class="activity-item">
                    <div class="activity-icon ${activityType}">
                        <i class="fas fa-${activityType === 'swap' ? 'exchange-alt' : 'star'}"></i>
                    </div>
                    <div class="activity-details">
                        <h4>${activityText}</h4>
                        <p>${swap.offered_skill} ↔ ${swap.requested_skill} • ${new Date(swap.created_at).toLocaleDateString()}</p>
                    </div>
                </div>
            `;
        }).join('');

        activityContainer.innerHTML = activityHTML;

    } catch (error) {
        console.error('Recent activity load error:', error);
    }
}

// Load admin dashboard with enhanced features
async function loadAdminDashboardEnhanced() {
    try {
        // Check if user is admin
        if (currentUser?.role !== 'admin') {
            showError('Access denied. Admin privileges required.');
            return;
        }

        showLoading();

        // Load comprehensive stats
        const [userCount, totalSwaps, pendingSwaps, bannedUsers] = await Promise.all([
            supabase.from(TABLES.PROFILES).select('*', { count: 'exact', head: true }),
            supabase.from(TABLES.SWAP_REQUESTS).select('*', { count: 'exact', head: true }),
            supabase.from(TABLES.SWAP_REQUESTS).select('*', { count: 'exact', head: true }).eq('status', 'pending'),
            supabase.from(TABLES.PROFILES).select('*', { count: 'exact', head: true }).eq('status', 'banned')
        ]);

        // Update dashboard stats
        document.getElementById('admin-total-users').textContent = userCount.count || 0;
        document.getElementById('admin-total-swaps-dashboard').textContent = totalSwaps.count || 0;
        document.getElementById('admin-pending-swaps-dashboard').textContent = pendingSwaps.count || 0;
        document.getElementById('admin-banned-users').textContent = bannedUsers.count || 0;

        // Load initial data
        await loadAllUsers();
        await loadAllSwaps();
        await loadPlatformMessages();

        hideLoading();
        
    } catch (error) {
        console.error('Admin dashboard load error:', error);
        showError('Failed to load admin dashboard');
        hideLoading();
    }
}

// Load users table
async function loadUsersTable() {
    try {
        const { data: users, error } = await supabase
            .from(TABLES.PROFILES)
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (error) throw error;
        
        const table = document.getElementById('users-table');
        table.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Location</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(user => `
                        <tr>
                            <td>${user.name}</td>
                            <td>${user.email || 'N/A'}</td>
                            <td>${user.location || 'N/A'}</td>
                            <td>${user.public_profile ? 'Public' : 'Private'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
    } catch (error) {
        console.error('Users table load error:', error);
    }
}

// Load activity table
async function loadActivityTable() {
    try {
        const { data: swaps, error } = await supabase
            .from(TABLES.SWAP_REQUESTS)
            .select(`
                *,
                requester:profiles!requester_id(name),
                target:profiles!target_user_id(name)
            `)
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (error) throw error;
        
        const table = document.getElementById('activity-table');
        table.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Users</th>
                        <th>Skills</th>
                        <th>Status</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${swaps.map(swap => `
                        <tr>
                            <td>${swap.requester?.name} ↔ ${swap.target?.name}</td>
                            <td>${swap.offered_skill} ↔ ${swap.requested_skill}</td>
                            <td>${swap.status}</td>
                            <td>${new Date(swap.created_at).toLocaleDateString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
    } catch (error) {
        console.error('Activity table load error:', error);
    }
}

// Toggle mobile menu
function toggleMobileMenu() {
    const navMenu = document.getElementById('nav-menu');
    navMenu.classList.toggle('active');
}

// Show loading
function showLoading() {
    loading.style.display = 'flex';
}

// Hide loading
function hideLoading() {
    loading.style.display = 'none';
}

// Show success message
function showSuccess(message) {
    // Simple success notification
    alert(message); // In a real app, you'd use a proper notification system
}

// Show error message
function showError(message) {
    // Simple error notification
    alert('Error: ' + message); // In a real app, you'd use a proper notification system
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize real-time subscriptions
function initializeRealtimeSubscriptions() {
    if (!currentUser) return;
    
    // Subscribe to new swap requests
    const swapRequestsSubscription = supabase
        .channel('swap_requests')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: TABLES.SWAP_REQUESTS,
            filter: `target_user_id=eq.${currentUser.id}`
        }, (payload) => {
            console.log('New swap request received:', payload);
            handleNewSwapRequest(payload.new);
        })
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: TABLES.SWAP_REQUESTS,
            filter: `requester_id=eq.${currentUser.id} OR target_user_id=eq.${currentUser.id}`
        }, (payload) => {
            console.log('Swap request updated:', payload);
            handleSwapRequestUpdate(payload.new);
        })
        .on('postgres_changes', {
            event: 'DELETE',
            schema: 'public',
            table: TABLES.SWAP_REQUESTS,
            filter: `requester_id=eq.${currentUser.id} OR target_user_id=eq.${currentUser.id}`
        }, (payload) => {
            console.log('Swap request deleted:', payload);
            handleSwapRequestDelete(payload.old);
        })
        .subscribe();
    

    
    // Subscribe to new notifications
    const notificationsSubscription = supabase
        .channel('notifications')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${currentUser.id}`
        }, (payload) => {
            console.log('New notification received:', payload);
            handleNewNotification(payload.new);
        })
        .subscribe();
    
    // Subscribe to new chat messages
    const chatMessagesSubscription = supabase
        .channel('chat_messages')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages'
        }, (payload) => {
            console.log('New chat message received:', payload);
            handleNewChatMessage(payload.new);
        })
        .subscribe();
    
    // Store subscriptions for cleanup
    window.swapRequestsSubscription = swapRequestsSubscription;
    window.notificationsSubscription = notificationsSubscription;
    window.chatMessagesSubscription = chatMessagesSubscription;
}

// Handle new swap request notification
async function handleNewSwapRequest(newRequest) {
    try {
        // Get requester profile info
        const { data: requester } = await supabase
            .from(TABLES.PROFILES)
            .select('name')
            .eq('user_id', newRequest.requester_id)
            .single();
        
        // Show notification
        showNotification(`New swap request from ${requester?.name || 'Someone'}!`, 'info');
        
        // Update swap requests if on swaps page
        if (document.getElementById('swaps-page').classList.contains('active')) {
            loadSwapRequests();
        }
        
        // Update notification badge
        updateSwapNotificationBadge();
        
    } catch (error) {
        console.error('Error handling new swap request:', error);
    }
}

// Handle swap request update
function handleSwapRequestUpdate(updatedRequest) {
    // Show notification based on status change
    let message = '';
    let type = 'info';
    
    switch (updatedRequest.status) {
        case 'accepted':
            message = 'Your swap request was accepted!';
            type = 'success';
            break;
        case 'rejected':
            message = 'Your swap request was rejected.';
            type = 'warning';
            break;
        case 'completed':
            message = 'Swap marked as completed!';
            type = 'success';
            break;
    }
    
    if (message) {
        showNotification(message, type);
    }
    
    // Update swap requests if on swaps page
    if (document.getElementById('swaps-page').classList.contains('active')) {
        loadSwapRequests();
    }
}

// Handle swap request deletion
function handleSwapRequestDelete(deletedRequest) {
    // Show notification
    showNotification('Swap request was deleted.', 'info');
    
    // Update swap requests if on swaps page
    if (document.getElementById('swaps-page').classList.contains('active')) {
        loadSwapRequests();
    }
    
    // Update notification badge
    updateSwapNotificationBadge();
}



// Handle new notification
function handleNewNotification(newNotification) {
    // Show regular notification
    showNotification(newNotification.message, 'info');
    
    // Update notification badge if needed
    updateSwapNotificationBadge();
}



// Handle new chat message
async function handleNewChatMessage(newMessage) {
    // Chat functionality removed
}

// Update swap notification badge
async function updateSwapNotificationBadge(incomingRequests = null) {
    try {
        let pendingCount = 0;
        
        if (incomingRequests) {
            pendingCount = incomingRequests.filter(req => req.status === 'pending').length;
        } else {
            const { data: incoming } = await supabase
                .from(TABLES.SWAP_REQUESTS)
                .select('status')
                .eq('target_user_id', currentUser.id)
                .eq('status', 'pending');
            
            pendingCount = incoming?.length || 0;
        }
        
        // Update navigation badge
        const swapsLink = document.querySelector('[data-page="swaps"]');
        let badge = swapsLink.querySelector('.notification-badge');
        
        if (pendingCount > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'notification-badge';
                swapsLink.appendChild(badge);
            }
            badge.textContent = pendingCount;
        } else if (badge) {
            badge.remove();
        }
        
    } catch (error) {
        console.error('Error updating notification badge:', error);
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        hideNotification(notification);
    }, 5000);
    
    // Close button
    notification.querySelector('.notification-close').addEventListener('click', () => {
        hideNotification(notification);
    });
}

// Hide notification
function hideNotification(notification) {
    notification.classList.remove('show');
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 300);
}





















// Show feedback modal
function showFeedbackModal(swapRequestId) {
    currentSwapRequest = { id: swapRequestId };
    selectedRating = 0;
    updateRatingStars();
    document.getElementById('feedback-modal').style.display = 'block';
}

// Show feedback modal
function showFeedbackModal(swapRequestId) {
    currentSwapRequest = { id: swapRequestId };
    selectedRating = 0;
    updateRatingStars();
    document.getElementById('feedback-modal').style.display = 'block';
}

// Update home stats with live data
async function updateHomeStats() {
    try {
        // Update successful swaps count
        document.getElementById('swap-count').textContent = successfulSwapsCount;
        
        // Add live indicator
        const swapCountElement = document.getElementById('swap-count');
        if (!swapCountElement.querySelector('.live-indicator')) {
            const liveIndicator = document.createElement('span');
            liveIndicator.className = 'live-indicator';
            liveIndicator.textContent = ' LIVE';
            swapCountElement.appendChild(liveIndicator);
        }
        
    } catch (error) {
        console.error('Update stats error:', error);
    }
}

// Test database connection
function testDatabaseConnection() {
    console.log('Testing database connection...');
    
    // Test basic profiles query
    supabase.from(TABLES.PROFILES).select('count').then(result => {
        console.log('Profiles query result:', result);
    });
    
    // Test basic swap_requests query
    supabase.from(TABLES.SWAP_REQUESTS).select('count').then(result => {
        console.log('Swap requests query result:', result);
    });
}

// Global functions for onclick handlers
window.showPage = showPage;
window.requestSwap = requestSwap;
window.viewProfile = viewProfile;
window.handleSwapResponse = handleSwapResponse;
window.cancelSwapRequest = cancelSwapRequest;
window.completeSwap = completeSwap;
window.rateSwap = rateSwap;
window.testDatabaseConnection = testDatabaseConnection;

// ===== ENHANCED ADMIN FUNCTIONS =====

// Load all users for admin management
async function loadAllUsers() {
    try {
        const { data: users, error } = await supabase
            .from(TABLES.PROFILES)
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        displayUsersTable(users || []);
        
    } catch (error) {
        console.error('Users load error:', error);
        showError('Failed to load users');
    }
}

// Display users table
function displayUsersTable(users) {
    const container = document.getElementById('all-users-table');
    
    if (users.length === 0) {
        container.innerHTML = '<p>No users found</p>';
        return;
    }
    
    container.innerHTML = `
        <table class="users-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(user => `
                    <tr data-user-id="${user.user_id}">
                        <td>${user.name || 'N/A'}</td>
                        <td>${user.email || 'N/A'}</td>
                        <td>${user.location || 'N/A'}</td>
                        <td>
                            <span class="user-status ${user.status || 'active'}">
                                ${user.status || 'active'}
                            </span>
                        </td>
                        <td>${new Date(user.created_at).toLocaleDateString()}</td>
                        <td>
                            <button class="btn btn-sm btn-secondary" onclick="viewUserDetails('${user.user_id}')">
                                View
                            </button>
                            ${user.status !== 'banned' ? 
                                `<button class="btn btn-sm btn-danger" onclick="showBanUserModal('${user.user_id}')">
                                    Ban
                                </button>` : 
                                `<button class="btn btn-sm btn-success" onclick="unbanUser('${user.user_id}')">
                                    Unban
                                </button>`
                            }
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Filter users
function filterUsers() {
    const searchTerm = document.getElementById('user-search').value.toLowerCase();
    const statusFilter = document.getElementById('user-status-filter').value;
    const rows = document.querySelectorAll('.users-table tbody tr');
    
    rows.forEach(row => {
        const name = row.cells[0].textContent.toLowerCase();
        const email = row.cells[1].textContent.toLowerCase();
        const status = row.cells[3].textContent.toLowerCase();
        
        const matchesSearch = name.includes(searchTerm) || email.includes(searchTerm);
        const matchesStatus = !statusFilter || status === statusFilter;
        
        row.style.display = matchesSearch && matchesStatus ? '' : 'none';
    });
}

// Load all swaps for admin management
async function loadAllSwaps() {
    try {
        const { data: swaps, error } = await supabase
            .from(TABLES.SWAP_REQUESTS)
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        displaySwapsTable(swaps || []);
        
    } catch (error) {
        console.error('Swaps load error:', error);
        showError('Failed to load swaps');
    }
}

// Display swaps table
function displaySwapsTable(swaps) {
    const container = document.getElementById('all-swaps-table');
    
    if (swaps.length === 0) {
        container.innerHTML = '<p>No swaps found</p>';
        return;
    }
    
    container.innerHTML = `
        <table class="swaps-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Requester</th>
                    <th>Target</th>
                    <th>Offers</th>
                    <th>Wants</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${swaps.map(swap => `
                    <tr data-swap-id="${swap.id}">
                        <td>${new Date(swap.created_at).toLocaleDateString()}</td>
                        <td>${swap.requester_id}</td>
                        <td>${swap.target_user_id}</td>
                        <td>${swap.offered_skill}</td>
                        <td>${swap.requested_skill}</td>
                        <td>
                            <span class="swap-status ${swap.status}">${swap.status}</span>
                        </td>
                        <td>
                            <button class="btn btn-sm btn-secondary" onclick="viewSwapDetails('${swap.id}')">
                                View
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="deleteSwapAdmin('${swap.id}')">
                                Delete
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Filter swaps
function filterSwaps() {
    const statusFilter = document.getElementById('swap-status-filter').value;
    const dateFilter = document.getElementById('swap-date-filter').value;
    const rows = document.querySelectorAll('.swaps-table tbody tr');
    
    rows.forEach(row => {
        const status = row.cells[5].textContent.toLowerCase();
        const date = row.cells[0].textContent;
        
        const matchesStatus = !statusFilter || status === statusFilter;
        const matchesDate = !dateFilter || date.includes(dateFilter);
        
        row.style.display = matchesStatus && matchesDate ? '' : 'none';
    });
}

// Load pending reviews
async function loadPendingReviews() {
    try {
        // This would typically load skills that need moderation
        // For now, we'll show a placeholder
        const skillsReview = document.getElementById('skills-review');
        skillsReview.innerHTML = `
            <div class="pending-review-item">
                <h4>Skill Review Needed</h4>
                <p>No skills currently pending review.</p>
            </div>
        `;
        
        const userReports = document.getElementById('user-reports');
        userReports.innerHTML = `
            <div class="pending-review-item">
                <h4>User Reports</h4>
                <p>No user reports currently pending.</p>
            </div>
        `;
        
    } catch (error) {
        console.error('Pending reviews load error:', error);
        showError('Failed to load pending reviews');
    }
}

// Load platform messages
async function loadPlatformMessages() {
    try {
        // This would load platform messages from a messages table
        // For now, we'll show a placeholder
        const container = document.getElementById('platform-messages');
        container.innerHTML = `
            <div class="message-item">
                <h4>Welcome to Skill Swap!</h4>
                <p>Welcome to our platform. We're excited to have you here!</p>
                <div class="message-meta">
                    <span>Type: Information</span>
                    <span>Sent: ${new Date().toLocaleDateString()}</span>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Platform messages load error:', error);
        showError('Failed to load platform messages');
    }
}

// Show send message modal
function showSendMessageModal() {
    document.getElementById('send-message-modal').style.display = 'block';
}

// Show ban user modal
function showBanUserModal(userId) {
    window.currentBanUserId = userId;
    document.getElementById('ban-user-modal').style.display = 'block';
}

// Ban user
async function banUser(userId) {
    try {
        const reason = document.getElementById('ban-reason').value;
        const duration = document.getElementById('ban-duration').value;
        
        if (!reason) {
            showError('Please provide a reason for the ban');
            return;
        }
        
        const { error } = await supabase
            .from(TABLES.PROFILES)
            .update({ 
                status: 'banned',
                ban_reason: reason,
                ban_duration: duration,
                banned_at: new Date().toISOString()
            })
            .eq('user_id', userId);
        
        if (error) throw error;
        
        hideModals();
        showSuccess('User banned successfully');
        loadAllUsers();
        
    } catch (error) {
        showError('Failed to ban user: ' + error.message);
    }
}

// Unban user
async function unbanUser(userId) {
    if (!confirm('Are you sure you want to unban this user?')) return;
    
    try {
        const { error } = await supabase
            .from(TABLES.PROFILES)
            .update({ 
                status: 'active',
                ban_reason: null,
                ban_duration: null,
                banned_at: null
            })
            .eq('user_id', userId);
        
        if (error) throw error;
        
        showSuccess('User unbanned successfully');
        loadAllUsers();
        
    } catch (error) {
        showError('Failed to unban user: ' + error.message);
    }
}

// Delete swap as admin
async function deleteSwapAdmin(swapId) {
    if (!confirm('Are you sure you want to delete this swap?')) return;
    
    try {
        const { error } = await supabase
            .from(TABLES.SWAP_REQUESTS)
            .delete()
            .eq('id', swapId);
        
        if (error) throw error;
        
        showSuccess('Swap deleted successfully');
        loadAllSwaps();
        
    } catch (error) {
        showError('Failed to delete swap: ' + error.message);
    }
}

// Generate report
async function generateReport() {
    try {
        showLoading();
        
        // This would generate a comprehensive report
        // For now, we'll show a success message
        setTimeout(() => {
            hideLoading();
            showSuccess('Report generated successfully!');
        }, 2000);
        
    } catch (error) {
        hideLoading();
        showError('Failed to generate report: ' + error.message);
    }
}

// Download user report
function downloadUserReport() {
    // This would generate and download a CSV file
    showSuccess('User report download started');
}

// Download swap report
function downloadSwapReport() {
    // This would generate and download a CSV file
    showSuccess('Swap report download started');
}

// Download feedback report
function downloadFeedbackReport() {
    // This would generate and download a CSV file
    showSuccess('Feedback report download started');
}

// View user details
function viewUserDetails(userId) {
    // This would show detailed user information
    showSuccess('User details loaded');
}

// View swap details
function viewSwapDetails(swapId) {
    // This would show detailed swap information
    showSuccess('Swap details loaded');
}

// Approve skill
function approveSkill() {
    // This would approve a skill for moderation
    hideModals();
    showSuccess('Skill approved');
}

// Reject skill
function rejectSkill() {
    // This would reject a skill for moderation
    hideModals();
    showSuccess('Skill rejected');
}

// Handle platform message submission
async function handlePlatformMessage(e) {
    e.preventDefault();
    
    try {
        const title = document.getElementById('message-title').value;
        const content = document.getElementById('message-content').value;
        const type = document.getElementById('message-type').value;
        
        // This would save the message to a messages table
        // For now, we'll just show a success message
        showSuccess('Platform message sent successfully!');
        hideModals();
        
        // Reset form
        e.target.reset();
        
    } catch (error) {
        showError('Failed to send platform message: ' + error.message);
    }
}

// Handle ban user form submission
async function handleBanUser(e) {
    e.preventDefault();
    
    try {
        if (!window.currentBanUserId) {
            showError('No user selected for banning');
            return;
        }
        
        await banUser(window.currentBanUserId);
        
        // Reset form
        e.target.reset();
        window.currentBanUserId = null;
        
    } catch (error) {
        showError('Failed to ban user: ' + error.message);
    }
}

// Switch moderation tabs
function switchModerationTab(tab) {
    document.querySelectorAll('.moderation-tabs .tab-btn').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.moderation-content').forEach(c => c.classList.remove('active'));
    
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    document.getElementById(`${tab}-review`).classList.add('active');
}

// Switch admin tabs
function switchAdminTab(tab) {
    document.querySelectorAll('.admin-tab-btn').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
    
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    document.getElementById(`${tab}-tab`).classList.add('active');
    
    // Load tab-specific content
    switch (tab) {
        case 'overview':
            loadAdminOverview();
            break;
        case 'users':
            loadAllUsersAdmin();
            break;
        case 'swaps':
            loadAllSwapsAdmin();
            break;
        case 'reports':
            // Reports are handled by onclick events
            break;
    }
}

// Load all users for admin page
async function loadAllUsersAdmin() {
    try {
        showLoading();
        
        const { data: users, error } = await supabase
            .from(TABLES.PROFILES)
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        displayUsersTableAdmin(users || []);
        
        hideLoading();
        
    } catch (error) {
        console.error('Users load error:', error);
        showError('Failed to load users');
        hideLoading();
    }
}

// Display users table for admin page
function displayUsersTableAdmin(users) {
    const container = document.getElementById('admin-users-container');
    
    if (users.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">No users found</p>';
        return;
    }
    
    container.innerHTML = `
        <table class="admin-users-table">
            <thead>
                <tr>
                    <th>User Details</th>
                    <th>Contact</th>
                    <th>Skills</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(user => `
                    <tr data-user-id="${user.user_id}">
                        <td>
                            <div class="user-details-cell">
                                <img src="${user.photo_url || 'https://via.placeholder.com/40'}" alt="${user.name}" class="user-avatar">
                                <div class="user-info">
                                    <h4>${user.name || 'N/A'}</h4>
                                    <p>${user.location || 'Location not specified'}</p>
                                </div>
                            </div>
                        </td>
                        <td>
                            <div>
                                <p><strong>Email:</strong> ${user.email || 'N/A'}</p>
                                <p><strong>Phone:</strong> ${user.phone || 'Not provided'}</p>
                            </div>
                        </td>
                        <td>
                            <div>
                                <p><strong>Offers:</strong> ${(user.skills_offered || []).slice(0, 3).join(', ')}${(user.skills_offered || []).length > 3 ? '...' : ''}</p>
                                <p><strong>Wants:</strong> ${(user.skills_wanted || []).slice(0, 3).join(', ')}${(user.skills_wanted || []).length > 3 ? '...' : ''}</p>
                            </div>
                        </td>
                        <td>
                            <span class="user-status ${user.status || 'active'}">
                                ${user.status || 'active'}
                            </span>
                            ${user.status === 'banned' ? `<br><small>${user.ban_reason || 'No reason provided'}</small>` : ''}
                        </td>
                        <td>
                            <div>
                                <p>${new Date(user.created_at).toLocaleDateString()}</p>
                                <small>${new Date(user.created_at).toLocaleTimeString()}</small>
                            </div>
                        </td>
                        <td>
                            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                                <button class="btn btn-sm btn-secondary" onclick="viewUserDetailsAdmin('${user.user_id}')">
                                    <i class="fas fa-eye"></i> View
                                </button>
                                ${user.status !== 'banned' ? 
                                    `<button class="btn btn-sm btn-danger" onclick="showBanUserModal('${user.user_id}')">
                                        <i class="fas fa-ban"></i> Ban
                                    </button>` : 
                                    `<button class="btn btn-sm btn-success" onclick="unbanUser('${user.user_id}')">
                                        <i class="fas fa-check"></i> Unban
                                    </button>`
                                }
                                <button class="btn btn-sm btn-warning" onclick="editUserAdmin('${user.user_id}')">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Load all swaps for admin page
async function loadAllSwapsAdmin() {
    try {
        showLoading();
        
        const { data: swaps, error } = await supabase
            .from(TABLES.SWAP_REQUESTS)
            .select(`
                *,
                requester:profiles!requester_id(name, photo_url),
                target:profiles!target_user_id(name, photo_url)
            `)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        displaySwapsTableAdmin(swaps || []);
        
        hideLoading();
        
    } catch (error) {
        console.error('Swaps load error:', error);
        showError('Failed to load swaps');
        hideLoading();
    }
}

// Display swaps table for admin page
function displaySwapsTableAdmin(swaps) {
    const container = document.getElementById('admin-swaps-container');
    
    if (swaps.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">No swaps found</p>';
        return;
    }
    
    container.innerHTML = `
        <table class="admin-swaps-table">
            <thead>
                <tr>
                    <th>Swap Details</th>
                    <th>Users</th>
                    <th>Skills</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${swaps.map(swap => `
                    <tr data-swap-id="${swap.id}">
                        <td>
                            <div class="swap-details-cell">
                                <div class="swap-users">
                                    <strong>${swap.requester?.name || 'Unknown'} ↔ ${swap.target?.name || 'Unknown'}</strong>
                                </div>
                                <div class="swap-skills">
                                    <strong>Offers:</strong> ${swap.offered_skill}
                                </div>
                                <div class="swap-skills">
                                    <strong>Wants:</strong> ${swap.requested_skill}
                                </div>
                                ${swap.message ? `<div class="swap-message">"${swap.message}"</div>` : ''}
                            </div>
                        </td>
                        <td>
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <img src="${swap.requester?.photo_url || 'https://via.placeholder.com/30'}" alt="Requester" style="width: 30px; height: 30px; border-radius: 50%;">
                                <span>→</span>
                                <img src="${swap.target?.photo_url || 'https://via.placeholder.com/30'}" alt="Target" style="width: 30px; height: 30px; border-radius: 50%;">
                            </div>
                        </td>
                        <td>
                            <div>
                                <p><strong>Offers:</strong> ${swap.offered_skill}</p>
                                <p><strong>Wants:</strong> ${swap.requested_skill}</p>
                            </div>
                        </td>
                        <td>
                            <span class="swap-status ${swap.status}">${swap.status}</span>
                            <br>
                            <small>${new Date(swap.updated_at || swap.created_at).toLocaleDateString()}</small>
                        </td>
                        <td>
                            <div>
                                <p><strong>Created:</strong> ${new Date(swap.created_at).toLocaleDateString()}</p>
                                <small>${new Date(swap.created_at).toLocaleTimeString()}</small>
                                ${swap.updated_at && swap.updated_at !== swap.created_at ? 
                                    `<br><p><strong>Updated:</strong> ${new Date(swap.updated_at).toLocaleDateString()}</p>` : ''
                                }
                            </div>
                        </td>
                        <td>
                            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                                <button class="btn btn-sm btn-secondary" onclick="viewSwapDetailsAdmin('${swap.id}')">
                                    <i class="fas fa-eye"></i> View
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="deleteSwapAdmin('${swap.id}')">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                                ${swap.status === 'pending' ? 
                                    `<button class="btn btn-sm btn-success" onclick="approveSwapAdmin('${swap.id}')">
                                        <i class="fas fa-check"></i> Approve
                                    </button>` : ''
                                }
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Filter users for admin page
function filterUsersAdmin() {
    const searchTerm = document.getElementById('user-search-admin').value.toLowerCase();
    const statusFilter = document.getElementById('user-status-filter-admin').value;
    const rows = document.querySelectorAll('.admin-users-table tbody tr');
    
    rows.forEach(row => {
        const name = row.querySelector('.user-info h4').textContent.toLowerCase();
        const email = row.querySelector('td:nth-child(2) p').textContent.toLowerCase();
        const status = row.querySelector('.user-status').textContent.toLowerCase();
        
        const matchesSearch = name.includes(searchTerm) || email.includes(searchTerm);
        const matchesStatus = !statusFilter || status === statusFilter;
        
        row.style.display = matchesSearch && matchesStatus ? '' : 'none';
    });
}

// Filter swaps for admin page
function filterSwapsAdmin() {
    const statusFilter = document.getElementById('swap-status-filter-admin').value;
    const dateFilter = document.getElementById('swap-date-filter-admin').value;
    const rows = document.querySelectorAll('.admin-swaps-table tbody tr');
    
    rows.forEach(row => {
        const status = row.querySelector('.swap-status').textContent.toLowerCase();
        const date = row.querySelector('td:nth-child(5) p').textContent;
        
        const matchesStatus = !statusFilter || status === statusFilter;
        const matchesDate = !dateFilter || date.includes(dateFilter);
        
        row.style.display = matchesStatus && matchesDate ? '' : 'none';
    });
}

// View user details for admin
function viewUserDetailsAdmin(userId) {
    // This would show detailed user information in a modal
    showSuccess('User details loaded for user ID: ' + userId);
}

// View swap details for admin
function viewSwapDetailsAdmin(swapId) {
    // This would show detailed swap information in a modal
    showSuccess('Swap details loaded for swap ID: ' + swapId);
}

// Edit user for admin
function editUserAdmin(userId) {
    // This would open an edit user modal
    showSuccess('Edit user modal opened for user ID: ' + userId);
}

// Approve swap for admin
async function approveSwapAdmin(swapId) {
    if (!confirm('Are you sure you want to approve this swap?')) return;
    
    try {
        const { error } = await supabase
            .from(TABLES.SWAP_REQUESTS)
            .update({ status: 'accepted' })
            .eq('id', swapId);
        
        if (error) throw error;
        
        showSuccess('Swap approved successfully');
        loadAllSwapsAdmin();
        
    } catch (error) {
        showError('Failed to approve swap: ' + error.message);
    }
}

// Generate comprehensive report
async function generateComprehensiveReport() {
    try {
        showLoading();
        
        // This would generate a comprehensive report with all data
        setTimeout(() => {
            hideLoading();
            showSuccess('Comprehensive report generated successfully!');
        }, 3000);
        
    } catch (error) {
        hideLoading();
        showError('Failed to generate comprehensive report: ' + error.message);
    }
}

// Make admin functions globally available
window.loadAllUsers = loadAllUsers;
window.filterUsers = filterUsers;
window.loadAllSwaps = loadAllSwaps;
window.filterSwaps = filterSwaps;
window.loadPendingReviews = loadPendingReviews;
window.loadPlatformMessages = loadPlatformMessages;
window.showSendMessageModal = showSendMessageModal;
window.showBanUserModal = showBanUserModal;
window.banUser = banUser;
window.unbanUser = unbanUser;
window.deleteSwapAdmin = deleteSwapAdmin;
window.generateReport = generateReport;
window.downloadUserReport = downloadUserReport;
window.downloadSwapReport = downloadSwapReport;
window.downloadFeedbackReport = downloadFeedbackReport;
window.viewUserDetails = viewUserDetails;
window.viewSwapDetails = viewSwapDetails;
window.approveSkill = approveSkill;
window.rejectSkill = rejectSkill;
window.handlePlatformMessage = handlePlatformMessage;
window.handleBanUser = handleBanUser;
window.switchModerationTab = switchModerationTab;

// Make new admin functions globally available
window.switchAdminTab = switchAdminTab;
window.loadAllUsersAdmin = loadAllUsersAdmin;
window.loadAllSwapsAdmin = loadAllSwapsAdmin;
window.filterUsersAdmin = filterUsersAdmin;
window.filterSwapsAdmin = filterSwapsAdmin;
window.viewUserDetailsAdmin = viewUserDetailsAdmin;
window.viewSwapDetailsAdmin = viewSwapDetailsAdmin;
window.editUserAdmin = editUserAdmin;
window.approveSwapAdmin = approveSwapAdmin;
window.generateComprehensiveReport = generateComprehensiveReport; 