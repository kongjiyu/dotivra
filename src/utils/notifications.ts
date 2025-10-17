// src/utils/notifications.ts
/**
 * Simple toast notification system as a fallback when proper toast library is not available
 */

interface ToastOptions {
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';
  type?: 'success' | 'error' | 'info' | 'warning';
}

let toastContainer: HTMLElement | null = null;

const createToastContainer = (): HTMLElement => {
  if (toastContainer && document.contains(toastContainer)) {
    return toastContainer;
  }

  const container = document.createElement('div');
  container.id = 'toast-container';
  container.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 400px;
  `;
  
  document.body.appendChild(container);
  toastContainer = container;
  return container;
};

const getToastStyles = (type: string): string => {
  const baseStyles = `
    pointer-events: auto;
    background: white;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05);
    border-left: 4px solid;
    display: flex;
    align-items: center;
    gap: 12px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.4;
    max-width: 100%;
    word-wrap: break-word;
    transform: translateX(100%);
    opacity: 0;
    transition: all 0.3s ease-out;
  `;

  const typeStyles = {
    success: 'border-left-color: #10b981; color: #065f46;',
    error: 'border-left-color: #ef4444; color: #991b1b;',
    warning: 'border-left-color: #f59e0b; color: #92400e;',
    info: 'border-left-color: #3b82f6; color: #1e40af;'
  };

  return baseStyles + (typeStyles[type as keyof typeof typeStyles] || typeStyles.info);
};

const getToastIcon = (type: string): string => {
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  
  return icons[type as keyof typeof icons] || icons.info;
};

export const showToast = (
  message: string,
  options: ToastOptions = {}
): void => {
  const {
    duration = 4000,
    type = 'info'
  } = options;

  const container = createToastContainer();
  
  // Create toast element
  const toast = document.createElement('div');
  toast.style.cssText = getToastStyles(type);
  
  // Add content
  toast.innerHTML = `
    <span style="font-size: 16px; flex-shrink: 0;">${getToastIcon(type)}</span>
    <span style="flex: 1;">${message}</span>
    <button 
      style="
        background: none; 
        border: none; 
        font-size: 18px; 
        cursor: pointer; 
        padding: 0; 
        margin-left: 8px;
        color: inherit;
        opacity: 0.7;
        flex-shrink: 0;
      "
      onclick="this.parentElement.remove()"
      title="Close"
    >×</button>
  `;
  
  container.appendChild(toast);
  
  // Animate in
  requestAnimationFrame(() => {
    toast.style.transform = 'translateX(0)';
    toast.style.opacity = '1';
  });
  
  // Auto remove after duration
  if (duration > 0) {
    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.transform = 'translateX(100%)';
        toast.style.opacity = '0';
        setTimeout(() => {
          if (toast.parentNode) {
            toast.remove();
          }
        }, 300);
      }
    }, duration);
  }
};

// Convenience methods
export const showSuccessToast = (message: string, duration?: number) => {
  showToast(message, { type: 'success', duration });
};

export const showErrorToast = (message: string, duration?: number) => {
  showToast(message, { type: 'error', duration });
};

export const showInfoToast = (message: string, duration?: number) => {
  showToast(message, { type: 'info', duration });
};

export const showWarningToast = (message: string, duration?: number) => {
  showToast(message, { type: 'warning', duration });
};