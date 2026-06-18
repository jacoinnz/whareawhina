'use server'
import { signIn } from '@/lib/auth'
import { AuthError } from 'next-auth'

export async function loginAction(
  _prev: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  try {
    await signIn('credentials', {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      redirectTo: '/dashboard',
    })
    return null
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: 'Invalid email or password.' }
    }
    throw err // re-throw NEXT_REDIRECT
  }
}
