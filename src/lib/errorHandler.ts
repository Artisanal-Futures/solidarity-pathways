import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export function handleError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: 'Validation failed', details: error.errors },
      { status: 400 }
    );
  }

  if (error instanceof Error) {
    console.error(error);
    return NextResponse.json(
      { error: error.message || 'Server error' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { error: 'Unknown server error' },
    { status: 500 }
  );
}