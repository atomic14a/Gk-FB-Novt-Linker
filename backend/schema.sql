-- SCHEMA MIGRATION COMMANDS (Run this in Supabase SQL Editor to update your live DB):
-- =========================================================================
-- ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_account_type_check;
-- ALTER TABLE public.profiles ADD CONSTRAINT profiles_account_type_check CHECK (account_type IN ('trial', 'plus', 'premium'));
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_links_created INTEGER DEFAULT 0;
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS monthly_links_created INTEGER DEFAULT 0;
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_reset_daily DATE DEFAULT CURRENT_DATE;
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_reset_monthly DATE DEFAULT CURRENT_DATE;
--
-- CREATE TABLE IF NOT EXISTS public.subscription_plans (
--     id TEXT PRIMARY KEY,
--     name TEXT NOT NULL,
--     price TEXT NOT NULL,
--     period TEXT NOT NULL,
--     description TEXT,
--     limits TEXT NOT NULL,
--     features TEXT[] NOT NULL,
--     badge TEXT,
--     badge_bg TEXT,
--     badge_color TEXT,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
-- );
--
-- ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Anyone can view subscription plans." ON public.subscription_plans;
-- CREATE POLICY "Anyone can view subscription plans." ON public.subscription_plans FOR SELECT USING (true);
--
-- INSERT INTO public.subscription_plans (id, name, price, period, description, limits, features, badge, badge_bg, badge_color)
-- VALUES 
-- ('trial', 'Trial Package', '$0', 'lifetime', 'Ideal for beginners testing out campaign structures.', '10 Total Links', ARRAY['Up to 10 customized redirection links', 'Basic Facebook Creative preview tools', 'Custom CTA link buttons support', 'Standard media library file uploads'], 'Starter', 'rgba(255, 255, 255, 0.05)', 'var(--text-muted)'),
-- ('plus', 'Plus Package', '$15', 'per month', 'Perfect for active marketers scaling daily creative assets.', '50 Daily / 500 Monthly Links', ARRAY['Max 50 new links daily limit', 'Max 500 links monthly limit', 'Dynamic mockup settings presets', 'Unlimited media library storage capacity', 'Priority banner resizing & blurring tools'], 'Most Popular', 'rgba(99, 102, 241, 0.15)', 'var(--primary)'),
-- ('premium', 'Premium Package', '$30', 'per month', 'For agencies and power users requiring absolute scale.', 'Unlimited Links', ARRAY['Unlimited daily link creations', 'Unlimited monthly link creations', 'Priority ad creative processing speed', 'Full mockup click-to-focus interactive page access', '24/7 client support assistance'], 'Unrestricted', 'rgba(16, 185, 129, 0.15)', 'var(--success)')
-- ON CONFLICT (id) DO UPDATE SET
--   name = EXCLUDED.name,
--   price = EXCLUDED.price,
--   period = EXCLUDED.period,
--   description = EXCLUDED.description,
--   limits = EXCLUDED.limits,
--   features = EXCLUDED.features,
--   badge = EXCLUDED.badge,
--   badge_bg = EXCLUDED.badge_bg,
--   badge_color = EXCLUDED.badge_color;
-- =========================================================================

-- Profiles table to store user plans and creation metrics
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    account_type TEXT DEFAULT 'trial' CHECK (account_type IN ('trial', 'plus', 'premium')),
    links_limit INTEGER DEFAULT 10,
    links_created INTEGER DEFAULT 0,
    daily_links_created INTEGER DEFAULT 0,
    monthly_links_created INTEGER DEFAULT 0,
    last_reset_daily DATE DEFAULT CURRENT_DATE,
    last_reset_monthly DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
DROP POLICY IF EXISTS "Users can view their own profile." ON public.profiles;
CREATE POLICY "Users can view their own profile." ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Facebook Accounts and Cookies per user
CREATE TABLE IF NOT EXISTS public.facebook_accounts (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    label TEXT NOT NULL,
    cookie_text TEXT NOT NULL,
    access_token TEXT NOT NULL,
    act_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS policies for facebook_accounts
ALTER TABLE public.facebook_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own Facebook cookies." ON public.facebook_accounts;
CREATE POLICY "Users can manage their own Facebook cookies." ON public.facebook_accounts FOR ALL USING (auth.uid() = user_id);

-- Automation Defaults configuration per user
CREATE TABLE IF NOT EXISTS public.user_defaults (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
    action_button TEXT DEFAULT 'DOWNLOAD',
    message TEXT DEFAULT '',
    description TEXT DEFAULT '',
    name TEXT DEFAULT '',
    caption TEXT DEFAULT '',
    target_link TEXT DEFAULT '',
    publish_to_page BOOLEAN DEFAULT true,
    auto_dimension BOOLEAN DEFAULT true
);

-- RLS policies for user_defaults
ALTER TABLE public.user_defaults ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own defaults." ON public.user_defaults;
CREATE POLICY "Users can manage their own defaults." ON public.user_defaults FOR ALL USING (auth.uid() = user_id);

-- Generation history logs
CREATE TABLE IF NOT EXISTS public.posts_history (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    page_name TEXT NOT NULL,
    peek_link TEXT NOT NULL,
    image_url TEXT,
    permalink TEXT NOT NULL,
    status TEXT NOT NULL,
    error_message TEXT,
    facebook_account_label TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS policies for posts_history
ALTER TABLE public.posts_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own posts history." ON public.posts_history;
CREATE POLICY "Users can view their own posts history." ON public.posts_history FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Backend system can insert logs." ON public.posts_history;
CREATE POLICY "Backend system can insert logs." ON public.posts_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Automatically create a profile when a new user signs up via auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  trial_limit INTEGER;
  trial_limits_text TEXT;
BEGIN
  -- Fetch the limits string of the trial plan from subscription_plans
  SELECT limits INTO trial_limits_text FROM public.subscription_plans WHERE id = 'trial';
  
  -- Parse the integer from the text (e.g., '10 Total Links' -> 10)
  BEGIN
    trial_limit := COALESCE(NULLIF(regexp_replace(trial_limits_text, '\D', '', 'g'), ''), '10')::INTEGER;
  EXCEPTION WHEN OTHERS THEN
    trial_limit := 10;
  END;

  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    account_type, 
    links_limit, 
    links_created,
    daily_links_created,
    monthly_links_created,
    last_reset_daily,
    last_reset_monthly
  )
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', ''), 
    'trial', 
    trial_limit, 
    0,
    0,
    0,
    CURRENT_DATE,
    CURRENT_DATE
  );
  
  INSERT INTO public.user_defaults (user_id, action_button, publish_to_page, auto_dimension)
  VALUES (new.id, 'DOWNLOAD', true, true);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run the function on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Contact form submissions table
CREATE TABLE IF NOT EXISTS public.contact_submissions (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS and create policy for public inserts
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can submit contact form." ON public.contact_submissions;
CREATE POLICY "Anyone can submit contact form." ON public.contact_submissions FOR INSERT WITH CHECK (true);

-- Update facebook_accounts schema columns
ALTER TABLE public.facebook_accounts ADD COLUMN IF NOT EXISTS fb_user_id TEXT;
ALTER TABLE public.facebook_accounts ALTER COLUMN label DROP NOT NULL;
ALTER TABLE public.facebook_accounts ALTER COLUMN access_token DROP NOT NULL;
ALTER TABLE public.facebook_accounts ALTER COLUMN act_id DROP NOT NULL;

-- Media Library table to store user images
CREATE TABLE IF NOT EXISTS public.media_library (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    filename TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for media_library
ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own media library." ON public.media_library;
CREATE POLICY "Users can manage their own media library." ON public.media_library FOR ALL USING (auth.uid() = user_id);

-- Create subscription_plans table to hold dynamic pricing
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price TEXT NOT NULL,
    period TEXT NOT NULL,
    description TEXT,
    limits TEXT NOT NULL,
    features TEXT[] NOT NULL,
    badge TEXT,
    badge_bg TEXT,
    badge_color TEXT,
    link_limit INTEGER DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for subscription_plans (public read)
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view subscription plans." ON public.subscription_plans;
CREATE POLICY "Anyone can view subscription plans." ON public.subscription_plans FOR SELECT USING (true);

-- Populate default plans
INSERT INTO public.subscription_plans (id, name, price, period, description, limits, features, badge, badge_bg, badge_color, link_limit)
VALUES 
('trial', 'Trial Package', '$0', 'lifetime', 'Ideal for beginners testing out campaign structures.', '10 Total Links', ARRAY['Up to 10 customized redirection links', 'Basic Facebook Creative preview tools', 'Custom CTA link buttons support', 'Standard media library file uploads'], 'Starter', 'rgba(255, 255, 255, 0.05)', 'var(--text-muted)', 10),
('plus', 'Plus Package', '$15', 'per month', 'Perfect for active marketers scaling daily creative assets.', '50 Daily / 500 Monthly Links', ARRAY['Max 50 new links daily limit', 'Max 500 links monthly limit', 'Dynamic mockup settings presets', 'Unlimited media library storage capacity', 'Priority banner resizing & blurring tools'], 'Most Popular', 'rgba(99, 102, 241, 0.15)', 'var(--primary)', 500),
('premium', 'Premium Package', '$30', 'per month', 'For agencies and power users requiring absolute scale.', 'Unlimited Links', ARRAY['Unlimited daily link creations', 'Unlimited monthly link creations', 'Priority ad creative processing speed', 'Full mockup click-to-focus interactive page access', '24/7 client support assistance'], 'Unrestricted', 'rgba(16, 185, 129, 0.15)', 'var(--success)', 999999)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  period = EXCLUDED.period,
  description = EXCLUDED.description,
  limits = EXCLUDED.limits,
  features = EXCLUDED.features,
  badge = EXCLUDED.badge,
  badge_bg = EXCLUDED.badge_bg,
  badge_color = EXCLUDED.badge_color,
  link_limit = EXCLUDED.link_limit;

-- Add facebook_account_label to posts_history
ALTER TABLE public.posts_history ADD COLUMN IF NOT EXISTS facebook_account_label TEXT;

-- Add link_limit column to subscription_plans
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS link_limit INTEGER DEFAULT 10;

-- Drop the check constraint if exists
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_account_type_check;

-- Add foreign key constraint to link profiles(account_type) with subscription_plans(id)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS fk_profiles_subscription_plans;
ALTER TABLE public.profiles 
  ADD CONSTRAINT fk_profiles_subscription_plans 
  FOREIGN KEY (account_type) 
  REFERENCES public.subscription_plans(id) 
  ON UPDATE CASCADE 
  ON DELETE SET DEFAULT;

-- Trigger function to handle account type change in profile
CREATE OR REPLACE FUNCTION public.handle_profile_account_type_change()
RETURNS trigger AS $$
DECLARE
  plan_limit INTEGER;
BEGIN
  IF OLD.account_type IS DISTINCT FROM NEW.account_type THEN
    -- Fetch the link_limit of the new plan
    SELECT link_limit INTO plan_limit FROM public.subscription_plans WHERE id = NEW.account_type;
    
    IF plan_limit IS NOT NULL THEN
      NEW.links_limit := plan_limit;
    END IF;
    
    -- Reset daily and monthly counters to start clean on the new plan
    NEW.daily_links_created := 0;
    NEW.monthly_links_created := 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS tr_profile_account_type_change ON public.profiles;
CREATE TRIGGER tr_profile_account_type_change
BEFORE UPDATE OF account_type ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_profile_account_type_change();

-- Trigger function to handle plan limit change in subscription_plans
CREATE OR REPLACE FUNCTION public.handle_subscription_plan_limit_change()
RETURNS trigger AS $$
DECLARE
  limit_diff INTEGER;
BEGIN
  -- Calculate the difference in limit
  limit_diff := NEW.link_limit - OLD.link_limit;
  
  -- If there is a difference, update all corresponding profiles by adding/subtracting the difference
  IF limit_diff <> 0 THEN
    UPDATE public.profiles
    SET links_limit = links_limit + limit_diff
    WHERE account_type = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on subscription_plans
DROP TRIGGER IF EXISTS tr_subscription_plan_limit_change ON public.subscription_plans;
CREATE TRIGGER tr_subscription_plan_limit_change
AFTER UPDATE OF link_limit ON public.subscription_plans
FOR EACH ROW
EXECUTE FUNCTION public.handle_subscription_plan_limit_change();

-- Grant privileges to all standard database roles
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon;

GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon;