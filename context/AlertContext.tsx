import React, { createContext, useCallback, useContext, useState } from 'react';

export type AlertButton = {
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
};

type AlertOptions = {
    title: string;
    message: string;
    buttons?: AlertButton[];
    type?: 'info' | 'warning' | 'error' | 'success';
};

interface AlertContextType {
    showAlert: (options: AlertOptions) => void;
    hideAlert: () => void;
    alertState: (AlertOptions & { visible: boolean }) | null;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [alertState, setAlertState] = useState<(AlertOptions & { visible: boolean }) | null>(null);

    const showAlert = useCallback((options: AlertOptions) => {
        setAlertState({ ...options, visible: true });
    }, []);

    const hideAlert = useCallback(() => {
        setAlertState(prev => prev ? { ...prev, visible: false } : null);
    }, []);

    return (
        <AlertContext.Provider value={{ showAlert, hideAlert, alertState }}>
            {children}
        </AlertContext.Provider>
    );
};

export const useAlert = () => {
    const context = useContext(AlertContext);
    if (!context) {
        throw new Error('useAlert must be used within an AlertProvider');
    }
    return context;
};
