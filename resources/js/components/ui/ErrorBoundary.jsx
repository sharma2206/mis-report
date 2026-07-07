import { Component } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export class ErrorBoundary extends Component {
    state = { error: null, errorInfo: null };

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo });
        console.error('[ErrorBoundary]', error, errorInfo);
    }

    reset = () => this.setState({ error: null, errorInfo: null });

    render() {
        if (this.state.error) {
            return (
                <div className="flex flex-col items-center justify-center gap-3 p-6 bg-red-50 border border-red-100 rounded-xl text-center">
                    <AlertTriangle className="w-8 h-8 text-red-400" />
                    <div>
                        <p className="text-[13px] font-700 text-red-700 mb-1">Something went wrong</p>
                        <p className="text-[11px] text-red-500">{this.state.error?.message || 'An unexpected error occurred.'}</p>
                    </div>
                    <button
                        onClick={this.reset}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 text-red-600 text-[12px] font-600 rounded-lg hover:bg-red-50 transition-all cursor-pointer"
                    >
                        <RefreshCw className="w-3 h-3" /> Try again
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
