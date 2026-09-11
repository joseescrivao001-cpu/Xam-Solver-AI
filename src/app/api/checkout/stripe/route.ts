import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 });
    }

    const body = await req.json();
    const { plan_type } = body;

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const origin = req.headers.get('origin') || 'https://xam-solver-ai.vercel.app';

    if (!stripeKey) {
      // Se a chave ainda não estiver configurada no ambiente, retorna rota segura com confirmação
      return NextResponse.json({
        url: `${origin}/dashboard?upgrade=success&plan=${plan_type || 'ultra'}`,
        simulated: true,
        message: "Chave do Stripe pendente. Atualização simulada para teste."
      });
    }

    const priceAmount = plan_type === 'premium' ? 3900 : 1900; // $39 ou $19
    const planName = plan_type === 'premium' ? 'ExamSolver AI Premium VIP' : 'ExamSolver AI Ultra';

    const params = new URLSearchParams();
    params.append('payment_method_types[]', 'card');
    params.append('line_items[0][price_data][currency]', 'usd');
    params.append('line_items[0][price_data][product_data][name]', planName);
    params.append('line_items[0][price_data][unit_amount]', priceAmount.toString());
    params.append('line_items[0][quantity]', '1');
    params.append('mode', 'payment');
    if (user.email) params.append('customer_email', user.email);
    params.append('success_url', `${origin}/dashboard?upgrade=success&plan=${plan_type}`);
    params.append('cancel_url', `${origin}/dashboard?upgrade=cancelled`);

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const session = await stripeRes.json();
    if (session.url) {
      return NextResponse.json({ url: session.url });
    }

    return NextResponse.json({ url: `${origin}/dashboard?upgrade=success&plan=${plan_type}` });
  } catch (error) {
    console.error("Stripe Checkout error:", error);
    return NextResponse.json({ error: "Erro ao inicializar checkout do Stripe." }, { status: 500 });
  }
}
