import { describe, expect, it } from 'vitest';
import { dailyUpdateSchema, passwordSchema, personSchema, repoSchema } from '@/lib/validation';

const basePerson = {
  full_name: 'Gagan K I',
  email: 'Gagan@Example.com',
  app_role: 'member',
  member_type: 'intern',
  weekday_target_hours: '4',
  weekend_target_hours: '4',
  github_username: '',
  start_date: '2026-11-10',
  end_date: '2027-02-09'
};

describe('personSchema', () => {
  it('normalises input and converts hours to minutes', () => {
    const parsed = personSchema.parse(basePerson);
    expect(parsed.email).toBe('gagan@example.com');
    expect(parsed.github_username).toBeNull();
    expect(parsed.weekday_target_hours).toBe(240);
    expect(parsed.team_id).toBeNull();
  });

  it('rejects an end date before the start date', () => {
    const result = personSchema.safeParse({ ...basePerson, end_date: '2026-11-01' });
    expect(result.success).toBe(false);
  });

  it('rejects a GitHub link instead of a username', () => {
    expect(personSchema.safeParse({ ...basePerson, github_username: 'https://github.com/gagan' }).success).toBe(false);
  });
});

describe('dailyUpdateSchema', () => {
  it('splits links and adds https', () => {
    const parsed = dailyUpdateSchema.parse({ done: 'Built the attendance page', links: 'github.com/a/b/pull/1\nhttps://x.dev' });
    expect(parsed.links).toEqual(['https://github.com/a/b/pull/1', 'https://x.dev']);
  });

  it('requires a meaningful summary', () => {
    expect(dailyUpdateSchema.safeParse({ done: 'stuff' }).success).toBe(false);
  });
});

describe('passwordSchema', () => {
  it('needs length, a number and a match', () => {
    expect(passwordSchema.safeParse({ password: 'short1', confirm: 'short1' }).success).toBe(false);
    expect(passwordSchema.safeParse({ password: 'longpassword', confirm: 'longpassword' }).success).toBe(false);
    expect(passwordSchema.safeParse({ password: 'longpassw0rd', confirm: 'different1' }).success).toBe(false);
    expect(passwordSchema.safeParse({ password: 'longpassw0rd', confirm: 'longpassw0rd' }).success).toBe(true);
  });
});

describe('repoSchema', () => {
  it('accepts owner/repo or a GitHub URL', () => {
    expect(repoSchema.parse({ full_name: 'https://github.com/Migsak/migsak-ops.git' }).full_name).toBe('Migsak/migsak-ops');
    expect(repoSchema.safeParse({ full_name: 'not a repo' }).success).toBe(false);
  });
});
