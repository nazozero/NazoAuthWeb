import { useEffect, useState } from 'react';
import { CircleAlert, Clock3, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useI18n } from '../i18n';
import {
  acquireVerificationReceiptCapability,
  canonicalVerificationResultPath,
  loadVerificationReceipt,
  type VerificationReceiptProjection,
} from '../lib/verificationReceipt';
import './VerificationResult.css';

type PageState =
  | Readonly<{ kind: 'loading' }>
  | Readonly<{ kind: 'verified'; receipt: VerificationReceiptProjection }>
  | Readonly<{ kind: 'expired' }>
  | Readonly<{ kind: 'not-found' }>
  | Readonly<{ kind: 'generic-error' }>;

function Detail({
  label,
  testId,
  value,
}: {
  label: string;
  testId: string;
  value: string;
}) {
  return (
    <div className="verification-result-detail">
      <dt>{label}</dt>
      <dd data-testid={testId}>{value}</dd>
    </div>
  );
}

function StateMessage({ state }: { state: Exclude<PageState['kind'], 'verified'> }) {
  const { t } = useI18n();
  const content = {
    loading: {
      icon: <LoaderCircle className="verification-result-spinner" aria-hidden="true" />,
      title: t('verificationResult.loading.title'),
      body: t('verificationResult.loading.body'),
    },
    expired: {
      icon: <Clock3 aria-hidden="true" />,
      title: t('verificationResult.expired.title'),
      body: t('verificationResult.expired.body'),
    },
    'not-found': {
      icon: <CircleAlert aria-hidden="true" />,
      title: t('verificationResult.notFound.title'),
      body: t('verificationResult.notFound.body'),
    },
    'generic-error': {
      icon: <CircleAlert aria-hidden="true" />,
      title: t('verificationResult.error.title'),
      body: t('verificationResult.error.body'),
    },
  }[state];

  return (
    <section className="verification-result-state" aria-live="polite">
      <div className="verification-result-state-icon">{content.icon}</div>
      <h1 id="verification-result-title" data-testid="vp-verification-status">
        {content.title}
      </h1>
      <p>{content.body}</p>
    </section>
  );
}

export default function VerificationResult() {
  const { t } = useI18n();
  const [state, setState] = useState<PageState>({ kind: 'loading' });

  useEffect(() => {
    const lease = acquireVerificationReceiptCapability();
    if (!lease) {
      setState({ kind: 'not-found' });
      return;
    }

    const controller = new AbortController();
    const clearOnPageHide = () => {
      lease.clear();
      controller.abort();
    };
    window.addEventListener('pagehide', clearOnPageHide, { once: true });
    void loadVerificationReceipt(lease.capability, controller.signal).then((result) => {
      if (controller.signal.aborted) {
        return;
      }
      lease.clear();
      if (result.kind !== 'verified') {
        setState(result);
        return;
      }
      if (Date.parse(result.receipt.expiresAt) <= Date.now()) {
        setState({ kind: 'expired' });
        return;
      }
      setState(result);
    });
    return () => {
      window.removeEventListener('pagehide', clearOnPageHide);
      controller.abort();
      if (
        !canonicalVerificationResultPath(
          window.location.pathname,
          import.meta.env.BASE_URL
        )
      ) {
        lease.clear();
      }
      lease.release();
    };
  }, []);

  useEffect(() => {
    if (state.kind !== 'verified') {
      return;
    }
    let timeout = 0;
    const expireWhenDue = () => {
      const remaining = Date.parse(state.receipt.expiresAt) - Date.now();
      if (remaining <= 0) {
        setState({ kind: 'expired' });
        return;
      }
      timeout = window.setTimeout(
        expireWhenDue,
        Math.min(remaining, 2_147_483_647)
      );
    };
    expireWhenDue();
    return () => window.clearTimeout(timeout);
  }, [state]);

  return (
    <main
      className="verification-result-page"
      data-testid="vp-verification-result"
      data-state={state.kind}
    >
      <div className="verification-result-backdrop" aria-hidden="true" />
      <article className="verification-result-card" aria-labelledby="verification-result-title">
        <header className="verification-result-brand">
          <img src={`${import.meta.env.BASE_URL}icons/site-icon-64x64.png`} alt="" />
          <div>
            <p>NazoAuth Verifier</p>
            <span>{t('verificationResult.brand.subtitle')}</span>
          </div>
        </header>

        {state.kind === 'verified' ? (
          <>
            <section className="verification-result-success" aria-live="polite">
              <div className="verification-result-success-icon" aria-hidden="true">
                <ShieldCheck />
              </div>
              <p className="verification-result-eyebrow">
                {t('verificationResult.success.eyebrow')}
              </p>
              <h1
                id="verification-result-title"
                data-testid="vp-verification-status"
              >
                Verification successful
              </h1>
              <p>{t('verificationResult.success.body')}</p>
            </section>

            <dl className="verification-result-details" aria-label={t('verificationResult.details.label')}>
              <Detail
                label={t('verificationResult.details.testName')}
                testId="vp-test-name"
                value={state.receipt.testName}
              />
              <Detail
                label={t('verificationResult.details.planId')}
                testId="vp-suite-plan-id"
                value={state.receipt.suitePlanId}
              />
              <Detail
                label={t('verificationResult.details.moduleId')}
                testId="vp-suite-module-id"
                value={state.receipt.suiteModuleId}
              />
              <Detail
                label={t('verificationResult.details.variantDigest')}
                testId="vp-variant-sha256"
                value={state.receipt.variantSha256}
              />
              <Detail
                label={t('verificationResult.details.receiptDigest')}
                testId="vp-receipt-sha256"
                value={state.receipt.receiptSha256}
              />
            </dl>

            <footer className="verification-result-footer">
              <span className="verification-result-seal">
                <ShieldCheck size={16} aria-hidden="true" />
                {t('verificationResult.footer.verified')}
              </span>
              <span>{t('verificationResult.footer.noCredentialData')}</span>
            </footer>
          </>
        ) : (
          <StateMessage state={state.kind} />
        )}
      </article>
    </main>
  );
}
