import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const migrationPath = path.join(process.cwd(),'supabase/migrations/20260914013110_s52_pkg_v5_workbook_material_baseline.sql');
const sql = fs.readFileSync(migrationPath,'utf8');

test('S52-PKG-V5: confirmed PET and Clear PET share the same v5 commercial values',()=>{
  assert.match(sql,/m\.code in \('MAT_PET_12','MAT_CLEAR_PET_12'\)/);
  assert.match(sql,/current_rate=165/);
  assert.match(sql,/gsm_override=16\.8/);
  assert.match(sql,/'same_material_group','12_pet_clear_pet'/);
});

test('S52-PKG-V5: confirmed aluminium foil values are seeded only into v5 overrides',()=>{
  assert.match(sql,/m\.code='MAT_AL_FOIL_9'/);
  assert.match(sql,/current_rate=550/);
  assert.match(sql,/gsm_override=24\.2/);
  assert.doesNotMatch(sql,/update\s+public\.packaging_cost_master_items\s+set\s+current_rate/i);
});

test('S52-PKG-V5: confirmed HoloPET values remove the previous costing blocker',()=>{
  assert.match(sql,/m\.code='MAT_HOLOPET_12'/);
  assert.match(sql,/current_rate=330/);
  assert.match(sql,/gsm_override=16\.8/);
});

test('S52-PKG-V5: confirmed Satin Matt values are seeded',()=>{
  const satin = sql.slice(sql.indexOf('-- 12 micron Satin Matt PET'), sql.indexOf('-- 15 micron Velvet Touch PET'));
  assert.match(satin,/current_rate=350/);
  assert.match(satin,/gsm_override=16\.8/);
  assert.match(satin,/m\.code='MAT_SATIN_MATT_PET_12'/);
});

test('S52-PKG-V5: confirmed Velvet Touch values are seeded',()=>{
  const velvet = sql.slice(sql.indexOf('-- 15 micron Velvet Touch PET'));
  assert.match(velvet,/current_rate=550/);
  assert.match(velvet,/gsm_override=18/);
  assert.match(velvet,/m\.code='MAT_VELVET_PET_15'/);
});

test('S52-PKG-V5: material confirmation is explicitly marked admin confirmed',()=>{
  const confirmations = sql.match(/'status','admin_confirmed'/g) ?? [];
  assert.equal(confirmations.length,5);
  assert.match(sql,/'confirmed_on','2026-09-14'/);
});
