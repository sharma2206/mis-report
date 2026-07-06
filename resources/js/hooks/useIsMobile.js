import { useState, useEffect } from 'react';

export const useIsMobile = (breakpoint = 768) => {
    const [isMobile, setIsMobile] = useState(
        () => typeof window !== 'undefined' ? window.innerWidth < breakpoint : false,
    );

    useEffect(() => {
        const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
        const sync = () => setIsMobile(mq.matches);
        mq.addEventListener('change', sync);
        sync();
        return () => mq.removeEventListener('change', sync);
    }, [breakpoint]);

    return isMobile;
};
