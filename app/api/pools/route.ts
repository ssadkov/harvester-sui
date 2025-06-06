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
    const apiUrl = `https://harvester-server-1.onrender.com/pools?search=${search.toLowerCase()}`;
    console.log('API: Fetching from:', apiUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(apiUrl, {
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 }, // Cache for 1 minute
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    console.log('API: Response status:', response.status);

    if (!response.ok) {
      console.error('API: Error response:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('API: Error response body:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    const data = await response.json();
    console.log('API: Received data:', JSON.stringify(data).slice(0, 200) + '...');
    
    if (!data || Object.keys(data).length === 0) {
      console.log('API: No data received');
      return NextResponse.json({ error: 'No pools found' }, { status: 404 });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('API: Error fetching pools:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch pools data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 