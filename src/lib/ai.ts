// Claude API calls. There's no backend, so requests go straight from the
// browser using the key from the Profile page (kept in localStorage).
// Fine for a personal tool; a hosted version would need a server-side proxy.

import Anthropic from '@anthropic-ai/sdk'
import type { Settings } from './types'

export interface StreamOptions {
  settings: Settings
  system: string
  messages: Anthropic.MessageParam[]
  onText: (fullText: string) => void
  signal?: AbortSignal
}

export interface StreamResult {
  text: string
  stopReason: string | null
  model: string
  usage: { input: number; output: number }
}

export class AssistantError extends Error {}

function client(apiKey: string): Anthropic {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
}

/**
 * Streams a reply, calling `onText` with the accumulated text as it arrives so
 * the UI can render tokens live. Resolves with the final text and metadata.
 */
export async function streamReply({ settings, system, messages, onText, signal }: StreamOptions): Promise<StreamResult> {
  if (!settings.apiKey) throw new AssistantError('Add your Anthropic API key on the Profile page to use the assistant.')

  let text = ''
  try {
    const stream = client(settings.apiKey).beta.messages.stream(
      {
        model: settings.model,
        max_tokens: 64000,
        thinking: { type: 'adaptive' },
        output_config: { effort: settings.effort },
        // If a safety classifier declines the request, retry server-side on the
        // model Anthropic recommends for that case instead of failing outright.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system,
        messages,
      },
      { signal },
    )

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        text += event.delta.text
        onText(text)
      }
    }

    const final = await stream.finalMessage()
    if (final.stop_reason === 'refusal') {
      throw new AssistantError('Claude declined this request. Try rephrasing it or removing unusual content from the inputs.')
    }
    return {
      text,
      stopReason: final.stop_reason,
      model: final.model,
      usage: { input: final.usage.input_tokens, output: final.usage.output_tokens },
    }
  } catch (error) {
    throw toAssistantError(error)
  }
}

function toAssistantError(error: unknown): Error {
  // Most specific first: each class extends Anthropic.APIError.
  if (error instanceof AssistantError) return error
  if (error instanceof Anthropic.APIUserAbortError) return new AssistantError('Stopped.')
  if (error instanceof Anthropic.AuthenticationError) return new AssistantError('That API key was rejected. Check it on the Profile page.')
  if (error instanceof Anthropic.PermissionDeniedError) return new AssistantError('This API key does not have access to the selected model.')
  if (error instanceof Anthropic.NotFoundError) return new AssistantError('Model not found. Pick another model on the Profile page.')
  if (error instanceof Anthropic.RateLimitError) return new AssistantError('Rate limited by the API. Wait a moment and try again.')
  if (error instanceof Anthropic.BadRequestError) return new AssistantError(`The API rejected the request: ${error.message}`)
  if (error instanceof Anthropic.APIConnectionError) return new AssistantError('Could not reach the Claude API. Check your connection.')
  if (error instanceof Anthropic.APIError) return new AssistantError(`Claude API error${error.status ? ` ${error.status}` : ''}: ${error.message}`)
  return error instanceof Error ? error : new AssistantError(String(error))
}
