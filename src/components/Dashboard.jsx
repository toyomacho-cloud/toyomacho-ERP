import React, { useState, useMemo, useEffect } from 'react';
import {
    TrendingUp,
    AlertTriangle,
    Package,
    DollarSign,
    ArrowDownLeft,
    ArrowUpRight,
    Clock,
    ShoppingCart,
    BarChart3,
    PieChart as PieChartIcon,
    History,
    RefreshCw
} from 'lucide-react';
import { useInventoryContext } from '../context/InventoryContext';
import { useExchangeRates } from '../context/ExchangeRateContext';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie,
    Legend
} from 'recharts';

// Exchange Rate Cards Component
const ExchangeRateCards = () => {
    const { bcvRate, usdtRate, lastUpdate, loading, refreshRates } = useExchangeRates();

    // Removed local redundant internal fetching logic - now uses global context

    const getTimeSinceUpdate = () => {
        if (!lastUpdate) return '';
        const minutes = Math.floor((new Date() - lastUpdate) / (1000 * 60));
        if (minutes === 0) return 'ahora';
        return `hace ${minutes} min`;
    };

    return (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {/* Refresh Button */}
            <button
                onClick={refreshRates}
                disabled={loading}
                className="btn btn-ghost"
                style={{
                    padding: '0.5rem',
                    minWidth: 'auto',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1
                }}
                title="Actualizar tasas"
            >
                <RefreshCw
                    size={18}
                    style={{
                        animation: loading ? 'spin 1s linear infinite' : 'none'
                    }}
                />
            </button>

            {/* BCV Card */}
            <div style={{
                padding: '0.75rem 1rem',
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                minWidth: '140px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                    <DollarSign size={14} style={{ color: 'rgb(34, 197, 94)' }} />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>BCV</span>
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'rgb(34, 197, 94)' }}>
                    Bs {bcvRate.toFixed(2)}
                </div>
                {lastUpdate && (
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        ⟳ {getTimeSinceUpdate()}
                    </div>
                )}
            </div>

            {/* USDT Card */}
            <div style={{
                padding: '0.75rem 1rem',
                background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.1) 0%, rgba(234, 179, 8, 0.05) 100%)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(234, 179, 8, 0.3)',
                minWidth: '140px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                    <TrendingUp size={14} style={{ color: 'rgb(234, 179, 8)' }} />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>USDT</span>
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'rgb(234, 179, 8)' }}>
                    Bs {usdtRate.toFixed(2)}
                </div>
                {lastUpdate && (
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        ⟳ {getTimeSinceUpdate()}
                    </div>
                )}
            </div>
        </div>
    );
};

const StatCard = ({ title, value, icon: Icon, color, trend, subtitle }) => (
    <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div style={{
                background: `rgba(${color}, 0.1)`,
                padding: '0.6rem',
                borderRadius: 'var(--radius-md)',
                color: `rgb(${color})`
            }}>
                <Icon size={20} />
            </div>
            {trend && (
                <span style={{
                    fontSize: '0.75rem',
                    color: trend.startsWith('-') ? 'var(--error)' : 'var(--success)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.15rem',
                    background: trend.startsWith('-') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                    padding: '0.2rem 0.4rem',
                    borderRadius: 'var(--radius-sm)'
                }}>
                    {trend.startsWith('-') ? <ArrowDownLeft size={12} /> : <TrendingUp size={12} />} {trend}
                </span>
            )}
        </div>
        <div>
            <h3 style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>{title}</h3>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{value}</p>
            {subtitle && <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{subtitle}</p>}
        </div>
    </div>
);

const Dashboard = () => {
    const { products, sales, movements } = useInventoryContext();
    const [categoryMetric, setCategoryMetric] = useState('units'); // 'units' or 'value'
    const [chartType, setChartType] = useState('bar'); // 'bar' or 'pie'

    // 1. Basic Stats Calculation
    const stats = useMemo(() => {
        const totalProducts = products.length;
        const totalVal = products.reduce((acc, curr) => acc + ((curr.price || 0) * (curr.quantity || 0)), 0);
        const belowMin = products.filter(p => p.quantity > 0 && p.quantity <= (p.minStock || 5)).length;
        const outOfStock = products.filter(p => p.quantity === 0).length;

        // Turnover Calculation (Simple: Sold Qty / Current Total Qty)
        // Last 30 days sales
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentSales = sales.filter(s => new Date(s.created_at || s.createdAt) >= thirtyDaysAgo);
        const unitsSold = recentSales.reduce((acc, s) => acc + (parseInt(s.quantity) || 0), 0);
        const currentTotalUnits = products.reduce((acc, p) => acc + (parseInt(p.quantity) || 0), 0);

        const turnover = currentTotalUnits > 0 ? (unitsSold / currentTotalUnits).toFixed(2) : '0';

        return { totalProducts, totalVal, belowMin, outOfStock, turnover, unitsSold };
    }, [products, sales]);

    // 2. Units & Value vs Category
    const categoryData = useMemo(() => {
        const dataMap = products.reduce((acc, product) => {
            const category = product.category || 'Sin Categoría';
            if (!acc[category]) {
                acc[category] = { name: category, units: 0, value: 0 };
            }
            acc[category].units += product.quantity || 0;
            acc[category].value += (product.quantity || 0) * (product.price || 0);
            return acc;
        }, {});

        return Object.values(dataMap).sort((a, b) => b[categoryMetric] - a[categoryMetric]);
    }, [products, categoryMetric]);

    // 3. Top 10 Most Sold Products
    const topSoldData = useMemo(() => {
        const salesMap = sales.reduce((acc, sale) => {
            const desc = sale.description || sale.sku || 'Producto';
            if (!acc[desc]) acc[desc] = 0;
            acc[desc] += parseInt(sale.quantity) || 0;
            return acc;
        }, {});

        return Object.entries(salesMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
    }, [sales]);

    // 4. Slow Moving Items (Inactivity Analysis)
    const slowMoving = useMemo(() => {
        const now = new Date();
        const getDaysDiff = (dateStr) => Math.floor((now - new Date(dateStr)) / (1000 * 60 * 60 * 24));

        const productLastMove = products.map(p => {
            const productMoves = movements.filter(m => m.productId === p.id && m.type === 'Salida');
            const lastMoveDate = productMoves.length > 0 ? productMoves[0].date : p.createdAt;
            return { ...p, daysInactive: getDaysDiff(lastMoveDate) };
        });

        return {
            days30: productLastMove.filter(p => p.daysInactive >= 30 && p.daysInactive < 60 && p.quantity > 0).length,
            days60: productLastMove.filter(p => p.daysInactive >= 60 && p.daysInactive < 90 && p.quantity > 0).length,
            days90: productLastMove.filter(p => p.daysInactive >= 90 && p.quantity > 0).length,
        };
    }, [products, movements]);

    const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#f97316', '#a855f7', '#14b8a6'];

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '2rem' }}>
            <header style={{
                marginBottom: '1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '1rem',
                flexWrap: 'wrap'
            }}>
                <div>
                    <h1>Gestión de Inventario</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Análisis proactivo y métricas de rendimiento.</p>
                </div>

                <ExchangeRateCards />
            </header>

            {/* Primary Stats */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem'
            }}>
                <StatCard title="Total SKU's" value={stats.totalProducts} icon={Package} color="59, 130, 246" />
                <StatCard title="Valor Inventario" value={`$${stats.totalVal.toLocaleString()}`} icon={DollarSign} color="139, 92, 246" />
                <StatCard title="Reponer (Bajo Mín)" value={stats.belowMin} icon={AlertTriangle} color="245, 158, 11" subtitle="Requieren compra inmediata" />
                <StatCard title="Agotados (Stock 0)" value={stats.outOfStock} icon={History} color="239, 68, 68" subtitle="Ventas perdidas potenciales" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Category Analysis Chart */}
                <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <PieChartIcon size={18} /> Categorías por {categoryMetric === 'units' ? 'Unidades' : 'Valor'}
                        </h3>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <select
                                value={categoryMetric}
                                onChange={(e) => setCategoryMetric(e.target.value)}
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: 'var(--radius-sm)' }}
                            >
                                <option value="units">Unidades</option>
                                <option value="value">Valor ($)</option>
                            </select>
                            <button
                                onClick={() => setChartType(chartType === 'bar' ? 'pie' : 'bar')}
                                className="btn-icon"
                                style={{ padding: '4px', background: 'rgba(255,255,255,0.05)' }}
                            >
                                {chartType === 'bar' ? <PieChartIcon size={16} /> : <BarChart3 size={16} />}
                            </button>
                        </div>
                    </div>

                    <div style={{ height: '300px', width: '100%' }}>
                        {categoryData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                {chartType === 'bar' ? (
                                    <BarChart data={categoryData} layout="vertical" margin={{ left: 40, right: 30 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={true} vertical={false} />
                                        <XAxis type="number" hide />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            stroke="var(--text-secondary)"
                                            fontSize={11}
                                            width={100}
                                        />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)', fontSize: '12px' }}
                                            formatter={(value) => categoryMetric === 'value' ? `$${value.toLocaleString()}` : `${value} unds`}
                                        />
                                        <Bar dataKey={categoryMetric} radius={[0, 4, 4, 0]}>
                                            {categoryData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                ) : (
                                    <PieChart>
                                        <Pie
                                            data={categoryData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={5}
                                            dataKey={categoryMetric}
                                        >
                                            {categoryData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value) => categoryMetric === 'value' ? `$${value.toLocaleString()}` : `${value} unds`}
                                        />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" fontSize={10} />
                                    </PieChart>
                                )}
                            </ResponsiveContainer>
                        ) : <NoData />}
                    </div>
                </div>

                {/* Top Sales Chart */}
                <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <TrendingUp size={18} /> Top 10 Productos Más Vendidos
                    </h3>
                    <div style={{ height: '300px', width: '100%' }}>
                        {topSoldData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topSoldData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        stroke="var(--text-secondary)"
                                        fontSize={10}
                                        interval={0}
                                        angle={-25}
                                        textAnchor="end"
                                        height={60}
                                    />
                                    <YAxis stroke="var(--text-secondary)" fontSize={11} />
                                    <Tooltip
                                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)', fontSize: '12px' }}
                                        formatter={(value) => [`${value} unidades`, 'Vendido']}
                                    />
                                    <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <NoData />}
                    </div>
                </div>
            </div>

            {/* Inactivity & Slow Moving Analysis */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Clock size={18} /> Análisis de Lento Movimiento
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                        <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--amber)' }}>{slowMoving.days30}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>+30 Días Inactivos</div>
                        </div>
                        <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--orange)' }}>{slowMoving.days60}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>+60 Días Inactivos</div>
                        </div>
                        <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--red)' }}>{slowMoving.days90}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>+90 Días Crítico</div>
                        </div>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ color: 'var(--success)', marginBottom: '0.5rem' }}>
                            <ShoppingCart size={40} style={{ margin: '0 auto' }} />
                        </div>
                        <h4 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>{stats.unitsSold} Unidades Vendidas</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Actividad de los últimos 30 días</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const NoData = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
        No hay datos suficientes para este análisis
    </div>
);

export default React.memo(Dashboard);

