import 'dotenv/config'
import { setupProxy } from './proxy.js'
setupProxy()

import { summarizeArticle } from './summarizer.js'

const models = ['gemma-4-31b-it', 'gemma-4-26b-a4b-it', 'gemini-3.1-flash-lite-preview']

for (const model of models) {
  process.env.GEMINI_MODEL = model
  process.env.SUMMARIZER = 'gemini'
  console.log(`\n--- Testing: ${model} ---`)
  const result = await summarizeArticle(
    'OpenAI releases GPT-5 with major reasoning improvements',
    'https://openai.com/blog/gpt-5'
  )
  console.log(JSON.stringify(result, null, 2))
}
