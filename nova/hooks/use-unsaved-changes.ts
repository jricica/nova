'use client';
import { useEffect } from 'react';
export function useUnsavedChanges(dirty: boolean) {
    useEffect(() => {
        if (!dirty)
            return;
        const leave = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', leave);
        return () => window.removeEventListener('beforeunload', leave);
    }, [dirty]);
}
