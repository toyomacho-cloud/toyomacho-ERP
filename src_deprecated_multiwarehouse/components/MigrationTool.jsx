import React, { useState } from 'react';
import { Database, AlertTriangle, CheckCircle } from 'lucide-react';
import { useInventoryContext } from '../context/InventoryContext';

const MigrationTool = () => {
    const { migrateToMultiWarehouse, products, warehouses } = useInventoryContext();
    const [migrating, setMigrating] = useState(false);
    const [result, setResult] = useState(null);

    // Check if migration is needed
    const needsMigration = products.some(p => !p.stockByWarehouse);
    const alreadyMigrated = products.every(p => p.stockByWarehouse);

    const handleMigrate = async () => {
        if (!window.confirm('⚠️ ADVERTENCIA: Esto modificará TODOS los productos.\n\n¿Estás seguro de continuar?')) {
            return;
        }

        setMigrating(true);
        setResult(null);

        try {
            const migrationResult = await migrateToMultiWarehouse();
            setResult(migrationResult);
        } catch (error) {
            setResult({
                success: false,
                error: error.message
            });
        } finally {
            setMigrating(false);
        }
    };

    return (
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <Database size={32} color="var(--accent-primary)" />
                <div>
                    <h3 style={{ margin: 0 }}>Migración a Multi-Warehouse</h3>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        Convierte todos los productos al nuevo formato de inventario por almacén
                    </p>
                </div>
            </div>

            {alreadyMigrated ? (
                <div style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    padding: '1.5rem',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                }}>
                    <CheckCircle size={24} color="var(--success)" />
                    <div>
                        <strong style={{ color: 'var(--success)' }}>✓ Migración Completada</strong>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            Todos los productos ({products.length}) ya están usando el formato multi-warehouse
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    <div style={{
                        background: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        padding: '1.5rem',
                        borderRadius: 'var(--radius-sm)',
                        marginBottom: '1.5rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                            <AlertTriangle size={24} color="var(--warning)" />
                            <div>
                                <strong style={{ color: 'var(--warning)' }}>Migración Pendiente</strong>
                                <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem', fontSize: '0.875rem' }}>
                                    <li>Productos detectados: <strong>{products.length}</strong></li>
                                    <li>Productos que necesitan migración: <strong>{products.filter(p => !p.stockByWarehouse).length}</strong></li>
                                    <li>Almacenes activos: <strong>{warehouses.filter(w => w.active !== false).length}</strong></li>
                                </ul>
                                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                    Todo el stock se asignará al primer almacén activo disponible
                                </p>
                            </div>
                        </div>
                    </div>

                    <button
                        className="btn btn-primary"
                        onClick={handleMigrate}
                        disabled={migrating}
                        style={{ width: '100%', padding: '1rem', fontSize: '1rem', fontWeight: 'bold' }}
                    >
                        {migrating ? '⏳ Migrando...' : '🚀 Ejecutar Migración a Multi-Warehouse'}
                    </button>
                </>
            )}

            {result && (
                <div style={{
                    marginTop: '1.5rem',
                    padding: '1.5rem',
                    borderRadius: 'var(--radius-sm)',
                    background: result.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${result.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                }}>
                    {result.success ? (
                        <>
                            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--success)' }}>
                                ✅ Migración Exitosa
                            </h4>
                            <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.875rem' }}>
                                <li>Productos migrados: <strong>{result.migratedCount}</strong></li>
                                <li>Almacén por defecto: <strong>{result.defaultWarehouse}</strong></li>
                            </ul>
                            <p style={{ margin: '0.75rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                Recarga la página para ver los cambios reflejados en toda la aplicación.
                            </p>
                        </>
                    ) : (
                        <>
                            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--danger)' }}>
                                ❌ Error en Migración
                            </h4>
                            <p style={{ margin: 0, fontSize: '0.875rem', fontFamily: 'monospace' }}>
                                {result.error}
                            </p>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default MigrationTool;
