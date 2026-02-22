-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'admin')),
  phone TEXT,
  avatar_url TEXT,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Youth Profiles table
CREATE TABLE youth_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date_of_birth DATE,
  parent_name TEXT,
  parent_contact TEXT,
  emergency_contact TEXT,
  medical_info TEXT,
  baptized BOOLEAN DEFAULT FALSE,
  member_since DATE,
  small_group TEXT,
  church TEXT,
  calling TEXT CHECK (calling IN ('Apóstolo', 'Profeta', 'Evangelista', 'Pastor', 'Mestre')),
  volunteer TEXT[],
  baptism_date DATE,
  birthdate DATE,
  youth_role TEXT CHECK (youth_role IN ('jovem', 'lider', 'voluntario', 'staff', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Devotionals table
CREATE TABLE devotionals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  date DATE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('faith', 'love', 'hope', 'courage', 'wisdom')),
  scripture TEXT NOT NULL,
  content TEXT NOT NULL,
  reflection TEXT NOT NULL,
  prayer_points TEXT[] NOT NULL,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prayer Requests table
CREATE TABLE prayer_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('personal', 'family', 'health', 'spiritual', 'other')),
  is_public BOOLEAN DEFAULT TRUE,
  is_answered BOOLEAN DEFAULT FALSE,
  testimony TEXT,
  prayer_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Community Posts table
CREATE TABLE community_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  is_moderated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Events table
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  event_title TEXT CHECK (event_title IN ('Overnight', 'Guest Fire', 'Table', 'Outside', 'Guest Play', 'Guest Lover')),
  event_type TEXT CHECK (event_type IN ('Culto', 'Oração', 'Vigilia', 'Confraternização')),
  description TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  location TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('worship', 'outreach', 'study', 'fellowship', 'service')),
  max_attendees INTEGER,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event RSVPs table
CREATE TABLE event_rsvps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('confirmed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Attendance Records table
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  check_in_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  method TEXT NOT NULL CHECK (method IN ('qr', 'manual')),
  notes TEXT
);

-- Achievements table
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE,
  progress INTEGER DEFAULT 0,
  target INTEGER NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('attendance', 'devotional', 'prayer', 'community', 'service')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('event', 'prayer', 'achievement', 'announcement', 'reminder')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Announcements table
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Verse of Week table
CREATE TABLE verse_of_week (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference TEXT NOT NULL,
  verse TEXT NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_youth_profiles_user_id ON youth_profiles(user_id);
CREATE INDEX idx_devotionals_date ON devotionals(date);
CREATE INDEX idx_devotionals_category ON devotionals(category);
CREATE INDEX idx_prayer_requests_user_id ON prayer_requests(user_id);
CREATE INDEX idx_prayer_requests_is_public ON prayer_requests(is_public);
CREATE INDEX idx_community_posts_user_id ON community_posts(user_id);
CREATE INDEX idx_community_posts_is_moderated ON community_posts(is_moderated);
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_event_rsvps_event_id ON event_rsvps(event_id);
CREATE INDEX idx_event_rsvps_user_id ON event_rsvps(user_id);
CREATE INDEX idx_attendance_records_user_id ON attendance_records(user_id);
CREATE INDEX idx_attendance_records_event_id ON attendance_records(event_id);
CREATE INDEX idx_achievements_user_id ON achievements(user_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_announcements_is_active ON announcements(is_active);
CREATE INDEX idx_verse_of_week_dates ON verse_of_week(week_start, week_end);

-- Row Level Security (RLS) Policies

-- Users table RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile" ON users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Youth Profiles RLS
ALTER TABLE youth_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all youth profiles" ON youth_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own youth profile" ON youth_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own youth profile" ON youth_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Devotionals RLS
ALTER TABLE devotionals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view devotionals" ON devotionals
  FOR SELECT USING (true);

CREATE POLICY "Admins can create devotionals" ON devotionals
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Prayer Requests RLS
ALTER TABLE prayer_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public prayer requests" ON prayer_requests
  FOR SELECT USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can create own prayer requests" ON prayer_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prayer requests" ON prayer_requests
  FOR UPDATE USING (auth.uid() = user_id);

-- Community Posts RLS
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view moderated posts" ON community_posts
  FOR SELECT USING (is_moderated = true OR auth.uid() = user_id);

CREATE POLICY "Users can create own posts" ON community_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts" ON community_posts
  FOR UPDATE USING (auth.uid() = user_id);

-- Events RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view events" ON events
  FOR SELECT USING (true);

CREATE POLICY "Admins can create events" ON events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Event RSVPs RLS
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all RSVPs" ON event_rsvps
  FOR SELECT USING (true);

CREATE POLICY "Users can create own RSVPs" ON event_rsvps
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own RSVPs" ON event_rsvps
  FOR UPDATE USING (auth.uid() = user_id);

-- Attendance Records RLS
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all attendance records" ON attendance_records
  FOR SELECT USING (true);

CREATE POLICY "Admins can create attendance records" ON attendance_records
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Achievements RLS
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements" ON achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create achievements" ON achievements
  FOR INSERT WITH CHECK (true);

-- Notifications RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- Announcements RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active announcements" ON announcements
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can create announcements" ON announcements
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update announcements" ON announcements
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Verse of Week RLS
ALTER TABLE verse_of_week ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view verse of week" ON verse_of_week
  FOR SELECT USING (true);

CREATE POLICY "Admins can create verse of week" ON verse_of_week
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RPC Functions

-- Increment prayer count
CREATE OR REPLACE FUNCTION increment_prayer_count(request_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE prayer_requests
  SET prayer_count = prayer_count + 1
  WHERE id = request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment post likes
CREATE OR REPLACE FUNCTION increment_post_likes(post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE community_posts
  SET likes_count = likes_count + 1
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update user last active timestamp
CREATE OR REPLACE FUNCTION update_last_active()
RETURNS trigger AS $$
BEGIN
  UPDATE users
  SET last_active = NOW()
  WHERE id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update last_active on any user action
CREATE TRIGGER update_user_last_active
AFTER INSERT OR UPDATE ON attendance_records
FOR EACH ROW
EXECUTE FUNCTION update_last_active();

CREATE TRIGGER update_user_last_active_posts
AFTER INSERT OR UPDATE ON community_posts
FOR EACH ROW
EXECUTE FUNCTION update_last_active();

CREATE TRIGGER update_user_last_active_prayers
AFTER INSERT OR UPDATE ON prayer_requests
FOR EACH ROW
EXECUTE FUNCTION update_last_active();