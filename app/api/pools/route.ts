import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');

  console.log('API: Received search request for:', search);

  if (!search) {
    console.log('API: Search parameter is missing');
    return NextResponse.json({ error: 'Search parameter is required' }, { status: 400 });
  }

  try {
    const apiUrl = `https://harvester-server-production.up.railway.app/pools?search=${search.toLowerCase()}`;
    console.log('API: Fetching from:', apiUrl);

    const response = await fetch(apiUrl, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('API: Response status:', response.status);

    if (!response.ok) {
      console.error('API: Error response:', response.status, response.statusText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('API: Received data:', JSON.stringify(data).slice(0, 200) + '...');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('API: Error fetching pools:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pools data' },
      { status: 500 }
    );
  }
} 