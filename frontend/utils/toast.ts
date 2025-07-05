
import { toast, ToastOptions, Id } from 'react-toastify';

const defaultOptions: ToastOptions = {
  position: 'bottom-right',
  autoClose: 5000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
};


export const toastSuccess = (message: string, options?: ToastOptions): Id => {
  return toast.success(message, {
    ...defaultOptions,
    className: '!bg-green-50 !text-green-800 !border !border-green-200',
    progressClassName: '!bg-green-500',
    ...options,
  });
};

export const toastError = (message: string, options?: ToastOptions): Id => {
  return toast.error(message, {
    ...defaultOptions,
    className: '!bg-red-50 !text-red-800 !border !border-red-200',
    progressClassName: '!bg-red-500',
    autoClose: 7000, 
    ...options,
  });
};


export const toastWarning = (message: string, options?: ToastOptions): Id => {
  return toast.warn(message, {
    ...defaultOptions,
    className: '!bg-yellow-50 !text-yellow-800 !border !border-yellow-200',
    progressClassName: '!bg-yellow-500',
    ...options,
  });
};

export const toastInfo = (message: string, options?: ToastOptions): Id => {
  return toast.info(message, {
    ...defaultOptions,
    className: '!bg-blue-50 !text-blue-800 !border !border-blue-200',
    progressClassName: '!bg-blue-500',
    ...options,
  });
};


export const toastLoading = (message: string = 'Loading...'): Id => {
  return toast.loading(message, {
    className: '!bg-gray-50 !text-gray-800 !border !border-gray-200',
  });
};


export const toastPromise = <T>(
  promise: Promise<T>,
  {
    loading = 'Loading...',
    success = 'Success!',
    error = 'Something went wrong!',
  }: {
    loading?: string;
    success?: string | ((data: T) => string);
    error?: string | ((error: any) => string);
  }
): Promise<T> => {
  return toast.promise(promise, {
    pending: {
      render: loading,
      className: '!bg-gray-50 !text-gray-800 !border !border-gray-200',
    },
    success: {
      render: typeof success === 'function' ? ({ data }) => success(data) : success,
      className: '!bg-green-50 !text-green-800 !border !border-green-200',
      progressClassName: '!bg-green-500',
    },
    error: {
      render: typeof error === 'function' ? ({ data }) => error(data) : error,
      className: '!bg-red-50 !text-red-800 !border !border-red-200',
      progressClassName: '!bg-red-500',
    },
  });
};


export const toastUpdate = (toastId: Id, options: ToastOptions): void => {
  toast.update(toastId, options);
};


export const toastDismissAll = (): void => {
  toast.dismiss();
};


export const toastDismiss = (toastId: Id): void => {
  toast.dismiss(toastId);
};
