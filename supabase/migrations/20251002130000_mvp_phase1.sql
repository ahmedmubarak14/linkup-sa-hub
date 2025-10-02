-- MVP Phase 1: profiles, habit_check_ins, habits enhancements

-- 1) Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_profiles_updated_at();

-- Auto-create a profile row when a new user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NULL))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2) Habits enhancements: icon + best_streak
ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS icon TEXT,
  ADD COLUMN IF NOT EXISTS best_streak INTEGER NOT NULL DEFAULT 0;

-- 3) Habit check-ins table
CREATE TABLE IF NOT EXISTS public.habit_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  check_in_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (habit_id, user_id, check_in_date)
);

ALTER TABLE public.habit_check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view their own habit check-ins"
  ON public.habit_check_ins FOR SELECT
  USING (
    user_id = auth.uid()
  );

CREATE POLICY IF NOT EXISTS "Users can insert habit check-ins for their own habits"
  ON public.habit_check_ins FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.habits h
      WHERE h.id = habit_id AND h.user_id = auth.uid()
    )
  );

-- Function to recompute streaks on check-in
CREATE OR REPLACE FUNCTION public.recompute_habit_streaks(target_habit_id UUID)
RETURNS VOID AS $$
DECLARE
  last_date DATE;
  current_streak INTEGER := 0;
  best_streak_local INTEGER := 0;
  r RECORD;
BEGIN
  -- Iterate check-ins ordered by date
  FOR r IN SELECT check_in_date FROM public.habit_check_ins WHERE habit_id = target_habit_id ORDER BY check_in_date LOOP
    IF last_date IS NULL OR r.check_in_date = last_date + INTERVAL '1 day' THEN
      current_streak := current_streak + 1;
    ELSE
      current_streak := 1;
    END IF;
    last_date := r.check_in_date;
    IF current_streak > best_streak_local THEN
      best_streak_local := current_streak;
    END IF;
  END LOOP;

  UPDATE public.habits
  SET streak_count = current_streak,
      best_streak = GREATEST(best_streak, best_streak_local),
      last_completed_at = CASE WHEN last_date IS NOT NULL THEN last_date::timestamptz ELSE last_completed_at END,
      updated_at = now()
  WHERE id = target_habit_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to recompute on insert into habit_check_ins
CREATE OR REPLACE FUNCTION public.on_habit_check_in()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.recompute_habit_streaks(NEW.habit_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS habit_check_ins_after_insert ON public.habit_check_ins;
CREATE TRIGGER habit_check_ins_after_insert
  AFTER INSERT ON public.habit_check_ins
  FOR EACH ROW EXECUTE FUNCTION public.on_habit_check_in();

