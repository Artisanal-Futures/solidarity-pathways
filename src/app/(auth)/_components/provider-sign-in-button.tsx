'use client'

import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'

import { Button } from '~/components/ui/button'

export function ProviderSignInButton(props: {
  id: string
  name: string
  signUp?: boolean
}) {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/'
  return (
    // <form
    //   action={`/api/auth/signin/${props.id}`}
    //   method="POST"
    //   className="w-full"
    // >
    <Button
      type="submit"
      variant={'outline'}
      className="inline-flex w-full gap-2"
      onClick={() => void signIn(props.id, { callbackUrl })}
      // className="inline-flex h-10 w-full flex-1 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent text-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
    >
      <Image
        src={`/auth/${props.id}.svg`}
        width={25}
        height={25}
        alt={props.name}
      />
      {props.name}
    </Button>
    // </form>
  )
}
