import React from 'react';
import { motion } from 'framer-motion';

export default function InteractiveButton({
  children,
  onClick,
  className = '',
  style = {},
  disabled = false,
  type = 'button',
  whileTap = { scale: 0.96 },
  whileHover = { scale: 1.015, y: -1.5 },
  ...props
}) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={premium-button \}
      whileTap={!disabled ? whileTap : undefined}
      whileHover={!disabled ? whileHover : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      style={{
        cursor: disabled ? 'not-allowed' : 'pointer',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        ...style,
      }}
      {...props}
    >
      {children}
    </motion.button>
  );
}