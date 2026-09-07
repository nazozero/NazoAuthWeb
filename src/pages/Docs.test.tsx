import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n';
import Docs from './Docs';

function HistoryBack() {
  const navigate = useNavigate();
  return <button onClick={() => navigate(-1)}>History back</button>;
}
function renderDocs(entry = '/docs') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <I18nProvider>
        <Docs />
        <HistoryBack />
      </I18nProvider>
    </MemoryRouter>
  );
}

describe('Documentation navigation', () => {
  beforeEach(() => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('opens deep links and preserves browser history between chapters', async () => {
    const user = userEvent.setup();
    renderDocs('/docs?section=deploy');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Deploy NazoAuth' })
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('link', { name: 'Connect your first app' })
    );
    expect(
      screen.getByRole('heading', { level: 1, name: 'Connect your first app' })
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'History back' }));
    expect(
      screen.getByRole('heading', { level: 1, name: 'Deploy NazoAuth' })
    ).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('searches chapter bodies and opens the result without network requests', async () => {
    const user = userEvent.setup();
    renderDocs();
    const search = screen.getByRole('searchbox', {
      name: 'Search documentation',
    });
    await user.type(search, 'nazoauthctl backup snapshot');
    expect(screen.getByRole('status')).toHaveTextContent('1 chapter found');
    await user.keyboard('{Enter}');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Operations and recovery' })
    ).toBeInTheDocument();
    expect(search).toHaveValue('');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('removes the interface checker and resolves its obsolete link to the overview', () => {
    renderDocs('/docs?section=interface-lab');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Developer documentation' })
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Interface checks|Run all|接口检查/)
    ).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('copies a code example without its decorative line numbers', async () => {
    const user = userEvent.setup();
    const write = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue();
    renderDocs('/docs?section=integration');
    await user.click(screen.getAllByRole('button', { name: 'Copy code' })[0]);
    expect(write).toHaveBeenCalledWith(
      expect.stringMatching(
        /^GET https:\/\/auth\.example\.com\/\.well-known\/openid-configuration\n/
      )
    );
    expect(
      screen
        .getAllByRole('status')
        .some((item) => item.textContent === 'Copied')
    ).toBe(true);
  });

  it('publishes the certified VCI issuer and VP verifier profiles with Foundation sources', () => {
    renderDocs('/docs?section=certification');
    for (const profile of [
      'Issuer · sd_jwt_vc · issuer_initiated',
      'Issuer · sd_jwt_vc · wallet_initiated',
      'Issuer · mdoc · issuer_initiated',
      'Issuer · mdoc · wallet_initiated',
      'Verifier · sd_jwt_vc · direct_post.jwt',
      'Verifier · iso_mdl · direct_post.jwt',
    ]) expect(screen.getByText(profile)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Verify OpenID4VCI + HAIP certifications' })).toHaveAttribute('href', 'https://openid.net/certification/certified-oid4vci-haip-final/');
    expect(screen.getByRole('link', { name: 'Verify OpenID4VP + HAIP certifications' })).toHaveAttribute('href', 'https://openid.net/certification/certified-oid4vp-haip-final/');
    expect(screen.getByRole('heading', { name: 'Engineering validation of later releases' })).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('finds an exact configuration key and opens the relevant reference chapter', async () => {
    const user = userEvent.setup();
    renderDocs();
    await user.type(screen.getByRole('searchbox', { name: 'Search documentation' }), 'EMAIL_SMTP_TLS');
    await user.keyboard('{Enter}');
    expect(screen.getByRole('heading', { level: 1, name: 'Email and verification' })).toBeInTheDocument();
    expect(screen.getByText('EMAIL_SMTP_TLS')).toBeInTheDocument();
    expect(screen.getByText('starttls, implicit, or none; none is limited to credential-free loopback development.')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});
