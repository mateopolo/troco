import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

let activeModalCount = 0;
let previousBodyOverflow = '';

/**
 * Universal Portal component rendering children into #modal-root
 * and maintaining a reference-counted scroll-lock on document.body.
 */
const Portal = ({ children, lockScroll = true, containerId = 'modal-root' }) => {
  const [mountNode, setMountNode] = useState(null);

  useEffect(() => {
    let node = document.getElementById(containerId);
    if (!node) {
      node = document.createElement('div');
      node.id = containerId;
      document.body.appendChild(node);
    }
    setMountNode(node);

    if (lockScroll && typeof document !== 'undefined') {
      activeModalCount += 1;
      if (activeModalCount === 1) {
        previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
      }
    }

    return () => {
      if (lockScroll && typeof document !== 'undefined') {
        activeModalCount = Math.max(0, activeModalCount - 1);
        if (activeModalCount === 0) {
          document.body.style.overflow = previousBodyOverflow || '';
        }
      }
    };
  }, [containerId, lockScroll]);

  if (!mountNode) return null;
  return createPortal(children, mountNode);
};

export default Portal;
export { Portal };
