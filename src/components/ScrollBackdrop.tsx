import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export function BrandStage() {
  return <div className="brand-stage" aria-label="NazoAuth">
    <span aria-hidden="true">NazoAuth</span>
    <small>IDENTITY, CONNECTED.</small>
  </div>;
}

/** One decorative scene survives route changes, independent of authentication. */
export default function ScrollBackdrop() {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<ReturnType<typeof import('./nebulaScene').createNebulaScene> | null>(null);
  const { pathname } = useLocation();
  useEffect(() => { controller.current?.refresh(); }, [pathname]);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let stopped = false;
    const showFallback = () => {
      if (!stopped) element.parentElement?.classList.remove('particles-ready');
    };
    void import('./nebulaScene').then(({ createNebulaScene }) => {
      if (stopped) return;
      controller.current = createNebulaScene(element, showFallback);
      element.parentElement?.classList.add('particles-ready');
    }).catch(showFallback);
    return () => { stopped = true; controller.current?.dispose(); controller.current = null; };
  }, []);
  return <div className="scroll-backdrop" ref={host} aria-hidden="true" />;
}
