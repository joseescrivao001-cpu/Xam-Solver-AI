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
    const { plan_type, amount, proof_base64 } = body;

    if (!plan_type || !proof_base64) {
      return NextResponse.json({ error: "Dados incompletos. Envie o plano e o comprovativo." }, { status: 400 });
    }

    // Registrar o comprovativo de pagamento
    const { data: proof, error: insertError } = await supabase
      .from("payment_proofs")
      .insert({
        user_id: user.id,
        user_email: user.email,
        plan_type: plan_type,
        amount: amount || (plan_type === 'ultra' ? '19.000 Kz' : '39.000 Kz'),
        payment_method: 'mcx',
        proof_url: proof_base64,
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error saving payment proof:", insertError);
      return NextResponse.json({ 
        error: "Erro ao registrar o comprovativo. Tente novamente ou envie diretamente pelo WhatsApp de suporte." 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      proof_id: proof?.id,
      message: "Comprovativo recebido com sucesso! Nossa equipe validará o pagamento e seus créditos serão liberados."
    });
  } catch (error) {
    console.error("MCX Checkout error:", error);
    return NextResponse.json({ error: "Erro interno no processamento do comprovativo." }, { status: 500 });
  }
}
