import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

export const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState({
    title: '',
    message: '',
    confirmLabel: '',
    cancelLabel: '',
    variant: 'default',
  });

  const resolveRef = useRef(null);

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setConfig({
        title: options.title || '',
        message: options.message || '',
        confirmLabel: options.confirmLabel || '',
        cancelLabel: options.cancelLabel || '',
        variant: options.variant || 'default',
      });
      setIsOpen(true);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    if (resolveRef.current) {
      resolveRef.current(true);
      resolveRef.current = null;
    }
  }, []);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    if (resolveRef.current) {
      resolveRef.current(false);
      resolveRef.current = null;
    }
  }, []);

  const value = {
    confirm,
    isOpen,
    config,
    onConfirm: handleConfirm,
    onCancel: handleCancel,
  };

  return (
    <ConfirmContext.Provider value={value}>
      {children}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context.confirm;
}

export default useConfirm;
