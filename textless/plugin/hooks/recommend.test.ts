import { describe, expect, test } from 'claude-code/testing'
import { recommendation } from './register'

// Claude's recommendation for a question, found in its answer and shown under the question.
describe('recommendation for a question', () => {
  test('a sentence that recommends, close to the question', () => {
    const answer = 'The list has three kinds of rows.\n\nShould right-click work on all rows, or only on your own devices?\n\nI recommend all rows, so right-click means the same thing everywhere.'
    expect(recommendation(answer, 'Should right-click work on all rows, or only on your own devices?')).toBe('I recommend all rows, so right-click means the same thing everywhere.')
  })

  test('Swedish, before the question', () => {
    const answer = 'Jag föreslår alla rader, så att högerklick betyder samma sak överallt.\n\nSka högerklick fungera på alla rader, eller bara på dina egna enheter?'
    expect(recommendation(answer, 'Ska högerklick fungera på alla rader, eller bara på dina egna enheter?')).toContain('Jag föreslår alla rader')
  })

  test('an option marked (recommended)', () => {
    expect(recommendation('Which one? Tabs, or spaces (recommended)?', 'Which one? Tabs, or spaces (recommended)?')).toBe('spaces')
  })

  test('no recommendation: nothing', () => {
    const answer = 'Here is what I found.\n\nWhich colour should the button have?'
    expect(recommendation(answer, 'Which colour should the button have?')).toBe('')
  })

  test('a recommendation far away belongs to something else', () => {
    const answer = `I recommend coffee.${' Filler words here.'.repeat(60)}\n\nWhich colour should the button have?`
    expect(recommendation(answer, 'Which colour should the button have?')).toBe('')
  })
})
