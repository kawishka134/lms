-- Enable Realtime for the matching tables so Tutes and Profile changes sync dynamically
ALTER PUBLICATION supabase_realtime ADD TABLE tutes;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
