// Lenco widget configuration
const LENCO_SCRIPT_URL = import.meta.env.VITE_LENCO_SCRIPT_URL || 'https://pay.sandbox.lenco.co/js/v1/inline.js';

export interface LencoWidgetConfig {
  key: string;
  reference: string;
  email: string;
  amount: number;
  currency?: 'ZMW' | 'USD';
  channels?: ('card' | 'mobile-money')[];
  onSuccess: (response: { reference: string }) => void;
  onClose: () => void;
  onConfirmationPending?: () => void;
}

// Load Lenco script dynamically
export const loadLencoScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if script already loaded
    if ((window as any).LencoPay) {
      resolve();
      return;
    }

    // Check if script is being loaded
    const existingScript = document.getElementById('lenco-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Lenco script')));
      return;
    }

    // Create and append script
    const script = document.createElement('script');
    script.id = 'lenco-script';
    script.src = LENCO_SCRIPT_URL;
    script.async = true;

    script.onload = () => {
      console.log('Lenco script loaded successfully');
      resolve();
    };

    script.onerror = () => {
      console.error('Failed to load Lenco script');
      reject(new Error('Failed to load Lenco script'));
    };

    document.body.appendChild(script);
  });
};

// Initialize Lenco payment widget
export const initializeLencoWidget = async (config: LencoWidgetConfig): Promise<void> => {
  try {
    // Ensure Lenco script is loaded
    await loadLencoScript();

    // Check if LencoPay is available
    if (!(window as any).LencoPay) {
      throw new Error('Lenco payment library not loaded');
    }

    // Initialize widget with configuration
    (window as any).LencoPay.getPaid({
      key: config.key,
      reference: config.reference,
      email: config.email,
      amount: config.amount,
      currency: config.currency || 'ZMW',
      channels: config.channels || ['card', 'mobile-money'],
      onSuccess: (response: { reference: string }) => {
        console.log('Payment successful:', response);
        config.onSuccess(response);
      },
      onClose: () => {
        console.log('Payment widget closed');
        config.onClose();
      },
      onConfirmationPending: () => {
        console.log('Payment confirmation pending');
        if (config.onConfirmationPending) {
          config.onConfirmationPending();
        }
      },
    });
  } catch (error) {
    console.error('Error initializing Lenco widget:', error);
    throw error;
  }
};

// Clean up Lenco script (optional, for unmounting)
export const cleanupLencoScript = (): void => {
  const script = document.getElementById('lenco-script');
  if (script) {
    script.remove();
  }
  delete (window as any).LencoPay;
};
