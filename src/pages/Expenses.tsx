import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { DollarSign, Users, Plus, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Navigation from '@/components/Navigation';
import LanguageToggle from '@/components/LanguageToggle';

type Expense = {
  id: string;
  user_id: string;
  name: string;
  total_amount: number;
  created_at: string;
};

type ExpenseMember = {
  id: string;
  expense_id: string;
  user_id: string;
  amount_owed: number;
  is_settled: boolean | null;
  created_at: string;
  expenses?: Expense; // when selecting with relation
};

const Expenses = () => {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [createdExpenses, setCreatedExpenses] = useState<Expense[]>([]);
  const [myMemberships, setMyMemberships] = useState<ExpenseMember[]>([]);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newExpenseName, setNewExpenseName] = useState('');
  const [newExpenseTotal, setNewExpenseTotal] = useState<string>('');
  const [addSelfAsMember, setAddSelfAsMember] = useState(true);
  const [selfOwedAmount, setSelfOwedAmount] = useState<string>('');

  const [memberDialogExpenseId, setMemberDialogExpenseId] = useState<string | null>(null);
  const [newMemberUserId, setNewMemberUserId] = useState('');
  const [newMemberOwed, setNewMemberOwed] = useState<string>('');

  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  const checkAuthAndLoad = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }
    setUserId(session.user.id);
    await fetchData(session.user.id);
    setLoading(false);
  };

  const fetchData = async (uid: string) => {
    try {
      const [{ data: expenses, error: e1 }, { data: memberships, error: e2 }] = await Promise.all([
        (supabase as any)
          .from('expenses')
          .select('*')
          .eq('user_id', uid)
          .order('created_at', { ascending: false }),
        (supabase as any)
          .from('expense_members')
          .select('*, expenses(*)')
          .eq('user_id', uid)
          .order('created_at', { ascending: false })
      ]);

      if (e1) throw e1;
      if (e2) throw e2;

      setCreatedExpenses((expenses as Expense[]) || []);
      setMyMemberships((memberships as ExpenseMember[]) || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load expenses');
    }
  };

  const createExpense = async () => {
    if (!newExpenseName.trim()) return;
    const total = parseFloat(newExpenseTotal || '0');
    if (isNaN(total) || total < 0) {
      toast.error('Enter a valid total amount');
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: inserted, error } = await (supabase as any)
        .from('expenses')
        .insert({ user_id: user.id, name: newExpenseName, total_amount: total })
        .select('*')
        .maybeSingle();
      if (error) throw error;

      if (addSelfAsMember && inserted?.id) {
        const owed = parseFloat(selfOwedAmount || '0');
        if (!isNaN(owed) && owed >= 0) {
          const { error: mErr } = await (supabase as any)
            .from('expense_members')
            .insert({ expense_id: inserted.id, user_id: user.id, amount_owed: owed });
          if (mErr) throw mErr;
        }
      }

      toast.success('Expense created');
      setCreateDialogOpen(false);
      setNewExpenseName('');
      setNewExpenseTotal('');
      setSelfOwedAmount('');
      await fetchData(user.id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create expense');
    }
  };

  const addMember = async () => {
    if (!memberDialogExpenseId || !newMemberUserId.trim()) return;
    const owed = parseFloat(newMemberOwed || '0');
    if (isNaN(owed) || owed < 0) {
      toast.error('Enter a valid owed amount');
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // only allow adding members if creator
      const isOwner = createdExpenses.some(e => e.id === memberDialogExpenseId && e.user_id === user.id);
      if (!isOwner) {
        toast.error('Only the creator can add members');
        return;
      }

      const { error } = await (supabase as any)
        .from('expense_members')
        .insert({ expense_id: memberDialogExpenseId, user_id: newMemberUserId, amount_owed: owed });
      if (error) throw error;

      toast.success('Member added');
      setMemberDialogExpenseId(null);
      setNewMemberUserId('');
      setNewMemberOwed('');
      await fetchData(user.id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add member');
    }
  };

  const toggleSettlement = async (member: ExpenseMember) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      if (member.user_id !== user.id) {
        toast.error('You can only update your own settlement');
        return;
      }
      const { error } = await (supabase as any)
        .from('expense_members')
        .update({ is_settled: !member.is_settled })
        .eq('id', member.id);
      if (error) throw error;
      await fetchData(user.id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update settlement');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <LanguageToggle />

      <div className="max-w-6xl mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {t('expenses.title')} 💰
            </h1>
            <p className="text-muted-foreground mt-2">
              {t('expenses.groups')}
            </p>
          </div>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-secondary text-white shadow-secondary hover:scale-105 transition-transform">
                <Plus className="w-5 h-5 mr-2" /> {t('expenses.createGroup')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Expense</DialogTitle>
                <DialogDescription>Start a new expense group</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Expense name" value={newExpenseName} onChange={(e) => setNewExpenseName(e.target.value)} />
                <Input placeholder="Total amount (e.g., 250)" value={newExpenseTotal} onChange={(e) => setNewExpenseTotal(e.target.value)} />
                <div className="space-y-2">
                  <label className="text-sm font-medium">Add me as a member (optional)</label>
                  <div className="flex gap-2">
                    <Button type="button" variant={addSelfAsMember ? 'success' : 'outline'} onClick={() => setAddSelfAsMember(!addSelfAsMember)}>
                      {addSelfAsMember ? 'Will Add' : 'Skip'}
                    </Button>
                    <Input placeholder="My owed amount" value={selfOwedAmount} onChange={(e) => setSelfOwedAmount(e.target.value)} />
                  </div>
                </div>
                <Button variant="gradient" onClick={createExpense}>Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Created Expenses */}
            <Card className="shadow-card border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" /> Your Created Expenses
                </CardTitle>
                <CardDescription>Manage expenses you created</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {createdExpenses.length === 0 ? (
                  <p className="text-muted-foreground">{t('expenses.noGroups')}</p>
                ) : (
                  createdExpenses.map((exp) => (
                    <div key={exp.id} className="p-4 rounded-xl border flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-foreground">{exp.name}</div>
                        <div className="text-sm text-muted-foreground">SAR {Number(exp.total_amount).toFixed(2)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => { setMemberDialogExpenseId(exp.id); }}>
                          Add member
                        </Button>
                      </div>
                    </div>
                  ))
                )}

                {/* Add Member Dialog */}
                <Dialog open={!!memberDialogExpenseId} onOpenChange={(o) => !o && setMemberDialogExpenseId(null)}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Member</DialogTitle>
                      <DialogDescription>Enter the user ID (UUID) and owed amount</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                      <Input placeholder="User ID (UUID)" value={newMemberUserId} onChange={(e) => setNewMemberUserId(e.target.value)} />
                      <Input placeholder="Amount owed" value={newMemberOwed} onChange={(e) => setNewMemberOwed(e.target.value)} />
                      <Button variant="gradient" onClick={addMember}>Add</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            {/* My Memberships */}
            <Card className="shadow-card border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-secondary" /> Your Pending/Settled
                </CardTitle>
                <CardDescription>Expenses where you are a member</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {myMemberships.length === 0 ? (
                  <p className="text-muted-foreground">No memberships yet</p>
                ) : (
                  myMemberships.map((m) => (
                    <div key={m.id} className="p-4 rounded-xl border flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-foreground">{m.expenses?.name || 'Expense'}</div>
                        <div className="text-sm text-muted-foreground">Owed: SAR {Number(m.amount_owed).toFixed(2)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant={m.is_settled ? 'outline' : 'success'} onClick={() => toggleSettlement(m)}>
                          {m.is_settled ? 'Mark Unsettled' : 'Mark Settled'}
                        </Button>
                        {m.is_settled ? <CheckCircle2 className="w-5 h-5 text-success" /> : null}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <Navigation />
    </div>
  );
};

export default Expenses;
