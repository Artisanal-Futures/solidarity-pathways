'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'

type Props = {
  children: ReactNode
  storeName: string
}
export function ProviderSignInForm({ children, storeName }: Props) {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/'

  return (
    <>
      <CardHeader>
        <CardTitle className="text-center text-2xl">
          Login to {storeName}
        </CardTitle>
        <CardDescription className="text-center">
          Login to your account using one of the providers below
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="flex w-full gap-2">{children}</div>
        </div>

        <p className="w-full py-4 text-center font-medium text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link
            href={`/auth/sign-up?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="underline"
          >
            <span className="font-bold hover:text-slate-800">Sign up</span>
          </Link>
        </p>
      </CardContent>
    </>
  )
}
