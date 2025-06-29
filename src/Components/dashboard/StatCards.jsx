
import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Clock, 
  CheckCircle, 
  TrendingUp,
  Truck,
  DollarSign,
  AlertTriangle,
  BarChart3
} from 'lucide-react';
import api from '../../utils/Api';

const StatsCards = () => {
  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    completedRequests: 0,
    inProgressRequests: 0,
    totalSpent: 0,
    averagePrice: 0,
    thisMonthRequests: 0,
    rejectedRequests: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch dashboard statistics
  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all user's requests
      const response = await api.get('/transport-requests/my-requests');
      
      if (response.data?.success) {
        const requests = response.data.requests || [];
        calculateStats(requests);
      } else {
        throw new Error('Failed to fetch statistics');
      }
    } catch (err) {
      console.error('Stats fetch error:', err);
      setError(err.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics from requests data
  const calculateStats = (requests) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const totalRequests = requests.length;
    const pendingRequests = requests.filter(req => 
      req.status?.toLowerCase() === 'pending'
    ).length;
    
    const completedRequests = requests.filter(req => 
      req.status?.toLowerCase() === 'completed'
    ).length;
    
    const inProgressRequests = requests.filter(req => 
      req.status?.toLowerCase() === 'in progress' || 
      req.status?.toLowerCase() === 'approved'
    ).length;
    
    const rejectedRequests = requests.filter(req => 
      req.status?.toLowerCase() === 'rejected'
    ).length;
    
    // Calculate financial stats
    const totalSpent = requests
      .filter(req => req.status?.toLowerCase() === 'completed')
      .reduce((sum, req) => sum + (parseFloat(req.requested_price) || 0), 0);
    
    const averagePrice = totalRequests > 0 
      ? requests.reduce((sum, req) => sum + (parseFloat(req.requested_price) || 0), 0) / totalRequests
      : 0;
    
    // Calculate this month's requests
    const thisMonthRequests = requests.filter(req => {
      const requestDate = new Date(req.created_at);
      return requestDate.getMonth() === currentMonth && 
             requestDate.getFullYear() === currentYear;
    }).length;

    setStats({
      totalRequests,
      pendingRequests,
      completedRequests,
      inProgressRequests,
      totalSpent,
      averagePrice,
      thisMonthRequests,
      rejectedRequests
    });
  };

  useEffect(() => {
    fetchStats();
    
    // Set up auto-refresh every 5 minutes
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Stat card configuration
  const statCards = [
    {
      title: 'Total Requests',
      value: stats.totalRequests,
      icon: Package,
      color: 'blue',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      change: stats.thisMonthRequests > 0 ? `+${stats.thisMonthRequests} this month` : 'No requests this month'
    },
    {
      title: 'Pending',
      value: stats.pendingRequests,
      icon: Clock,
      color: 'yellow',
      bgColor: 'bg-yellow-50',
      iconColor: 'text-yellow-600',
      change: stats.totalRequests > 0 ? `${((stats.pendingRequests / stats.totalRequests) * 100).toFixed(1)}% of total` : '0% of total'
    },
    {
      title: 'Completed',
      value: stats.completedRequests,
      icon: CheckCircle,
      color: 'green',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      change: stats.totalRequests > 0 ? `${((stats.completedRequests / stats.totalRequests) * 100).toFixed(1)}% success rate` : '0% success rate'
    },
    {
      title: 'In Progress',
      value: stats.inProgressRequests,
      icon: Truck,
      color: 'indigo',
      bgColor: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
      change: stats.inProgressRequests > 0 ? 'Active shipments' : 'No active shipments'
    },
    {
      title: 'Total Spent',
      value: `₹${stats.totalSpent.toLocaleString('en-IN')}`,
      icon: DollarSign,
      color: 'purple',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      change: stats.completedRequests > 0 ? `Avg: ₹${(stats.totalSpent / stats.completedRequests).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : 'No completed requests'
    },
 
  ];

  // Loading state
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow animate-pulse">
            <div className="flex items-center justify-between">
              <div>
                <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="h-12 w-12 bg-gray-200 rounded-lg"></div>
            </div>
            <div className="mt-4 h-3 bg-gray-200 rounded w-24"></div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Failed to load statistics</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button 
              onClick={fetchStats}
              className="text-sm text-red-600 hover:text-red-800 underline mt-2"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
      {statCards.map((card, index) => {
        const Icon = card.icon;
        
        return (
          <div 
            key={index} 
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {card.title}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {card.value}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${card.bgColor}`}>
                <Icon className={`h-6 w-6 ${card.iconColor}`} />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs text-gray-500">
                {card.change}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatsCards;