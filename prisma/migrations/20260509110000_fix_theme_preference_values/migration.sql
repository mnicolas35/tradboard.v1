-- Reset any invalid theme preference values to 'LIGHT'
UPDATE "User" SET "themePreference" = 'LIGHT' WHERE "themePreference" NOT IN ('LIGHT', 'DARK');
