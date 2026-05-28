insert into public.gifts (name, description, icon, animation_type, cost_denarii, tier, category, is_active, sort_order, combo_enabled, screen_takeover)
values
  ('Rose', 'A quick appreciation gift.', 'rose', 'simple', 10, 'common', 'love', true, 10, true, false),
  ('Laurel', 'A Roman laurel for standout moments.', 'laurel', 'burst', 50, 'uncommon', 'roman', true, 20, true, false),
  ('Torch', 'A bright celebration for the room.', 'torch', 'burst', 100, 'rare', 'celebration', true, 30, true, false),
  ('Gladius', 'A premium battle-themed gift.', 'gladius', 'fullscreen', 500, 'epic', 'war', true, 40, false, true),
  ('Chariot', 'A legendary room takeover.', 'chariot', 'prestige', 1000, 'legendary', 'prestige', true, 50, false, true),
  ('Jupiter Bolt', 'A divine high-impact gift.', 'bolt', 'mega', 5000, 'divine', 'divine', true, 60, false, true)
on conflict (name) do update
set description = excluded.description,
    icon = excluded.icon,
    animation_type = excluded.animation_type,
    cost_denarii = excluded.cost_denarii,
    tier = excluded.tier,
    category = excluded.category,
    is_active = excluded.is_active,
    sort_order = excluded.sort_order,
    combo_enabled = excluded.combo_enabled,
    screen_takeover = excluded.screen_takeover;
