import test from 'node:test';import assert from 'node:assert/strict';
import { matchesPlatformSearch, normalizePhoneSearch } from '../src/lib/search/platform-search.ts';
test('phone search ignores formatting',()=>{assert.equal(normalizePhoneSearch('+91 98765-43210'),'919876543210');assert.equal(matchesPlatformSearch('9876543210',['Acme'],['+91 98765-43210']),true);assert.equal(matchesPlatformSearch('+91 98765 43210',['Acme'],['919876543210']),true);assert.equal(matchesPlatformSearch('543210',['Acme'],['+91-98765-43210']),true);});
test('text search remains supported',()=>{assert.equal(matchesPlatformSearch('maya',['Maya Test Customer','Sunrise'],['9876543210']),true);assert.equal(matchesPlatformSearch('999',['Maya'],['9876543210']),false);});
