import { describe, it, expect } from 'vitest'
import { validateName, buildFullName } from './validation'

describe('validateName', () => {
  it('rejects empty string', () => { expect(validateName('')).toBe(false) })
  it('rejects whitespace-only string', () => { expect(validateName('   ')).toBe(false) })
  it('rejects name shorter than 2 chars', () => { expect(validateName('A')).toBe(false) })
  it('rejects name longer than 50 chars', () => { expect(validateName('A'.repeat(51))).toBe(false) })
  it('accepts valid name', () => { expect(validateName('John')).toBe(true) })
  it('accepts name with exactly 2 chars', () => { expect(validateName('Jo')).toBe(true) })
  it('accepts name with exactly 50 chars', () => { expect(validateName('A'.repeat(50))).toBe(true) })
})

describe('buildFullName', () => {
  it('lowercases and trims first and last name', () => {
    expect(buildFullName('  John  ', '  Smith  ')).toBe('john smith')
  })
  it('handles mixed case', () => {
    expect(buildFullName('JOHN', 'SMITH')).toBe('john smith')
  })
})
