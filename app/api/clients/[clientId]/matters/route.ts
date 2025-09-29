import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const { clientId } = params;

    // First verify the client exists
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('client_id', clientId)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      );
    }

    // Get all matters for this client
    const { data: matters, error: mattersError } = await supabase
      .from('matters')
      .select('*')
      .eq('client_id', clientId)
      .order('created_date', { ascending: false });

    if (mattersError) {
      throw new Error(`Failed to fetch matters: ${mattersError.message}`);
    }

    return NextResponse.json({
      success: true,
      client,
      matters: matters || []
    });

  } catch (error) {
    console.error('Error fetching client matters:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}