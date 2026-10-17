import { describe, it, expect } from 'vitest';
import { createVault, openVault, createVaultWithKey, openVaultWithKey } from './vault';
import type { VaultEntry } from './vault';

const entry: VaultEntry = {
  id: '1',
  name: 'Example',
  username: 'user',
  password: 'hunter2',
  createdAt: new Date().toISOString(),
  lastModified: new Date().toISOString(),
};

describe('.guardian vault format', () => {
  it('round-trips entries through createVault/openVault', async () => {
    const vault = await createVault('master password', [entry]);
    const data = await openVault('master password', vault);
    expect(data.entries).toEqual([entry]);
  });

  it('rejects the wrong master password', async () => {
    const vault = await createVault('master password', [entry]);
    await expect(openVault('wrong password', vault)).rejects.toThrow();
  });

  it('round-trips through createVaultWithKey/openVaultWithKey', async () => {
    const key = new Uint8Array(32).fill(7);
    const vault = await createVaultWithKey(key, [entry]);
    const data = await openVaultWithKey(key, vault);
    expect(data.entries).toEqual([entry]);
  });
});
