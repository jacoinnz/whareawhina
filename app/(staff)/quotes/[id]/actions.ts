'use server'

export async function saveQuote(_input: unknown): Promise<{ error?: string }> {
  throw new Error('Not implemented yet')
}

export async function sendToClient(_quoteId: string): Promise<{ error?: string }> {
  throw new Error('Not implemented yet')
}

export async function duplicateQuote(_quoteId: string): Promise<{ newId?: string; error?: string }> {
  throw new Error('Not implemented yet')
}
