import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Plus, Target, TrendingUp, MoreVertical, Pencil, Trash2, CheckCircle2, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import Navigation from '@/components/Navigation';
import { SkeletonList } from '@/components/ui/skeleton-card';
import HabitCalendar from '@/components/HabitCalendar';
import { HabitStatistics } from '@/components/HabitStatistics';
import { useIsRTL } from '@/lib/rtl-utils';
import { responsiveText, responsiveSpacing, responsiveGrid } from '@/lib/responsive-utils';
import { EmptyState } from '@/components/EmptyState';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileQuickActionsFAB } from '@/components/MobileQuickActionsFAB';
import { HabitCheckInCelebration } from '@/components/HabitCheckInCelebration';

type Habit = {
  id: string;
  name: string;
  icon: string | null;
  streak_count: number | null;
  best_streak: number | null;
  target_days?: number;
};

const Habits = () => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [newHabitIcon, setNewHabitIcon] = useState('🔥');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editIcon, setEditIcon] = useState('🔥');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingHabit, setDeletingHabit] = useState<Habit | null>(null);
  const [calendarDialogOpen, setCalendarDialogOpen] = useState(false);
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [celebratedHabit, setCelebratedHabit] = useState<Habit | null>(null);
  
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const isMobile = useIsMobile();

  useEffect(() => {
    checkAuth();
    fetchHabits();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) navigate('/auth');
  };

  const fetchHabits = async () => {
    try {
      const { data, error } = await supabase
        .from('habits')
        .select('id, name, icon, streak_count, best_streak, target_days, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: Habit[] = ((data as Tables<'habits'>[] | null) ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        icon: (row as any).icon ?? null,
        streak_count: row.streak_count,
        best_streak: (row as any).best_streak ?? null,
        target_days: (row as any).target_days ?? 30,
      }));

      setHabits(mapped);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to load habits');
    } finally {
      setLoading(false);
    }
  };

  const createHabit = async () => {
    if (!newHabitTitle.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const payload: TablesInsert<'habits'> = {
        user_id: user.id,
        name: newHabitTitle,
        icon: newHabitIcon,
      };
      const { error } = await supabase.from('habits').insert(payload);
      if (error) throw error;

      toast.success('Habit created');
      setNewHabitTitle('');
      setNewHabitIcon('🔥');
      setDialogOpen(false);
      fetchHabits();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to create habit');
    }
  };

  const checkInHabit = async (habitId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('habit_check_ins').insert({
        habit_id: habitId,
        user_id: user.id,
      } as TablesInsert<'habit_check_ins'>);

      if (error) {
        if (error.code === '23505') {
          toast.error('Already checked in today');
        } else {
          throw error;
        }
      } else {
        // Find the habit to celebrate
        const habit = habits.find(h => h.id === habitId);
        
        if (habit) {
          // Trigger celebration
          setCelebratedHabit(habit);
          setCelebrating(true);
        }
        
        // Refresh data
        fetchHabits();
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to check in');
    }
  };

  const openEditDialog = (habit: Habit) => {
    setEditingHabit(habit);
    setEditTitle(habit.name);
    setEditIcon(habit.icon || '🔥');
    setEditDialogOpen(true);
  };

  const updateHabit = async () => {
    if (!editingHabit || !editTitle.trim()) return;

    try {
      const payload: TablesUpdate<'habits'> = {
        name: editTitle.trim(),
        icon: editIcon,
      };

      const { error } = await supabase
        .from('habits')
        .update(payload)
        .eq('id', editingHabit.id);

      if (error) throw error;

      toast.success('Habit updated');
      setEditDialogOpen(false);
      setEditingHabit(null);
      fetchHabits();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to update habit');
    }
  };

  const openDeleteDialog = (habit: Habit) => {
    setDeletingHabit(habit);
    setDeleteDialogOpen(true);
  };

  const deleteHabit = async () => {
    if (!deletingHabit) return;

    try {
      const { error } = await supabase
        .from('habits')
        .delete()
        .eq('id', deletingHabit.id);

      if (error) throw error;

      toast.success('Habit deleted');
      setDeleteDialogOpen(false);
      setDeletingHabit(null);
      fetchHabits();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete habit');
    }
  };

  const emojiOptions = ['🔥', '💪', '🎯', '📚', '🏃', '🧘', '💧', '🌱', '⭐', '🎨'];

  return (
    <div className={`min-h-screen bg-gradient-to-b from-muted/30 via-muted/10 to-background ${responsiveSpacing.pageContainer} ${responsiveSpacing.mobileNavPadding}`} dir={isRTL ? 'rtl' : 'ltr'}>
      
      <div className={`max-w-7xl mx-auto space-y-6 md:space-y-8`}>
        {/* Header */}
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
          <div className={`space-y-1 ${isRTL ? 'text-right' : 'text-left'}`}>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">
              {t('habits.title')}
            </h1>
            <p className={`text-sm md:text-base text-muted-foreground flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <TrendingUp className="w-4 h-4" />
              {t('habits.myHabits')}
            </p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-sm hover:shadow-md active:scale-95 transition-all duration-200">
                <Plus className="w-4 h-4 mr-2" />
                {t('habits.createNew')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
              <DialogHeader>
                <DialogTitle className={isRTL ? 'text-right' : 'text-left'}>{t('habits.createNew')}</DialogTitle>
                <DialogDescription className={isRTL ? 'text-right' : 'text-left'}>
                  {t('habits.createDescription')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
              <div>
                <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>{t('habits.chooseEmoji')}</label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => document.getElementById('emoji-input-create')?.focus()}
                    className="text-6xl p-4 rounded-xl bg-muted hover:bg-accent transition-all hover:scale-105 active:scale-95 shadow-sm border border-border/40"
                  >
                    {newHabitIcon}
                  </button>
                  <input
                    id="emoji-input-create"
                    type="text"
                    inputMode="none"
                    maxLength={2}
                    value={newHabitIcon}
                    onChange={(e) => {
                      const emoji = e.target.value.slice(-2);
                      if (emoji) setNewHabitIcon(emoji);
                    }}
                    className="sr-only"
                  />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-2">
                      {t('habits.tapToSelectEmoji') || 'Tap the emoji to open your device emoji picker'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {emojiOptions.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setNewHabitIcon(emoji)}
                          className={cn(
                            "text-2xl p-2 rounded-lg transition-all duration-200",
                            newHabitIcon === emoji 
                              ? 'bg-primary/10 ring-2 ring-primary shadow-sm' 
                              : 'bg-muted/50 hover:bg-accent hover:scale-105 active:scale-95'
                          )}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
                <Input
                  placeholder={t('habits.habitNamePlaceholder')}
                  value={newHabitTitle}
                  onChange={(e) => setNewHabitTitle(e.target.value)}
                  className={isRTL ? 'text-right' : 'text-left'}
                />
                <Button onClick={createHabit} className="w-full">
                  {t('common.add')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Content */}
        {loading ? (
          <SkeletonList count={6} />
        ) : habits.length === 0 ? (
          <EmptyState
            icon={Target}
            title={t('habits.startJourney')}
            description={t('habits.noHabits')}
            actionLabel={t('habits.createNew')}
            onAction={() => setDialogOpen(true)}
          />
        ) : (
          <div className={`grid ${responsiveGrid.cards} ${responsiveSpacing.gridGap}`}>
            {habits.map((habit) => (
              <Card key={habit.id} className="border border-border/40 shadow-sm hover:shadow-md hover:border-border/60 transition-all duration-200 overflow-hidden group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-4xl group-hover:scale-110 transition-transform duration-200">{habit.icon || '🔥'}</div>
                      <div>
                        <CardTitle className={`${responsiveText.cardTitle} font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{habit.name}</CardTitle>
                        <p className={`${responsiveText.caption} text-muted-foreground mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                          {habit.streak_count ?? 0} {t('habits.dayStreak')}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="bg-background z-50">
                        <DropdownMenuItem onClick={() => {
                          setSelectedHabit(habit);
                          setCalendarDialogOpen(true);
                        }}>
                          <Calendar className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                          {t('habits.viewCalendar')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setSelectedHabit(habit);
                          setStatsDialogOpen(true);
                        }}>
                          <TrendingUp className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                          {t('habits.viewStatistics')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditDialog(habit)}>
                          <Pencil className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                          {t('common.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => openDeleteDialog(habit)}
                          className="text-destructive"
                        >
                          <Trash2 className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                          {t('common.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {habit.target_days && (
                    <div className="p-3 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg space-y-2 border border-primary/20">
                      <div className={`flex items-center justify-between ${responsiveText.caption} ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <span className="text-muted-foreground">{t('habits.goalProgress')}</span>
                        <span className="font-semibold text-primary">
                          {habit.streak_count ?? 0} / {habit.target_days} {t('habits.days')}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden shadow-inner">
                        <div 
                          className={`h-full bg-gradient-to-r from-primary to-accent transition-all duration-700 ease-out shadow-sm ${isRTL ? 'float-right' : ''}`}
                          style={{ width: `${Math.min(((habit.streak_count ?? 0) / habit.target_days) * 100, 100)}%` }}
                        />
                      </div>
                      <div className={`${responsiveText.caption} text-muted-foreground text-center`}>
                        {((habit.streak_count ?? 0) / habit.target_days * 100).toFixed(0)}% {t('habits.complete')}
                      </div>
                    </div>
                  )}
                  <div className={`flex items-center justify-between p-3 bg-accent rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className={`${responsiveText.caption} font-medium text-muted-foreground`}>{t('habits.bestStreak')}</span>
                    <span className="font-semibold">{habit.best_streak ?? 0} {t('habits.days')}</span>
                  </div>
                  <Button
                    onClick={() => checkInHabit(habit.id)}
                    className="w-full shadow-sm hover:shadow-md active:scale-95 transition-all duration-200"
                    size="sm"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {t('habits.checkIn')}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className={isRTL ? 'text-right' : 'text-left'}>{t('habits.editHabit')}</DialogTitle>
            <DialogDescription className={isRTL ? 'text-right' : 'text-left'}>{t('habits.updateDetails')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>{t('habits.chooseEmoji')}</label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => document.getElementById('emoji-input-edit')?.focus()}
                  className="text-6xl p-4 rounded-xl bg-muted hover:bg-accent transition-all hover:scale-105 active:scale-95 shadow-sm border border-border/40"
                >
                  {editIcon}
                </button>
                <input
                  id="emoji-input-edit"
                  type="text"
                  inputMode="none"
                  maxLength={2}
                  value={editIcon}
                  onChange={(e) => {
                    const emoji = e.target.value.slice(-2);
                    if (emoji) setEditIcon(emoji);
                  }}
                  className="sr-only"
                />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-2">
                    {t('habits.tapToSelectEmoji') || 'Tap the emoji to open your device emoji picker'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {emojiOptions.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setEditIcon(emoji)}
                        className={cn(
                          "text-2xl p-2 rounded-lg transition-all duration-200",
                          editIcon === emoji 
                            ? 'bg-primary/10 ring-2 ring-primary shadow-sm' 
                            : 'bg-muted/50 hover:bg-accent hover:scale-105 active:scale-95'
                        )}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <Input
              placeholder={t('habits.habitName')}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className={isRTL ? 'text-right' : 'text-left'}
            />
            <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Button onClick={updateHabit} className="flex-1">
                {t('habits.updateHabit')}
              </Button>
              <Button onClick={() => setEditDialogOpen(false)} variant="outline">
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir={isRTL ? 'rtl' : 'ltr'}>
          <AlertDialogHeader>
            <AlertDialogTitle className={isRTL ? 'text-right' : 'text-left'}>{t('habits.deleteHabit')}</AlertDialogTitle>
            <AlertDialogDescription className={isRTL ? 'text-right' : 'text-left'}>
              {t('habits.deleteConfirm').replace('"{deletingHabit?.name}"', `"${deletingHabit?.name}"`)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={deleteHabit} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedHabit && (
        <>
          <HabitCalendar
            habitId={selectedHabit.id}
            habitName={selectedHabit.name}
            open={calendarDialogOpen}
            onOpenChange={setCalendarDialogOpen}
          />
          <Dialog open={statsDialogOpen} onOpenChange={setStatsDialogOpen}>
            <DialogContent className="sm:max-w-2xl">
              <HabitStatistics />
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* Celebration */}
      {celebratedHabit && (
        <HabitCheckInCelebration
          show={celebrating}
          habitName={celebratedHabit.name}
          habitIcon={celebratedHabit.icon || '🔥'}
          streakCount={(celebratedHabit.streak_count || 0) + 1}
          onComplete={() => {
            setCelebrating(false);
            setCelebratedHabit(null);
          }}
        />
      )}

      {/* Mobile Quick Actions FAB */}
      <MobileQuickActionsFAB onAddHabit={() => setDialogOpen(true)} />

      <Navigation />
    </div>
  );
};

export default Habits;
