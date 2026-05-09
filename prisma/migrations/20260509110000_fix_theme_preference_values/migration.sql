-- Reset any invalid theme preference values to 'LIGHT'
UPDATE "User" SET "theme" = 'LIGHT' WHERE "theme" NOT IN ('LIGHT', 'DARK');
