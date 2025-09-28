'use client';

import { useState } from 'react';

/** Optional passcode. Set in Vercel as NEXT_PUBLIC_CONSULT_PASS. 
 *  If not set, the page skips the gate automatically.
 */
const PASS = process.env.NEXT_PUBLIC_CONSULT_PASS || '';

/** Example: put any of your existing JSX here later. */
function ConsoleHome() {
  return (
    <main
      style={{
        fontFamily: 'Inter, system-ui, sans-serif',
        background: '#0F0F10',
        color: '#fff',
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px'
      }}
    >
      <div
        style={{
          background: '#120309',
          border: '1px solid rgba(255,255,255,.15)',
          borderRadius: 16,
          padding: 24,
          width: 'min(920px,100%)',
          boxShadow: '0 20px 60px rgba(0,0,0,.35)'
        }}
      >
        <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 900 }}>
          Internal Consultation Console
        </h1>
        <p style={{ opacity: 0.85, margin: 0 }}>
          Success — deployment is live. Replace this block with your full UI when ready.
        </p>
      </div>
    </main>
  );
}

export default function Home() {
  // If no PASS set, skip the gate.
  const [ok, setOk] = useState(!PASS);
  const [val, setVal] = useState('');

  if (!ok) {
    return (
      <main
        style={{
          fontFamily: 'Inter, system-ui, sans-serif',
          background: '#0F0F10',
          color: '#fff',
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: '24px'
        }}
      >
        <div
          style={{
            background: '#120309',
            border: '1px solid rgba(255,255,255,.15)',
            borderRadius: 16,
            padding: 24,
            width: 'min(720px,100%)',
            boxShadow: '0 20px 60px rgba(0,0,0,.35)'
          }}
        >
          <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 900 }}>
            Enter Passcode
          </h1>
          <p style={{ opacity: 0.8, margin: '0 0 12px' }}>
            Set <code>NEXT_PUBLIC_CONSULT_PASS</code> in Vercel Project &rarr; Settings &rarr; Environment Variables.
          </p>

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={val}
              onChange={(e) => setVal(e.target.value)}
              type="password"
              placeholder="Passcode"
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,.2)',
                background: 'rgba(255,255,255,.08)',
                color: '#fff'
              }}
            />
            <button
              onClick={() => setOk(val === PASS)}
              style={{
                padding: '10px 14px',
                borderRadius: 999,
                fontWeight: 800,
                background: '#F58A07',
                color: '#0b0710',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Enter
            </button>
          </div>

          {val && val !== PASS && (
            <div style={{ color: '#fca5a5', fontSize: 12, marginTop: 8 }}>
              Incorrect passcode
            </div>
          )}
        </div>
      </main>
    );
  }

  return <ConsoleHome />;
}
