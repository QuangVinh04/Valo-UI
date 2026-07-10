export const chatModelOptions = [
  { value: 'groq-llama-3.3', label: 'Llama 3.3' },
  { value: 'flowise-agent', label: 'Flowise agent' },
] as const;

export type ChatModelKey = typeof chatModelOptions[number]['value'];

export const defaultModel: ChatModelKey = chatModelOptions[0].value;

const availableModels = chatModelOptions.map((model): ChatModelKey => model.value);

export function normalizeModelName(modelName: string | null | undefined): ChatModelKey {
  return availableModels.includes(modelName as ChatModelKey)
    ? modelName as ChatModelKey
    : defaultModel;
}
