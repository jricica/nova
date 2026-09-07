'use client';
import { createContext, useContext, type ReactNode } from 'react';
import { useData } from './ui';
import { defaultAccount, type AccountRecord } from '@/lib/account';
type Session = {
    email: string;
    fullName: string | null;
    displayName: string;
};
type AccountContextValue = {
    account: AccountRecord | null;
    loading: boolean;
    error: string;
    reload: () => Promise<void>;
    setAccount: (value: AccountRecord) => void;
    session: Session;
};
const AccountContext = createContext<AccountContextValue | null>(null);
export function AccountProvider({ children, session }: {
    children: ReactNode;
    session: Session;
}) {
    const result = useData('account');
    return <AccountContext.Provider value={{ account: result.data, loading: result.loading, error: result.error, reload: result.reload, setAccount: result.setData, session }}>{children}</AccountContext.Provider>;
}
export function useAccount() {
    const value = useContext(AccountContext);
    if (!value)
        throw new Error('AccountProvider is required');
    return { ...value, preferences: value.account?.data || defaultAccount(), name: value.account?.data.displayName || value.session.fullName || value.session.email.split('@')[0] || 'Autor' };
}
