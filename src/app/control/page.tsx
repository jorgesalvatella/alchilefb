'use client';
import { useState, useEffect } from 'react';
import {
  DollarSign,
  Package,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { withAuth, WithAuthProps } from '@/firebase/withAuth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Tipos para las métricas del dashboard
type DateRange = 'today' | '7days' | '30days';

type DashboardData = {
  kpis: {
    revenue: number;
    expenses: number;
    profit: number;
    margin: number;
    revenueChange: number;
    expensesChange: number;
    profitChange: number;
    marginChange: number;
  };
  dailyData: Array<{
    date: string;
    revenue: number;
    expenses: number;
  }>;
  orderStatusData: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  topProducts: Array<{
    name: string;
    quantity: number;
  }>;
  alerts: Array<{
    type: string;
    message: string;
    severity: 'high' | 'medium' | 'low';
  }>;
};

function AdminDashboardPage({ user }: WithAuthProps) {
  const [dateRange, setDateRange] = useState<DateRange>('7days');
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard data from backend
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      setIsLoading(true);
      setError(null);

      try {
        const token = await user.getIdToken();
        const response = await fetch(
          `/api/control/dashboard/metrics?range=${dateRange}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
          console.error('Backend error:', response.status, errorData);
          throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
        }

        const dashboardData = await response.json();
        setData(dashboardData);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [dateRange, user]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Error al cargar dashboard</h3>
          <p className="text-white/60">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-32">
      <div className="container mx-auto px-4 sm:px-6 pb-8 space-y-8">
        {/* Header con selector de rango */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-white/60 mt-1">Resumen ejecutivo de tu negocio</p>
        </div>
        <Select value={dateRange} onValueChange={(value) => setDateRange(value as DateRange)}>
          <SelectTrigger className="w-[180px] bg-black/50 border-white/10 text-white">
            <SelectValue placeholder="Seleccionar periodo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoy</SelectItem>
            <SelectItem value="7days">Últimos 7 días</SelectItem>
            <SelectItem value="30days">Últimos 30 días</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs Principales */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Ingresos"
          value={`$${data?.kpis.revenue.toFixed(2) || '0.00'}`}
          change={data?.kpis.revenueChange || 0}
          icon={<DollarSign className="h-6 w-6 text-green-400" />}
          isLoading={isLoading}
        />
        <KPICard
          title="Gastos"
          value={`$${data?.kpis.expenses.toFixed(2) || '0.00'}`}
          change={data?.kpis.expensesChange || 0}
          icon={<FileText className="h-6 w-6 text-red-400" />}
          isLoading={isLoading}
        />
        <KPICard
          title="Ganancia"
          value={`$${data?.kpis.profit.toFixed(2) || '0.00'}`}
          change={data?.kpis.profitChange || 0}
          icon={<TrendingUp className="h-6 w-6 text-blue-400" />}
          isLoading={isLoading}
        />
        <KPICard
          title="Margen"
          value={`${data?.kpis.margin.toFixed(1) || '0.0'}%`}
          change={data?.kpis.marginChange || 0}
          icon={<Package className="h-6 w-6 text-purple-400" />}
          isLoading={isLoading}
          isPercentage
        />
      </div>

      {/* Gráfica Principal: Ingresos vs Gastos */}
      <Card className="bg-black/50 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Ingresos vs Gastos</CardTitle>
          <CardDescription className="text-white/60">
            Comparación diaria de ingresos y gastos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading || !data?.dailyData || data.dailyData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-white/40">
              {isLoading ? 'Cargando datos...' : 'No hay datos para mostrar'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis
                  dataKey="date"
                  stroke="rgba(255,255,255,0.5)"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.5)"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.9)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Ingresos"
                  dot={{ fill: '#10b981', r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="Gastos"
                  dot={{ fill: '#ef4444', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Grid: Top Productos + Alertas + Gráfica de Dona */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Top 5 Productos */}
        <Card className="bg-black/50 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-400" />
              Top 5 Productos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading || !data?.topProducts || data.topProducts.length === 0 ? (
              <p className="text-white/40 text-sm">
                {isLoading ? 'Cargando...' : 'No hay datos de productos'}
              </p>
            ) : (
              <div className="space-y-3">
                {data.topProducts.map((product, index) => (
                  <div key={product.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-white/60 font-mono text-xs">
                        {index + 1}.
                      </span>
                      <span className="text-white text-sm">{product.name}</span>
                    </div>
                    <span className="text-white/80 font-semibold">
                      {product.quantity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alertas */}
        <Card className="bg-black/50 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
              Alertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading || !data?.alerts || data.alerts.length === 0 ? (
              <p className="text-white/40 text-sm">
                {isLoading ? 'Cargando...' : 'Todo en orden ✓'}
              </p>
            ) : (
              <div className="space-y-3">
                {data.alerts.map((alert, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      alert.severity === 'high'
                        ? 'bg-red-500/10 border-red-500/30'
                        : 'bg-yellow-500/10 border-yellow-500/30'
                    }`}
                  >
                    <p className="text-white text-sm">{alert.message}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráfica de Dona: Estados de Pedidos */}
        <Card className="bg-black/50 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-blue-400" />
              Estado de Pedidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading || !data?.orderStatusData || data.orderStatusData.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-white/40 text-sm">
                {isLoading ? 'Cargando...' : 'No hay pedidos'}
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={data.orderStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      fill="#8884d8"
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {data.orderStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(0,0,0,0.9)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Leyenda */}
                <div className="mt-4 space-y-2">
                  {data.orderStatusData.map((entry) => (
                    <div key={entry.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-white/80">{entry.name}</span>
                      </div>
                      <span className="text-white font-semibold">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}

// Componente KPI Card reutilizable
function KPICard({
  title,
  value,
  change,
  icon,
  isLoading,
  isPercentage = false
}: {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  isLoading?: boolean;
  isPercentage?: boolean;
}) {
  const isPositive = change >= 0;
  const ChangeIcon = isPositive ? TrendingUp : TrendingDown;
  const changeColor = isPositive ? 'text-green-400' : 'text-red-400';

  return (
    <Card className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl transition-all duration-300 hover:bg-white/10 hover:scale-105">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-headline text-white/80">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-white mb-2">
          {isLoading ? '...' : value}
        </div>
        {!isLoading && (
          <div className={`flex items-center gap-1 text-sm ${changeColor}`}>
            <ChangeIcon className="h-4 w-4" />
            <span>
              {Math.abs(change).toFixed(1)}{isPercentage ? 'pp' : '%'} vs periodo anterior
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default withAuth(AdminDashboardPage, 'admin');
