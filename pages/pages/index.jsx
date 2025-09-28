'use client';

import { useState } from 'react';

const PASS = process.env.NEXT_PUBLIC_CONSULT_PASS || '';

export default function Home() {
  const [ok, setOk] = useState(!PASS); // if no env set, skip gate
  const [val, setVal] = useState('');

  if (!ok) {
    return (
      <main style={{
        fontFamily: 'Inter, system-ui, sans-serif',
        background: '#0F0F10',
        color: '#fff',
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px'
      }}>
        <div style={{background:'#120309',border:'1px solid rgba(255,255,255,.15)',borderRadius:16,padding:24,width:'min(720px,100%)'}}>
          <h1 style={{margin:'0 0 8px',fontSize:28,fontWeight:900}}>Enter Passcode</h1>
          <p style={{opacity:.8,margin:'0 0 12px'}}>Set <code>NEXT_PUBLIC_CONSULT_PASS</code> in Vercel.</p>
          <div style={{display:'flex',gap:8}}>
            <input
              value={val}
              onChange={e=>setVal(e.target.value)}
              type="password"
              placeholder="Passcode"
              style={{flex:1,padding:'10px 12px',borderRadius:10,border:'1px solid rgba(255,255,255,.2)',background:'rgba(255,255,255,.08)',color:'#fff'}}
            />
            <button onClick={()=>setOk(val===PASS)} style={{padding:'10px 14px',borderRadius:999,fontWeight:800,background:'#F58A07',color:'#0b0710',border:'none'}}>
              Enter
            </button>
          </div>
          {val && val!==PASS && <div style={{color:'#fca5a5',fontSize:12,marginTop:8}}>Incorrect passcode</div>}
        </div>
      </main>
    );
  }

  return (
    <main style={{
      fontFamily: 'Inter, system-ui, sans-serif',
      background: '#0F0F10',
      color: '#fff',
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      padding: '24px'
    }}>
      <div style={{background:'#120309',border:'1px solid rgba(255,255,255,.15)',borderRadius:16,padding:24,width:'min(880px,100%)'}}>
        <h1 style={{margin:'0 0 8px',fontSize:28,fontWeight:900}}>Internal Consultation Console</h1>
        <p style={{opacity:.85,margin:0}}>Success — page is live. Replace this area with your full UI.</p>
      </div>
    </main>
  );
}
