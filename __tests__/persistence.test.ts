/**
 * Byte-level compatibility with files written by contributor-assistant/github-action.
 * Fixtures mirror real files from public repos (cozodb/cozo, NVIDIA/garak,
 * vendurehq/vendure, withfig/autocomplete, xibosignage/xibo,
 * Heroic-Games-Launcher/HeroicGamesLauncher) with identities anonymized.
 */
import * as fs from 'fs'
import * as path from 'path'
import { serialize } from '../src/persistence/persistence'
import { ClaFileContent, CommittersDetails } from '../src/interfaces'

const fixture = (name: string): string =>
  fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8')

const FIXTURES = ['cla.small.json', 'cla.large.json', 'cla.empty.json', 'cla.extrakeys.json']

const newSignature = (): CommittersDetails => ({
  name: 'newcomer',
  id: 777001,
  comment_id: 1499999999,
  created_at: '2026-08-20T12:00:00Z',
  repoId: 551374215,
  pullRequestNo: 99
})

describe('signature file round-trip', () => {
  test.each(FIXTURES)('%s re-serializes byte-identically', name => {
    const raw = fixture(name)
    expect(serialize(JSON.parse(raw))).toBe(raw)
  })

  test.each(FIXTURES)('%s has no trailing newline', name => {
    expect(fixture(name).endsWith('\n')).toBe(false)
  })

  test.each(FIXTURES)('%s uses two-space indent', name => {
    const second = fixture(name).split('\n')[1]
    if (second !== undefined && second.trim() !== '') {
      expect(second.match(/^ +/)![0].length).toBe(2)
    }
  })

  it('appending changes exactly the added record and nothing else', () => {
    const raw = fixture('cla.small.json')
    const content: ClaFileContent = JSON.parse(raw)
    const before = content.signedContributors.length

    content.signedContributors.push(newSignature())
    const after = serialize(content)

    const removed = raw.split('\n').filter(l => !after.split('\n').includes(l))
    expect(removed).toEqual([])
    expect(JSON.parse(after).signedContributors).toHaveLength(before + 1)
    // everything before the new record is untouched, byte for byte
    expect(after.startsWith(raw.slice(0, raw.lastIndexOf('\n    }')))).toBe(true)
  })

  it('preserves unknown sibling keys and their order', () => {
    const raw = fixture('cla.extrakeys.json')
    const content: ClaFileContent = JSON.parse(raw)
    content.signedContributors.push(newSignature())
    const out = JSON.parse(serialize(content))
    expect(Object.keys(out)).toEqual(['schemaVersion', 'signedContributors', 'note'])
    expect(out.schemaVersion).toBe(1)
    expect(out.note).toBe('unknown sibling keys must round-trip untouched')
  })

  it('writes record keys in upstream order', () => {
    const content: ClaFileContent = JSON.parse(fixture('cla.empty.json'))
    content.signedContributors.push(newSignature())
    const first = JSON.parse(serialize(content)).signedContributors[0]
    expect(Object.keys(first)).toEqual([
      'name', 'id', 'comment_id', 'created_at', 'repoId', 'pullRequestNo'
    ])
  })

  it('never persists body or updated_at', () => {
    const raw = fixture('cla.large.json')
    for (const s of JSON.parse(raw).signedContributors) {
      expect(s).not.toHaveProperty('body')
      expect(s).not.toHaveProperty('updated_at')
    }
  })

  it('appends without sorting or rewriting existing entries', () => {
    const content: ClaFileContent = JSON.parse(fixture('cla.small.json'))
    const namesBefore = content.signedContributors.map(s => s.name)
    content.signedContributors.push(newSignature())
    const out = JSON.parse(serialize(content))
    expect(out.signedContributors.map((s: CommittersDetails) => s.name))
      .toEqual([...namesBefore, 'newcomer'])
  })
})
