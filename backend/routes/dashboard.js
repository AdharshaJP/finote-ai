import express from 'express';
import Transaction from '../models/Transaction.js';
import Budget from '../models/Budget.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Get dashboard statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentYear = new Date().getFullYear();
    
    // Get current month's transactions
    const monthlyStats = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          date: {
            $gte: new Date(currentMonth + '-01'),
            $lt: new Date(currentYear, new Date().getMonth() + 1, 1)
          }
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' }
        }
      }
    ]);

    // Get all-time stats
    const allTimeStats = await Transaction.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' }
        }
      }
    ]);

    // Get budget status
    const budgets = await Budget.find({ user: req.user._id, month: currentMonth });
    const totalBudget = budgets.reduce((sum, budget) => sum + budget.amount, 0);
    const totalSpent = budgets.reduce((sum, budget) => sum + budget.spent, 0);

    const monthlyIncome = monthlyStats.find(s => s._id === 'income')?.total || 0;
    const monthlyExpenses = monthlyStats.find(s => s._id === 'expense')?.total || 0;
    const totalIncome = allTimeStats.find(s => s._id === 'income')?.total || 0;
    const totalExpenses = allTimeStats.find(s => s._id === 'expense')?.total || 0;

    res.json({
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      monthlyIncome,
      monthlyExpenses,
      budgetRemaining: totalBudget - totalSpent,
      budgetStatus: totalSpent <= totalBudget ? 'on-track' : 'over-budget',
      totalBudget,
      totalSpent
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get chart data
router.get('/charts', auth, async (req, res) => {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    // Get category breakdown for current month
    const categoryBreakdown = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          type: 'expense',
          date: {
            $gte: new Date(currentMonth + '-01'),
            $lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
          }
        }
      },
      {
        $group: {
          _id: '$category',
          amount: { $sum: '$amount' }
        }
      },
      {
        $project: {
          category: '$_id',
          amount: 1,
          _id: 0
        }
      },
      { $sort: { amount: -1 } }
    ]);

    // Get monthly trends (last 6 months)
    const monthlyTrends = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          date: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1)
          }
        }
      },
      {
        $group: {
          _id: {
            month: { $dateToString: { format: '%Y-%m', date: '$date' } },
            type: '$type'
          },
          amount: { $sum: '$amount' }
        }
      },
      {
        $project: {
          month: '$_id.month',
          type: '$_id.type',
          amount: 1,
          _id: 0
        }
      },
      { $sort: { month: 1 } }
    ]);

    // Weekly spending — last 7 days grouped by date
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const weeklySpending = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          type: 'expense',
          date: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          amount: { $sum: '$amount' },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { date: '$_id', amount: 1, _id: 0 } },
    ]);

    // Day-of-week pattern — last 90 days, avg spend per weekday
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 89);
    ninetyDaysAgo.setHours(0, 0, 0, 0);

    const dowPattern = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          type: 'expense',
          date: { $gte: ninetyDaysAgo },
        },
      },
      {
        $group: {
          _id: { $dayOfWeek: '$date' }, // 1=Sun … 7=Sat
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { dow: '$_id', total: 1, count: 1, avg: { $divide: ['$total', '$count'] }, _id: 0 } },
    ]);

    // Monthly income vs expense — last 6 months grouped as bar data
    const monthlyComparison = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          date: { $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1) },
        },
      },
      {
        $group: {
          _id: {
            month: { $dateToString: { format: '%Y-%m', date: '$date' } },
            type: '$type',
          },
          amount: { $sum: '$amount' },
        },
      },
      { $project: { month: '$_id.month', type: '$_id.type', amount: 1, _id: 0 } },
      { $sort: { month: 1 } },
    ]);

    res.json({
      categoryBreakdown,
      monthlyTrends,
      weeklySpending,
      dowPattern,
      monthlyComparison,
    });
  } catch (error) {
    console.error('Error fetching chart data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;