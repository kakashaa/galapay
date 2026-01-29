import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { TrendingUp, PieChart as PieIcon } from 'lucide-react';

interface ChartData {
  totalRequests: number;
  paidRequests: number;
  rejectedRequests: number;
  pendingRequests: number;
  totalPaidAmount: number;
  totalPendingAmount: number;
}

interface AnalyticsChartsProps {
  stats: ChartData;
}

const AnalyticsCharts = ({ stats }: AnalyticsChartsProps) => {
  // Pie chart data for request statuses
  const pieData = useMemo(() => [
    { name: 'مكتملة', value: stats.paidRequests, color: 'hsl(145, 70%, 45%)' },
    { name: 'مرفوضة', value: stats.rejectedRequests, color: 'hsl(0, 80%, 55%)' },
    { name: 'قيد الانتظار', value: stats.pendingRequests, color: 'hsl(35, 90%, 55%)' },
  ].filter(item => item.value > 0), [stats]);

  // Area chart data for amounts
  const areaData = useMemo(() => [
    { name: 'مكتملة', amount: stats.totalPaidAmount },
    { name: 'معلقة', amount: stats.totalPendingAmount },
  ], [stats]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card px-3 py-2 text-sm">
          <p className="font-medium">{payload[0].name}</p>
          <p className="text-primary">{payload[0].value.toLocaleString()}</p>
        </div>
      );
    }
    return null;
  };

  if (stats.totalRequests === 0) {
    return (
      <div className="dark-card p-8 text-center text-muted-foreground">
        <PieIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>لا توجد بيانات كافية للرسوم البيانية</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Pie Chart */}
      <div className="dark-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <PieIcon className="w-4 h-4 text-primary" />
          <h3 className="font-medium text-sm">توزيع الطلبات</h3>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={4}
                dataKey="value"
                animationBegin={0}
                animationDuration={800}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value) => <span className="text-xs text-foreground">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {/* Center Stats */}
        <div className="text-center -mt-2">
          <p className="text-2xl font-bold text-primary">{stats.totalRequests}</p>
          <p className="text-xs text-muted-foreground">إجمالي الطلبات</p>
        </div>
      </div>

      {/* Amount Bar Chart */}
      <div className="dark-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="font-medium text-sm">المبالغ</h3>
        </div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={areaData}>
              <defs>
                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(145, 70%, 45%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(145, 70%, 45%)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="glass-card px-3 py-2 text-sm">
                        <p className="font-medium">{payload[0].payload.name}</p>
                        <p className="text-primary">${payload[0].value?.toLocaleString()}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area 
                type="monotone" 
                dataKey="amount" 
                stroke="hsl(145, 70%, 45%)" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorAmount)" 
                animationDuration={800}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Amount Summary */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-primary/10 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-primary">${stats.totalPaidAmount.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">تم تحويلها</p>
          </div>
          <div className="bg-warning/10 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-warning">${stats.totalPendingAmount.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">معلقة</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsCharts;
