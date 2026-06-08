import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import IdentityCanvas from '../components/IdentityCanvas';
import './Home.css';

gsap.registerPlugin(ScrollTrigger);

const layers = [
  {
    mark: 'key',
    title: '登录',
    text: '账号、验证码、会话和同意页。',
  },
  {
    mark: 'lock',
    title: '授权',
    text: 'Authorization Code、PKCE、scope、UserInfo。',
  },
  {
    mark: 'shield',
    title: '治理',
    text: '客户端审批、密钥投递、授权撤销。',
  },
  {
    mark: 'network',
    title: '验证',
    text: 'Discovery、JWKS、PAR、Introspection。',
  },
];

const flow = ['Authorize', 'Sign in', 'Consent', 'Code', 'Token'];

export default function Home() {
  const { user } = useAuth();
  const canAccessAdmin = user?.role === 'admin' && user.admin_level >= 1;
  const pageRef = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      gsap.from('.hero-word', {
        y: 42,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.08,
      });

      gsap.from('.layer-item', {
        y: 30,
        duration: 0.7,
        ease: 'power2.out',
        stagger: 0.08,
        immediateRender: false,
        scrollTrigger: {
          trigger: '.layer-strip',
          start: 'top 78%',
        },
      });
    },
    { scope: pageRef }
  );

  return (
    <motion.div
      ref={pageRef}
      className="page-transition-wrap home-page cinematic-home"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.16 } }}
    >
      <section className="cinematic-hero">
        <div className="container hero-inner">
          <div className="hero-copy">
            <h1 aria-label="NazoAuth">
              <span className="hero-word">Nazo</span>
              <span className="hero-word">Auth</span>
            </h1>
            <p>
              登录、授权、接入审核。给 OAuth/OIDC 留一个安静、可靠的入口。
            </p>
            <div className="home-actions">
              <Link to={user ? '/profile' : '/auth'} className="btn-primary">
                <span>{user ? '个人中心' : '登录'}</span>
              </Link>
              <Link to="/docs" className="btn-secondary">
                <span>接入</span>
              </Link>
              {canAccessAdmin && (
                <Link to="/admin" className="btn-secondary">
                  <span>后台</span>
                </Link>
              )}
            </div>
          </div>

          <div className="identity-stage" aria-label="NazoAuth identity surface">
            <IdentityCanvas />
            <div className="identity-glass" />
            <div className="identity-core">
              <img src="/icons/site-icon-64x64.png" alt="NazoAuth 图标" />
              <strong>NazoAuth</strong>
              <span>{user ? 'session active' : 'public gateway'}</span>
            </div>
            <div className="identity-note note-client">
              <strong>Client</strong>
              <span>redirect</span>
            </div>
            <div className="identity-note note-user">
              <strong>User</strong>
              <span>consent</span>
            </div>
            <div className="identity-note note-token">
              <strong>Token</strong>
              <span>verify</span>
            </div>
          </div>
        </div>
      </section>

      <section className="container layer-strip" aria-label="NazoAuth capabilities">
        {layers.map((item) => {
          return (
            <article className="layer-item" key={item.title}>
              <span className={`layer-mark ${item.mark}`} />
              <div>
                <h2>{item.title}</h2>
                <p>{item.text}</p>
              </div>
            </article>
          );
        })}
      </section>

      <section className="container sequence-section" aria-label="OAuth flow">
        <div>
          <h2>授权路径</h2>
          <p>协议细节留给后端。页面只把用户带到该做决定的地方。</p>
        </div>
        <div className="sequence-rail">
          {flow.map((item, index) => (
            <div className="sequence-stop" key={item}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{item}</strong>
              {index < flow.length - 1 && <em aria-hidden="true">→</em>}
            </div>
          ))}
        </div>
      </section>
    </motion.div>
  );
}
