import { useRef, useState } from 'react';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { AnimatePresence, motion } from 'framer-motion';
import { alertVariants, modalOverlayVariants, modalPanelVariants } from '../lib/motion';
import './CaptchaModal.css';

interface CaptchaModalProps {
  siteKey: string;
  title: string;
  actionLabel: string;
  disabled?: boolean;
  onClose: () => void;
  onVerified: (token: string) => void;
}

export default function CaptchaModal({
  siteKey,
  title,
  actionLabel,
  disabled = false,
  onClose,
  onVerified,
}: CaptchaModalProps) {
  const turnstileRef = useRef<TurnstileInstance | undefined>(undefined);
  const [errorMsg, setErrorMsg] = useState('');
  const [running, setRunning] = useState(false);

  const handleStart = () => {
    setErrorMsg('');
    setRunning(true);
    turnstileRef.current?.execute();
  };

  return (
    <motion.div
      className="captcha-modal-overlay"
      variants={modalOverlayVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      role="presentation"
      onClick={onClose}
    >
      <motion.div
        className="captcha-modal glass"
        variants={modalPanelVariants}
        role="dialog"
        aria-modal="true"
        aria-label="Human verification"
        onClick={(event) => event.stopPropagation()}
      >
        <h3>{title}</h3>
        <p>Complete the verification step to continue.</p>

        <div className="captcha-widget-wrap">
          <Turnstile
            ref={turnstileRef}
            siteKey={siteKey}
            options={{
              theme: 'dark',
              execution: 'execute',
              appearance: 'execute',
              refreshExpired: 'manual',
              refreshTimeout: 'manual',
            }}
            onSuccess={(token) => {
              setRunning(false);
              onVerified(token);
            }}
            onExpire={() => {
              setRunning(false);
              setErrorMsg('Verification expired. Start the check again.');
            }}
            onError={() => {
              setRunning(false);
              setErrorMsg('Verification failed. Please try again.');
            }}
          />
        </div>

        <AnimatePresence initial={false}>
          {errorMsg && (
            <motion.div
              className="captcha-modal-error"
              variants={alertVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {errorMsg}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="captcha-modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleStart}
            disabled={disabled || running}
          >
            {running ? 'Verifying...' : actionLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
