'use client'

import { useSearchParams } from 'next/navigation'

export function ErrorText() {
  const params = useSearchParams()
  const error = params?.get('error')

  const ERROR_MESSAGE_OPTIONS: Record<string, string> = {
    CredentialsSignin:
      'Oops, seems like your username or password is incorrect. Please try again.',
    'account-not-found':
      "Oops, that account doesn't exist. You can sign up for a new account below. ",
    OAuthCallback: 'Oops, something went wrong there. Please try again later.',
    OAuthAccountNotLinked:
      'The email associated with your selected provider is already in use. Please try another provider or contact us.',
  }

  if (error)
    return (
      <p className="py-4 text-center font-semibold text-red-700">
        {ERROR_MESSAGE_OPTIONS[error ?? 'OAuthCallback']}
      </p>
    )

  return null
}
