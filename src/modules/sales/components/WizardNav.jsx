/**
 * WizardNav Component
 * Navegacion por pasos del wizard de ventas (simplificado a 3 pasos)
 */
import React from 'react';
import { Package, User, CreditCard, CheckCircle } from 'lucide-react';

const ICONOS_PASO = {
    1: Package,
    2: User,
    3: CreditCard
};

const ETIQUETAS_PASO = {
    1: 'Productos',
    2: 'Cliente',
    3: 'Pago'
};

const WizardNav = ({ pasoActual, onIrAPaso }) => {
    return (
        <div style={{
            display: 'flex',
            gap: '1rem',
            background: 'transparent'
        }}>
            {[1, 2, 3].map((paso) => {
                const Icono = ICONOS_PASO[paso];
                const etiqueta = ETIQUETAS_PASO[paso];
                const esActivo = pasoActual === paso;
                const esCompletado = pasoActual > paso;
                const esClickeable = paso < pasoActual;

                return (
                    <div
                        key={paso}
                        onClick={() => esClickeable && onIrAPaso(paso)}
                        style={{
                            flex: 1,
                            background: esActivo ? 'var(--primary)' : 'white',
                            color: esActivo ? 'white' : 'var(--text-secondary)',
                            padding: '1rem',
                            borderRadius: 'var(--radius-lg)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            boxShadow: 'var(--shadow-sm)',
                            cursor: esClickeable ? 'pointer' : 'default',
                            opacity: paso > pasoActual && !esActivo ? 0.7 : 1,
                            transition: 'all 0.2s',
                            border: esActivo ? 'none' : '1px solid transparent'
                        }}
                    >
                        <div style={{
                            background: esActivo ? 'rgba(255,255,255,0.2)' : 'var(--bg-secondary)',
                            borderRadius: '50%',
                            width: '28px',
                            height: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: esActivo ? 'white' : esCompletado ? 'var(--success)' : 'var(--text-secondary)'
                        }}>
                            {esCompletado ? (
                                <CheckCircle size={16} />
                            ) : (
                                <Icono size={16} />
                            )}
                        </div>
                        <span style={{
                            fontWeight: esActivo ? '700' : '500',
                            fontSize: '1rem'
                        }}>
                            {etiqueta}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

export default WizardNav;

