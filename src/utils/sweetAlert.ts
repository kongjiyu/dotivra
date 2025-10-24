import Swal from 'sweetalert2';

/**
 * Show a success alert
 */
export const showSuccess = (title: string, message?: string) => {
  return Swal.fire({
    icon: 'success',
    title,
    text: message,
    confirmButtonColor: '#10b981',
    timer: 3000,
    timerProgressBar: true,
  });
};

/**
 * Show an error alert
 */
export const showError = (title: string, message?: string) => {
  return Swal.fire({
    icon: 'error',
    title,
    text: message,
    confirmButtonColor: '#ef4444',
  });
};

/**
 * Show a warning alert
 */
export const showWarning = (title: string, message?: string) => {
  return Swal.fire({
    icon: 'warning',
    title,
    text: message,
    confirmButtonColor: '#f59e0b',
  });
};

/**
 * Show an info alert
 */
export const showInfo = (title: string, message?: string) => {
  return Swal.fire({
    icon: 'info',
    title,
    text: message,
    confirmButtonColor: '#3b82f6',
  });
};

/**
 * Show a confirmation dialog
 */
export const showConfirm = (title: string, message?: string, confirmButtonText = 'Yes', cancelButtonText = 'Cancel') => {
  return Swal.fire({
    icon: 'question',
    title,
    text: message,
    showCancelButton: true,
    confirmButtonColor: '#3b82f6',
    cancelButtonColor: '#6b7280',
    confirmButtonText,
    cancelButtonText,
  });
};

/**
 * Show a delete confirmation dialog
 */
export const showDeleteConfirm = (itemName?: string) => {
  return Swal.fire({
    icon: 'warning',
    title: 'Are you sure?',
    html: itemName 
      ? `You are about to delete <strong>"${itemName}"</strong>.<br>This action cannot be undone.`
      : 'This action cannot be undone.',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'Yes, delete it!',
    cancelButtonText: 'Cancel',
  });
};

/**
 * Show a loading alert
 */
export const showLoading = (title = 'Processing...', message?: string) => {
  return Swal.fire({
    title,
    text: message,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });
};

/**
 * Close the current alert
 */
export const closeAlert = () => {
  Swal.close();
};
