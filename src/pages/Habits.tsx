import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Flame, Plus, Target, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Navigation from '@/components/Navigation';
import LanguageToggle from '@/components/LanguageToggle';

type Habit = {
  id: string;
  name: string;
  icon: string | null;
  streak_count: number | null;
  best_streak: number;
};

const Habits = () => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [newHabitIcon, setNewHabitIcon] = useState('🔥');
  const [dialogOpen, setDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    checkAuth();
    fetchHabits();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
    }
  };

  const fetchHabits = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('habits')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHabits((data as Habit[]) || []);
    } catch (error: any) {
      toast.error('Failed to load habits');
    } finally {
      setLoading(false);
    }
  };

  const createHabit = async () => {
    if (!newHabitTitle.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await (supabase as any).from('habits').insert({
        user_id: user.id,
        name: newHabitTitle,
        icon: newHabitIcon,
      });

      if (error) throw error;

      toast.success('Habit created! 🎉');
      setNewHabitTitle('');
      setNewHabitIcon('🔥');
      setDialogOpen(false);
      fetchHabits();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const checkInHabit = async (habitId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await (supabase as any).from('habit_check_ins').insert({
        habit_id: habitId,
        user_id: user.id,
      });

      if (error) {
        if (error.code === '23505') {
          toast.error('Already checked in today!');
        } else {
          throw error;
        }
      } else {
        toast.success('Streak updated! 🔥');
        fetchHabits();
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const emojiOptions = ['🔥', '💪', '🎯', '📚', '🏃', '🧘', '💧', '🌱', '⭐', '🎨'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background pb-24 md:pb-8">
      <LanguageToggle />
      
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Header Section */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl gradient-success flex items-center justify-center shadow-success animate-pulse-glow">
                <Target className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  {t('habits.title')}
                </h1>
                <p className="text-muted-foreground mt-1 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  {t('habits.myHabits')}
                </p>
              </div>
            </div>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                size="lg"
                variant="gradient"
                className="text-lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                {t('habits.createNew')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl">{t('habits.createNew')}</DialogTitle>
                <DialogDescription className="text-base">
                  Create a new habit to track your progress
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 pt-4">
                <div>
                  <label className="text-sm font-semibold mb-3 block">Choose an emoji</label>
                  <div className="flex gap-2 flex-wrap">
                    {emojiOptions.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => setNewHabitIcon(emoji)}
                        className={`text-4xl p-3 rounded-2xl transition-all hover:scale-110 ${
                          newHabitIcon === emoji 
                            ? 'bg-primary/20 scale-110 ring-2 ring-primary' 
                            : 'bg-muted hover:bg-muted/70'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
                <Input
                  placeholder="Habit name (e.g., Morning workout)"
                  value={newHabitTitle}
                  onChange={(e) => setNewHabitTitle(e.target.value)}
                  className="h-12 text-base"
                />
                <Button 
                  onClick={createHabit} 
                  className="w-full h-12 text-base"
                  variant="gradient"
                >
                  {t('common.add')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent"></div>
          </div>
        ) : habits.length === 0 ? (
          <Card className="shadow-card border-2">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 rounded-3xl gradient-primary flex items-center justify-center mb-6 animate-bounce-slow shadow-primary">
                <Target className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Start Your Journey!</h3>
              <p className="text-lg text-muted-foreground max-w-md">
                {t('habits.noHabits')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {habits.map((habit) => (
              <Card
                key={habit.id}
                className="shadow-card border-2 hover:border-primary card-hover overflow-hidden"
              >
                <div className="h-2 gradient-primary"></div>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-5xl animate-pulse-glow">{habit.icon || '🎯'}</div>
                      <div>
                        <CardTitle className="text-xl mb-1">{habit.name}</CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <Flame className="w-5 h-5 text-orange-500 animate-bounce" />
                          <span className="font-bold text-xl text-orange-500">
                            {habit.streak_count ?? 0}
                          </span>
                          <span className="text-sm">{t('habits.days')}</span>
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-xl">
                    <span className="text-sm font-medium text-muted-foreground">
                      {t('habits.bestStreak')}
                    </span>
                    <span className="font-bold text-lg flex items-center gap-1">
                      <span className="text-primary">{habit.best_streak ?? 0}</span>
                      {t('habits.days')}
                    </span>
                  </div>
                  <Button
                    onClick={() => checkInHabit(habit.id)}
                    className="w-full h-11"
                    variant="success"
                  >
                    {t('habits.checkIn')} ✓
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Navigation />
    </div>
  );
};

export default Habits;
