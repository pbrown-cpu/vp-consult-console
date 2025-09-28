'use client';

export default function Home() {
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
      <div style={{
        background: '#120309',
        border: '1px solid rgba(255,255,255,.15)',
        borderRadius: 16,
        padding: 24,
        width: 'min(720px,100%)',
        boxShadow: '0 20px 60px rgba(0,0,0,.35)'
      }}>
        <h1 style={{margin:'0 0 8px', fontSize:28, fontWeight:900}}>Internal Console — Starter</h1>
        <p style={{opacity:.85, margin:0}}>If you can see this page after deploy, you’re done. Replace this with your real UI next.</p>
      </div>
    </main>
  );
}
