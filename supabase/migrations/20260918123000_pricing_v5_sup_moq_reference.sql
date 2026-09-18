-- Source: legacy Stark SUP quantity reference matrix (2K/3K/5K/10K/20K/30K/50K) plus Sep 18 owner review.
-- Sizes sheet remains the authority for approved SUP sizes and pricing buckets.
-- MOQ reference is used only where it explicitly provides quantity availability. Sample prices are not imported.

with rules(size_key, allowed_quantities, blocked_quantities) as (
  values
    ('80x130_bg25_25', '[3000,5000,10000,20000,30000,50000]'::jsonb, '[1000,2000]'::jsonb),
    ('98x150_bg30_30', '[3000,5000,10000,20000,30000,50000]'::jsonb, '[1000,2000]'::jsonb),
    ('110x170_bg30_30', '[3000,5000,10000,20000,30000,50000]'::jsonb, '[1000,2000]'::jsonb),
    ('120x210_bg40_40', '[3000,5000,10000,20000,30000,50000]'::jsonb, '[1000,2000]'::jsonb),
    ('130x210_bg40_40', '[3000,5000,10000,20000,30000,50000]'::jsonb, '[1000,2000]'::jsonb),
    ('140x210_bg40_40', '[3000,5000,10000,20000,30000,50000]'::jsonb, '[1000,2000]'::jsonb),
    ('150x220_bg50_50', '[2000,3000,5000,10000,20000,30000,50000]'::jsonb, '[1000]'::jsonb),

    ('170x250_bg50_50', '[2000,3000,5000,10000,20000,30000,50000]'::jsonb, '[1000]'::jsonb),
    ('185x270_bg50_50', '[2000,3000,5000,10000,20000,30000,50000]'::jsonb, '[1000]'::jsonb),
    ('210x300_bg55_55', '[2000,3000,5000,10000,20000,30000,50000]'::jsonb, '[1000]'::jsonb),
    ('220x300_bg55_55', '[2000,3000,5000,10000,20000,30000,50000]'::jsonb, '[1000]'::jsonb),
    ('245x320_bg55_55', '[2000,3000,5000,10000,20000,30000,50000]'::jsonb, '[1000]'::jsonb),
    ('260x340_bg60_60', '[2000,3000,5000,10000,20000,30000,50000]'::jsonb, '[1000]'::jsonb),
    ('280x360_bg60_60', '[2000,3000,5000,10000,20000,30000,50000]'::jsonb, '[1000]'::jsonb)
)