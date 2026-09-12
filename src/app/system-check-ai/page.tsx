'use client';
import { useState, useEffect } from 'react';

export default function SystemCheckAiPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/system-check-ai')
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className='p-8 font-sans'>Rodando diagnóstico de motores IA...</div>;
  
  return (
    <div className='p-8 font-sans max-w-4xl mx-auto'>
      <h1 className='text-2xl font-bold mb-6'>Diagnóstico do Motor Cognitivo (Triple-Tier)</h1>
      <pre className='bg-zinc-900 text-green-400 p-6 rounded-xl overflow-auto text-sm'>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
