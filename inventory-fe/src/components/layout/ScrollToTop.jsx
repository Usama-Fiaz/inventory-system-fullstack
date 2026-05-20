import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        if ('scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual';
        }
    }, []);

    useEffect(() => {
        // If View Transitions are supported, the sidebar handle will take care of it 
        // to avoid the "trailing scroll" effect. This is a fallback for other navigation.
        if (typeof document !== 'undefined' && typeof document.startViewTransition === 'function') {
            return;
        }
        window.scrollTo(0, 0);
    }, [pathname]);

    return null;
};

export default ScrollToTop;
