import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: clients, error } = await supabase
      .from('clients')
      .select('*')
      .order('name');

    if (error) {
      throw new Error(`Failed to fetch clients: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      clients: clients || []
    });

  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, address } = await request.json();

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Client name is required' },
        { status: 400 }
      );
    }

    // Generate client_id from name
    const clientId = name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');

    // Check if client_id already exists
    const { data: existingClient } = await supabase
      .from('clients')
      .select('client_id')
      .eq('client_id', clientId)
      .single();

    if (existingClient) {
      return NextResponse.json(
        { success: false, error: 'A client with this name already exists' },
        { status: 400 }
      );
    }

    const { data: client, error } = await supabase
      .from('clients')
      .insert({
        client_id: clientId,
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create client: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      message: `Client "${name}" created successfully`,
      client
    });

  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}