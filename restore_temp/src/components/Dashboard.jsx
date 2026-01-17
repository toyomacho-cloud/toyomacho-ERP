import React from 'react';
import { TrendingUp, AlertTriangle, Package, DollarSign } from 'lucide-react';
import { useInventoryContext } from '../context/InventoryContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const StatCard = ({ title, value, icon: Icon, color, trend }) => (
    <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div style={{
                background: `rgba(${color}, 0.1)`,
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                color: `rgb(${color})`
            }}>
                <Icon size={24} />
            </div>
            {trend && (
                <span style={{
                    fontSize: '0.875rem',
                    color: 'var(--success)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    background: 'rgba(16, 185, 129, 0.1)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: 'var(--radius-sm)'
                }}>
                    <TrendingUp size={14} /> {trend}
                </span>
            )}
        </div>
        <div>
            <h3 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>{title}</h3>
            <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{value}</p>
        </div>
    </div>
);

const Dashboard = () => {
    const { getStats, products } = useInventoryContext();
    const { totalProducts, totalValue, lowStock } = getStats();

    // Calculate data for the chart: Units per Category
    const categoryData = products.reduce((acc, product) => {
        const category = product.category || 'Uncategorized';
        const existing = acc.find(item => item.name === category);
        if (existing) {
            existing.value += product.quantity;
        } else {
            acc.push({ name: category, value: product.quantity });
        }
        return acc;
    }, []);

    // Sort by value desc
    categoryData.sort((a, b) => b.value - a.value);

    const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: '2rem' }}>
                <h1>Dashboard</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Resumen general de tu inventario.</p>
            </header>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem'
            }}>
                <StatCard
                    title="Total Productos"
                    value={totalProducts}
                    icon={Package}
                    color="59, 130, 246" // Blue
                    trend="+12%"
                />
                <StatCard
                    title="Valor Total"
                    value={`$${totalValue.toLocaleString()}`}
                    icon={DollarSign}
                    color="139, 92, 246" // Purple
                    trend="+5%"
                />
                <StatCard
                    title="Alertas Bajo Stock"
                    value={lowStock}
                    icon={AlertTriangle}
                    color="245, 158, 11" // Amber
                />
            </div>

            <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)', minHeight: '400px' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>Unidades por Categoría</h3>
                <div style={{ height: '300px', width: '100%' }}>
                    {categoryData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={categoryData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    stroke="var(--text-secondary)"
                                    tick={{ fill: 'var(--text-secondary)' }}
                                    axisLine={{ stroke: 'var(--border-color)' }}
                                />
                                <YAxis
                                    stroke="var(--text-secondary)"
                                    tick={{ fill: 'var(--text-secondary)' }}
                                    axisLine={{ stroke: 'var(--border-color)' }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'var(--bg-card)',
                                        borderColor: 'var(--glass-border)',
                                        color: 'var(--text-primary)',
                                        borderRadius: 'var(--radius-sm)'
                                    }}
                                    cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                                />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                            No hay datos para mostrar
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
