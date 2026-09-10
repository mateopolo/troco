// src/contexts/ModalContext.jsx
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ModalContext = createContext(null);

export function ModalProvider({ children }) {
  const [modalStack, setModalStack] = useState([]);

  const openModal = useCallback((modalId, props = {}) => {
    setModalStack(prev => {
      // Avoid duplicate entries
      const filtered = prev.filter(m => m.id !== modalId);
      return [...filtered, { id: modalId, props }];
    });
  }, []);

  const closeModal = useCallback((modalId) => {
    setModalStack(prev => {
      if (!modalId) return prev.slice(0, -1);
      return prev.filter(m => m.id !== modalId);
    });
  }, []);

  const isModalOpen = useCallback((modalId) => {
    return modalStack.some(m => m.id === modalId);
  }, [modalStack]);

  const activeModal = modalStack.length > 0 ? modalStack[modalStack.length - 1] : null;

  // Lock body scroll whenever at least one modal is active
  useEffect(() => {
    if (modalStack.length > 0) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [modalStack.length]);

  // Handle ESC key to close top modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && modalStack.length > 0) {
        const top = modalStack[modalStack.length - 1];
        if (top.props?.onClose) {
          top.props.onClose();
        } else {
          closeModal(top.id);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalStack, closeModal]);

  return (
    <ModalContext.Provider value={{
      modalStack,
      activeModal,
      openModal,
      closeModal,
      isModalOpen,
    }}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) {
    // Graceful fallback if used outside provider
    return {
      modalStack: [],
      activeModal: null,
      openModal: () => {},
      closeModal: () => {},
      isModalOpen: () => false,
    };
  }
  return ctx;
}
