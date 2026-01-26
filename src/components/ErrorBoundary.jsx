import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: '2rem',
                    color: '#7f1d1d',
                    background: '#fef2f2',
                    minHeight: '100vh',
                    fontFamily: 'system-ui, sans-serif'
                }}>
                    <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Algo salió mal (Error de Aplicación)</h1>
                    <div style={{
                        background: 'white',
                        padding: '1rem',
                        borderRadius: '0.5rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        overflow: 'auto',
                        maxHeight: '80vh'
                    }}>
                        <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Error:</h3>
                        <pre style={{ color: '#dc2626', marginBottom: '1rem', whiteSpace: 'pre-wrap' }}>
                            {this.state.error && this.state.error.toString()}
                        </pre>
                        <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Stack:</h3>
                        <pre style={{ fontSize: '0.8rem', color: '#666', whiteSpace: 'pre-wrap' }}>
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </pre>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            marginTop: '1rem',
                            padding: '0.5rem 1rem',
                            background: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: 'pointer'
                        }}
                    >
                        Recargar Página
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
